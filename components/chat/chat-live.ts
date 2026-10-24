"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useSyncExternalStore } from "react";

import { apiSocketTarget } from "@/lib/api/client";
import {
  listChatMessages,
  markChatRead,
  type ApiChatMessage,
  type ApiChatRead,
} from "@/components/chat/chat-data";

/**
 * The chat, live: one Socket.IO connection to the API's `/chat` namespace, and
 * the small stores the screens lay over what they read from REST.
 *
 * ## The connection
 *
 * `ChatGateway` authenticates the handshake with the better-auth session cookie,
 * the same one every REST call carries, so the socket only has to send
 * credentials (`withCredentials`) to the API's origin; nothing goes in `auth` or
 * the query. Every chat screen holds the connection while it is mounted and the
 * last one to leave lets it go a moment later, so walking from the list into a
 * thread keeps the one socket rather than opening a second. Socket.IO reconnects
 * on its own after a network drop; when the server itself refuses the handshake
 * it does not, so that is retried here, except for a missing or inactive session,
 * which no retry can fix.
 *
 * ## What it carries
 *
 * - `chat:join` for every room on screen: the list joins all of its rooms, so a
 *   line in a room you are not reading still moves that row to the top.
 *   Subscriptions belong to one connection, so they are made again on every
 *   connect.
 * - `chat:message`, the gateway's broadcast of every persisted line, which lands
 *   in `liveMessages` and is merged by id with what REST returned.
 * - `chat:send` with an acknowledgement carrying the stored line. The gateway
 *   answers a failure with an `exception` event and no acknowledgement, so a send
 *   also has a deadline (`SEND_TIMEOUT_MS`).
 * - `chat:read`, to move my read marker and to hear that another tab of mine did.
 *
 * ## Catching up
 *
 * Realtime delivery is not a record (the API says as much), so after any
 * reconnect, and when a new connection follows an earlier one in the same tab,
 * the newest page of every joined room is read again and merged in. Nothing is
 * thrown away and no skeleton is shown: lines that were missed simply appear.
 */

/* ---------------------------------------------------------------- protocol */

/** What the gateway sends when an event or the handshake fails. */
type SocketError = { readonly statusCode: number; readonly message: string };

interface ServerEvents {
  "chat:message": (message: ApiChatMessage) => void;
  "chat:read": (read: ApiChatRead) => void;
  exception: (error: SocketError) => void;
}

interface ClientEvents {
  "chat:join": (
    payload: { readonly chatRoomId: string },
    ack: (room: { readonly chatRoomId: string }) => void,
  ) => void;
  "chat:send": (
    payload: { readonly chatRoomId: string; readonly message: string },
    ack: (message: ApiChatMessage) => void,
  ) => void;
  "chat:read": (
    payload: { readonly chatRoomId: string; readonly messageId: string },
    ack: (read: ApiChatRead) => void,
  ) => void;
}

type ChatSocket = Socket<ServerEvents, ClientEvents>;

/** How long a line may wait for the server to confirm it before it reads as not sent. */
const SEND_TIMEOUT_MS = 10_000;
/** The same for a join or a read marker, which nobody is watching. */
const ACK_TIMEOUT_MS = 10_000;
/** Disconnected for this long before the screens say so; a blip passes unremarked. */
const NOTICE_AFTER_MS = 5_000;
/** How long the connection outlives the last screen, so a route change keeps it. */
const LINGER_MS = 3_000;
/** The wait before asking again after the server refused the handshake. */
const RETRY_MS = 5_000;
/** A line of mine is taken as a failed send's own only if it is no older than this. */
const SAME_SEND_WINDOW_MS = 2 * 60_000;

/* ------------------------------------------------------------------ stores */

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
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "unauthorized";

export type Connection = {
  readonly status: ConnectionStatus;
  /** Not connected for long enough (`NOTICE_AFTER_MS`) that the reader should be told. */
  readonly noticeable: boolean;
};

const IDLE: Connection = { status: "idle", noticeable: false };

const connection = createStore<Connection>(IDLE);

/** Lines that arrived after REST was read, by room, in arrival order. */
const liveMessages = createStore<ReadonlyMap<string, readonly ApiChatMessage[]>>(new Map());

/** How far I have read each room (an instant, from the API's `lastReadAt`). */
const readMarks = createStore<ReadonlyMap<string, number>>(new Map());

