"use client";

import { CalendarDays, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
import { Button } from "@/components/ui/button";
import { DESK_BONE, DeskSection } from "@/components/work/desk-parts";
import { BoneLine, LIST_SECTION, isAhead } from "@/components/work/today-parts";
import { getAdvisorBooking, type AdvisorBooking, type AdvisorBookingDetail } from "@/lib/api/advisor-bookings";
import { useResource } from "@/lib/api/use-resource";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** How long before its start a session's card offers the room rather than its details. */
const JOIN_WINDOW = 15 * 60_000;

/** The cards' grid: one column on a phone, two from `sm`, three from `xl`. */
const CARD_GRID = "grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3";

/** A card's capsule: a step under the page's own actions, so two sit side by side in a third of the row. */
const CARD_PILL = "h-9 w-auto shrink-0 px-4 text-sm md:h-9 md:px-4 md:text-sm lg:h-11 lg:px-5 lg:text-frame-meta";

/** Where a session of today stands against the clock. */
type Phase = "ahead" | "live" | "ended";

/** The chip each phase wears: the time still to go on grey, under way in ink, done muted. */
const CHIP: Record<Phase, string> = {
  ahead: "bg-muted text-foreground",
  live: "bg-hero-action text-hero-action-foreground",
  ended: "bg-muted text-muted-foreground",
};

/** Today's sessions in the advisor's zone that are theirs — booked, under way or done — by their start. */
export function todaysSessions(bookings: readonly AdvisorBooking[], now: number, timeZone: string): AdvisorBooking[] {
  const today = bookingDay(now, timeZone);
  return bookings
    .filter(
      (booking) =>
        (booking.state === "BOOKED" || booking.state === "IN_PROGRESS" || booking.state === "COMPLETED") &&
        bookingDay(booking.startTime, timeZone) === today,
    )
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
}

function phaseOf(booking: AdvisorBooking, now: number): Phase {
  if (booking.state === "COMPLETED" || Date.parse(booking.endTime) <= now) return "ended";
  return Date.parse(booking.startTime) <= now ? "live" : "ahead";
}

/** "อีก 25 นาที", "อีก 3 ชม. 10 นาที": how long until a session of today starts. */
function useStartsIn(now: number): (booking: AdvisorBooking) => string {
  const t = useTranslations("workDesk");
  return (booking) => {
    const minutes = Math.ceil((Date.parse(booking.startTime) - now) / 60_000);
    if (minutes < 60) return t("startsInMinutes", { minutes });
    return t("startsInHours", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  };
}

/**
 * One session of today as a card: its time large with where it stands at
 * the right, who in the soft circle over the service, then the way in — the
 * room in ink once it is under way or about to start, its details before
 * that — and the chat when the booking has one. A session that is over goes
 * quiet, its ink muted.
 */
function SessionCard({ booking, now, timeZone }: {
  readonly booking: AdvisorBooking;
  readonly now: number;
  readonly timeZone: string;
}) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const startsIn = useStartsIn(now);
  const detail = useResource<AdvisorBookingDetail>(
    `advisors/me/bookings/${booking.id}`,
    useCallback((signal: AbortSignal) => getAdvisorBooking(booking.id, signal), [booking.id]),
  );
  const clock = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const phase = phaseOf(booking, now);
  const ended = phase === "ended";
  const joinable = phase === "live" || (phase === "ahead" && Date.parse(booking.startTime) - now <= JOIN_WINDOW);
  const chatRoomId = detail.data?.chatRoomId;
  const href = `/work/session?id=${booking.id}`;

  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-4 lg:gap-5 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "font-latin text-lg font-semibold whitespace-nowrap tabular-nums lg:text-frame-figure",
            ended ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {clock(booking.startTime)}–{clock(booking.endTime)}
        </p>
        <span
          className={cn(
            "flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap lg:h-9 lg:px-3.5 lg:text-frame-label",
            CHIP[phase],
          )}
        >
          <Figures>{phase === "ahead" ? startsIn(booking) : t(phase === "live" ? "inSession" : "stateEnded")}</Figures>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium lg:size-12 lg:text-frame-body",
            ended ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {booking.adviseeName.trim().slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
          <span className={cn("truncate text-sm font-medium lg:text-frame-body", ended ? "text-muted-foreground" : "text-foreground")}>
            {booking.adviseeName}
          </span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">{booking.serviceName}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 lg:gap-3">
        {joinable ? (
          <Button className={cn(authPill(true), CARD_PILL)} nativeButton={false} render={<Link href={href} />}>
            {t("joinNow")}
          </Button>
        ) : (
          <Button className={cn(authPill(false), CARD_PILL)} nativeButton={false} render={<Link href={href} />} variant="outline">
            {t("openSession")}
          </Button>
        )}
        {chatRoomId ? (
          <Button
            className={cn(authPill(false), CARD_PILL)}
            nativeButton={false}
            render={<Link href={`/chat/room?id=${chatRoomId}`} />}
            variant="outline"
          >
            <MessageSquare aria-hidden />
            {t("openChat")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** A card while the bookings load: the time and its chip, the circle over two lines, and the two capsules. */
function SessionCardBone() {
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border p-4 lg:gap-5 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <BoneLine bone="h-5 w-28 lg:h-6 lg:w-36" text="text-lg lg:text-frame-figure" />
        <span className={cn(DESK_BONE, "h-7 w-20 shrink-0 rounded-full lg:h-9 lg:w-24")} />
      </div>
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <BoneLine bone="h-3.5 w-28 lg:h-4.5 lg:w-36" text="text-sm lg:text-frame-body" />
          <BoneLine bone="h-3 w-36 lg:h-4 lg:w-48" text="text-xs lg:text-frame-meta" />
        </span>
      </div>
      <div className="flex flex-wrap gap-2 lg:gap-3">
        <span className={cn(DESK_BONE, "h-9 w-28 rounded-full lg:h-11 lg:w-36")} />
        <span className={cn(DESK_BONE, "h-9 w-20 rounded-full lg:h-11 lg:w-24")} />
      </div>
    </li>
  );
}

/** No session today, but one ahead: one compact box saying so, and the next one as the way to it. */
function NoneToday({ next, timeZone }: { readonly next: AdvisorBooking; readonly timeZone: string }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const when = format.dateTime(new Date(next.startTime), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border p-4 lg:gap-1.5 lg:p-5">
      <p className="text-sm font-medium text-foreground lg:text-frame-body">{t("todayEmpty")}</p>
      <Link
        className="max-w-full self-start truncate rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta"
        href={`/work/session?id=${next.id}`}
      >
        {t("nextTitle")}
        {" · "}
        <Figures>{when}</Figures>
        {" · "}
        {next.adviseeName}
      </Link>
    </div>
  );
}

/** Nothing booked at all: one muted icon, what will land here, and the way to the services — the transactions page's empty box. */
function NothingAhead() {
  const t = useTranslations("workDesk");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border px-6 py-12 text-center lg:gap-5 lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <CalendarDays aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("emptyTitle")}</h3>
        <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{t("emptyBody")}</p>
      </div>
      <Button
        className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
        nativeButton={false}
        render={<Link href="/advisor/services" />}
      >
        {t("emptyAction")}
      </Button>
    </div>
  );
}

/**
 * "นัดวันนี้": today's sessions in the advisor's zone as cards, by start.
 * With none today, one compact box says so and points at the next session;
 * with nothing booked at all, the empty box and the way to the services.
 * `bookings` not given yet draws two cards' bones; `failure` stands in for
 * the body when the bookings could not be read.
 */
export function TodaySessions({ bookings, now, timeZone, failure }: {
  readonly bookings: readonly AdvisorBooking[] | undefined;
  readonly now: number;
  readonly timeZone?: string;
  readonly failure?: ReactNode;
}) {
  const t = useTranslations("workDesk");

  let body: ReactNode;
  if (failure) {
    body = failure;
  } else if (!bookings || timeZone === undefined) {
    body = (
      <ul aria-hidden className={CARD_GRID}>
        <SessionCardBone />
        <SessionCardBone />
      </ul>
    );
  } else {
    const sessions = todaysSessions(bookings, now, timeZone);
    const next = bookings.filter((booking) => isAhead(booking, now)).toSorted((a, b) => a.startTime.localeCompare(b.startTime))[0];
    if (sessions.length > 0) {
      body = (
        <ul className={CARD_GRID}>
          {sessions.map((booking) => (
            <SessionCard booking={booking} key={booking.id} now={now} timeZone={timeZone} />
          ))}
        </ul>
      );
    } else {
      body = next ? <NoneToday next={next} timeZone={timeZone} /> : <NothingAhead />;
    }
  }

  return (
    <DeskSection className={LIST_SECTION} id="work-today" title={t("todayTitle")}>
      {body}
    </DeskSection>
  );
}
