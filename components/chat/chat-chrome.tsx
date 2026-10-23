"use client";

import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, Info, Plus, SendHorizontal, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMark } from "@/components/chat/chat-avatar";
import {
  CHAT_FILE_ACCEPT,
  CHAT_IMAGE_TYPES,
  CHAT_MESSAGE_MAX_LENGTH,
  pendingCopy,
  uploadChatFile,
} from "@/components/chat/chat-data";

/**
 * The desktop two-pane card the three thread screens share — Figma's desktop
 * chat (1952:8003) stands the inbox and the open thread side by side in one
 * card.
 *
 * It is `Surface`'s raised tier written as `lg:` variants rather than the
 * component: below `lg` there is no card at all, because the thread *is* the
 * screen — full-bleed, `h-dvh`, its own scroll.
 */
export const CHAT_PANE =
  "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:overflow-clip lg:rounded-card lg:border lg:border-border lg:bg-card lg:shadow-card";

/**
 * Figma "Chat Header" — 402 x 84: 24px top padding, a 40px back chevron, a 40px
 * avatar, the 24/24 Geist semibold name (-0.625 tracking) and 24px action glyphs,
 * closed by a hairline 20px below the row.
 *
 * `title` is what the API can actually name this conversation with. That is not
 * a person: `ChatRoomResponseDto` carries no member, and `ChatMessageResponseDto`
 * carries a `senderUserId` and no display name, so nothing in the chat surface
 * knows who is on the other side. The header says "a conversation" and the
 * portrait is a glyph, rather than putting a fixture's face and name over data
 * that has never heard of either.
 *
 * The video control has no endpoint behind it — there is no call module in the
 * API — so it is disabled rather than left looking live.
 */
