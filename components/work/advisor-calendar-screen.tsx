"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { DESK_BONE, DeskSection } from "@/components/work/desk-parts";
import { SessionRow } from "@/components/work/session-row";
import { WorkHub } from "@/components/work/work-hub";
import {
  listAllAdvisorBookings,
  type AdvisorBooking,
} from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { WEEKDAY_KEYS, monthGrid } from "@/lib/calendar";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The month's card, and beside it from `lg` the day's list. */
const GRID =
  "mt-5 grid w-full gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";

const BLOCK = "flex w-full min-w-0 flex-col items-start gap-3 lg:gap-4";

/** The day's heading over its sessions, at the month card's spacing. */
const DAY_SECTION = "gap-3 lg:gap-4";

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

/**
 * The calendar while the account is on its way, in its own shape so nothing
 * shifts when it lands: the month's row (its two chevrons and its name), the
 * zone's line, the card of weeks under the weekdays' names, the count with
 * the refresh, and beside it the day's heading over its sessions.
 */
function CalendarSkeleton() {
  const t = useTranslations("advisorBookings");
  const s = useTranslations("serviceSchedule");
  // The static export prerenders the build's month, so the page hydrates
  // with five weeks and then takes the device's count.
  const weeks = useSyncExternalStore(noSubscription, deviceWeeks, () => 5);

  return (
    <div aria-busy className={GRID}>
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className={BLOCK}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-md")} />
          <span className="flex h-lh items-center text-base lg:text-frame-body">
            <span className={cn(DESK_BONE, "h-4 w-32 rounded lg:h-5 lg:w-40")} />
          </span>
          <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-md")} />
        </div>
        <span className="flex h-lh items-center text-xs lg:text-frame-label">
          <span className={cn(DESK_BONE, "h-3 w-36 rounded lg:h-3.5 lg:w-44")} />
        </span>
        <div className="w-full overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-7">
            {WEEKDAY_KEYS.map((key) => (
              <span
                className="py-2 text-center text-xs text-muted-foreground"
                key={key}
              >
                {s(`weekdayShort.${key}`)}
              </span>
            ))}
            {Array.from({ length: weeks * 7 }, (_, index) => (
              <span
                className="flex min-h-12 items-center justify-center lg:min-h-20 lg:border-t lg:border-border"
                key={index}
              >
                <span className="flex h-lh items-center text-sm">
                  <span className={cn(DESK_BONE, "h-3.5 w-4 rounded")} />
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <span className="flex h-lh items-center text-xs">
            <span className={cn(DESK_BONE, "h-3 w-16 rounded")} />
          </span>
          <span className="flex h-9 items-center px-2.5">
            <span className={cn(DESK_BONE, "h-3.5 w-16 rounded")} />
          </span>
        </div>
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

export function AdvisorCalendarScreen() {
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  return (
    <WorkHub tab="calendar">
      {profile.error ? (
        <AdvisorBookingReadState failed retry={profile.reload} />
      ) : profile.data ? (
        <CalendarData profile={profile.data} />
      ) : (
        <CalendarSkeleton />
      )}
    </WorkHub>
  );
}

function CalendarData({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("advisorBookings");
  const s = useTranslations("serviceSchedule");
  const locale = useLocale();
  const now = useMountTime();
  const today = bookingDay(now, profile.timezone);
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const fetcher = useCallback(
    (signal: AbortSignal) => listAllAdvisorBookings(signal),
    [],
  );
  const resource = useResource<AdvisorBooking[]>(
    `advisors/${profile.id}/bookings/all`,
    fetcher,
  );
  const month = shownMonth ?? today.slice(0, 7);
  const day = picked?.startsWith(month)
    ? picked
    : month === today.slice(0, 7)
      ? today
      : `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const cells = monthGrid(year, monthNumber);
  const entries = (resource.data ?? []).toSorted((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const inMonth = entries.filter((booking) =>
    bookingDay(booking.startTime, profile.timezone).startsWith(month),
  );
  const selected = inMonth.filter(
    (booking) => bookingDay(booking.startTime, profile.timezone) === day,
  );
  const counts = new Map<string, number>();
  for (const booking of inMonth) {
    const key = bookingDay(booking.startTime, profile.timezone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  const dayLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
  function navigate(offset: number) {
    setShownMonth(moveMonth(month, offset));
    setPicked(null);
  }

  return (
    <div className={GRID}>
      <section className={BLOCK}>
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            aria-label={t("previousMonth")}
            onClick={() => navigate(-1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <h2 className="text-base font-semibold text-foreground lg:text-frame-body" aria-live="polite">
            {monthLabel}
          </h2>
          <Button
            aria-label={t("nextMonth")}
            onClick={() => navigate(1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground lg:text-frame-label">
          {t("timezone", { zone: profile.timezone })}
        </p>
        <div className="w-full overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-7">
            {WEEKDAY_KEYS.map((key) => (
              <span
                className="py-2 text-center text-xs text-muted-foreground"
                key={key}
              >
                {s(`weekdayShort.${key}`)}
              </span>
            ))}
            {cells.map((cell, index) => {
              const key = `${month}-${String(cell.day).padStart(2, "0")}`;
              const count = cell.inMonth ? (counts.get(key) ?? 0) : 0;
              return (
                <button
                  aria-label={`${cell.day}, ${t("bookingCount", { count })}`}
                  aria-pressed={cell.inMonth && key === day}
                  className={cn(
                    "relative flex min-h-12 flex-col items-center justify-center gap-1 text-sm lg:min-h-20 lg:border-t lg:border-border",
                    !cell.inMonth && "text-muted-foreground/40",
                    cell.inMonth &&
                      key === day &&
                      "bg-hero-action text-hero-action-foreground",
                  )}
                  disabled={!cell.inMonth}
                  key={`${index}-${cell.day}`}
                  onClick={() => setPicked(key)}
                  type="button"
                >
                  <span
                    className={cn(
                      "font-latin tabular-nums",
                      key === today && "font-bold underline underline-offset-4",
                    )}
                  >
                    {cell.day}
                  </span>
                  {count > 0 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        key === day ? "bg-hero-action-foreground" : "bg-hero-action",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
          {resource.data ? (
            <span>{t("bookingCount", { count: inMonth.length })}</span>
          ) : resource.error ? (
            <span>{t("loadFailed")}</span>
          ) : (
            <span aria-hidden className="flex h-lh items-center">
              <span className={cn(DESK_BONE, "h-3 w-16 rounded")} />
            </span>
          )}
          <Button
            disabled={resource.loading}
            onClick={resource.reload}
            type="button"
            variant="ghost"
          >
            <RotateCw aria-hidden />
            {t("refresh")}
          </Button>
        </div>
      </section>
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
