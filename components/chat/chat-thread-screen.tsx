"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";

import { CHAT_PANE, ChatFooter, ChatHeader } from "@/components/chat/chat-chrome";
import {
  isChatRoomId,
  listChatFiles,
  listChatMessages,
  markChatRead,
  pendingCopy,
  type ApiChatFile,
  type ApiChatMessage,
  type CursorPage,
} from "@/components/chat/chat-data";
import { ChatList } from "@/components/chat/chat-inbox-screen";
import {
  DayDivider,
  FileBody,
  MyMessage,
  MyText,
  PartnerMessage,
  PartnerText,
} from "@/components/chat/messages";
import { NeutralButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { surfaceClass } from "@/components/mobile/surface";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

/**
 * Figma "Chat" (995:8152), read from the API.
 *
 * ## What it reads
 *
 * Three requests, and each is needed for a different reason.
 *
 * `GET /chat/rooms/:id/messages` is the thread. It is keyset-paginated **newest
 * first**, so the page is reversed here to read downwards.
 *
 * `GET /users/me` is the only way to tell my bubble from theirs.
 * `ChatMessageResponseDto` carries a `senderUserId` and nothing else about the
 * author — no name, no avatar — so "mine" is `senderUserId === me.id` and there
 * is no third possibility to render.
 *
 * `GET /chat/rooms/:id/files` is the attachments. A file is a separate resource
 * from a message: `POST .../files` writes a `chat_files` row and never touches
 * `chat_messages`, so an attachment would be invisible in this thread if it were
 * not read separately and interleaved by `createdAt`.
 *
 * ## What it cannot show
 *
 * No names, so the header says "a conversation" and the partner's bubble takes a
 * glyph rather than a fixture's portrait. No image bubbles either: an image
 * attachment's bytes are behind a presigned URL that has to be fetched per file
 * and expires in five minutes, so every attachment is a file row with a size and
 * an expiry — which is true of a PNG as much as of a PDF.
 *
 * ## A thread id that is not a room
 *
 * `/chat/sarah-jenskins` and the other two ids in `lib/chat/threads.ts` predate
 * the API and are not UUIDs. `ParseUUIDPipe` would answer them with a 400, so
 * they are caught before the request and the screen says the room does not
 * exist — rather than firing a call it knows will fail and reporting the
 * validator's sentence as a chat failure.
 *
 * `generateStaticParams` still emits only those three ids. Under `next dev` any
 * id renders, so a real room UUID works; in the exported build (`output:
 * "export"`) `/chat/<uuid>` has no emitted HTML and 404s. Nothing breaks today —
 * the seed has zero rooms, so the inbox links nowhere — but `lib/chat/threads.ts`
 * has to stop being the source of that list before real rooms are reachable in a
 * deploy.
 */

/** A message or a file, on one timeline. */
type Entry =
  | { readonly kind: "message"; readonly at: number; readonly message: ApiChatMessage }
  | { readonly kind: "file"; readonly at: number; readonly file: ApiChatFile };

/** Figma's stamp is `23.53` — a dot, not a colon, and 24-hour. */
function clock(iso: string): string {
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(at.getHours())}.${pad(at.getMinutes())}`;
}

/** The local calendar day, so two messages either side of midnight split. */
function dayKey(iso: string): string {
  const at = new Date(iso);
  return `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
}

