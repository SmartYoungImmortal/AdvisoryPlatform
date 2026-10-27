"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import type { Paginated } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { listAdvisors, listMyBookings, listServices } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { useMountTime } from "@/components/bookings/booking-flow";
import { MiniMonth, dayDate, shiftMonth, useDayKey } from "@/components/bookings/mini-month";
import {
  bookingPhase,
  useClock,
  useStanding,
  useWaysOn,
  BookingDialog,
  type BookingEntry,
  type BookingPhase,
} from "@/components/bookings/booking-sheet";
import { authPill } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Popover } from "@base-ui/react/popover";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { AccountShell } from "@/components/account/account-shell";
import { AppFrame, PHONE_BAR } from "@/components/account/app-frame";
import { FEED_COLUMN, GUTTER } from "@/components/notifications/notification-center-screen";
import { cn } from "@/lib/utils";

/**
 * API-backed booking list. Public service/advisor records supply display names;
 * unavailable records retain the appointment's own date and state.
 */

/** A quiet grey capsule, for the retry and the way in when the list fails. */
const ACTION =
  "h-9 shrink-0 rounded-full bg-muted px-4 text-sm font-medium text-foreground hover:bg-muted/70 hover:text-foreground lg:h-11 lg:px-5 lg:text-frame-meta";

/** Soonest first. */
const byStart = (a: BookingEntry, b: BookingEntry) => Date.parse(a.booking.startTime) - Date.parse(b.booking.startTime);

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/** The tabs in the order their capsules sit. Called-off bookings only get theirs when there are some. */
const TABS: readonly BookingPhase[] = ["ahead", "past", "cancelled"];

const TAB_LABEL = {
  ahead: "tabUpcoming",
  past: "tabPast",
  cancelled: "filterCancelled",
} as const satisfies Record<BookingPhase, string>;

/** The id a day's group carries, for the small month to take the list to it. */
const dayAnchor = (day: string) => `day-${day}`;

/**
 * The tabs as capsules, the chosen one filled in ink: the notification
 * centre's filters and the payments page's, one for one.
 */
function BookingTabs({
  value,
  tabs,
  onChange,
}: {
  readonly value: BookingPhase;
  readonly tabs: readonly BookingPhase[];
  readonly onChange: (next: BookingPhase) => void;
}) {
  const t = useTranslations("bookings");

  return (
    // `<fieldset>`: a group by its own semantics; reset so it lays out as the row it was.
    <fieldset
      aria-label={t("filterLabel")}
      className="-mx-5 flex min-w-0 gap-2 overflow-x-auto border-0 px-5 py-0 md:-mx-10 md:px-10 lg:mx-0 lg:gap-3 lg:px-0"
    >
      {tabs.map((key) => {
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
            {t(TAB_LABEL[key])}
          </Button>
        );
      })}
    </fieldset>
  );
}

/**
 * One booking, as a meeting list shows a meeting: the hours stacked at the
 * left, a bar in the booking's colour, what it is and with whom and how it
 * stands, and for one still ahead its way in, as a meeting has its join
 * button: at the right edge from `lg`, under the text on a phone.
 *
 * A plain click opens the booking over the list (`onOpen`); the name is still
 * a link to the booking's own page, so a new tab or a copied address works.
 */
function BookingRow({
  entry,
  now,
  onOpen,
}: {
  readonly entry: BookingEntry;
  readonly now: number;
  readonly onOpen: (bookingId: string) => void;
}) {
  const t = useTranslations("bookings");
  const clock = useClock();
  const standing = useStanding()(entry.booking, now);
  const ways = useWaysOn(entry, now);
  const { booking, service, advisor } = entry;
  const ahead = bookingPhase(booking, now) === "ahead";
  const MainIcon = ways.main.icon;
  const wayIn = (className: string) =>
    ahead ? (
      // Above the stretched link, so it takes its own press.
      <Button
        className={cn(
          "relative z-10 h-9 shrink-0 gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:h-11 lg:gap-2 lg:px-5 lg:text-frame-meta",
          className,
        )}
        nativeButton={false}
        render={<Link href={ways.main.href} />}
      >
        {MainIcon ? <MainIcon aria-hidden className="size-4 lg:size-5" /> : null}
        {ways.main.label}
      </Button>
    ) : null;

  return (
    <li className="relative -mx-3 flex items-stretch gap-3 rounded-card px-3 py-3 transition-colors duration-150 has-[a:hover]:bg-muted/60 motion-reduce:transition-none lg:-mx-4 lg:items-center lg:gap-5 lg:px-4 lg:py-4">
      <span className="flex w-11 shrink-0 flex-col font-latin tabular-nums lg:w-16">
        <span className="text-sm font-semibold text-foreground lg:text-frame-meta">{clock(booking.startTime)}</span>
        <span className="text-xs text-muted-foreground lg:text-frame-label">{clock(booking.endTime)}</span>
      </span>
      <span aria-hidden className={cn("w-1 shrink-0 self-stretch rounded-full lg:w-1.5", standing.dot)} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 lg:gap-1">
        <Link
          className="max-w-full truncate text-sm font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-ring/50 lg:text-frame-body"
          href={`/bookings/detail?bookingId=${booking.id}`}
          onClick={(event) => {
            // A new tab or window keeps the link's own behaviour.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            onOpen(booking.id);
          }}
        >
          {service?.name ?? t("detailsUnavailableValue")}
        </Link>
        <span className="max-w-full truncate text-xs text-muted-foreground lg:text-frame-meta">
          {advisor ? `${advisor.displayName} · ` : null}
          <span className={standing.ink}>{standing.label}</span>
        </span>
        {wayIn("mt-2 lg:hidden")}
      </span>
      {wayIn("hidden lg:inline-flex")}
    </li>
  );
}

