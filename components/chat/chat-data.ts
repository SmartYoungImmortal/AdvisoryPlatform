/**
 * The chat half of the API.
 *
 * ## Sending a message is not a REST route
 *
 * `ChatController` (`src/modules/chat/chat.controller.ts`) maps exactly three
 * routes — `GET /chat/rooms`, `GET /chat/rooms/:id/messages` and
 * `PATCH /chat/rooms/:id/read` — and `ChatFilesController` maps four more under
 * `/chat/rooms/:id/files`. **There is no `POST` for a message.** Sending lives on
 * `ChatGateway`, a Socket.IO gateway on the `/chat` namespace, as the
 * `chat:send` event with a `{ chatRoomId, message }` payload and an ack carrying
 * the created `ChatMessageResponseDto`. It broadcasts `chat:message` to the room.
 * That half is `./chat-live`; this file is the REST half.
 *
 * A file is not a message. `POST /chat/rooms/:id/files` writes a `chat_files`
 * row and nothing in `chat_messages`, so an attachment shows up in this room's
 * file list and never in its message list. Both are read below, and the thread
 * interleaves them by `createdAt`.
 *
 * ## Where this belongs
 *
 * `lib/api/resources.ts` and `lib/api/types.ts`, beside everything else. It is
 * here because those two files were being appended to elsewhere at the time;
 * every export is written to be moved verbatim.
 */

import { api, type CursorPage, type Paginated } from "@/lib/api/client";

/* -------------------------------------------------------------------- shapes */

/**
 * `ChatRoomCounterpartDto` — the other member of a room: the public display name
 * and better-auth's `image`, a portrait URL that is already public (never a
 * storage key).
 */
export interface ApiChatRoomCounterpart {
  readonly id: string;
  readonly displayName: string;
  readonly image: string | null;
}

/**
 * `ChatRoomResponseDto` — chat/dtos/chat-room-response.dto.ts
 *
 * `counterpart` names who the room is with. It is `null` for an anonymous room,
 * and absent from an API older than the field, so a screen still falls back to
 * working the person out (`resolveCounterpart`). `lastMessage` is the room's
 * newest line, which an older API left to the room's first page of messages.
 */
export interface ApiChatRoom {
  readonly id: string;
  readonly isAnonymous: boolean;
  readonly lastReadAt: string | null;
  readonly unreadCount: number;
  readonly createdAt: string;
  readonly counterpart?: ApiChatRoomCounterpart | null;
  /**
   * The room's newest message (null in an empty room), so the inbox needs no
   * per-room read; absent from an API older than the field.
   */
  readonly lastMessage?: ApiChatMessage | null;
}

/**
 * `ChatMessageResponseDto` — chat/dtos/chat-message-response.dto.ts
 *
 * `senderUserId` is an id, not a name. Telling "mine" from "theirs" means
 * comparing it against `GET /users/me`'s `id`; there is nothing else to compare.
 */
export interface ApiChatMessage {
  readonly id: string;
  readonly chatRoomId: string;
  readonly senderUserId: string;
  readonly message: string;
  readonly createdAt: string;
}

/** `ChatReadResponseDto` — what `PATCH /chat/rooms/:id/read` answers with. */
export interface ApiChatRead {
  readonly chatRoomId: string;
  readonly memberUserId: string;
  readonly messageId: string;
  readonly lastReadAt: string;
}

/**
 * `ChatFileResponseDto` — chat/dtos/chat-file-response.dto.ts
 *
 * `objectKey` is deliberately absent from the DTO: a download is a fresh
 * presigned URL from `getChatFileUrl`, never a stored link.
 */
export interface ApiChatFile {
  readonly id: string;
  readonly chatRoomId: string;
  readonly senderUserId: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly fileSizeBytes: number;
  readonly expiryDate: string | null;
  readonly createdAt: string;
}

/** A presigned download URL. It expires, so it is fetched at the click. */
export interface ApiChatFileUrl {
  readonly url: string;
  readonly expiresInSeconds: number;
}

/* ----------------------------------------------------------------- constants */

/** `CHAT_MESSAGE_MAX_LENGTH` — chat/chat.constants.ts. The API rejects more. */
export const CHAT_MESSAGE_MAX_LENGTH = 4_000;

/** `MAX_CHAT_FILE_BYTES` — chat/chat-files.constants.ts, and a CHECK in Postgres. */
export const MAX_CHAT_FILE_BYTES = 50 * 1024 * 1024;

/**
 * `CHAT_FILE_EXTENSIONS` — the accepted upload types, as an `accept` attribute.
 * Executables and scripts are absent from the API's list on purpose.
 */
export const CHAT_FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
].join(",");

/** Images the thread can render inline; everything else shows as a file row. */
export const CHAT_IMAGE_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Every id the API takes here is a v4 UUID, and `ParseUUIDPipe` answers a
 * non-UUID with a 400 before the handler runs. Checked before the request so a
 * prototype thread id (`/chat/sarah-jenskins`) is named as such instead of being
 * reported as a chat-room failure.
 */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isChatRoomId(value: string): boolean {
  return UUID.test(value);
}

/* -------------------------------------------------------------------- routes */

