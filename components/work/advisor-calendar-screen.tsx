"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState, useSyncExternalStore } from "react";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { CalendarMonthBones, CalendarMonthGrid } from "@/components/work/calendar-month";
import { DESK_BONE, DeskSection } from "@/components/work/desk-parts";
import { SessionRow } from "@/components/work/session-row";
import { useAdvisorBookings } from "@/components/work/work-data";
import { WorkHub } from "@/components/work/work-hub";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { monthGrid } from "@/lib/calendar";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The month's row: its name at the left, "today" and the two chevrons at the right. */
const HEAD_ROW = "mt-5 flex w-full items-center justify-between gap-3 lg:mt-8";

const MONTH_NAME = "min-w-0 truncate font-hero text-xl font-normal tracking-tight text-hero-ink lg:text-frame-heading";

/** "Today", an outline capsule at the chevrons' height. */
const TODAY_PILL = "h-9 rounded-full px-3.5 text-sm font-medium shadow-none lg:h-11 lg:px-5 lg:text-frame-meta";

const CHEVRON = "size-9 rounded-full shadow-none lg:size-11";

/** The month's box under its row. */
const GRID_GAP = "mt-4 lg:mt-6";

/** The picked day's heading over its sessions, under the month. */
const DAY_SECTION = "mt-8 gap-3 lg:mt-12 lg:gap-4";

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

/** Nothing to listen to: the device's month is read once, after hydration. */
const noSubscription = () => () => {};

/**
 * How many weeks the device's own month spans. The account's zone is not
 * known while it loads; the device's agrees with it but at a month's edge.
 */
function deviceWeeks(): number {
  const now = new Date();
  return monthGrid(now.getFullYear(), now.getMonth() + 1).length / 7;
}

