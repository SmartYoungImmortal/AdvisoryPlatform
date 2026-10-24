"use client";

import Link from "next/link";
import { CalendarClock, EyeOff, MessagesSquare, Search } from "lucide-react";
import { useFormatter, useNow, useTimeZone, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { ChatError, ChatFrame, ConnectionNote, counterpartName } from "@/components/chat/chat-chrome";
import { chatHref } from "@/components/chat/chat-data";
import {
  counterpartFor,
  newestRoomId,
  useChatPeople,
  useClock,
  useDesktop,
  useHourStyle,
  useInbox,
  type ChatPeople,
} from "@/components/chat/chat-hooks";
import { NewestThread } from "@/components/chat/chat-thread-screen";
import { useLiveMessages, useReadMarks, useRoomSubscriptions } from "@/components/chat/chat-live";
import {
  dayKey,
  daysBetween,
  matchesQuery,
  mergeMessages,
  newestOf,
  unreadIn,
  type Counterpart,
} from "@/components/chat/chat-logic";
import type { ApiBooking } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * `/chat`: every conversation, read from `GET /chat/rooms` and each room's
 * first page of messages (`useInbox`), named from the bookings and the public
 * directory (`resolveCounterpart` explains how far that can be trusted).
 *
 * A phone shows the list as its own screen; a desktop shows it as the left of
 * the messenger card, with a quiet "choose a conversation" in the room the
 * thread will take.
 */

/** The time a row shows: the clock today, then "yesterday", the weekday, the date. */
function useRowTime(): (iso: string) => string {
  const t = useTranslations("chat");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "Asia/Bangkok";
  const clock = useClock();
  const now = useMountTime();
  const today = dayKey(now, timeZone);
  return (iso: string) => {
    const at = new Date(iso);
    const day = dayKey(at.getTime(), timeZone);
    const ago = daysBetween(day, today);
    if (ago <= 0) return clock(at);
    if (ago === 1) return t("yesterday");
    if (ago < 7) return format.dateTime(at, { weekday: "short" });
    return day.slice(0, 4) === today.slice(0, 4)
      ? format.dateTime(at, { day: "numeric", month: "short" })
      : format.dateTime(at, { day: "numeric", month: "short", year: "numeric" });
  };
}

/** The list as the card's left column from `lg`, the same width on both screens. */
export const CHAT_LIST_PANE = "lg:w-88 lg:shrink-0";

/** One conversation, everything a row needs and the list can search. */
type Row = {
  readonly id: string;
  readonly anonymous: boolean;
  readonly counterpart: Counterpart;
  readonly name: string;
  readonly preview: string | null;
  readonly mine: boolean;
  readonly at: string;
  readonly unread: number;
};

/**
 * The rows, with what has arrived live laid over the cached read: a new line
 * moves its row to the top with its text and time, and counts as unread until
 * the room is read. The open room (`activeId`) is being read, so it counts none.
 */
function useRows(
  people: ChatPeople,
  activeId?: string,
): {
  readonly rows: readonly Row[] | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
} {
  const t = useTranslations("chat");
  const inbox = useInbox();
  const live = useLiveMessages();
  const readMarks = useReadMarks();
  const meId = people.me.data?.id;

  const rows = inbox.data
    ?.map(({ room, messages }): Row => {
      const arrived = live.get(room.id) ?? [];
      const all = arrived.length > 0 ? mergeMessages(messages, arrived) : messages;
      const counterpart = counterpartFor(room, all.map((m) => m.senderUserId), people);
      const newest = newestOf(all);
      return {
        id: room.id,
        anonymous: room.isAnonymous,
        counterpart,
        name: counterpartName(counterpart, t),
        preview: newest?.message ?? null,
        mine: newest !== undefined && newest.senderUserId === meId,
        at: newest?.createdAt ?? room.createdAt,
        unread:
          room.id === activeId
            ? 0
            : unreadIn({ room, page: messages, live: arrived, meId, readThrough: readMarks.get(room.id) }),
      };
    })
    // Last activity first, the way every messenger orders a list.
    .toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return {
    rows,
    // Names wait for the directory and the bookings too, or every row would
    // flash "การสนทนา" first and then change under the reader.
    loading:
      inbox.loading ||
      people.me.loading ||
      people.advisors.loading ||
      people.bookings.loading ||
      people.services.loading,
    error: inbox.error,
    reload: inbox.reload,
  };
}

/**
 * A conversation in the list: the face, the name, the time; the last line under
 * them, mine marked "you:". Unread rows carry the weight (semibold, the line in
 * ink, the count in the accent), so the list has a shape before it is read.
 */
function ChatRow({ row, active, time }: { readonly row: Row; readonly active: boolean; readonly time: string }) {
  const t = useTranslations("chat");
  const unread = row.unread > 0;
  const { advisor } = row.counterpart;

  return (
    <li>
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors duration-150",
          "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
          "aria-[current=page]:bg-muted",
        )}
        href={chatHref(row.id)}
      >
        <PersonAvatar
          advisor={advisor}
          known={row.counterpart.userId !== null}
          person={row.counterpart.person}
          size={52}
        />
        {/* From `lg` everything steps up: the desktop is drawn at 1710 and
            zoomed down, so a phone's 12px meta would read at 10. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 truncate text-base text-foreground lg:text-lg",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {row.name}
              {advisor ? <span className="sr-only"> · {t("verified")}</span> : null}
            </span>
            {row.anonymous ? (
              <span className="flex shrink-0 items-center self-center text-muted-foreground" title={t("anonymous")}>
                <EyeOff aria-hidden className="size-3.5 lg:size-4" />
                <span className="sr-only">{t("anonymous")}</span>
              </span>
            ) : null}
            <span
              className={cn(
                "ml-auto shrink-0 font-latin text-xs tabular-nums lg:text-frame-label",
                unread ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm lg:text-base",
                unread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.preview ? (
                <>
                  {row.mine ? `${t("you")}: ` : null}
                  {row.preview}
                </>
              ) : (
                t("noMessagesYet")
              )}
            </span>
            {unread ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hero-action px-1.5 font-latin text-xs font-semibold text-hero-action-foreground tabular-nums lg:h-6 lg:min-w-6 lg:text-frame-label">
                <span aria-hidden>{row.unread > 99 ? "99+" : row.unread}</span>
                <span className="sr-only">{t("unreadCount", { count: row.unread })}</span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

function RowSkeleton() {
  return (
    <li aria-hidden className="flex items-center gap-3 px-3 py-3">
      <span className="size-13 shrink-0 rounded-full bg-muted" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="h-4 w-2/5 rounded-md bg-muted" />
        <span className="h-3.5 w-4/5 rounded-md bg-muted" />
      </span>
    </li>
  );
}

/**
 * A filter as a small text tab: the current one in ink and underlined, the
 * other muted. 44px tall for a thumb, though the text is small.
 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn(
        "h-11 shrink-0 gap-1.5 rounded-md px-1 text-sm underline-offset-8 hover:bg-transparent lg:text-frame-meta",
        active
          ? "font-semibold text-foreground underline decoration-2"
          : "font-medium text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

/* ------------------------------------------------------------------ banner */

/**
 * The in-app banner about a session: one that is under way or starts within
 * the hour, read from `GET /bookings/me`. `/chat/session-banner` forces it
 * on, and then it states the next session whenever it is, or plainly that
 * there is none. It leads to the booking, not to a call: the API has no call
 * module to join.
 */
function SessionBanner({ forced, people }: { readonly forced: boolean; readonly people: ChatPeople }) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const hour = useHourStyle();
  // A ticking clock, so "starts in 12 min" stays true while the page is open.
  const now = useNow({ updateInterval: 30_000 }).getTime();
  const live = (people.bookings.data?.items ?? [])
    .filter((b) => (b.state === "BOOKED" || b.state === "IN_PROGRESS") && Date.parse(b.endTime) > now)
    .toSorted((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const next: ApiBooking | undefined = live[0];

  if (people.bookings.loading) return null;

  if (!next) {
    if (!forced) return null;
    return (
      <BannerCard
        action={{ href: "/search", label: t("bannerNoneAction") }}
        body={t("bannerNoneBody")}
        title={t("bannerNone")}
      />
    );
  }

  const start = Date.parse(next.startTime);
  const minutes = Math.ceil((start - now) / 60_000);
  const underway = start <= now;
  if (!forced && !underway && minutes > 60) return null;

  const advisor = people.advisors.data?.items.find((a) => a.id === next.advisorId) ?? null;
  const service = people.services.data?.items.find((s) => s.id === next.serviceId) ?? null;
  const name = advisor?.displayName ?? t("advisorFallback");
  const when = format.dateTime(new Date(start), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour,
    minute: "2-digit",
  });

  return (
    <BannerCard
      action={{ href: "/bookings", label: t("bannerAction") }}
      body={[service?.name, when].filter(Boolean).join(" · ")}
      live={underway || minutes <= 60}
      title={
        underway
          ? t("bannerLive", { name })
          : minutes <= 60
            ? t("bannerStartsIn", { name, count: minutes })
            : t("bannerNext", { name })
      }
    />
  );
}

function BannerCard({
  title,
  body,
  action,
  live = false,
}: {
  readonly title: string;
  readonly body: string;
  readonly action: { readonly href: string; readonly label: string };
  /** Soon or under way: the accent ground marks it as the one to act on. */
  readonly live?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl p-3.5",
        live ? "bg-accent-surface" : "border border-hero-card-border bg-card shadow-hero-card",
      )}
      data-slot="session-banner"
      role="status"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card">
        <CalendarClock aria-hidden className="size-5 text-primary" />
      </span>
      {/* The copy wraps rather than truncates: in a 352px column a cut-off
          "starts in…" is the one line that must be read whole. */}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className="text-sm font-semibold text-foreground lg:text-base">{title}</span>
        <span className="font-latin text-xs text-muted-foreground tabular-nums lg:text-base">{body}</span>
        <Button
          className="relative mt-2 h-9 rounded-full bg-hero-action px-4 text-xs font-medium text-hero-action-foreground before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] hover:bg-hero-action/85 lg:h-11 lg:px-5 lg:text-base"
          nativeButton={false}
          render={<Link href={action.href} />}
        >
          {action.label}
        </Button>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------- list */

/**
 * The list itself — heading, search, the unread filter, the rows. The inbox
 * renders it as the whole phone screen and the desktop's left pane; a thread
 * renders it beside itself from `lg`, with the open room marked.
 *
 * The search is real now, over what the page holds: names, services and last
 * lines. `GET /chat/rooms` takes no query, so it searches the loaded page (up
 * to fifty rooms), which for a consultation inbox is the whole of it.
 */
export function ChatList({
  activeId,
  banner = "auto",
  className,
}: {
  readonly activeId?: string;
  /** `forced` is the `/chat/session-banner` frame; `off` beside an open thread. */
  readonly banner?: "auto" | "forced" | "off";
  readonly className?: string;
}) {
  const t = useTranslations("chat");
  const people = useChatPeople();
  const { rows, loading, error, reload } = useRows(people, activeId);
  const rowTime = useRowTime();
  const [query, setQuery] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  // Every listed room live, so a line anywhere moves its row.
  useRoomSubscriptions(rows?.map((row) => row.id) ?? []);

  const unreadTotal = rows?.filter((row) => row.unread > 0).length ?? 0;
  const shown = (rows ?? []).filter(
    (row) =>
      (!onlyUnread || row.unread > 0) &&
      matchesQuery(query, row.name, row.counterpart.service?.name, row.counterpart.advisor?.headline, row.preview),
  );
  const empty = !loading && !error && rows?.length === 0;

  let body: ReactNode;
  if (error) {
    body = (
      // Inset to the heading's own gutter (the list's 8px plus these 12px).
      <div className="px-3">
        <ChatError error={error} onRetry={reload} title={t("loadFailedTitle")} />
      </div>
    );
  } else if (loading || !rows) {
    body = (
      <ul className="flex flex-col">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </ul>
    );
  } else if (shown.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
        <p className="text-base font-semibold text-foreground lg:text-lg">
          {query.trim() ? t("noMatchesTitle", { query: query.trim() }) : t("noUnreadTitle")}
        </p>
        {query.trim() ? <p className="text-sm text-muted-foreground lg:text-base">{t("noMatchesBody")}</p> : null}
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-0.5">
        {shown.map((row) => (
          <ChatRow active={row.id === activeId} key={row.id} row={row} time={rowTime(row.at)} />
        ))}
      </ul>
    );
  }

  if (empty) return <InboxEmpty className={className} />;

  return (
    <div className={cn("flex w-full flex-col", className)} data-slot="chat-list">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-3 lg:px-5 lg:pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-3xl">{t("title")}</h1>
          {/* Beside an open thread its composer says it instead. */}
          {banner === "off" ? null : <ConnectionNote className="pt-1" />}
        </div>

        {/* Search and the list are the inbox; the banner is only the
            `/chat/session-banner` frame now. */}
        {banner === "forced" ? <SessionBanner forced people={people} /> : null}

        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground lg:size-5" />
          <Input
            aria-label={t("searchConversations")}
            className="h-11 rounded-full border-transparent bg-muted/70 pr-4 pl-11 text-base shadow-none md:text-base lg:h-12 lg:pl-12 lg:text-lg"
            disabled={!rows || rows.length === 0}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchConversations")}
            type="search"
            value={query}
          />
        </div>

        <div aria-label={t("filterLabel")} className="-my-2 flex gap-4" role="group">
          <FilterChip active={!onlyUnread} onClick={() => setOnlyUnread(false)}>
            {t("filterAll")}
          </FilterChip>
          <FilterChip active={onlyUnread} onClick={() => setOnlyUnread(true)}>
            {t("filterUnread")}
            {unreadTotal > 0 ? (
              <span className="font-latin tabular-nums opacity-70">{unreadTotal}</span>
            ) : null}
          </FilterChip>
        </div>
      </div>

      {/* Its own scroller on a desktop (the page does not move there), the
          page's on a phone. `data-lenis-prevent` keeps the desktop's smooth
          page scroll from taking the wheel off this list. */}
      <div className="px-2 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain" data-lenis-prevent>
        {body}
      </div>
    </div>
  );
}

/** No rooms at all: the honest reason, and the way to the one thing that opens one. */
function InboxEmpty({ className }: { readonly className?: string }) {
  const t = useTranslations("chat");
  return (
    <div className={cn("flex w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center lg:py-0", className)}>
      <span className="flex size-16 items-center justify-center rounded-full bg-muted">
        <MessagesSquare aria-hidden className="size-7 text-muted-foreground" />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h1 className="font-hero text-2xl tracking-tight text-hero-ink lg:text-3xl">{t("emptyTitle")}</h1>
        <p className="text-sm text-muted-foreground lg:text-base">{t("emptyBody")}</p>
      </div>
      <Button className={cn(authPill(true), "w-auto")} nativeButton={false} render={<Link href="/search" />}>
        {t("emptyAction")}
      </Button>
    </div>
  );
}


/**
 * `/chat`, `/chat/empty` and `/chat/session-banner`.
 *
 * `empty` forces the no-rooms screen whatever the API holds; the default lets
 * the API decide, because "no rooms" is an answer it really gives (a room is
 * only created by a booking). `session-banner` forces the banner on.
 */
export function ChatInboxScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "session-banner";
}) {
  return (
    <ChatFrame phone="page">
      {state === "empty" ? <InboxEmpty /> : <InboxPanes forcedBanner={state === "session-banner"} />}
    </ChatFrame>
  );
}

/** The list, and on a desktop the latest conversation open beside it. */
function InboxPanes({ forcedBanner }: { readonly forcedBanner: boolean }) {
  const inbox = useInbox();
  const desktop = useDesktop();
  const newest = desktop ? newestRoomId(inbox.data) : undefined;
  return (
    <>
      <ChatList activeId={newest ?? undefined} banner={forcedBanner ? "forced" : "auto"} className={CHAT_LIST_PANE} />
      <NewestThread />
    </>
  );
}