/** `kB`/`MB` with no decimals — a file size is a magnitude, not a measurement. */
function bytes(size: number): string {
  if (size >= 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} kB`;
  return `${size} B`;
}

function shortDateTime(iso: string): string {
  return `${new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  })} ${clock(iso)}`;
}

export function ChatThreadScreen({
  threadId,
  state = "default",
}: {
  /** The room id from the route. A UUID for a real room. */
  readonly threadId: string;
  /** Kept for `/chat/[id]/message-failed`, which is a frame and not a state the API has. */
  readonly state?: "default" | "message-failed";
}) {
  const t = useTranslations("chat");
  const isRoom = isChatRoomId(threadId);

  // A hook cannot be skipped, so an id that is not a room reads a key of its own
  // whose fetcher rejects with the reason. That settles the cache entry instead
  // of leaving a request nothing will ever resolve, and the notice below picks
  // the wording — this message is the fallback if it ever surfaces raw.
  const absent = useCallback(
    () => Promise.reject(new Error(`${threadId} is not a chat room id`)),
    [threadId],
  );
  const messagesFetcher = useCallback(
    (signal: AbortSignal) => listChatMessages(threadId, { limit: 50 }, signal),
    [threadId],
  );
  const filesFetcher = useCallback(
    (signal: AbortSignal) => listChatFiles(threadId, { limit: 50 }, signal),
    [threadId],
  );

  const messages = useResource<CursorPage<ApiChatMessage>>(
    isRoom ? `chat/rooms/${threadId}/messages?limit=50` : `chat/absent/${threadId}/messages`,
    isRoom ? messagesFetcher : absent,
  );
  const files = useResource<CursorPage<ApiChatFile>>(
    isRoom ? `chat/rooms/${threadId}/files?limit=50` : `chat/absent/${threadId}/files`,
    isRoom ? filesFetcher : absent,
  );
  const me = useResource<ApiOwnProfile>("users/me", getOwnProfile);

  const reloadFiles = useCallback(() => {
    invalidate(`chat/rooms/${threadId}/files`);
    files.reload();
  }, [files, threadId]);

  /**
   * Move this member's read marker to the newest message.
   *
   * A write — `PATCH /chat/rooms/:id/read` — and the only thing that clears
   * `unreadCount` on the inbox row, so reading a thread has to perform it. Fired
   * once per (room, newest message): the ref is what stops the inbox
   * invalidation below from re-triggering it in a loop.
   */
  const marked = useRef<string | null>(null);
  const newest = messages.data?.items[0];
  useEffect(() => {
    if (!isRoom || !newest) return;
    const stamp = `${threadId}:${newest.id}`;
    if (marked.current === stamp) return;
    marked.current = stamp;
    markChatRead(threadId, newest.id)
      .then(() => {
        // The inbox's unread count is now stale wherever it is mounted.
        invalidate("chat/rooms?");
      })
      .catch(() => {
        // Failing to mark read is not worth a banner: the thread is on screen
        // and readable, and the next mount tries again.
        marked.current = null;
      });
  }, [isRoom, newest, threadId]);

  // Oldest first, messages and files on one timeline. `slice()` because the
  // resource's array is the cache's own.
  const entries: Entry[] = [
    ...(messages.data?.items ?? []).map(
      (message): Entry => ({
        kind: "message",
        at: Date.parse(message.createdAt),
        message,
      }),
    ),
    ...(files.data?.items ?? []).map(
      (file): Entry => ({ kind: "file", at: Date.parse(file.createdAt), file }),
    ),
  ].sort((a, b) => a.at - b.at);

  let body: React.ReactNode;
  if (!isRoom) {
    body = (
      <ThreadNotice
        body={`${threadId} — ${pendingCopy(t, "notARoomBody", "ไอดีนี้เป็นของต้นแบบก่อนต่อ API ไม่ใช่ห้องแชทจริง")}`}
        title={pendingCopy(t, "notARoomTitle", "ไม่พบห้องแชทนี้")}
      />
    );
  } else if (messages.loading || me.loading) {
    body = <ThreadSkeleton />;
  } else if (messages.error) {
    body = (
      <ThreadNotice
        body={messages.error.message}
        onRetry={messages.reload}
        retryLabel={pendingCopy(t, "retry", "ลองอีกครั้ง")}
        title={pendingCopy(t, "threadLoadFailedTitle", "โหลดข้อความไม่สำเร็จ")}
      />
    );
  } else if (entries.length === 0) {
    body = (
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <EmptyState
          body={pendingCopy(
            t,
            "threadEmptyBody",
            "ห้องแชทนี้เปิดแล้ว แต่ยังไม่มีใครส่งข้อความ",
          )}
          icon={MessageSquare}
          title={pendingCopy(t, "threadEmptyTitle", "ยังไม่มีข้อความ")}
        />
      </div>
    );
  } else {
    let lastDay = "";
    body = entries.map((entry) => {
      const iso = entry.kind === "message" ? entry.message.createdAt : entry.file.createdAt;
      const day = dayKey(iso);
      const divider =
        day === lastDay ? null : (
          <DayDivider key={`day-${day}`}>
            {new Date(iso).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </DayDivider>
        );
      lastDay = day;

      const senderId =
        entry.kind === "message" ? entry.message.senderUserId : entry.file.senderUserId;
      const mine = me.data !== undefined && senderId === me.data.id;
      const key = entry.kind === "message" ? entry.message.id : `file-${entry.file.id}`;

      if (entry.kind === "file") {
        const meta = [
          bytes(entry.file.fileSizeBytes),
          entry.file.expiryDate ? shortDateTime(entry.file.expiryDate) : null,
        ]
          .filter(Boolean)
          .join(" · ");
        // A file I sent: the accent fill would put muted meta on blue, so the
        // bubble takes the accent's *surface* token instead — still plainly my
        // side, still readable.
        return (
          <div className="contents" key={key}>
            {divider}
            {mine ? (
              <MyMessage bubbleClassName="gap-2.5 bg-accent-surface" time={clock(iso)}>
                <FileBody meta={meta} name={entry.file.originalFileName} />
              </MyMessage>
            ) : (
              <PartnerMessage bubbleClassName="items-start gap-2.5" time={clock(iso)}>
                <FileBody meta={meta} name={entry.file.originalFileName} />
              </PartnerMessage>
            )}
          </div>
        );
      }

      return (
        <div className="contents" key={key}>
          {divider}
          {mine ? (
            <MyMessage time={clock(iso)}>
              <MyText>{entry.message.message}</MyText>
            </MyMessage>
          ) : (
            <PartnerMessage time={clock(iso)}>
              <PartnerText>{entry.message.message}</PartnerText>
            </PartnerMessage>
          )}
        </div>
      );
    });
  }

  // The thread frame stacks its blocks with a 16px gap. Figma's desktop chat
  // (1952:8003) sets the same thread in the right half of a card with the inbox
  // beside it, under the app's nav — so the phone's full-bleed screen becomes a
  // pane, and the list it came from stays visible.
  return (
    <MobileScreen className="gap-4 lg:gap-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>

      <div className={cn("flex w-full min-h-0 flex-1 flex-col", CHAT_PANE)}>
        <ChatList
          activeId={threadId}
          className="hidden lg:flex lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4"
        />

        <div className="flex w-full min-h-0 flex-1 flex-col">
          <ChatHeader
            threadId={threadId}
            title={pendingCopy(t, "roomLabel", "การสนทนา")}
          />
          {/* Figma "Container": 16px side padding, 12px between messages. The
              ground is stated rather than inherited: inside the desktop pane the
              card surface would otherwise reach under the bubbles and flatten
              them. */}
          <ScreenBody className="items-start gap-3 bg-background px-4 py-3 lg:px-6 lg:py-4">
            {body}
          </ScreenBody>
          {/* `state` only decides which frame the route opens on. It says nothing
              about whether a send is possible — see `ChatFooter`, which cannot
              send in any state because the API has no route for it. */}
          <ChatFooter
            onUploaded={reloadFiles}
            roomId={isRoom && state === "default" ? threadId : undefined}
          />
        </div>
      </div>
    </MobileScreen>
  );
}

/** A thread-shaped skeleton, so the column does not reflow when the page lands. */
function ThreadSkeleton() {
  return (
    <>
      <div className="flex w-full shrink-0 items-end gap-2">
        <div className="size-8 shrink-0 rounded-full bg-muted" />
        <div className="h-10 w-48 rounded-tl-card rounded-tr-card rounded-br-card bg-muted" />
      </div>
      <div className="flex w-full shrink-0 justify-end">
        <div className="h-10 w-40 rounded-tl-card rounded-tr-card rounded-bl-card bg-muted" />
      </div>
      <div className="flex w-full shrink-0 items-end gap-2">
        <div className="size-8 shrink-0 rounded-full bg-muted" />
        <div className="h-16 w-56 rounded-tl-card rounded-tr-card rounded-br-card bg-muted" />
      </div>
    </>
  );
}

/**
 * What the thread says instead of messages: the API's own sentence, and a retry
 * where retrying is the fix. Same rule as `components/home/browse-list.tsx` — the
 * message is the only thing that separates "no session" from "the container is
 * not running", and the reader needs to know which.
 */
function ThreadNotice({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  readonly title: string;
  readonly body: string;
  readonly retryLabel?: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div
      className={cn(
        surfaceClass({ tier: "flat" }),
        "flex w-full shrink-0 flex-col items-start gap-3 p-4",
      )}
    >
      <p className="w-full text-base font-semibold text-foreground">{title}</p>
      <p className="w-full text-sm font-normal text-muted-foreground">{body}</p>
      {onRetry && retryLabel ? (
        <NeutralButton onClick={onRetry} size="sm">
          {retryLabel}
        </NeutralButton>
      ) : null}
    </div>
  );
}
