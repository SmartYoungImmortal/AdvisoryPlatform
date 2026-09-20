/**
 * The chat half of the API, and the one thing it cannot do.
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
 *
 * Reaching that needs `socket.io-client` in `package.json`, which is a dependency
 * decision this file is not allowed to make on its own — so the compose row reads
 * and attaches but cannot send text. See `ChatFooter` in `./chat-chrome`, which
 * states that in the UI rather than pretending otherwise.
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

import { api, type Paginated } from "@/lib/api/client";

/* -------------------------------------------------------------------- shapes */

/**
 * A page of results, exactly as the API's `CursorPaginatedResult<T>` is shaped —
 * `common/pagination/cursor-pagination.dto.ts`. Distinct from `Paginated<T>`:
 * messages and files are keyset-paginated on `(createdAt, id)` and have no total.
 */
export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly limit: number;
  /** Opaque; pass back as `cursor` for the next page. Null at the end. */
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/**
 * `ChatRoomResponseDto` — chat/dtos/chat-room-response.dto.ts
 *
 * Note what a room does **not** carry: no participant, no display name, no
 * avatar, no last message. A room is created by a booking, so the other member
 * is knowable in principle, but no route exposes them — which is why the inbox
 * row names a conversation by when it started rather than by who is in it.
 */
export interface ApiChatRoom {
  readonly id: string;
  readonly isAnonymous: boolean;
  readonly lastReadAt: string | null;
  readonly unreadCount: number;
  readonly createdAt: string;
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

/* ---------------------------------------------------------------------- copy */

/**
 * The shape of a `useTranslations` result that this file needs.
 *
 * `has` and `raw` are written in method shorthand, not as function properties,
 * deliberately. `globals.ts` augments next-intl's `AppConfig` with the message
 * catalogue, so the real `t.has` is typed to the keys that catalogue *has* — and
 * under `strictFunctionTypes` a property-style `(key: string) => boolean` would
 * refuse it. Method-shorthand parameters are checked bivariantly, which is
 * exactly the looseness needed to ask about a key that does not exist yet.
 */
type Translator = {
  has(key: string): boolean;
  raw(key: string): unknown;
};

/**
 * A string that belongs in `messages/th.json` and is not there yet.
 *
 * Connecting these screens turned up states the frames never drew — a list that
 * failed to load, a room with no messages, a send button that cannot send — and
 * `messages/th.json` was owned elsewhere while this was written. Rather than
 * render `chat.loadFailedTitle` at the reader, each of those reads the catalogue
 * through `has`/`raw` and falls back to the Thai copy written here.
 *
 * Adding the key to `messages/th.json` is all it takes: the key wins the moment
 * it exists, with no edit here. Every key this app is waiting on is listed in
 * `PENDING_CHAT_COPY` below so none of them gets lost.
 */
export function pendingCopy(t: Translator, key: string, fallback: string): string {
  return t.has(key) ? String(t.raw(key)) : fallback;
}

/**
 * Every `chat.*` key the screens ask for and `messages/th.json` does not have,
 * with the copy they fall back to. Exported so it reads as a checklist rather
 * than as strings scattered through three files.
 */
export const PENDING_CHAT_COPY = {
  loadFailedTitle: "โหลดรายการแชทไม่สำเร็จ",
  retry: "ลองอีกครั้ง",
  roomLabel: "การสนทนา",
  anonymous: "ไม่เปิดเผยชื่อ",
  threadEmptyTitle: "ยังไม่มีข้อความ",
  threadEmptyBody: "ห้องแชทนี้เปิดแล้ว แต่ยังไม่มีใครส่งข้อความ",
  threadLoadFailedTitle: "โหลดข้อความไม่สำเร็จ",
  sendUnavailable:
    "ตอนนี้ยังส่งข้อความตัวอักษรไม่ได้ ฝั่ง API รับข้อความผ่าน Socket.IO เท่านั้น ยังไม่มีเส้นทาง REST — แนบไฟล์ได้ตามปกติ",
  attachFailed: "แนบไฟล์ไม่สำเร็จ",
  fileDownload: "เปิดไฟล์",
} as const;

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
