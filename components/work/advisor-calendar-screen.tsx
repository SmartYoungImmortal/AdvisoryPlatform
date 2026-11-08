"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CalendarDeskBox,
  CalendarDeskControlBones,
  CalendarDeskControls,
  CalendarDeskMonth,
  CalendarDeskWeek,
  CalendarDeskWeekBones,
  CalendarMonthMenu,
  CalendarViewMenu,
  type CalendarView,
} from "@/components/work/calendar-desk-views";
import {
  CalendarHours,
  SessionBlock,
  asDay,
  hourSpan,
  laySessions,
  noonOf,
  share,
  shiftDay,
  weekOf,
} from "@/components/work/calendar-time-grid";
import { DESK_BONE } from "@/components/work/desk-parts";
import { useAdvisorBookings } from "@/components/work/work-data";
import { WorkHub } from "@/components/work/work-hub";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/**
 * `/work/calendar`: the advisor's sessions by the clock. Below `lg` the
 * month over a strip of the week's days, the chosen day's number in the ink
 * circle and a dot under each day with a session, then that day hour by
 * hour. From `lg` the month large with its menu and the view's capsule, then
 * the week hour by hour or the month as tiles, with the way back, today and
 * the way on floating at the foot. `?day=` (and `?view=month`) name what is
 * shown, and every move writes them back, so coming back from a session
 * lands where it was opened.
 */

