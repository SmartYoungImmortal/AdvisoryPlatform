"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  FileText,
  MessageSquare,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import type { NotificationCategory } from "@/components/notifications/notifications-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The phone's side margin, and the tablet's. From `lg` the page column
 * (`AccountShell`) owns the inset, so the blocks drop theirs there.
 */
export const GUTTER = "px-5 md:px-10 lg:px-0";

/**
 * The feed and its side card as one group filling the panel: the feed takes
 * what is left beside a 400px card 40px away (just wide enough for the card's
 * one line of copy), in a 1496px group centred in the 1710 space, so about
 * 890 + 335 rendered at 1440 and wider (`app-scale` holds
 * 0.842), with even margins either side.
 */
export const FEED_COLUMN = "max-w-374 lg:mx-auto";

/**
 * The filters: everything, then each kind the feed holds. No "unread" filter:
 * unread rows already stand out with their dot and tint.
 */
export type FeedFilter = "all" | NotificationCategory;

const FILTER_LABEL = {
  all: "filterAll",
  booking: "filterBooking",
  message: "filterMessage",
  payment: "filterPayment",
} as const satisfies Record<FeedFilter, string>;

/** The kinds in the order their tabs sit, for a feed to keep only the ones it has. */
export const CATEGORY_ORDER: readonly NotificationCategory[] = ["booking", "message", "payment"];

/**
 * The filters as capsules, the chosen one filled in ink. A kind only gets a
 * capsule when the feed has something of that kind.
 */