/**
 * Where a room lives.
 *
 * A static export prerenders only the ids `generateStaticParams` names, and a
 * room's uuid is not knowable at build time — `/chat/<uuid>` is a 404 in the
 * export and a "missing param" error under `next dev`. So the uuid rides as
 * `?id=` on the prerendered `/chat/room`, as a service's does on its slug
 * (`liveServiceHref`). The day the app stops being a static export these
 * become the plain paths they want to be, in this one place.
 */
export const CHAT_ROOM_SLUG = "room";

export function chatHref(roomId: string): string {
  return `/chat/${CHAT_ROOM_SLUG}?id=${roomId}`;
}

export function chatFailedHref(roomId: string): string {
  return `/chat/${CHAT_ROOM_SLUG}/message-failed?id=${roomId}`;
}

export function chatReportHref(roomId: string): string {
  return `/chat/${CHAT_ROOM_SLUG}/report?id=${roomId}`;
}

export function chatReportSentHref(roomId: string, reportId?: string): string {
  const report = reportId ? `&report=${reportId}` : "";
  return `/chat/${CHAT_ROOM_SLUG}/report/submitted?id=${roomId}${report}`;
}

/**
 * The newest conversation with one person, for a "message this advisor"
 * button that knows the advisor and not the room. The thread screen finds the
 * room (see `resolveCounterpart`) or says there is none yet.
 */
export function chatWithHref(userId: string): string {
  return `/chat/${CHAT_ROOM_SLUG}?with=${userId}`;
}

/* ------------------------------------------------------------------- reports */

/** `user_report_status` — what has become of a report. */
export type ApiReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";

/** `OwnReportResponseDto` — safety/dtos/own-report-response.dto.ts */
export interface ApiOwnReport {
  readonly id: string;
  readonly reportedUserId: string;
  readonly reportedDisplayName: string;
  readonly chatRoomId: string | null;
  readonly reason: string;
  readonly status: ApiReportStatus;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

/** `CreateReportDto` caps `reason` at 2000 characters, after trimming. */
export const REPORT_REASON_MAX_LENGTH = 2_000;

/**
 * `POST /reports` — file a report. A write, gated on `report:submitSelf`.
 *
 * The reporter is the session, never the body; the API refuses a body with any
 * field beyond these three (`forbidNonWhitelisted`), a report against yourself,
 * and a `chatRoomId` you are not a member of. Sending the room is what lets the
 * console's case view read the whole conversation, so the report carries it.
 */
export function submitReport(
  input: {
    readonly reportedUserId: string;
    readonly chatRoomId?: string;
    readonly reason: string;
  },
  signal?: AbortSignal,
): Promise<ApiOwnReport> {
  return api.post("reports", { body: input, signal });
}

/** `GET /reports/me` — the reports this account has filed, newest first. */
export function listMyReports(
  query: { readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiOwnReport>> {
  return api.get("reports/me", { query: { ...query }, signal });
}

/* ----------------------------------------------------------------- resources */

/** `GET /chat/rooms` — offset-paginated, newest room first. Requires a session. */
export function listChatRooms(
  query: { readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiChatRoom>> {
  return api.get("chat/rooms", { query: { ...query }, signal });
}

/**
 * `GET /chat/rooms/:chatRoomId/messages` — keyset-paginated, **newest first**
 * (`orderBy(desc(createdAt), desc(id))` in the repository). A thread reads oldest
 * at the top, so the caller reverses; doing it here would hide which end a
 * `nextCursor` continues from.
 */
export function listChatMessages(
  chatRoomId: string,
  query: { readonly cursor?: string; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<CursorPage<ApiChatMessage>> {
  return api.get(`chat/rooms/${chatRoomId}/messages`, {
    query: { ...query },
    signal,
  });
}

/**
 * `PATCH /chat/rooms/:chatRoomId/read` — moves this member's read marker to
 * `messageId`, which is what clears `unreadCount` on the inbox row.
 *
 * A write. The message must be in this room or the API answers 404.
 */
export function markChatRead(
  chatRoomId: string,
  messageId: string,
  signal?: AbortSignal,
): Promise<ApiChatRead> {
  return api.patch(`chat/rooms/${chatRoomId}/read`, {
    body: { messageId },
    signal,
  });
}

/** `GET /chat/rooms/:chatRoomId/files` — keyset-paginated, newest first. */
export function listChatFiles(
  chatRoomId: string,
  query: { readonly cursor?: string; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<CursorPage<ApiChatFile>> {
  return api.get(`chat/rooms/${chatRoomId}/files`, { query: { ...query }, signal });
}

/** `POST /chat/rooms/:chatRoomId/files` — multipart, field name `file`. A write. */
export function uploadChatFile(
  chatRoomId: string,
  file: File,
  signal?: AbortSignal,
): Promise<ApiChatFile> {
  const body = new FormData();
  body.append("file", file);
  return api.post(`chat/rooms/${chatRoomId}/files`, { body, signal });
}

/** `GET /chat/rooms/:chatRoomId/files/:fileId` — a fresh presigned URL. */
export function getChatFileUrl(
  chatRoomId: string,
  fileId: string,
  signal?: AbortSignal,
): Promise<ApiChatFileUrl> {
  return api.get(`chat/rooms/${chatRoomId}/files/${fileId}`, { signal });
}
