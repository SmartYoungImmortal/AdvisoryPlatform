"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SessionRowBones } from "@/components/work/advisor-calendar-screen";
import { DeskSection } from "@/components/work/desk-parts";
import { SessionRow } from "@/components/work/session-row";
import { BoneLine, LIST_SECTION, SECTION_LINK, isAhead } from "@/components/work/today-parts";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { WEEKDAY_KEYS } from "@/lib/calendar";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The days the strip shows: tomorrow and the six after it. */
const WEEK_DAYS = 7;

/** A day shows its sessions as dots up to this many, and as a number past it. */
const DOTS = 3;

/** The strip: seven columns that share the row at every width, so a phone never scrolls it sideways. */
const STRIP = "grid grid-cols-7 gap-1.5 lg:gap-3";

/** A day's tile: the weekday over the date over its sessions, on a hairline box. */
const TILE = "flex h-auto min-w-0 flex-col items-center gap-0.5 rounded-xl border px-0 py-2.5 lg:gap-1 lg:rounded-2xl lg:py-4";

/** The day under the strip: its date small and grey over its sessions, as a day of the notification feed is headed. */
const DAY_BLOCK = "flex flex-col pt-2 lg:pt-4";

/** The day `offset` days after `day` (`YYYY-MM-DD`), counted on the calendar rather than in hours. */
function addDays(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/**
 * The week after today, a tile a day; pressing one lists its sessions under
 * the strip. It opens on the first day that has any, else tomorrow. A day
 * with sessions is in ink, an empty one muted, the chosen one filled — the
 * calendar's chosen day.
 */
function Week({ bookings, now, timeZone }: {
  readonly bookings: readonly AdvisorBooking[];
  readonly now: number;
  readonly timeZone: string;
}) {
  const t = useTranslations("workDesk");
  const s = useTranslations("serviceSchedule");
  const format = useFormatter();
  const [picked, setPicked] = useState<string | null>(null);

  const today = bookingDay(now, timeZone);
  const days = Array.from({ length: WEEK_DAYS }, (_, index) => addDays(today, index + 1));
  const byDay = new Map<string, AdvisorBooking[]>();
  for (const booking of bookings.filter((entry) => isAhead(entry, now)).toSorted((a, b) => a.startTime.localeCompare(b.startTime))) {
    const day = bookingDay(booking.startTime, timeZone);
    if (days.includes(day)) byDay.set(day, [...(byDay.get(day) ?? []), booking]);
  }
  const selected = picked ?? days.find((day) => byDay.has(day)) ?? days[0];
  const rows = byDay.get(selected) ?? [];
  const longDate = (day: string) =>
    format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <div aria-label={t("weekTitle")} className={STRIP} role="group">
        {days.map((day) => {
          const count = byDay.get(day)?.length ?? 0;
          const active = day === selected;
          const date = new Date(`${day}T12:00:00Z`);
          return (
            <Button
              aria-label={t("dayTile", { date: longDate(day), count })}
              aria-pressed={active}
              className={cn(
                TILE,
                active
                  ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
                  : "border-border bg-card hover:bg-muted",
                !active && (count > 0 ? "text-foreground" : "text-muted-foreground"),
              )}
              key={day}
              onClick={() => setPicked(day)}
              type="button"
              variant="ghost"
            >
              <span className="text-xs font-normal lg:text-frame-label">{s(`weekdayShort.${WEEKDAY_KEYS[date.getUTCDay()]}`)}</span>
              <span className="font-latin text-lg font-semibold tabular-nums lg:text-frame-figure">{date.getUTCDate()}</span>
              <span aria-hidden className="flex h-lh items-center gap-0.5 text-xs lg:gap-1 lg:text-frame-label">
                {count > DOTS ? (
                  <span className="font-latin font-semibold tabular-nums">{count}</span>
                ) : (
                  Array.from({ length: count }, (_, dot) => <span className="size-1.5 rounded-full bg-current" key={dot} />)
                )}
              </span>
            </Button>
          );
        })}
      </div>
      <section aria-labelledby="work-week-day" className={DAY_BLOCK}>
        <h3 className="text-xs font-medium text-muted-foreground lg:text-frame-label" id="work-week-day">
          {longDate(selected)}
        </h3>
        {rows.length > 0 ? (
          <ul className="flex flex-col">
            {rows.map((booking) => (
              <SessionRow booking={booking} key={booking.id} now={now} timeZone={timeZone} />
            ))}
          </ul>
        ) : (
          <p className="py-2.5 text-sm text-muted-foreground lg:py-3.5 lg:text-frame-meta">{t("dayEmpty")}</p>
        )}
      </section>
    </>
  );
}

/** The strip while the bookings load: seven tiles of bones at the tiles' measure, then a day's heading over two rows. */
function WeekBones() {
  return (
    <>
      <div aria-hidden className={STRIP}>
        {Array.from({ length: WEEK_DAYS }, (_, index) => (
          <span className={cn(TILE, "border-border")} key={index}>
            <BoneLine bone="h-3 w-4 lg:h-3.5 lg:w-6" text="text-xs lg:text-frame-label" />
            <BoneLine bone="h-4.5 w-5 lg:h-5 lg:w-7" text="text-lg lg:text-frame-figure" />
            <span className="flex h-lh text-xs lg:text-frame-label" />
          </span>
        ))}
      </div>
      <div aria-hidden className={DAY_BLOCK}>
        <BoneLine bone="h-3 w-32 lg:h-3.5 lg:w-40" text="text-xs lg:text-frame-label" />
        <SessionRowBones />
      </div>
    </>
  );
}

/**
 * "7 วันข้างหน้า": the strip of the next seven days and the chosen day's
 * sessions, with the way to the calendar at the right. `bookings` not given
 * yet draws the strip's bones.
 */
export function WeekAhead({ bookings, now, timeZone }: {
  readonly bookings: readonly AdvisorBooking[] | undefined;
  readonly now: number;
  readonly timeZone?: string;
}) {
  const t = useTranslations("workDesk");
  return (
    <DeskSection
      action={
        <Link className={SECTION_LINK} href="/work/calendar">
          {t("seeCalendar")}
        </Link>
      }
      className={LIST_SECTION}
      id="work-week"
      title={t("weekTitle")}
    >
      {bookings && timeZone !== undefined ? <Week bookings={bookings} now={now} timeZone={timeZone} /> : <WeekBones />}
    </DeskSection>
  );
}
