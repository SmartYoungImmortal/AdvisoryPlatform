"use client";

import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
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

const BLOCK = "flex w-full min-w-0 flex-col items-start gap-3 lg:gap-4";

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

export function AdvisorCalendarScreen() {
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  return (
    <WorkHub tab="calendar">
      {profile.error ? (
        <AdvisorBookingReadState failed retry={profile.reload} />
      ) : profile.data ? (
        <CalendarData profile={profile.data} />
      ) : (
        <AdvisorBookingReadState />
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
    <div className="mt-5 grid w-full gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
          <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" aria-live="polite">
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
          <span>
            {resource.data
              ? t("bookingCount", { count: inMonth.length })
              : t(resource.error ? "loadFailed" : "loading")}
          </span>
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
      <section className={BLOCK}>
        <h2 className="flex min-h-11 items-center text-lg font-semibold text-foreground lg:text-frame-heading">
          {dayLabel}
        </h2>
        {resource.error ? (
          <AdvisorBookingReadState failed retry={resource.reload} />
        ) : !resource.data ? (
          <AdvisorBookingReadState />
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
      </section>
    </div>
  );
}
