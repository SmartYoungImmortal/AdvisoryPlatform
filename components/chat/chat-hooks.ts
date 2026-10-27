"use client";

import { useFormatter, useLocale } from "next-intl";
import { useCallback, useSyncExternalStore } from "react";

import type { CursorPage, Paginated } from "@/lib/api/client";
import { listAdvisors, listMyBookings, listServices } from "@/lib/api/resources";
import { fetchOwnProfile } from "@/lib/session";
import type { ApiBooking, ApiOwnProfile, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { useResource, type Resource } from "@/lib/api/use-resource";
import {
  listChatFiles,
  listChatMessages,
  listChatRooms,
  type ApiChatFile,
  type ApiChatMessage,
  type ApiChatRoom,
} from "@/components/chat/chat-data";
import { newestOf, resolveCounterpart, type Counterpart } from "@/components/chat/chat-logic";

/**
 * The reads the chat screens share, one cache key each so the list, the open
 * thread and the details beside it never ask twice.
 *
 * ## Where the inbox's last lines come from
 *
 * A room row needs a name, a last line and a time. The rooms list carries the
 * other member (`counterpart`) and the newest line (`lastMessage`), so the
 * inbox is one read. Against an API older than `lastMessage` it falls back to
 * fanning out: each room's first page in parallel, where a room whose page
 * fails still lists, without a preview.
 *
 * ## Why nothing here invalidates a mounted read
 *
 * `useResource` does not re-fetch a key that was dropped under a mounted
 * reader: the next render finds no entry and shows loading for good. So a read
 * marker or a sent file is recorded in a small store for the life of the tab
 * instead, and the screens lay it over what the API said. A reload asks the
 * API again and finds it agreeing.
 */

/** One room and the first page of its messages, newest first as the API sends them. */
export type InboxRoom = {
  readonly room: ApiChatRoom;
  readonly messages: readonly ApiChatMessage[];
};

export function useInbox(): Resource<readonly InboxRoom[]> {
  return useResource<readonly InboxRoom[]>(
    "chat/inbox?limit=50",
    useCallback(async (signal: AbortSignal) => {
      const rooms = await listChatRooms({ limit: 50 }, signal);
      // The newest line rides on each room: the row's page is that one line.
      if (rooms.items.every((room) => room.lastMessage !== undefined)) {
        return rooms.items.map((room) => ({ room, messages: room.lastMessage ? [room.lastMessage] : [] }));
      }
      const pages = await Promise.all(
        rooms.items.map((room) =>
          listChatMessages(room.id, { limit: 50 }, signal).catch((cause: unknown) => {
            // An abort is the whole read tearing down; anything else costs this
            // one row its preview, not the inbox.
            if (signal.aborted) throw cause;
            return null;
          }),
        ),
      );
      return rooms.items.map((room, index) => ({
        room,
        messages: pages[index]?.items ?? [],
      }));
    }, []),
  );
}

/** Who I am, what I booked, and the public directory to name people from. */
export type ChatPeople = {
  readonly me: Resource<ApiOwnProfile>;
  readonly bookings: Resource<Paginated<ApiBooking>>;
  readonly advisors: Resource<Paginated<ApiPublicAdvisor>>;
  readonly services: Resource<Paginated<ApiPublicService>>;
};

export function useChatPeople(): ChatPeople {
  // The same keys `/bookings` and the catalogue read, so whichever page came
  // first has already paid for them.
  const me = useResource<ApiOwnProfile>("users/me", fetchOwnProfile);
  const bookings = useResource<Paginated<ApiBooking>>(
    "bookings/me?limit=50",
    useCallback((signal: AbortSignal) => listMyBookings({ limit: 50 }, signal), []),
  );
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    useCallback((signal: AbortSignal) => listAdvisors({ limit: 100 }, signal), []),
  );
  const services = useResource<Paginated<ApiPublicService>>(
    "services?limit=100",
    useCallback((signal: AbortSignal) => listServices({ limit: 100 }, signal), []),
  );
  return { me, bookings, advisors, services };
}

/** The counterpart of one room, from whatever of `people` has arrived. */
export function counterpartFor(
  room: ApiChatRoom | undefined,
  senders: readonly string[],
  people: ChatPeople,
): Counterpart {
  return resolveCounterpart({
    room,
    senders,
    meId: people.me.data?.id,
    bookings: people.bookings.data?.items ?? [],
    advisors: people.advisors.data?.items ?? [],
    services: people.services.data?.items ?? [],
  });
}