export function AdvisorBookingReadState({
  failed = false,
  retry,
}: {
  readonly failed?: boolean;
  readonly retry?: () => void;
}) {
  const t = useTranslations("advisorBookings");
  return (
    <div
      className="flex w-full flex-col items-center gap-3 px-6 py-10"
      role={failed ? "alert" : "status"}
    >
      <p className="text-sm text-muted-foreground">
        {t(failed ? "loadFailed" : "loading")}
      </p>
      {retry ? (
        <Button onClick={retry} type="button" variant="outline">
          <RotateCw aria-hidden />
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Sessions still on their way, each at `SessionRow`'s measure: the circle,
 * the service over the advisee, the time over where it stands at the right.
 * Each line is one line box of its text's step (`h-lh`) with the bone
 * inside, so a row stands as tall as a real one.
 */
export function SessionRowBones({ rows = 2 }: { readonly rows?: number }) {
  return (
    <ul aria-hidden className="flex w-full flex-col">
      {Array.from({ length: rows }, (_, row) => (
        <li
          className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5"
          key={row}
        >
          <span
            className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
            <span className="flex h-lh items-center text-sm lg:text-frame-body">
              <span className={cn(DESK_BONE, "h-3.5 w-1/2 rounded lg:h-4.5")} />
            </span>
            <span className="flex h-lh items-center text-xs lg:text-frame-meta">
              <span className={cn(DESK_BONE, "h-3 w-1/3 rounded lg:h-4")} />
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
            <span className="flex h-lh items-center text-sm lg:text-frame-meta">
              <span
                className={cn(DESK_BONE, "h-3.5 w-20 rounded lg:h-4 lg:w-24")}
              />
            </span>
            <span className="flex h-lh items-center text-xs lg:text-frame-label">
              <span
                className={cn(DESK_BONE, "h-3 w-12 rounded lg:h-3.5 lg:w-14")}
              />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The page under the frame's band. */
const PAGE = "mt-5 flex w-full min-w-0 flex-col lg:mt-8";

/** The phone's round grey buttons, and the "today" capsule at their height. */
const ROUND =
  "size-10 rounded-full bg-muted text-foreground hover:bg-muted/70 hover:text-foreground";
const PILL =
  "h-10 rounded-full bg-muted px-4 text-sm font-medium text-foreground hover:bg-muted/70 hover:text-foreground";

/** The week's strip, its hairline under it running to the phone's edges. */
const STRIP =
  "-mx-5 mt-4 grid grid-cols-7 border-b border-border px-5 pb-3 md:mx-0 md:px-0";

/** A day of the strip: its letter, its number in the circle, the dot. */
const DAY_CELL = "flex h-auto flex-col items-center gap-0 px-0 py-1";
const CIRCLE = "mt-2 flex size-9 items-center justify-center rounded-full";
const DOT = "mt-1 size-1.5 rounded-full";

/** The phone's day: 08:00 to 20:00 at the least, an hour either side of its sessions. */
const DAY_FROM = 8;
const DAY_TO = 20;

/** A week known to start on Sunday, for the weekdays' letters before any date is. */
const A_SUNDAY = "2023-01-01";

/** The time, again each minute: today, and the red line on the week. */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * The calendar while it loads, in its own shape so nothing shifts when it
 * lands: below `lg` the month's row, the strip's letters over bones in the
 * circles, and the hours with bones for labels; from `lg` the title and the
 * capsule, the week's head and hours, and the floating controls.
 */
function CalendarSkeleton() {
  const t = useTranslations("advisorBookings");
  const format = useFormatter();

  return (
    <div aria-busy className={PAGE}>
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className="lg:hidden">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex h-lh items-center font-hero text-xl">
            <span className={cn(DESK_BONE, "h-5 w-36 rounded")} />
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={cn(DESK_BONE, "size-10 rounded-full")} />
            <span className={cn(DESK_BONE, "size-10 rounded-full")} />
            <span className={cn(DESK_BONE, "h-10 w-18 rounded-full")} />
          </span>
        </div>
        <div className={STRIP}>
          {weekOf(A_SUNDAY).map((date) => (
            <span className={cn(DAY_CELL, "border border-transparent")} key={date}>
              <span className="text-xs text-muted-foreground">
                {format.dateTime(noonOf(date), { weekday: "narrow", timeZone: "UTC" })}
              </span>
              <span className={cn(DESK_BONE, CIRCLE)} />
              <span className={DOT} />
            </span>
          ))}
        </div>
        <div className="mt-8 pb-3">
          <CalendarHours bones first={DAY_FROM} last={DAY_TO} size="phone" />
        </div>
      </div>
      <div aria-hidden className="hidden lg:block">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <span className="flex h-lh items-center text-frame-title">
              <span className={cn(DESK_BONE, "h-9 w-72 rounded-lg")} />
            </span>
            <span className={cn(DESK_BONE, "size-10 rounded-full")} />
          </span>
          <span className={cn(DESK_BONE, "h-10 w-24.5 rounded-full")} />
        </div>
        <CalendarDeskBox controls={<CalendarDeskControlBones />}>
          <CalendarDeskWeekBones />
        </CalendarDeskBox>
      </div>
    </div>
  );
}

export function AdvisorCalendarScreen() {
  return (
    <WorkHub tab="calendar">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarFromQuery />
      </Suspense>
    </WorkHub>
  );
}

/** What the address names: the day shown, and the month view when it is that. */
function CalendarFromQuery() {
  const params = useSearchParams();
  const day = asDay(params.get("day"));
  const view: CalendarView = params.get("view") === "month" ? "month" : "week";
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  if (profile.error) {
    return <AdvisorBookingReadState failed retry={profile.reload} />;
  }
  if (!profile.data) return <CalendarSkeleton />;
  return <CalendarData profile={profile.data} queryDay={day} queryView={view} />;
}

function CalendarData({
  profile,
  queryDay,
  queryView,
}: {
  readonly profile: ApiOwnProfile;
  readonly queryDay: string | null;
  readonly queryView: CalendarView;
}) {
  const t = useTranslations("advisorBookings");
  const format = useFormatter();
  const bookings = useAdvisorBookings(profile);
  const now = useMinuteClock();
  const [picked, setPicked] = useState<{ readonly day: string; readonly view: CalendarView } | null>(null);
  const timeZone = profile.timezone;
  const today = bookingDay(now, timeZone);
  const day = picked?.day ?? queryDay ?? today;
  const view = picked?.view ?? queryView;

  if (bookings.error) {
    return <AdvisorBookingReadState failed retry={bookings.reload} />;
  }
  if (!bookings.data) return <CalendarSkeleton />;

  /** Show `next` (in `nextView`), and name it in the address for the way back. */
  function go(next: string, nextView: CalendarView = view) {
    setPicked({ day: next, view: nextView });
    const params = new URLSearchParams(window.location.search);
    params.set("day", next);
    if (nextView === "month") params.set("view", "month");
    else params.delete("view");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  const byDay = new Map<string, AdvisorBooking[]>();
  for (const booking of bookings.data.toSorted((a, b) => a.startTime.localeCompare(b.startTime))) {
    const key = bookingDay(booking.startTime, timeZone);
    byDay.set(key, [...(byDay.get(key) ?? []), booking]);
  }
  const week = weekOf(day);
  const month = day.slice(0, 7);
  const monthLabel = format.dateTime(noonOf(day), { month: "long", year: "numeric", timeZone: "UTC" });
  const fullDate = (date: string) => format.dateTime(noonOf(date), { dateStyle: "full", timeZone: "UTC" });
  const daySlots = laySessions(byDay.get(day) ?? [], timeZone);
  const { first, last } = hourSpan(daySlots, DAY_FROM, DAY_TO, 1);
  const rows = last - first;

  function step(offset: number) {
    go(view === "week" ? shiftDay(day, offset * 7) : `${moveMonth(month, offset)}-01`);
  }

  return (
    <div className={PAGE}>
      <div className="lg:hidden">
        <div className="flex w-full items-center justify-between gap-3">
          <h2 aria-live="polite" className="min-w-0 truncate font-hero text-xl font-medium tracking-tight text-hero-ink">
            {monthLabel}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button aria-label={t("previousWeek")} className={ROUND} onClick={() => go(shiftDay(day, -7))} size="icon" type="button" variant="ghost">
              <ChevronLeft aria-hidden className="size-5" />
            </Button>
            <Button aria-label={t("nextWeek")} className={ROUND} onClick={() => go(shiftDay(day, 7))} size="icon" type="button" variant="ghost">
              <ChevronRight aria-hidden className="size-5" />
            </Button>
            <Button className={PILL} onClick={() => go(today)} type="button" variant="ghost">
              {t("today")}
            </Button>
          </div>
        </div>
        <div className={STRIP}>
          {week.map((date) => {
            const count = byDay.get(date)?.length ?? 0;
            const selected = date === day;
            return (
              <Button
                aria-current={date === today ? "date" : undefined}
                aria-label={`${fullDate(date)}, ${t("bookingCount", { count })}`}
                aria-pressed={selected}
                className={cn(DAY_CELL, "hover:bg-transparent dark:hover:bg-transparent")}
                key={date}
                onClick={() => go(date)}
                type="button"
                variant="ghost"
              >
                <span className="text-xs font-normal text-muted-foreground">
                  {format.dateTime(noonOf(date), { weekday: "narrow", timeZone: "UTC" })}
                </span>
                <span
                  className={cn(
                    CIRCLE,
                    "font-latin text-base font-medium tabular-nums",
                    selected
                      ? "bg-hero-action text-hero-action-foreground"
                      : cn(
                          "group-hover/button:bg-muted",
                          date === today && "font-bold text-foreground",
                          date < today && "text-muted-foreground",
                          date > today && "text-foreground",
                        ),
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                <span aria-hidden className={cn(DOT, count ? "bg-foreground" : "bg-transparent")} />
              </Button>
            );
          })}
        </div>
        <section aria-label={fullDate(day)} className="mt-8 pb-3">
          <CalendarHours first={first} last={last} size="phone">
            {daySlots.length ? (
              <ul>
                {daySlots.map((slot) => (
                  <SessionBlock first={first} key={slot.booking.id} last={last} now={now} size="phone" slot={slot} timeZone={timeZone} />
                ))}
              </ul>
            ) : (
              <p
                className="absolute inset-x-0 -translate-y-1/2 text-center text-sm text-muted-foreground"
                style={{ top: share(Math.floor(rows / 2) + 0.5, rows) }}
              >
                {t("emptyDay")}
              </p>
            )}
          </CalendarHours>
        </section>
      </div>

      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-1">
            <h2 aria-live="polite" className="truncate font-hero text-frame-title font-medium tracking-tight text-hero-ink">
              {monthLabel}
            </h2>
            <CalendarMonthMenu
              month={month}
              onPick={(next) => go(next === today.slice(0, 7) ? today : `${next}-01`)}
            />
          </div>
          <CalendarViewMenu onChange={(next) => go(day, next)} view={view} />
        </div>
        <CalendarDeskBox controls={<CalendarDeskControls onStep={step} onToday={() => go(today)} view={view} />}>
          {view === "week" ? (
            <CalendarDeskWeek byDay={byDay} now={now} timeZone={timeZone} today={today} week={week} />
          ) : (
            <CalendarDeskMonth byDay={byDay} month={month} onPick={(date) => go(date, "week")} timeZone={timeZone} today={today} />
          )}
        </CalendarDeskBox>
      </div>
    </div>
  );
}
