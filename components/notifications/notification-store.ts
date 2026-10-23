"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isApiConfigured } from "@/lib/api/client";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/components/notifications/notifications-data";

/**
 * One shared store per browser tab for the user's notifications. The bell dot, the
 * toast and the notification center all read from it, so a read, "mark all read" or
 * a new notification shows everywhere at once, without a reload.
 *
 * - Pulse: checks the unread count every 30 seconds while the tab is visible. When
 *   the count goes up, it loads the newest notification for the toast and reloads
 *   the open list.
 * - Feed: the notification center's list. It loads fresh every time the center
 *   opens, and read changes are applied to it directly.
 *
 * Polling is used until the team decides on `socket.io-client`. Only this file
 * would need to change.
 */

/* --------------------------------------------------------------------- pulse */

export interface Pulse {
  /** Null until the first answer; callers use their own default until then. */
  readonly unread: number | null;
  /** The notification that just arrived, until the toast is done with it. */
  readonly fresh: ApiNotification | null;
}

/** How often an open tab checks for new notifications. */
const POLL_MS = 30_000;

const IDLE: Pulse = { unread: null, fresh: null };

let pulse: Pulse = IDLE;
const pulseListeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function publishPulse(next: Pulse): void {
  pulse = next;
  for (const listener of pulseListeners) listener();
}

/**
 * `force` runs the check even when the tab is hidden. It is used for the first
 * check and after a read.
 */
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
    // Offline or signed out: keep the last known state; the next check tries again.
  }
}

function onVisible(): void {
  if (document.visibilityState === "visible") void tick();
}

function subscribePulse(listener: () => void): () => void {
  pulseListeners.add(listener);
  if (pulseListeners.size === 1) {
    void tick(true);
    timer = setInterval(() => void tick(), POLL_MS);
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

/**
 * The shared check. `enabled` is false for guests and when the build has no API.
 */
export function useNotificationPulse(enabled: boolean): Pulse {
  return useSyncExternalStore(
    enabled ? subscribePulse : ignore,
    useCallback(() => (enabled ? pulse : IDLE), [enabled]),
    () => IDLE,
  );
}

/**
 * Whether the bell shows its dot: the live unread count once it is known, otherwise
 * the screen's `fallback`. Guests and builds without an API always use the
 * fallback.
 */
export function useUnreadDot(signedIn: boolean, fallback: boolean): boolean {
  const { unread } = useNotificationPulse(isApiConfigured && signedIn);
  return unread === null ? fallback : unread > 0;
}

/** Clears the new notification once the toast is done with it. */
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
/**
 * Increased on every first-page load, so an older, slower response cannot replace a
 * newer one.
 */
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
    // If a reload fails, keep the list that is already on screen.
    if (feed.status === "ready") return;
    publishFeed({ status: "failed", error: cause instanceof Error ? cause : new Error(String(cause)) });
  }
}

function subscribeFeed(listener: () => void): () => void {
  feedListeners.add(listener);
  // Every visit loads from the server, never from an old copy.
  if (feedListeners.size === 1) {
    // Set directly instead of publishing: React reads the value again right after
    // subscribing.
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

/** Loads the next page when the end of the list scrolls into view. */
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
    // Keep the cursor; scrolling down again will retry.
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

/**
 * Tapping a row: mark it read on screen now, and on the server in the background.
 */
export async function readNotification(notificationId: string): Promise<void> {
  applyRead((item) => item.id === notificationId);
  if (pulse.unread) publishPulse({ ...pulse, unread: pulse.unread - 1 });
  try {
    await markNotificationRead(notificationId);
  } catch {
    // The row stays read on screen; the next visit shows the server's state.
  } finally {
    void tick(true);
  }
}

/**
 * "Mark all read": the same as above for every notification. If it fails, the list
 * reloads from the server.
 */
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