/**
 * The tab's bookings a day to a group, the way a scheduling app lists its
 * meetings: the day's name over its bookings, a hairline between days. The
 * days run as the caller orders them, soonest first ahead and latest first
 * behind; within a day the clock decides. Each day is anchored for the small
 * month to take the list to it.
 */
function Timeline({
  entries,
  today,
  now,
  onOpen,
}: {
  readonly entries: readonly BookingEntry[];
  readonly today: string;
  readonly now: number;
  readonly onOpen: (bookingId: string) => void;
}) {
  const t = useTranslations("bookings");
  const format = useFormatter();
  const dayKey = useDayKey();

  const days: { key: string; rows: BookingEntry[] }[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.booking.startTime);
    const last = days.at(-1);
    if (last?.key === key) last.rows.push(entry);
    else days.push({ key, rows: [entry] });
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {days.map((day) => (
        // `scroll-mt`, so a jump from the small month lands with the day's name in view.
        <section aria-labelledby={dayAnchor(day.key)} className="scroll-mt-6 pt-5 pb-2 lg:pt-7 lg:pb-3" key={day.key}>
          <h2 className="text-sm font-semibold text-foreground lg:text-frame-meta" id={dayAnchor(day.key)}>
            {format.dateTime(dayDate(day.key), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {day.key === today ? <span className="font-normal text-primary"> · {t("today")}</span> : null}
          </h2>
          <ul className="mt-1 flex flex-col lg:mt-2">
            {day.rows.toSorted(byStart).map((entry) => (
              <BookingRow entry={entry} key={entry.booking.id} now={now} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Nothing to list, unboxed like the notification centre's: one muted icon,
 * what will show here, and the way to book. Centred in the space below on a
 * phone; from `lg` a box that fills the column down to the panel's foot.
 *
 * `body` and the way to book are for nothing ahead; a past or called-off tab
 * with nothing in it only says so.
 */
function EmptyBox({ title, body }: { readonly title: string; readonly body?: string }) {
  const t = useTranslations("bookings");

  return (
    <div className="mt-6 flex w-full flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:mt-8 lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <CalendarDays aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h2>
        {body ? <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p> : null}
      </div>
      {body ? (
        <Button
          className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
          nativeButton={false}
          render={<Link href="/search" />}
        >
          {t("findExpert")}
        </Button>
      ) : null}
    </div>
  );
}

/** A tab with nothing in it. Nothing ahead is the one worth a way on: finding the next expert. */
function TabEmpty({ tab }: { readonly tab: BookingPhase }) {
  const t = useTranslations("bookings");
  return tab === "ahead" ? (
    <EmptyBox body={t("emptyBody")} title={t("emptyUpcoming")} />
  ) : (
    <EmptyBox title={t("emptyPast")} />
  );
}

/** No bookings at all. */
function NoBookings() {
  const t = useTranslations("bookings");
  return <EmptyBox body={t("emptyBody")} title={t("emptyUpcoming")} />;
}

/** The list's own shape while it loads, so nothing shifts when it lands: capsules, a day, rows. */
function ListSkeleton() {
  return (
    <div aria-busy className="mt-5 flex w-full flex-col lg:mt-8">
      <div aria-hidden className="flex gap-2 lg:gap-3">
        {[0, 1].map((i) => (
          <span className={cn(BONE, "h-9 w-24 rounded-full lg:h-12 lg:w-32")} key={i} />
        ))}
      </div>
      <span aria-hidden className={cn(BONE, "mt-6 h-4 w-48 rounded lg:mt-8 lg:h-5 lg:w-64")} />
      {[0, 1, 2].map((i) => (
        <div aria-hidden className="flex items-start gap-3 py-3 lg:gap-5 lg:py-4" key={i}>
          <span className={cn(BONE, "h-8 w-11 shrink-0 rounded lg:h-10 lg:w-16")} />
          <span className={cn(BONE, "h-10 w-1 shrink-0 rounded-full lg:h-12 lg:w-1.5")} />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className={cn(BONE, "h-4 w-1/2 rounded")} />
            <span className={cn(BONE, "h-3.5 w-1/3 rounded")} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The phone's small month: it opens just under its button, over the list
 * rather than pushing it down, smaller than the desktop's month at its
 * proportions: w-68 less its padding leaves 34-wide days 32 tall, the
 * desktop's 42 by 40 scaled down.
 */
function PhoneMonth({
  open,
  onOpenChange,
  children,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations("bookings");

  return (
    <Popover.Root onOpenChange={onOpenChange} open={open}>
      <Popover.Trigger
        aria-label={t("calendarLabel")}
        render={
          <Button
            className={cn(
              "size-9 shrink-0 rounded-full border border-border lg:hidden",
              open &&
                "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground",
            )}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <CalendarDays aria-hidden className="size-4.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end" className="isolate z-50 outline-none" collisionPadding={16} side="bottom" sideOffset={8}>
          <Popover.Popup
            aria-label={t("calendarLabel")}
            className="w-68 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-card border border-border bg-card px-4 pt-2.5 pb-3 text-foreground shadow-hero-card outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * `/bookings`: the advisee's sessions as scheduling apps list them for the
 * one who booked: upcoming, past and called-off as capsules, each a day to a
 * group, soonest first ahead and latest first behind. A booking opens over the
 * list (`BookingDialog`), where its details and everything that can be done
 * with it sit together.
 *
 * From `lg` a small month stands beside the list as an aid, the booked days
 * dotted; pressing one takes the list to it. Not the page itself: an advisee
 * books a few sessions, and a month of empty cells would push the few that
 * matter behind a press. The month view belongs to the advisor, whose days
 * fill up.
 */
export function MyBookingsScreen() {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const s = useTranslations("search");
  const now = useMountTime();
  const dayKey = useDayKey();
  // Null until the reader picks a tab or moves the month: the tab is what is
  // ahead till then, and the month the next session's.
  const [chosen, setChosen] = useState<BookingPhase | null>(null);
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  // Below `lg` the small month waits behind its button and opens just under it.
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Which booking is open, kept apart from whether the dialog is: the booking
  // stays on screen while the dialog plays its exit. By id, so the card shows
  // the booking as the list reads it again after a change.
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const bookingsFetcher = useCallback((signal: AbortSignal) => listMyBookings({ limit: 50 }, signal), []);
  const servicesFetcher = useCallback((signal: AbortSignal) => listServices({ limit: 100 }, signal), []);
  const advisorsFetcher = useCallback((signal: AbortSignal) => listAdvisors({ limit: 100 }, signal), []);

  const bookings = useResource<Paginated<ApiBooking>>("bookings/me?limit=50", bookingsFetcher);
  const services = useResource<Paginated<ApiPublicService>>("services?limit=100", servicesFetcher);
  const advisors = useResource<Paginated<ApiPublicAdvisor>>("advisors?limit=100", advisorsFetcher);
  // Kept on screen while the list is read again after a change made in the
  // open card, so the card keeps what it was saying (a cancellation to check,
  // or to try again).
  const read = useLastAnswer(bookings);

  const serviceById = new Map((services.data?.items ?? []).map((service) => [service.id, service]));
  const advisorById = new Map((advisors.data?.items ?? []).map((advisor) => [advisor.id, advisor]));

  const entries: readonly BookingEntry[] = (read?.items ?? [])
    .map((booking) => ({
      booking,
      service: serviceById.get(booking.serviceId),
      advisor: advisorById.get(booking.advisorId),
    }))
    .toSorted(byStart);
  const inPhase = (phase: BookingPhase) => entries.filter((entry) => bookingPhase(entry.booking, now) === phase);
  const lists: Record<BookingPhase, readonly BookingEntry[]> = {
    ahead: inPhase("ahead"),
    past: inPhase("past").toReversed(),
    cancelled: inPhase("cancelled").toReversed(),
  };
  const tabs = TABS.filter((tab) => tab !== "cancelled" || lists.cancelled.length > 0);
  // The page always opens on what is ahead, empty or not, as scheduling apps
  // do: that is what a visit is for, and an empty one says how to book. A tab
  // that has emptied (the last called-off booking is gone) falls back there too.
  const tab = chosen && tabs.includes(chosen) ? chosen : "ahead";
  const rows = lists[tab];

  const byDay = new Map<string, BookingEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.booking.startTime);
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }
  const today = dayKey(now);
  const next = lists.ahead[0];
  const month = shownMonth ?? (next ? dayKey(next.booking.startTime) : today).slice(0, 7);

  const openEntry = entries.find((entry) => entry.booking.id === openId) ?? null;
  const open = (bookingId: string) => {
    setOpenId(bookingId);
    setDialogOpen(true);
  };
  // A booked day on the small month: the tab its first booking is in, then the
  // list scrolled to the day once the tab has drawn it.
  const pick = (day: string) => {
    const first = byDay.get(day)?.[0];
    if (!first) return;
    setChosen(bookingPhase(first.booking, now));
    // On a phone the month's popover closes, so the day is in view under it.
    setCalendarOpen(false);
    requestAnimationFrame(() =>
      document.getElementById(dayAnchor(day))?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const changed = () => {
    // The booking's own page reads it under its id; the list is read again here.
    invalidate("bookings/");
    bookings.reload();
  };

  const failed = bookings.error;
  const miniMonth = (
    <MiniMonth
      byDay={byDay}
      month={month}
      now={now}
      onPick={pick}
      onStep={(by) => setShownMonth(shiftMonth(month, by))}
      today={today}
    />
  );

  let body: ReactNode;
  if (failed) {
    // The API's own sentence, not a translated guess. For a missing session it
    // is the only thing that tells "sign in" from "the server is not running",
    // so both the retry and the way in are offered and the reader picks.
    body = (
      <div className="flex w-full flex-col items-start gap-2 pt-8 lg:pt-12">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{s("loadFailedTitle")}</h2>
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{failed.message}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button className={ACTION} onClick={bookings.reload} type="button" variant="ghost">
            {s("retry")}
          </Button>
          {failed instanceof ApiError && failed.isUnauthenticated ? (
            <Button className={ACTION} nativeButton={false} render={<Link href="/login" />} variant="ghost">
              {c("login")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  } else if (!read) {
    body = <ListSkeleton />;
  } else if (entries.length === 0) {
    body = <NoBookings />;
  } else {
    body = (
      // `lg:flex-1` and no `items-start`: the list's column runs to the panel's
      // foot, so a tab with nothing in it can fill it; the month keeps its own
      // height (`self-start`), which its stickiness needs.
      <div className="mt-5 flex flex-1 flex-col lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <BookingTabs onChange={setChosen} tabs={tabs} value={tab} />
            </div>
            <PhoneMonth onOpenChange={setCalendarOpen} open={calendarOpen}>
              {miniMonth}
            </PhoneMonth>
          </div>
          {rows.length > 0 ? <Timeline entries={rows} now={now} onOpen={open} today={today} /> : <TabEmpty tab={tab} />}
        </div>
        {/* Dropped by the capsules' row and the gap under it, so its top lines
            up with what the tab shows (an empty tab's box, or its first day)
            rather than with the capsules; the same on every tab, so switching
            never moves it. */}
        <aside className="hidden lg:sticky lg:top-8 lg:mt-20 lg:block lg:self-start">{miniMonth}</aside>
      </div>
    );
  }

  return (
    <MobileScreen className="bg-card pb-0" wide="md">
      <AppFrame active="bookings">
        <ScreenBody className="bg-card pb-18 lg:pb-0">
          <div className={PHONE_BAR}>
            <TopBar dock unreadNotifications />
          </div>

          <AccountShell active="bookings">
            {/* `pt-2`: on a phone this is a tab of its own, with no back chevron
                above the title to make room for. `flex-1` at every width: the
                column takes what the screen has left and no more, so an empty
                tab's box fills it exactly and the page has nothing to scroll. */}
            <div className={cn("flex w-full min-w-0 flex-1 flex-col pt-2 pb-12 lg:pt-0 lg:pb-0", FEED_COLUMN, GUTTER)}>
              <header className="flex w-full flex-col items-start">
                <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:text-frame-title">
                  {t("title")}
                </h1>
              </header>
              {body}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
      <BottomBar className="lg:hidden" role="user" selected="bookings" />
      <BookingDialog
        entry={openEntry}
        now={now}
        onChanged={changed}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </MobileScreen>
  );
}