export function FeedFilters({
  value,
  onChange,
  kinds,
}: {
  readonly value: FeedFilter;
  readonly onChange: (next: FeedFilter) => void;
  readonly kinds: readonly NotificationCategory[];
}) {
  const t = useTranslations("notifications");
  const options: readonly FeedFilter[] = ["all", ...kinds];

  return (
    <div
      aria-label={t("filterLabel")}
      className="-mx-5 flex gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10 lg:mx-0 lg:gap-3 lg:px-0"
      role="group"
    >
      {options.map((key) => {
        const active = key === value;
        return (
          <Button
            aria-pressed={active}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap lg:h-12 lg:px-5 lg:text-frame-meta",
              active
                ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            key={key}
            onClick={() => onChange(key)}
            type="button"
            variant="ghost"
          >
            {t(FILTER_LABEL[key])}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * One notification, the whole row the link: the kind's icon in a soft circle,
 * the title, when, and one line of what it says. Unread is a dot before the
 * title, a heavier title and a faint tint behind the row.
 */
export function NotificationRow({
  icon: Icon,
  title,
  body,
  time,
  unread = false,
  href,
  onClick,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body?: string | null;
  readonly time?: string;
  readonly unread?: boolean;
  /**
   * What it opens (`notificationTarget`): the thing to act on, or for one
   * that only informs, its own page with the whole message.
   */
  readonly href: string;
  readonly onClick?: () => void;
}) {
  const t = useTranslations("notifications");

  return (
    <li>
      <Link
        className={cn(
          "-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5",
          unread && "bg-primary/5",
        )}
        href={href}
        onClick={onClick}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12">
          <Icon aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
        </span>
        {/* Title and body share one column that stops before the time, so a
            long line ends in "…" there instead of running under it. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="flex min-w-0 items-center gap-2">
            {unread ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary lg:size-2" /> : null}
            <span
              className={cn(
                "truncate text-sm text-foreground lg:text-frame-body",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {unread ? <span className="sr-only">{`${t("unread")}: `}</span> : null}
              {title}
            </span>
          </span>
          {body ? <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">{body}</span> : null}
        </span>
        {time ? (
          <span className="shrink-0 pt-0.5 text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label">
            <Figures>{time}</Figures>
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/**
 * A stretch of the feed, today, yesterday or earlier: a tiny muted heading
 * over its rows. The hairline sits between stretches, never between rows.
 */
export function DayGroup({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  const heading = useId();

  return (
    <section aria-labelledby={heading} className="flex w-full flex-col pt-5 lg:pt-8">
      <h2 className="text-xs font-medium text-muted-foreground lg:text-frame-label" id={heading}>
        {label}
      </h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

/** The feed's own shape while it loads, so nothing shifts when it lands. */
export function FeedSkeleton() {
  const t = useTranslations("notifications");

  return (
    <div aria-busy className="flex w-full flex-col pt-6 lg:pt-8">
      <span className="sr-only">{t("loading")}</span>
      <span aria-hidden className="h-3 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      {[0, 1, 2, 3].map((i) => (
        <div aria-hidden className="flex items-start gap-4 py-4 lg:gap-5 lg:py-6" key={i}>
          <span className="size-5 shrink-0 animate-pulse rounded bg-muted motion-reduce:animate-none lg:size-6" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <span className="h-3.5 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Nothing yet, unboxed at the top of the column: one muted icon, what will
 * arrive here, and the way to start (a booking sends the first one).
 */
export function EmptyFeed() {
  const t = useTranslations("notifications");

  return (
    // On a phone or an upright tablet there is no box: the message sits centred
    // in the space down to the page's foot padding (the heading and the switch
    // take the 11rem above it). From `lg` it is a box of its own height.
    <div className="mt-6 flex min-h-[calc(100dvh-11rem)] w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:mt-8 lg:min-h-0 lg:rounded-2xl lg:border lg:border-border lg:gap-5 lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <Bell aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("emptyTitle")}</h2>
        <p className="text-xs text-muted-foreground lg:text-frame-meta">
          {/* Broken in two on a phone or an upright tablet, at the phrase
              rather than wherever the width runs out; one line from `lg`. */}
          {t.rich("emptyBody", { br: () => <br className="lg:hidden" /> })}
        </p>
      </div>
      <Button
        className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
        nativeButton={false}
        render={<Link href="/search" />}
      >
        {t("findExpert")}
      </Button>
    </div>
  );
}

/** A filter that leaves nothing: say so, and the way back to everything. */
export function FilteredEmpty({ onShowAll }: { readonly onShowAll: () => void }) {
  const t = useTranslations("notifications");

  return (
    <div className="flex w-full flex-col items-start gap-2 pt-8 lg:pt-12">
      <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("filteredEmptyTitle")}</h2>
      <Button
        className="h-11 px-0 text-sm font-normal text-muted-foreground underline underline-offset-4 hover:bg-transparent hover:text-foreground lg:text-frame-body"
        onClick={onShowAll}
        type="button"
        variant="ghost"
      >
        {t("showAll")}
      </Button>
    </div>
  );
}

/**
 * The heading row: the title at the frame's title step, how many are new as
 * plain muted text beside it, and "mark all read" as a quiet text control at
 * the right. The count is polite live text, so reading everything is
 * announced as well as seen.
 *
 * `unread` is null while there is nothing to count (loading, failed, empty).
 */
function FeedHeader({
  unread,
  onMarkAllRead,
  actions,
  back,
}: {
  readonly unread: number | null;
  readonly onMarkAllRead?: () => void;
  readonly actions?: ReactNode;
  /** Where the phone's chevron goes; the rail or app bar does this from `lg`. */
  readonly back: string;
}) {
  const t = useTranslations("notifications");
  const c = useTranslations("common");

  return (
    <header className="flex w-full flex-col items-start gap-3 lg:gap-0">
      {/* The chevron has the top row to itself, above the title. Its tap
          target is widened by `before` without moving anything. */}
      <Button
        aria-label={c("back")}
        className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-[''] lg:hidden"
        nativeButton={false}
        render={<Link href={back} />}
        size="icon"
        variant="ghost"
      >
        <ChevronLeft aria-hidden className="size-6" />
      </Button>
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-baseline gap-3 lg:gap-4">
          <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:text-frame-title">
            {t("title")}
          </h1>
          <span aria-live="polite" className="text-xs text-muted-foreground lg:text-frame-meta">
            {unread !== null && unread > 0 ? <Figures>{t("unreadBadge", { count: unread })}</Figures> : null}
          </span>
        </div>
        {/* The right side: "mark all read", then whatever the page adds (the
            device-alerts switch). */}
        <div className="flex shrink-0 items-center gap-5 lg:gap-6">
          {/* Always there while the feed has rows, so it is easy to find; it
              only goes quiet (disabled) once everything has been read. */}
          {onMarkAllRead ? (
            <Button
              className="h-10 shrink-0 gap-1.5 px-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-50 lg:h-11 lg:gap-2 lg:text-frame-meta"
              disabled={!unread}
              onClick={onMarkAllRead}
              type="button"
              variant="ghost"
            >
              <CheckCheck aria-hidden className="size-3.5 lg:size-5" />
              {t("readAll")}
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}

/**
 * The page around the feed, shared by the sample screens below and the API
 * version (`notifications-live.tsx`): one centred column, the heading row,
 * the filter tabs, and the feed. Nothing boxed. `headerActions` sits at the
 * right of the heading row, for the device-alerts switch.
 *
 * Every role's page sits in the app frame (`AppFrame`), the rail at its left;
 * `advisor` only changes where the phone's back chevron goes.
 */
export function NotificationCenterFrame({
  advisor = false,
  unread = null,
  onMarkAllRead,
  filters,
  headerActions,
  aside,
  children,
}: {
  readonly advisor?: boolean;
  readonly unread?: number | null;
  readonly onMarkAllRead?: () => void;
  /** The filter capsules, when the feed has something to filter. */
  readonly filters?: ReactNode;
  /** Controls at the right of the heading row, after "mark all read". */
  readonly headerActions?: ReactNode;
  /**
   * The card beside the feed (device alerts), from `lg` like the rest of the
   * desktop layout (a landscape iPad is the desktop scaled down). Not shown
   * on a phone or an upright tablet: there the switch lives in settings only,
   * and this page is for reading.
   */
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}) {
  // The advisee reaches this from their profile; the advisor from the desk.
  const back = advisor ? "/work" : "/profile";
  const content = (
    <div
      className={cn(
        "flex w-full flex-col gap-8 pt-6 pb-12 lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-10 lg:pt-0 lg:pb-0",
        FEED_COLUMN,
        GUTTER,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <FeedHeader actions={headerActions} back={back} onMarkAllRead={onMarkAllRead} unread={unread} />
        {filters ? <div className="mt-4 lg:mt-8">{filters}</div> : null}
        <div className="flex w-full flex-col">{children}</div>
      </div>
      {/* Dropped by the heading row's height, so its top lines up with the
          filters (or the empty-state box) rather than with the page title. */}
      {aside ? <aside className="hidden lg:sticky lg:top-8 lg:mt-20 lg:block">{aside}</aside> : null}
    </div>
  );

  return <NotificationsShell>{content}</NotificationsShell>;
}

/**
 * The page around the feed or one notification: the app frame and its rail,
 * for every role. An advisor reaches it from the same rail as every other
 * account page, so it keeps that rail rather than swapping to the app bar
 * and footer (which made the rail vanish for advisors on this one page).
 */
export function NotificationsShell({ children }: { readonly children: ReactNode }) {
  return (
    // `wide="md"`: a tablet held upright gets the phone layout at its own width.
    <MobileScreen className="bg-card" wide="md">
      <AppFrame active="notifications">
        <ScreenBody className="bg-card">
          <AccountShell active="notifications">{children}</AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

type SampleRow = {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly category: NotificationCategory | null;
  readonly title: string;
  readonly body: string;
  readonly time?: string;
  readonly href: string;
  readonly unread?: boolean;
};

type SampleGroup = { readonly label: string; readonly rows: readonly SampleRow[] };

/** Figma's feed for the reader who books: a confirmation, a reply, a receipt. */
function useAdviseeSample(): readonly SampleGroup[] {
  const t = useTranslations("notifications");
  return [
    {
      label: t("today"),
      rows: [
        {
          id: "booking",
          icon: CalendarDays,
          category: "booking",
          title: t("bookingConfirmedTitle"),
          body: t("bookingConfirmedBody"),
          time: t("bookingConfirmedTime"),
          href: "/transactions/detail",
          unread: true,
        },
        {
          id: "message",
          icon: MessageSquare,
          category: "message",
          title: t("newMessageTitle"),
          body: t("newMessageBody"),
          time: t("newMessageTime"),
          href: "/chat/sarah-jenskins",
          unread: true,
        },
        {
          id: "payment",
          icon: CreditCard,
          category: "payment",
          title: t("paymentTitle"),
          body: t("paymentBody"),
          time: t("paymentTime"),
          href: "/transactions/detail",
        },
      ],
    },
    {
      // Yesterday's rows carry no time of their own: the heading already says when.
      label: t("yesterday"),
      rows: [
        {
          id: "message-1",
          icon: MessageSquare,
          category: "message",
          title: t("newMessageTitle"),
          body: t("newMessageBody"),
          href: "/chat/sarah-jenskins",
        },
        {
          id: "message-2",
          icon: MessageSquare,
          category: "message",
          title: t("newMessageTitle"),
          body: t("newMessageBody"),
          href: "/chat/sarah-jenskins",
        },
      ],
    },
  ];
}

/**
 * The same feed from the other side of the booking (1952:35562): the request to
 * screen, the booking that came of it, the reply, the payout, then yesterday's
 * review and the verification that put the profile up. Each row goes where an
 * advisor would act on it.
 */
function useAdvisorSample(): readonly SampleGroup[] {
  const t = useTranslations("notifications");
  return [
    {
      label: t("today"),
      rows: [
        {
          id: "screening",
          icon: FileText,
          category: null,
          title: t("screeningRequestTitle"),
          body: t("screeningRequestBody"),
          time: t("screeningRequestTime"),
          href: "/screening/requests",
          unread: true,
        },
        {
          id: "booking",
          icon: CalendarDays,
          category: "booking",
          title: t("newBookingTitle"),
          body: t("newBookingBody"),
          time: t("bookingConfirmedTime"),
          href: "/work/calendar",
          unread: true,
        },
        {
          id: "message",
          icon: MessageSquare,
          category: "message",
          title: t("advisorMessageTitle"),
          body: t("newMessageBody"),
          time: t("newMessageTime"),
          href: "/chat",
          unread: true,
        },
        {
          id: "payout",
          icon: CreditCard,
          category: "payment",
          title: t("payoutTitle"),
          body: t("payoutBody"),
          time: t("paymentTime"),
          href: "/earnings",
        },
      ],
    },
    {
      label: t("yesterday"),
      rows: [
        {
          id: "review",
          icon: Star,
          category: null,
          title: t("reviewTitle"),
          body: t("reviewBody"),
          href: "/reviews",
        },
        {
          id: "verified",
          icon: BadgeCheck,
          category: null,
          title: t("verifiedTitle"),
          body: t("verifiedBody"),
          href: "/advisor/profile",
        },
      ],
    },
  ];
}

/**
 * A sample feed. The filters and "mark all read" work on this page only:
 * nothing here comes from the server, so nothing is sent to it.
 */
function SampleCenter({ advisor }: { readonly advisor: boolean }) {
  const advisee = useAdviseeSample();
  const advisorFeed = useAdvisorSample();
  const groups = advisor ? advisorFeed : advisee;
  const [allRead, setAllRead] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const rows = groups.flatMap((group) => group.rows);
  const isUnread = (row: SampleRow) => Boolean(row.unread) && !allRead;
  const unread = rows.filter(isUnread).length;
  const kinds = CATEGORY_ORDER.filter((kind) => rows.some((row) => row.category === kind));
  const matches = (row: SampleRow) => filter === "all" || row.category === filter;
  const visible = groups
    .map((group) => ({ ...group, rows: group.rows.filter(matches) }))
    .filter((group) => group.rows.length > 0);

  return (
    <NotificationCenterFrame
      advisor={advisor}
      filters={<FeedFilters kinds={kinds} onChange={setFilter} value={filter} />}
      onMarkAllRead={() => setAllRead(true)}
      unread={unread}
    >
      {visible.length === 0 ? (
        <FilteredEmpty onShowAll={() => setFilter("all")} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {visible.map((group) => (
            <DayGroup key={group.label} label={group.label}>
              {group.rows.map((row) => (
                <NotificationRow
                  body={row.body}
                  href={row.href}
                  icon={row.icon}
                  key={row.id}
                  time={row.time}
                  title={row.title}
                  unread={isUnread(row)}
                />
              ))}
            </DayGroup>
          ))}
        </div>
      )}
    </NotificationCenterFrame>
  );
}

/**
 * Figma "Notification center (Light)" (995:10813), its empty state (995:10894),
 * and the advisor's (1952:35562): the sample screens, for a build without an
 * API and for `/notifications/advisor`.
 */
export function NotificationCenterScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "advisor";
}) {
  if (state === "empty") {
    return (
      <NotificationCenterFrame>
        <EmptyFeed />
      </NotificationCenterFrame>
    );
  }
  return <SampleCenter advisor={state === "advisor"} />;
}
