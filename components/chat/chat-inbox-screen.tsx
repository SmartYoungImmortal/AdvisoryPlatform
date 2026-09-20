"use client";

import Link from "next/link";
import { Search, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { messagesEmpty as emptyIllustration } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ChatMark } from "@/components/chat/chat-avatar";
import { CHAT_PANE } from "@/components/chat/chat-chrome";
import { listChatRooms, pendingCopy, type ApiChatRoom } from "@/components/chat/chat-data";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { surfaceClass } from "@/components/mobile/surface";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The inbox, read from `GET /chat/rooms`.
 *
 * ## What a room does and does not tell us
 *
 * `ChatRoomResponseDto` is `{ id, isAnonymous, lastReadAt, unreadCount,
 * createdAt }` and that is the whole of it. No participant, no display name, no
 * avatar, no last message. A room is created by a booking, so the other member
 * exists, but no route exposes them — so this row shows the date the
 * conversation opened and its unread count, and leaves the portrait as a plain
 * glyph. It does not borrow a stock photograph and a name from the fixtures that
 * used to be here: a row that says "Sarah Jenskins" over data that has never
 * heard of her is worse than a row that admits it only knows a date.
 *
 * ## Why the empty state is not a failure
 *
 * `chat_rooms`, `chat_messages` and `service_appointments` all have zero rows in
 * the seeded database, and a room is only created by a booking. So an empty list
 * here is the correct answer, not a broken read, and it renders the designed
 * empty screen rather than an error.
 *
 * The search field is still inert. `GET /chat/rooms` takes `page` and `limit`
 * and nothing else — there is no `q` — and filtering a page of UUID-keyed rooms
 * on the client would search text that is not there.
 */

/** Thai short date, e.g. "20 ก.ย. 2569" — `th-TH` is Buddhist-era by default. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Figma "Chat 1..3" row — 12px top padding, 40px avatar, name/preview stack,
 * hairline.
 *
 * An unread row carries weight — the name goes semibold, the preview stops being
 * muted and a dot holds the right edge — so the list has a shape before it is
 * read. The row answers the pointer, and it sits on the card surface rather than
 * straight on the page ground.
 */
function ChatRow({
  href,
  avatar,
  name,
  preview,
  trailing,
  unread = false,
  active = false,
}: {
  readonly href: string;
  readonly avatar: React.ReactNode;
  readonly name: string;
  readonly preview: React.ReactNode;
  /** The anonymous marker, where a room has one. */
  readonly trailing?: React.ReactNode;
  /** Not read yet: the row's own weight, plus the dot. */
  readonly unread?: boolean;
  /** The thread open in the pane beside this list — desktop only. */
  readonly active?: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[70px] w-full shrink-0 flex-col items-start justify-center border-b border-border bg-card transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
        // The open thread keeps the accent tint and an accent edge, so the pane
        // and the list agree on which conversation is on screen.
        active && "bg-accent-surface/60 before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-primary before:content-['']",
      )}
      href={href}
    >
      <div className="flex w-full shrink-0 items-center gap-3 px-4">
        {avatar}
        <div className="flex min-w-px flex-1 flex-col items-start justify-center gap-0.5">
          <p
            className={cn(
              "w-full truncate text-sm",
              unread ? "font-semibold text-foreground" : "font-medium text-foreground",
            )}
          >
            {name}
          </p>
          <p
            className={cn(
              "w-full truncate text-xs tabular-nums",
              unread ? "font-medium text-foreground" : "font-normal text-muted-foreground",
            )}
          >
            {preview}
          </p>
        </div>
        {trailing}
        {unread ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
    </Link>
  );
}

/** A row-shaped skeleton, so the list does not reflow when the rooms land. */
function RowSkeleton() {
  return (
    <div className="flex h-[70px] w-full shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <div className="size-10 shrink-0 rounded-full bg-muted" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1.5">
        <div className="h-3.5 w-2/5 rounded-md bg-muted" />
        <div className="h-3 w-1/4 rounded-md bg-muted" />
      </div>
    </div>
  );
}

/**
 * The inbox itself — title, search, rooms.
 *
 * Figma's desktop chat (1952:8003) shows this beside the open thread instead of
 * on a screen of its own, so it is a component both screens render: the inbox
 * page at every width, the thread page from `lg`. `activeId` is what marks the
 * row being read, which only the two-pane layout can show.
 *
 * `emptyState` is what stands in for the list when the API returns no rooms. The
 * inbox page passes Figma's illustrated empty screen; the desktop thread pane
 * passes one line, because there is a thread open beside it.
 */