export function ChatHeader({
  threadId,
  title,
}: {
  /** Addresses this thread's report screen, and nothing else. */
  readonly threadId: string;
  /** Left off, the header falls back to the same generic label the inbox uses. */
  readonly title?: string;
}) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  const heading = title ?? pendingCopy(t, "roomLabel", "การสนทนา");

  // Figma draws the closing rule as a zero-height stroke, so it is painted with
  // ::after and the 20px trailing space is padding instead of a gap.
  return (
    <div className="relative flex w-full shrink-0 flex-col items-start bg-card pt-6 pb-5 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-border after:content-[''] lg:py-4">
      <div className="flex w-full shrink-0 items-center gap-4 px-4 lg:gap-3 lg:px-5">
        {/* The desktop pane has the inbox beside it, so there is nothing for a
            back chevron to do there. */}
        <Button
          aria-label={c("back")}
          className="size-10 shrink-0 lg:hidden"
          nativeButton={false}
          render={<Link href="/chat" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-10" />
        </Button>
        <div className="flex min-w-px flex-1 items-center gap-2.5 self-stretch">
          {/* No presence dot either: nothing in the API reports whether a member
              is online. */}
          <ChatMark size={40} />
          <p className="min-w-px flex-1 truncate text-2xl leading-6 font-semibold tracking-[-0.625px] text-foreground">
            {heading}
          </p>
        </div>
        <Button
          aria-label={t("videoCall")}
          className="size-6 shrink-0"
          disabled
          size="icon"
          variant="ghost"
        >
          <Video className="size-6" />
        </Button>
        {/* The one way into the report flow. `nativeButton={false}` is what tells
            Base UI it ended up on an anchor; without it `check-a11y-render.mjs`
            fails the build. */}
        <Button
          aria-label={t("info")}
          className="size-6 shrink-0"
          nativeButton={false}
          render={<Link href={`/chat/${threadId}/report`} />}
          size="icon"
          variant="ghost"
        >
          <Info className="size-6" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Figma "Chat Footer" — 402 x 76: a hairline, then a 16px gap above the compose
 * row (8px side padding, 24px attach glyphs, the 36px input and a 36px send
 * button).
 *
 * ## What this row can and cannot do, and why it says so
 *
 * It arrived with no `onSubmit`, no `onClick`, no `onChange` and no state: a
 * picture of a compose row. Two of the three things it draws are now real.
 *
 * **Text cannot be sent.** `ChatController` maps `GET /chat/rooms`,
 * `GET /chat/rooms/:id/messages` and `PATCH /chat/rooms/:id/read`. There is no
 * `POST` for a message anywhere in the API. Sending is a Socket.IO event —
 * `chat:send` on the `/chat` namespace, handled by `ChatGateway` — which needs
 * `socket.io-client` in `package.json`, and that is not a dependency this screen
 * may add on its own. So the send button is **disabled**, and a line under the
 * row states the reason and points at the gap.
 *
 * Disabled rather than clickable-then-apologetic on purpose: a button that
 * accepts a paragraph and then throws it away is worse than one that never
 * pretended. The draft is still real local state, so what is typed survives a
 * re-render and is there the moment a send exists.
 *
 * **A file can be sent.** `POST /chat/rooms/:id/files` is a real REST route, and
 * both attach glyphs go through it. A file is *not* a message though — the API
 * writes a `chat_files` row and nothing in `chat_messages` — so an upload appears
 * in this room's file list rather than as a bubble the thread already had.
 * `onUploaded` is how the thread hears about it and reads the list again.
 */
export function ChatFooter({
  roomId,
  onUploaded,
}: {
  /**
   * The room to attach to. Undefined when this thread is not a room the API
   * knows — a prototype id, or a read that failed — and then the whole row is
   * inert, because there is nowhere to put a file either.
   */
  readonly roomId?: string;
  readonly onUploaded?: () => void;
}) {
  const t = useTranslations("chat");
  const noteId = useId();
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const anyFile = useRef<HTMLInputElement>(null);
  const imageFile = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file || !roomId) return;
    setUploadError(null);
    setUploading(true);
    try {
      await uploadChatFile(roomId, file);
      onUploaded?.();
    } catch (cause) {
      // The API's own sentence — "That file type is not accepted in chat", "A
      // chat file must not exceed 50 MB", "File storage is currently
      // unavailable" — each of which the reader needs told apart.
      setUploadError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  }

  /** The hidden control behind an attach glyph. `Input` carries the primitive's states. */
  function picker(ref: React.RefObject<HTMLInputElement | null>, accept: string) {
    return (
      <Input
        accept={accept}
        aria-hidden
        className="sr-only"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={ref}
        tabIndex={-1}
        type="file"
      />
    );
  }

  return (
    // Card surface, like the header: the compose row is the other end of the
    // thread's chrome, and the messages scroll on the page ground between them.
    <div className="relative flex w-full shrink-0 flex-col items-start bg-card pt-4 pb-6 before:absolute before:top-0 before:left-0 before:h-px before:w-full before:bg-border before:content-['']">
      {picker(anyFile, CHAT_FILE_ACCEPT)}
      {picker(imageFile, CHAT_IMAGE_TYPES.join(","))}

      <form
        className="flex w-full shrink-0 items-center gap-2 px-2"
        onSubmit={(event) => {
          // Nothing to submit to. Stopping the default keeps Enter in the field
          // from navigating away and silently losing the draft.
          event.preventDefault();
        }}
      >
        {/* Figma draws these as bare 24px glyphs; as real buttons they keep that
            box but gain the focus ring, hover and press states. */}
        <Button
          aria-label={t("attach")}
          className="size-6 shrink-0"
          disabled={!roomId || uploading}
          onClick={() => anyFile.current?.click()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Plus className="size-6" />
        </Button>
        <Button
          aria-label={t("attachImage")}
          className="size-6 shrink-0"
          disabled={!roomId || uploading}
          onClick={() => imageFile.current?.click()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ImageIcon className="size-6" />
        </Button>
        <Input
          aria-describedby={noteId}
          aria-label={t("title")}
          className="min-w-px flex-1 rounded-card border-border bg-muted px-3.5 text-sm shadow-none"
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("messagePlaceholder")}
          type="text"
          value={draft}
        />
        {/* Disabled unconditionally, and not because the field is empty: there is
            no route to send a message on. The well step rather than the hairline
            colour, which was a border token doing duty as a fill. */}
        <Button
          aria-describedby={noteId}
          aria-label={t("send")}
          className="size-9 shrink-0 border-0 bg-muted text-muted-foreground hover:bg-accented"
          disabled
          size="icon"
          type="submit"
        >
          <SendHorizontal className="size-5" />
        </Button>
      </form>

      {/* The one honest thing this row can say. It is always true, so it is
          always shown rather than waiting for a click to admit it. */}
      <p
        className="w-full px-4 pt-2 text-xs font-normal text-muted-foreground"
        id={noteId}
      >
        {pendingCopy(
          t,
          "sendUnavailable",
          "ตอนนี้ยังส่งข้อความตัวอักษรไม่ได้ ฝั่ง API รับข้อความผ่าน Socket.IO เท่านั้น ยังไม่มีเส้นทาง REST — แนบไฟล์ได้ตามปกติ",
        )}
      </p>
      {uploadError ? (
        <p className="w-full px-4 pt-1 text-xs font-normal text-destructive" role="alert">
          {`${pendingCopy(t, "attachFailed", "แนบไฟล์ไม่สำเร็จ")} — ${uploadError}`}
        </p>
      ) : null}
    </div>
  );
}