/** `?day=` when it is a real "YYYY-MM-DD"; anything else is not asked for. */
function askedDay(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

/**
 * The calendar while the account is on its way, in its own shape so nothing
 * shifts when it lands: the month's row (its name, "today" and the two
 * chevrons), the month's box of weeks under the weekdays' names, and under it
 * the day's heading over its sessions. `month` is the one `?day=` asked for,
 * so its weeks are counted; without it the device's month is.
 */
function CalendarSkeleton({ month }: { readonly month?: string }) {
  const t = useTranslations("advisorBookings");
  // The static export prerenders the build's month, so the page hydrates
  // with five weeks and then takes the device's count.
  const device = useSyncExternalStore(noSubscription, deviceWeeks, () => 5);
  const [year, monthNumber] = (month ?? "").split("-").map(Number);
  const weeks = month ? monthGrid(year, monthNumber).length / 7 : device;

  return (
    <div aria-busy className="flex w-full flex-col">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className={HEAD_ROW}>
        <span className="flex h-lh items-center font-hero text-xl lg:text-frame-heading">
          <span className={cn(DESK_BONE, "h-5 w-40 rounded lg:h-6 lg:w-48")} />
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={cn(DESK_BONE, "h-9 w-16 rounded-full lg:h-11 lg:w-20")} />
          <span className={cn(DESK_BONE, "size-9 rounded-full lg:size-11")} />
          <span className={cn(DESK_BONE, "size-9 rounded-full lg:size-11")} />
        </span>
      </div>
      <div className={GRID_GAP}>
        <CalendarMonthBones weeks={weeks} />
      </div>
      <div aria-hidden className={cn("flex min-w-0 flex-col", DAY_SECTION)}>
        <div className="flex min-h-11 items-end">
          <span className="flex h-lh items-center text-base lg:text-frame-body">
            <span className={cn(DESK_BONE, "h-4 w-56 rounded lg:h-5 lg:w-72")} />
          </span>
        </div>
        <SessionRowBones />
      </div>
    </div>
  );
}

/**
 * `/work/calendar`: the advisor's month as a host's calendar — the month's
 * name with "today" and the chevrons, the month's box with each day's
 * sessions in it, and under it the picked day's sessions as rows. `?day=`
 * opens on that day and its month; picking a day writes it back, so the way
 * back from a session lands on the same day.
 */
export function AdvisorCalendarScreen() {
  return (
    <WorkHub tab="calendar">
      {/* `useSearchParams` in a prerendered page reads in the browser only, under a boundary. */}
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarFromQuery />
      </Suspense>
    </WorkHub>
  );
}

function CalendarFromQuery() {
  const asked = askedDay(useSearchParams().get("day"));
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  if (profile.error) return <AdvisorBookingReadState failed retry={profile.reload} />;
  if (!profile.data) return <CalendarSkeleton month={asked?.slice(0, 7)} />;
  return <CalendarData asked={asked} profile={profile.data} />;
}

function CalendarData({
  profile,
  asked,
}: {
  readonly profile: ApiOwnProfile;
  /** The day `?day=` opened on, if any. */
  readonly asked: string | null;
}) {
  const t = useTranslations("advisorBookings");
  const locale = useLocale();
  const now = useMountTime();
  const today = bookingDay(now, profile.timezone);
  const [chosen, setChosen] = useState<string | null>(null);
  const resource = useAdvisorBookings(profile);
  const day = chosen ?? asked ?? today;
  const month = day.slice(0, 7);
  const byDay = new Map<string, AdvisorBooking[]>();
  for (const booking of (resource.data ?? []).toSorted((a, b) => a.startTime.localeCompare(b.startTime))) {
    const key = bookingDay(booking.startTime, profile.timezone);
    if (!key.startsWith(month)) continue;
    const list = byDay.get(key);
    if (list) list.push(booking);
    else byDay.set(key, [booking]);
  }
  const selected = byDay.get(day) ?? [];
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  const dayLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));

  /** Pick a day, and keep it in the address so returning from a session lands on it. */
  function go(next: string) {
    setChosen(next);
    window.history.replaceState(null, "", `?day=${next}`);
  }
  /** Another month: today when it is this one, its first day otherwise. */
  function turn(offset: number) {
    const next = moveMonth(month, offset);
    go(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  return (
    <div className="flex w-full flex-col">
      <div className={HEAD_ROW}>
        <h2 aria-live="polite" className={MONTH_NAME}>
          {monthLabel}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button className={TODAY_PILL} onClick={() => go(today)} type="button" variant="outline">
            {t("today")}
          </Button>
          <Button
            aria-label={t("previousMonth")}
            className={CHEVRON}
            onClick={() => turn(-1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden className="size-4 lg:size-5" />
          </Button>
          <Button
            aria-label={t("nextMonth")}
            className={CHEVRON}
            onClick={() => turn(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden className="size-4 lg:size-5" />
          </Button>
        </div>
      </div>
      <div className={GRID_GAP}>
        <CalendarMonthGrid
          byDay={byDay}
          month={month}
          now={now}
          onPick={go}
          selected={day}
          timeZone={profile.timezone}
          today={today}
        />
      </div>
      <DeskSection className={DAY_SECTION} id="calendar-day" title={dayLabel}>
        {resource.error ? (
          <AdvisorBookingReadState failed retry={resource.reload} />
        ) : !resource.data ? (
          <div aria-busy className="w-full">
            <span className="sr-only">{t("loading")}</span>
            <SessionRowBones />
          </div>
        ) : selected.length ? (
          <ul className="flex w-full flex-col">
            {selected.map((booking) => (
              <SessionRow
                booking={booking}
                key={booking.id}
                now={now}
                timeZone={profile.timezone}
              />
            ))}
          </ul>
        ) : (
          <p className="w-full rounded-2xl border border-border p-5 text-sm text-muted-foreground lg:text-frame-meta">
            {t("emptyDay")}
          </p>
        )}
      </DeskSection>
    </div>
  );
}
