"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";

import { useStanding, type BookingEntry } from "@/components/bookings/booking-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A day on the reader's calendar as `YYYY-MM-DD`, its month as the first
 * seven characters. The reader's zone, not UTC's: a session at 06:00 in
 * Bangkok is still that day.
 */
export function useDayKey(): (date: Date | number | string) => string {
  const timeZone = useTimeZone() ?? "Asia/Bangkok";
  const dayOf = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return (date) => dayOf.format(new Date(date));
}

/** A `YYYY-MM` month moved by whole months. */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Noon UTC on a calendar day, for naming it: the same date in every zone
 * within eleven hours of UTC, Bangkok's included.
 */
export function dayDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** The month's days in weeks, Sunday first; `null` pads the weeks out either side. */
function monthCells(month: string): readonly (string | null)[] {
  const [year, index] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= length ? `${month}-${String(day).padStart(2, "0")}` : null;
  });
}

/**
 * A month at a glance beside the list, as a calendar app keeps a small month
 * by its schedule: today on the filled blue disc, a dot under each booked day
 * in its booking's colour. Only a booked day is a button: pressing it takes
 * the list to that day (`onPick`).
 */
export function MiniMonth({
  month,
  today,
  byDay,
  now,
  onPick,
  onStep,
}: {
  readonly month: string;
  readonly today: string;
  readonly byDay: ReadonlyMap<string, readonly BookingEntry[]>;
  readonly now: number;
  readonly onPick: (day: string) => void;
  readonly onStep: (by: number) => void;
}) {
  const t = useTranslations("bookings");
  const format = useFormatter();
  const standing = useStanding();
  const cells = monthCells(month);
  // Any Sunday-first week names the columns; the first full one is at hand.
  const week = Array.from({ length: 7 }, (_, i) => dayDate(`2026-10-${String(25 + i).padStart(2, "0")}`));

  return (
    <section aria-label={t("calendarLabel")} className="flex w-full flex-col gap-3 lg:gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 aria-live="polite" className="text-sm font-medium text-foreground lg:text-frame-body">
          {format.dateTime(dayDate(`${month}-01`), { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center">
          <Button aria-label={t("previousMonth")} className="size-7 lg:size-11" onClick={() => onStep(-1)} size="icon" type="button" variant="ghost">
            <ChevronLeft aria-hidden className="size-5" />
          </Button>
          <Button aria-label={t("nextMonth")} className="size-7 lg:size-11" onClick={() => onStep(1)} size="icon" type="button" variant="ghost">
            <ChevronRight aria-hidden className="size-5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {week.map((date) => (
          <span aria-hidden className="pb-1 text-center text-xs text-muted-foreground lg:text-frame-label" key={date.toISOString()}>
            {format.dateTime(date, { weekday: "narrow" })}
          </span>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span aria-hidden key={`pad-${i}`} />;
          const entries = byDay.get(key) ?? [];
          const date = dayDate(key);
          const number = format.dateTime(date, { day: "numeric" });
          const disc = cn(
            // The phone's day: 32 tall in its 34-wide column and a 26 disc, the
            // desktop's 42 × 40 and 34 at the same proportions, smaller.
            "flex size-6.5 items-center justify-center rounded-full font-latin text-xs tabular-nums lg:size-10 lg:text-frame-label",
            key === today ? "bg-primary font-semibold text-primary-foreground" : "text-foreground",
          );
          return (
            <span className="relative flex h-8 justify-center lg:h-12" key={key}>
              {entries.length > 0 ? (
                <Button
                  aria-label={t("dayWithCount", {
                    date: format.dateTime(date, { weekday: "long", day: "numeric", month: "long" }),
                    count: entries.length,
                  })}
                  className={cn(disc, "h-6.5 p-0 font-semibold lg:h-10", key !== today && "hover:bg-muted")}
                  onClick={() => onPick(key)}
                  type="button"
                  variant="ghost"
                >
                  {number}
                </Button>
              ) : (
                <span className={cn(disc, key !== today && "text-muted-foreground")}>{number}</span>
              )}
              {entries.length > 0 ? (
                <span aria-hidden className="absolute bottom-0 flex gap-0.5">
                  {entries.slice(0, 3).map((entry) => (
                    <span className={cn("size-1 rounded-full lg:size-1.5", standing(entry.booking, now).dot)} key={entry.booking.id} />
                  ))}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}