/** One room's messages and files, the two halves of its timeline. */
export function useRoomTimeline(roomId: string): {
  readonly messages: Resource<CursorPage<ApiChatMessage>>;
  readonly files: Resource<CursorPage<ApiChatFile>>;
} {
  const messages = useResource<CursorPage<ApiChatMessage>>(
    `chat/rooms/${roomId}/messages?limit=50`,
    useCallback((signal: AbortSignal) => listChatMessages(roomId, { limit: 50 }, signal), [roomId]),
  );
  const files = useResource<CursorPage<ApiChatFile>>(
    `chat/rooms/${roomId}/files?limit=50`,
    useCallback((signal: AbortSignal) => listChatFiles(roomId, { limit: 50 }, signal), [roomId]),
  );
  return { messages, files };
}

/**
 * The room a "message this person" link means: the one whose counterpart is
 * `userId`, newest activity first. `undefined` while the inbox is still being
 * read, `null` once it is clear there is none.
 */
export function roomWith(
  userId: string,
  inbox: Resource<readonly InboxRoom[]>,
  people: ChatPeople,
): string | null | undefined {
  if (inbox.error || people.me.error) return null;
  if (!inbox.data || !people.me.data || people.bookings.loading) return undefined;
  const matches = inbox.data
    .filter(
      ({ room, messages }) =>
        counterpartFor(room, messages.map((m) => m.senderUserId), people).userId === userId,
    )
    .map(({ room, messages }) => ({
      id: room.id,
      at: Date.parse(newestOf(messages)?.createdAt ?? room.createdAt),
    }))
    .sort((a, b) => b.at - a.at);
  return matches[0]?.id ?? null;
}

/**
 * The room with the latest activity: what a desktop opens on `/chat`, and what
 * the failed-message frame draws over. `undefined` while the inbox loads, `null`
 * when there are no rooms.
 */
export function newestRoomId(rooms: readonly InboxRoom[] | undefined): string | null | undefined {
  if (!rooms) return undefined;
  const ranked = rooms
    .map(({ room, messages }) => ({ id: room.id, at: Date.parse(newestOf(messages)?.createdAt ?? room.createdAt) }))
    .sort((a, b) => b.at - a.at);
  return ranked[0]?.id ?? null;
}

/* ---------------------------------------------------------------- desktop */

/** Tailwind's `lg`, where the chat is the three-column messenger rather than one screen at a time. */
const DESKTOP = "(min-width: 64rem)";

function subscribeDesktop(listener: () => void): () => void {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/**
 * Whether the screen is the desktop messenger. For what must not even mount on
 * a phone (a thread opened beside the list would mark its room read unseen),
 * not for looks, which stay in `lg:` classes.
 */
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
}

/* ------------------------------------------------------------------ clock */

/** How the hour is written: Thai reads a clock as 09:05, English drops the zero before AM/PM. */
export function useHourStyle(): "2-digit" | "numeric" {
  return useLocale() === "th" ? "2-digit" : "numeric";
}

/** A time of day in the reader's language, on the app's clock (Asia/Bangkok). */
export function useClock(): (at: Date | number) => string {
  const format = useFormatter();
  const hour = useHourStyle();
  return (at) => format.dateTime(typeof at === "number" ? new Date(at) : at, { hour, minute: "2-digit" });
}

/* -------------------------------------------------------------- tab stores */

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const sentFiles = createStore<ReadonlyMap<string, readonly ApiChatFile[]>>(new Map());

/** A file the API has accepted, shown in its room until a fresh read lists it. */
export function noteFileSent(file: ApiChatFile): void {
  const next = new Map(sentFiles.get());
  next.set(file.chatRoomId, [...(next.get(file.chatRoomId) ?? []), file]);
  sentFiles.set(next);
}

const NO_FILES: readonly ApiChatFile[] = [];
const NO_SENT: ReadonlyMap<string, readonly ApiChatFile[]> = new Map();

export function useSentFiles(roomId: string): readonly ApiChatFile[] {
  const all = useSyncExternalStore(sentFiles.subscribe, sentFiles.get, () => NO_SENT);
  return all.get(roomId) ?? NO_FILES;
}