/** Why a line of mine did not go. `server` carries the API's own sentence. */
export type SendFailure = {
  readonly kind: "offline" | "unconfirmed" | "server";
  readonly message?: string;
};

/** A line of mine on its way, or one that did not make it. */
export type PendingSend = {
  readonly key: string;
  readonly roomId: string;
  readonly text: string;
  readonly startedAt: number;
  readonly status: "sending" | "failed";
  readonly failure: SendFailure | null;
};

const pendingSends = createStore<ReadonlyMap<string, readonly PendingSend[]>>(new Map());

/* -------------------------------------------------------------- the socket */

let socket: ChatSocket | null = null;
let holders = 0;
let lingerTimer: ReturnType<typeof setTimeout> | null = null;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** This tab has been live before, so a connection now may have missed lines. */
let wasLive = false;
/** The signed-in member, to tell my lines and my read markers from theirs. */
let self: string | null = null;
let sequence = 0;

/** Rooms some screen wants live, with how many screens want each. */
const wanted = new Map<string, number>();
/** Rooms joined on the current connection. */
const joined = new Set<string>();
/** Sends waiting on their acknowledgement, by key. */
const inflightSends = new Map<string, string>();
/** Joins and read markers waiting on theirs. */
let inflightOther = 0;

function setStatus(status: ConnectionStatus): void {
  const current = connection.get();
  if (status === "connected" || status === "idle") {
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = null;
    connection.set({ status, noticeable: false });
    return;
  }
  if (status === "unauthorized") {
    connection.set({ status, noticeable: true });
    return;
  }
  if (current.status !== status) connection.set({ status, noticeable: current.noticeable });
  if (!current.noticeable && !noticeTimer) {
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      const now = connection.get();
      if (now.status !== "connected" && now.status !== "idle") {
        connection.set({ status: now.status, noticeable: true });
      }
    }, NOTICE_AFTER_MS);
  }
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (socket && !socket.connected && holders > 0) socket.connect();
  }, RETRY_MS);
}

function join(roomId: string): void {
  const live = socket;
  if (!live?.connected || joined.has(roomId)) return;
  joined.add(roomId);
  inflightOther += 1;
  live.timeout(ACK_TIMEOUT_MS).emit("chat:join", { chatRoomId: roomId }, (error) => {
    inflightOther -= 1;
    // Not joined after all; the next connection asks again.
    if (error) joined.delete(roomId);
  });
}

/** The newest page of each room again, merged in: what a dropped connection missed. */
async function catchUp(roomIds: readonly string[]): Promise<void> {
  const pages = await Promise.all(
    roomIds.map((roomId) => listChatMessages(roomId, { limit: 50 }).catch(() => null)),
  );
  addLiveMessages(pages.flatMap((page) => page?.items ?? []));
}

function onConnect(): void {
  joined.clear();
  setStatus("connected");
  for (const roomId of wanted.keys()) join(roomId);
  if (wasLive) void catchUp([...wanted.keys()]);
  wasLive = true;
}

function onDisconnect(reason: Socket.DisconnectReason): void {
  joined.clear();
  // Our own `disconnect()`, when the last screen let go.
  if (reason === "io client disconnect") return;
  setStatus("reconnecting");
  // The server closed it: Socket.IO leaves reconnecting to the client.
  if (reason === "io server disconnect") scheduleRetry();
}

function onConnectError(error: Error & { readonly data?: Partial<SocketError> }): void {
  const status = error.data?.statusCode;
  if (status === 401 || status === 403) {
    setStatus("unauthorized");
    return;
  }
  setStatus(wasLive ? "reconnecting" : "connecting");
  // A refused handshake is not retried by Socket.IO itself; a network error is.
  if (socket && !socket.active) scheduleRetry();
}

function onRead(read: ApiChatRead): void {
  if (self && read.memberUserId === self) noteRoomRead(read.chatRoomId, Date.parse(read.lastReadAt));
}

/**
 * The gateway names no event in its `exception`, so it can only be pinned on a
 * send when that send is the one thing waiting. Anything less certain is left to
 * the send's own deadline.
 */
function onException(error: SocketError): void {
  if (inflightSends.size !== 1 || inflightOther > 0) return;
  const [[key, roomId]] = inflightSends;
  inflightSends.delete(key);
  failSend(roomId, key, { kind: "server", message: error.message });
}