export function ChatList({
  activeId,
  className,
  emptyState,
}: {
  readonly activeId?: string;
  readonly className?: string;
  readonly emptyState?: React.ReactNode;
}) {
  const t = useTranslations("chat");
  const fetcher = useCallback(
    (signal: AbortSignal) => listChatRooms({ limit: 50 }, signal),
    [],
  );
  const rooms = useResource<Paginated<ApiChatRoom>>("chat/rooms?limit=50", fetcher);

  let body: React.ReactNode;
  if (rooms.loading) {
    body = (
      <>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </>
    );
  } else if (rooms.error) {
    // The API's own sentence, not a translated guess. It is the only thing that
    // separates "no session" from "the container is not running", and the reader
    // needs to know which. Same rule as `components/home/browse-list.tsx`.
    body = (
      <div
        className={cn(
          surfaceClass({ tier: "flat" }),
          "m-4 flex shrink-0 flex-col items-start gap-3 p-4",
        )}
      >
        <p className="w-full text-base font-semibold text-foreground">
          {pendingCopy(t, "loadFailedTitle", "โหลดรายการแชทไม่สำเร็จ")}
        </p>
        <p className="w-full text-sm font-normal text-muted-foreground">
          {rooms.error.message}
        </p>
        <NeutralButton onClick={rooms.reload} size="sm">
          {pendingCopy(t, "retry", "ลองอีกครั้ง")}
        </NeutralButton>
      </div>
    );
  } else if ((rooms.data?.items.length ?? 0) === 0) {
    body = emptyState ?? null;
  } else {
    body = rooms.data?.items.map((room) => (
      <ChatRow
        active={room.id === activeId}
        avatar={<ChatMark size={40} />}
        href={`/chat/${room.id}`}
        key={room.id}
        name={pendingCopy(t, "roomLabel", "การสนทนา")}
        preview={shortDate(room.createdAt)}
        trailing={
          room.isAnonymous ? (
            <StatusPill className="shrink-0" tone="neutral">
              {pendingCopy(t, "anonymous", "ไม่เปิดเผยชื่อ")}
            </StatusPill>
          ) : null
        }
        unread={room.unreadCount > 0}
      />
    ));
  }

  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start gap-4", className)}>
      <div className="flex shrink-0 items-start gap-6 px-4">
        <p className="shrink-0 text-xl font-semibold whitespace-nowrap text-foreground">
          {t("title")}
        </p>
      </div>

      {/* Inert, and stated as such: `GET /chat/rooms` takes `page` and `limit`
          only — there is no `q` — and a room carries no text to match against. */}
      <div className="flex w-full shrink-0 items-start px-4">
        <InputGroup className="gap-2 rounded-card border-border bg-muted px-3.5 shadow-none">
          <InputGroupAddon className="p-0">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={t("searchPlaceholder")}
            className="px-0 text-sm"
            disabled
            placeholder={t("searchPlaceholder")}
            type="search"
          />
        </InputGroup>
      </div>

      {/* The rows carry the card surface themselves, so the list closes with a
          hairline at the top and needs nothing else to read as one block. */}
      <div className="flex w-full min-h-0 flex-1 flex-col items-start overflow-y-auto border-t border-border">
        {body}
      </div>
    </div>
  );
}

/**
 * Figma "Chat Inbox" (995:8260) and "Chat inbox - Empty" (995:8325).
 *
 * The empty frame is no longer a separate route's worth of layout: the API
 * answers with no rooms today, so the default screen renders it whenever the
 * list comes back empty. `state="empty"` still forces it, which is what
 * `/chat/empty` is for.
 */
export function ChatInboxScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "session-banner";
}) {
  const t = useTranslations("chat");
  const n = useTranslations("notifications");
  const hasBanner = state === "session-banner";
  // The forced frame, for the state route. Everything else lets the list decide,
  // because "no rooms" is an answer the API actually gives.
  const [forcedEmpty] = useState(state === "empty");

  /* Figma "Empty State" — illustration, copy, then the 200px CTA. */
  const empty = useMemo(
    () => (
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-6">
        <EmptyState
          action={
            <PrimaryButton className="w-50" href="/matching">
              {t("emptyAction")}
            </PrimaryButton>
          }
          body={t("emptyBody")}
          illustration={emptyIllustration}
          title={t("emptyTitle")}
        />
      </div>
    ),
    [t],
  );

  return (
    <MobileScreen className="pb-0" wide>
      {/* Figma "Container": 2px side padding, 16px top padding, 16px between blocks. */}
      <ScreenBody className="items-start gap-4 px-0.5 pb-[144px] lg:gap-0 lg:px-8 xl:px-12 lg:pb-6">
        <TopBar unreadNotifications />
        {hasBanner ? (
          /* Figma "In-app banner" (995:11104) — a 64px accent-tinted strip above
             the list with an 18px video glyph and a join affordance. There is no
             endpoint behind it: the API has no notifications module at all (a
             `notification` table exists in the schema and no controller reads
             it), so this stays the fixture the frame draws. */
          <div className="flex h-16 w-full shrink-0 items-center gap-3 overflow-clip border-b border-border bg-accent-surface px-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
              <Video aria-hidden className="size-4.5 text-primary" />
            </span>
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full truncate text-sm font-semibold text-foreground">
                {n("sessionBannerTitle")}
              </p>
              <p className="w-full truncate text-xs font-normal tabular-nums text-muted-foreground">
                {n("sessionBannerBody")}
              </p>
            </div>
            <Button className="h-8 shrink-0 px-3.5 text-xs font-medium">
              {n("sessionBannerAction")}
            </Button>
          </div>
        ) : null}

        {forcedEmpty ? (
          empty
        ) : (
          /* Figma's desktop frame stands the list in the left half of a card
             and leaves the right half waiting for a thread to be picked. */
          <div className={cn("flex w-full min-h-0 flex-1 flex-col items-start", CHAT_PANE)}>
            <ChatList
              className="lg:h-full lg:w-80 lg:shrink-0 lg:border-e lg:border-border lg:pt-4"
              emptyState={empty}
            />
            <div className="hidden lg:flex lg:min-w-px lg:flex-1 lg:items-center lg:justify-center lg:bg-background lg:p-10">
              <p className="max-w-80 text-center text-sm font-normal text-muted-foreground">
                {t("pickThread")}
              </p>
            </div>
          </div>
        )}
      </ScreenBody>
      <BottomBar className="lg:hidden" role="anon" selected="chat" />
    </MobileScreen>
  );
}
