import { z } from "zod";

import { Id, IsoDateTime } from "./common";

/**
 * A row in the chat inbox — `components/chat/chat-inbox-screen.tsx` renders
 * `partnerName` (Latin face, 16/24) over `preview` (Thai face, 12/18).
 */
export const ChatThread = z.object({
  id: Id,
  partnerId: Id,
  partnerName: z.string(),
  partnerImageUrl: z.url().nullable(),
  /** Last message, already truncated by the backend to one line's worth. */
  preview: z.string(),
  lastAt: IsoDateTime,
  unreadCount: z.int(),
});

/**
 * Message bodies are a discriminated union because the thread renders three
 * genuinely different layouts — see `components/chat/messages.tsx`
 * (`PartnerText`/`MyText`, `FileBody`, `ImageBody`).
 */
export const ChatMessageBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({
    kind: z.literal("file"),
    fileName: z.string(),
    /** Bytes. The UI formats this, so do not send "2.4 MB". */
    sizeBytes: z.int(),
    url: z.url(),
  }),
  z.object({
    kind: z.literal("image"),
    url: z.url(),
    width: z.int(),
    height: z.int(),
  }),
]);

/**
 * `status` drives the failed-message affordance (Figma "Chat - Message failed").
 * The backend only ever returns "sent"; "sending" and "failed" are client-side
 * states the optimistic UI assigns while a send is in flight.
 */
export const ChatMessage = z.object({
  id: Id,
  threadId: Id,
  /** True when the signed-in user wrote it — decides which side it renders on. */
  mine: z.boolean(),
  body: ChatMessageBody,
  sentAt: IsoDateTime,
  status: z.enum(["sending", "sent", "failed"]),
});

export const SendMessageInput = z.object({
  threadId: Id,
  text: z.string().min(1).max(4000),
  /**
   * Client-generated. Lets a retry be recognised as the same message instead of
   * posting twice — the failed-message screen exists precisely because retries
   * happen.
   */
  clientToken: z.string().min(1),
});

export type ChatThread = z.infer<typeof ChatThread>;
export type ChatMessageBody = z.infer<typeof ChatMessageBody>;
export type ChatMessage = z.infer<typeof ChatMessage>;
export type SendMessageInput = z.infer<typeof SendMessageInput>;