function acquire(): void {
  holders += 1;
  if (lingerTimer) clearTimeout(lingerTimer);
  lingerTimer = null;
  if (socket) {
    if (!socket.connected && !socket.active && connection.get().status !== "unauthorized") socket.connect();
    return;
  }
  const target = apiSocketTarget("chat");
  // No API in this build: the REST reads already say so on screen.
  if (!target) return;
  const created: ChatSocket = io(target.url, { path: target.path, withCredentials: true });
  created.on("connect", onConnect);
  created.on("disconnect", onDisconnect);
  created.on("connect_error", onConnectError);
  created.on("chat:message", (message) => addLiveMessages([message]));
  created.on("chat:read", onRead);
  created.on("exception", onException);
  socket = created;
  setStatus("connecting");
}

function release(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0 || lingerTimer) return;
  lingerTimer = setTimeout(() => {
    lingerTimer = null;
    if (holders > 0 || !socket) return;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    joined.clear();
    setStatus("idle");
  }, LINGER_MS);
}

/* ------------------------------------------------------------------- lines */

function updatePending(roomId: string, change: (list: readonly PendingSend[]) => readonly PendingSend[]): void {
  const current = pendingSends.get();
  const next = new Map(current);
  const list = change(current.get(roomId) ?? []);
  if (list.length === 0) next.delete(roomId);
  else next.set(roomId, list);
  pendingSends.set(next);
}

function failSend(roomId: string, key: string, failure: SendFailure): void {
  updatePending(roomId, (list) =>
    list.map((item) => (item.key === key ? { ...item, status: "failed", failure } : item)),
  );
}

/**
 * Lines of mine the server has stored settle the pending line they came from:
 * the oldest one with the same text, sent no earlier than the stored line could
 * have been. That covers the broadcast arriving a beat before the
 * acknowledgement, and a send that read as failed but did arrive (found again
 * when catching up), which retrying would otherwise post twice.
 */
function settleFromServer(messages: readonly ApiChatMessage[]): void {
  if (!self) return;
  for (const message of messages) {
    if (message.senderUserId !== self) continue;
    const at = Date.parse(message.createdAt);
    const match = (pendingSends.get().get(message.chatRoomId) ?? []).find(
      (item) => item.text === message.message && at >= item.startedAt - SAME_SEND_WINDOW_MS,
    );
    if (!match) continue;
    inflightSends.delete(match.key);
    updatePending(message.chatRoomId, (list) => list.filter((item) => item.key !== match.key));
  }
}

function addLiveMessages(messages: readonly ApiChatMessage[]): void {
  if (messages.length === 0) return;
  const next = new Map(liveMessages.get());
  let changed = false;
  for (const message of messages) {
    const list = next.get(message.chatRoomId) ?? [];
    if (list.some((known) => known.id === message.id)) continue;
    next.set(message.chatRoomId, [...list, message]);
    changed = true;
  }
  if (changed) liveMessages.set(next);
  settleFromServer(messages);
}

function emitSend(entry: PendingSend): void {
  const live = socket;
  // Nothing to send on, or a connection the server refused and is not retrying.
  if (!live || (!live.connected && !live.active)) {
    failSend(entry.roomId, entry.key, { kind: "offline" });
    return;
  }
  // While reconnecting, Socket.IO holds the line and sends it on reconnect; the
  // deadline drops it from that queue, so a line that read as failed never goes later.
  inflightSends.set(entry.key, entry.roomId);
  live
    .timeout(SEND_TIMEOUT_MS)
    .emit("chat:send", { chatRoomId: entry.roomId, message: entry.text }, (error, message) => {
      if (!inflightSends.delete(entry.key)) return;
      if (error) {
        failSend(entry.roomId, entry.key, { kind: "unconfirmed" });
        return;
      }
      addLiveMessages([message]);
      updatePending(entry.roomId, (list) => list.filter((item) => item.key !== entry.key));
    });
}

/** Send a line: it shows at once as sending, then as sent or as not sent. */
export function sendChatMessage(roomId: string, text: string): void {
  const message = text.trim();
  if (!message) return;
  sequence += 1;
  const entry: PendingSend = {
    key: `send-${sequence}`,
    roomId,
    text: message,
    startedAt: Date.now(),
    status: "sending",
    failure: null,
  };
  updatePending(roomId, (list) => [...list, entry]);
  emitSend(entry);
}

