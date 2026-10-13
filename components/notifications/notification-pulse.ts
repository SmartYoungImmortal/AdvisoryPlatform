"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isApiConfigured } from "@/lib/api/client";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_POLL_MS,
  type ApiNotification,
} from "@/components/notifications/notifications-data";

/**
 * The tab's one live picture of the user's notifications, shared by the bell's
 * dot, the toast and the notification center — so a read, a mark-all or
 * something new shows everywhere at once, without a reload.
 *
 * - **Pulse:** the unread count, asked every 30 seconds while the tab is visible.
 *   When it goes up, the newest notification is fetched once for the toast, and
 *   an open feed reloads its first page.
 * - **Feed:** the center's list. It loads fresh every time the center opens, and
 *   reads are applied to it in place.
 *
 * Polling is the stand-in for Socket.IO until the frontend takes on
 * `socket.io-client` (a team decision). Only this file would change.
 */

/* --------------------------------------------------------------------- pulse */

export interface Pulse {
  /** Null until the first answer — callers fall back to their own default. */
  readonly unread: number | null;
  /** The notification that just arrived, until the toast lets go of it. */
  readonly fresh: ApiNotification | null;
}

const IDLE: Pulse = { unread: null, fresh: null };

let pulse: Pulse = IDLE;
const pulseListeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function publishPulse(next: Pulse): void {
  pulse = next;
  for (const listener of pulseListeners) listener();
}

/** `force` is the first check on mount, which a tab opened in the background still needs. */
async function tick(force = false): Promise<void> {
  if (!force && document.visibilityState === "hidden") return;
  try {
    const { count } = await countUnreadNotifications();
    const rose = pulse.unread !== null && count > pulse.unread;
    if (!rose) {
      if (count !== pulse.unread) publishPulse({ ...pulse, unread: count });
      return;
    }
    if (feedListeners.size > 0) void loadFirstPage();
    const page = await listNotifications({ limit: 1 });
    const newest = page.items[0];
    publishPulse({ unread: count, fresh: newest && !newest.isRead ? newest : pulse.fresh });
  } catch {
    // Offline or signed out mid-way: keep what we last knew; the next tick retries.
  }
}

function onVisible(): void {
  if (document.visibilityState === "visible") void tick();
}

function subscribePulse(listener: () => void): () => void {
  pulseListeners.add(listener);
  if (pulseListeners.size === 1) {
    void tick(true);
    timer = setInterval(() => void tick(), NOTIFICATION_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    pulseListeners.delete(listener);
    if (pulseListeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

const ignore = () => () => {};

/** The shared poll; `enabled` is false for a guest or a build with no API. */
export function useNotificationPulse(enabled: boolean): Pulse {
  return useSyncExternalStore(
    enabled ? subscribePulse : ignore,
    useCallback(() => (enabled ? pulse : IDLE), [enabled]),
    () => IDLE,
  );
}

/**
 * Whether the bell shows its dot: the live unread count once it has answered,
 * until then the screen's own `fallback`. Signed out, or with no API, it is only
 * the fallback.
 */
export function useUnreadDot(signedIn: boolean, fallback: boolean): boolean {
  const { unread } = useNotificationPulse(isApiConfigured && signedIn);
  return unread === null ? fallback : unread > 0;
}

/** The toast is done with the fresh notification. */
export function dismissFresh(): void {
  if (pulse.fresh) publishPulse({ ...pulse, fresh: null });
}

/* ---------------------------------------------------------------------- feed */

const PAGE_SIZE = 20;

export type Feed =
  | { readonly status: "loading" }
  | { readonly status: "failed"; readonly error: Error }
  | {
      readonly status: "ready";
      readonly items: readonly ApiNotification[];
      readonly nextCursor: string | null;
      readonly loadingMore: boolean;
    };

const LOADING: Feed = { status: "loading" };

let feed: Feed = LOADING;
const feedListeners = new Set<() => void>();
/** Bumped on every first-page load, so a slower, older answer cannot land on top. */
let generation = 0;

function publishFeed(next: Feed): void {
  feed = next;
  for (const listener of feedListeners) listener();
}

async function loadFirstPage(): Promise<void> {
  const mine = ++generation;
  try {
    const page = await listNotifications({ limit: PAGE_SIZE });
    if (mine !== generation) return;
    publishFeed({ status: "ready", items: page.items, nextCursor: page.nextCursor, loadingMore: false });
  } catch (cause: unknown) {
    if (mine !== generation) return;
    // A reload that fails keeps the list already on screen.
    if (feed.status === "ready") return;
    publishFeed({ status: "failed", error: cause instanceof Error ? cause : new Error(String(cause)) });
  }
}

function subscribeFeed(listener: () => void): () => void {
  feedListeners.add(listener);
  // Every visit starts from the server's answer, never a copy from last time.
  if (feedListeners.size === 1) {
    // Set, not published: React reads the snapshot again right after subscribing.
    feed = LOADING;
    void loadFirstPage();
  }
  return () => {
    feedListeners.delete(listener);
  };
}

/** The notification center's list. */
export function useNotificationFeed(): Feed {
  return useSyncExternalStore(subscribeFeed, () => feed, () => LOADING);
}

/** After a failed first load. */
export function retryFeed(): void {
  publishFeed(LOADING);
  void loadFirstPage();
}

/** The next page, when the end of the list scrolls into view. */
export async function loadMoreFeed(): Promise<void> {
  if (feed.status !== "ready" || !feed.nextCursor || feed.loadingMore) return;
  const mine = generation;
  publishFeed({ ...feed, loadingMore: true });
  try {
    const page = await listNotifications({ cursor: feed.nextCursor, limit: PAGE_SIZE });
    if (mine !== generation || feed.status !== "ready") return;
    publishFeed({
      status: "ready",
      items: [...feed.items, ...page.items],
      nextCursor: page.nextCursor,
      loadingMore: false,
    });
  } catch {
    // Leave the cursor where it was; scrolling back down tries again.
    if (feed.status === "ready") publishFeed({ ...feed, loadingMore: false });
  }
}

function applyRead(read: (item: ApiNotification) => boolean): void {
  if (feed.status !== "ready") return;
  publishFeed({
    ...feed,
    items: feed.items.map((item) => (!item.isRead && read(item) ? { ...item, isRead: true } : item)),
  });
}

/** Tapping a row: read on screen now, on the server in the background. */
export async function readNotification(notificationId: string): Promise<void> {
  applyRead((item) => item.id === notificationId);
  if (pulse.unread) publishPulse({ ...pulse, unread: pulse.unread - 1 });
  try {
    await markNotificationRead(notificationId);
  } catch {
    // The row stays read on screen; the next visit shows the server's answer.
  } finally {
    void tick(true);
  }
}

/** "Mark all read": the same, for everything. A failure puts the server's answer back. */
export async function readAllNotifications(): Promise<void> {
  applyRead(() => true);
  publishPulse({ ...pulse, unread: 0 });
  try {
    await markAllNotificationsRead();
  } catch {
    void loadFirstPage();
  } finally {
    void tick(true);
  }
}