/** Try a line that did not go once more, in its place. */
export function retryChatMessage(roomId: string, key: string): void {
  const entry = pendingSends.get().get(roomId)?.find((item) => item.key === key);
  if (entry?.status !== "failed") return;
  const again: PendingSend = { ...entry, status: "sending", failure: null, startedAt: Date.now() };
  updatePending(roomId, (list) => list.map((item) => (item.key === key ? again : item)));
  emitSend(again);
}

/** Let a line that did not go, go. */
export function dismissChatMessage(roomId: string, key: string): void {
  updatePending(roomId, (list) => list.filter((item) => item.key !== key));
}

/* ------------------------------------------------------------------- reads */

/** This room is read through `at`, whatever the cached inbox still says. */
export function noteRoomRead(roomId: string, at: number): void {
  if (Number.isNaN(at)) return;
  const current = readMarks.get();
  if ((current.get(roomId) ?? Number.NEGATIVE_INFINITY) >= at) return;
  readMarks.set(new Map(current).set(roomId, at));
}

/**
 * Move my read marker to `messageId`: over the socket when it is up, so my
 * other tabs hear it too, and over REST (`PATCH .../read`) when it is not.
 */
export async function markRoomRead(roomId: string, messageId: string): Promise<void> {
  const live = socket;
  let read: ApiChatRead;
  if (live?.connected) {
    inflightOther += 1;
    try {
      read = await live
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck("chat:read", { chatRoomId: roomId, messageId });
    } finally {
      inflightOther -= 1;
    }
  } else {
    read = await markChatRead(roomId, messageId);
  }
  noteRoomRead(roomId, Date.parse(read.lastReadAt));
}

/* ------------------------------------------------------------------- hooks */

/**
 * Hold the connection for as long as the calling screen is mounted. `selfId` is
 * the signed-in member, once `GET /users/me` has said who that is.
 */
export function useChatConnection(selfId: string | undefined): void {
  useEffect(() => {
    if (selfId) self = selfId;
  }, [selfId]);
  useEffect(() => {
    acquire();
    return release;
  }, []);
}

/** Keep these rooms joined while the caller is mounted, across reconnects. */
export function useRoomSubscriptions(roomIds: readonly string[]): void {
  const key = [...new Set(roomIds)].sort((a, b) => a.localeCompare(b)).join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    for (const id of ids) {
      wanted.set(id, (wanted.get(id) ?? 0) + 1);
      join(id);
    }
    return () => {
      for (const id of ids) {
        const left = (wanted.get(id) ?? 1) - 1;
        if (left > 0) wanted.set(id, left);
        else wanted.delete(id);
      }
    };
  }, [key]);
}

export function useConnection(): Connection {
  return useSyncExternalStore(connection.subscribe, connection.get, () => IDLE);
}

const NO_LIVE: ReadonlyMap<string, readonly ApiChatMessage[]> = new Map();
const NO_LINES: readonly ApiChatMessage[] = [];

/** Every room's live lines, for the list. */
export function useLiveMessages(): ReadonlyMap<string, readonly ApiChatMessage[]> {
  return useSyncExternalStore(liveMessages.subscribe, liveMessages.get, () => NO_LIVE);
}

/** One room's live lines, for its thread. */
export function useRoomLiveMessages(roomId: string): readonly ApiChatMessage[] {
  return useLiveMessages().get(roomId) ?? NO_LINES;
}

const NO_READS: ReadonlyMap<string, number> = new Map();

export function useReadMarks(): ReadonlyMap<string, number> {
  return useSyncExternalStore(readMarks.subscribe, readMarks.get, () => NO_READS);
}

const NO_PENDING_ROOMS: ReadonlyMap<string, readonly PendingSend[]> = new Map();
const NO_PENDING: readonly PendingSend[] = [];

export function usePendingSends(roomId: string): readonly PendingSend[] {
  const all = useSyncExternalStore(pendingSends.subscribe, pendingSends.get, () => NO_PENDING_ROOMS);
  return all.get(roomId) ?? NO_PENDING;
}

function subscribeVisibility(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/** Whether the page is in front of the reader, for marking a room read. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
}
