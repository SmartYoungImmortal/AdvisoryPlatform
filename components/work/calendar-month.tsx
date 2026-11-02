"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { useStanding } from "@/components/bookings/booking-sheet";
import { Button } from "@/components/ui/button";
import { DESK_BONE } from "@/components/work/desk-parts";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { WEEKDAY_KEYS, monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/** How many sessions a day's cell names before it counts the rest. */
const CHIPS_PER_DAY = 3;

/** The month's box: the weekdays' row, then the weeks; hairlines between the days from `lg`. */
const BOX = "w-full overflow-hidden rounded-2xl border border-border";

/** A weekday's name: centred over the phone's day, over the number at the cell's left from `lg`. */
const WEEKDAY = "py-2 text-center text-xs text-muted-foreground lg:px-1.5 lg:text-left lg:text-frame-label";

/**
 * A day: on the phone its number over its dots, centred; from `lg` a tall
 * cell with the number at its top left and the sessions under it. The cell is
 * tall enough for three chips and the count of the rest, so every week stands
 * at the same height whatever it holds.
 */
const CELL =
  "relative flex min-h-12 flex-col items-center justify-center gap-1 lg:min-h-38 lg:items-stretch lg:justify-start lg:border-t lg:border-border lg:p-1.5";

/** The day's number in its circle: filled in ink on today. */
const NUMBER =
  "pointer-events-none relative flex size-8 shrink-0 items-center justify-center rounded-full font-latin text-sm tabular-nums lg:size-7 lg:text-frame-label";

/** The phone's row of dots, held open on an empty day so the numbers line up across the week. */
const DOTS = "pointer-events-none relative flex h-1.5 items-center gap-0.5 lg:hidden";

type BookingState = AdvisorBooking["state"];

/**
 * A session's chip by where it stands: confirmed and running in solid ink,
 * one still waiting on payment drawn in a dashed outline, a finished one grey,
 * a cancelled one or a no-show struck through.
 */
const CHIP_TONE: Record<BookingState, string> = {
  BOOKED: "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85",
  IN_PROGRESS: "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85",
  PENDING_PAYMENT: "border-dashed border-foreground/40 text-foreground hover:bg-foreground/5",
  COMPLETED: "bg-foreground/8 text-muted-foreground hover:bg-foreground/12",
  CANCELLED: "text-muted-foreground line-through hover:bg-foreground/5",
  NO_SHOW: "text-muted-foreground line-through hover:bg-foreground/5",
};

/** The phone's dot for the same, in the same order of weight. */
const DOT_TONE: Record<BookingState, string> = {
  BOOKED: "bg-hero-action",
  IN_PROGRESS: "bg-hero-action",
  PENDING_PAYMENT: "border border-foreground/50",
  COMPLETED: "bg-muted-foreground/60",
  CANCELLED: "bg-muted-foreground/25",
  NO_SHOW: "bg-muted-foreground/25",
};

/** "YYYY-MM-DD" for a day of `month` ("YYYY-MM"). */
function dayKey(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** Between the columns from `lg`: every day but the week's first has a hairline at its left. */
function columnRule(index: number): string | false {
  return index % 7 !== 0 && "lg:border-l";
}

function Weekdays() {
  const s = useTranslations("serviceSchedule");
  return WEEKDAY_KEYS.map((key) => (
    <span className={WEEKDAY} key={key}>
      <span className="lg:inline-block lg:min-w-7 lg:text-center">{s(`weekdayShort.${key}`)}</span>
    </span>
  ));
}

/**
 * The month as a host's calendar: the weekdays' row, then each week's days.
 * From `lg` a day lists its sessions as chips — the start and who, in the
 * session's tone, each opening it (`/work/session`) — up to three, then how
 * many more; on the phone it shows up to three dots instead. A press anywhere
 * else on a day picks it. The days of the months either side are muted and
 * hold nothing.
 */
export function CalendarMonthGrid({
  month,
  today,
  selected,
  byDay,
  now,
  timeZone,
  onPick,
}: {
  /** "YYYY-MM". */
  readonly month: string;
  readonly today: string;
  readonly selected: string;
  /** The month's sessions by their day in the advisor's zone, each day's in order of start. */
  readonly byDay: ReadonlyMap<string, readonly AdvisorBooking[]>;
  readonly now: number;
  readonly timeZone: string;
  readonly onPick: (day: string) => void;
}) {
  const t = useTranslations("advisorBookings");
  const locale = useLocale();
  const standing = useStanding();
  const [year, monthNumber] = month.split("-").map(Number);
  const cells = monthGrid(year, monthNumber);
  const clock = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayName = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className={BOX}>
      <div className="grid grid-cols-7">
        <Weekdays />
        {cells.map((cell, index) => {
          if (!cell.inMonth) {
            return (
              <div className={cn(CELL, columnRule(index))} key={`${index}-${cell.day}`}>
                <span aria-hidden className={cn(NUMBER, "text-muted-foreground/40")}>
                  {cell.day}
                </span>
                <span aria-hidden className={DOTS} />
              </div>
            );
          }
          const key = dayKey(month, cell.day);
          const sessions = byDay.get(key) ?? [];
          const shown = sessions.slice(0, CHIPS_PER_DAY);
          const picked = key === selected;
          return (
            <div className={cn(CELL, columnRule(index))} key={key}>
              {/* The day's own press, under its chips so each chip stays a link of its own. */}
              <Button
                aria-label={`${dayName.format(new Date(`${key}T12:00:00Z`))}, ${t("bookingCount", { count: sessions.length })}`}
                aria-pressed={picked}
                className={cn(
                  "absolute inset-0 h-auto rounded-none border-0 p-0 focus-visible:ring-inset active:not-aria-[haspopup]:translate-y-0",
                  picked ? "bg-muted hover:bg-muted" : "hover:bg-muted/50",
                )}
                onClick={() => onPick(key)}
                type="button"
                variant="ghost"
              />
              <span
                aria-hidden
                className={cn(NUMBER, key === today ? "bg-hero-action font-semibold text-hero-action-foreground" : "text-foreground")}
              >
                {cell.day}
              </span>
              <span aria-hidden className={DOTS}>
                {shown.map((booking) => (
                  <span className={cn("size-1.5 rounded-full", DOT_TONE[booking.state])} key={booking.id} />
                ))}
              </span>
              {shown.length > 0 ? (
                <ul className="pointer-events-none relative hidden min-w-0 flex-col gap-1 lg:flex">
                  {shown.map((booking) => {
                    const time = clock.format(new Date(booking.startTime));
                    const label = t("sessionChip", { time, name: booking.adviseeName, state: standing(booking, now).label });
                    return (
                      <li className="flex min-w-0" key={booking.id}>
                        <Link
                          aria-label={label}
                          className={cn(
                            "pointer-events-auto flex w-full min-w-0 items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:text-frame-label",
                            CHIP_TONE[booking.state],
                          )}
                          href={`/work/session?id=${booking.id}`}
                          title={label}
                        >
                          <span className="shrink-0 font-latin font-medium tabular-nums">{time}</span>
                          <span className="min-w-0 truncate">{booking.adviseeName}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {sessions.length > shown.length ? (
                <span className="pointer-events-none relative hidden px-1.5 text-xs text-muted-foreground lg:block lg:text-frame-label">
                  {t("moreBookings", { count: sessions.length - shown.length })}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The month's box while the account is on its way, cell for cell: the
 * weekdays' row as it reads, and `weeks` weeks of days, each its number's
 * circle with the bone inside and the dots' row held open.
 */
export function CalendarMonthBones({ weeks }: { readonly weeks: number }) {
  return (
    <div aria-hidden className={BOX}>
      <div className="grid grid-cols-7">
        <Weekdays />
        {Array.from({ length: weeks * 7 }, (_, index) => (
          <div className={cn(CELL, columnRule(index))} key={index}>
            <span className={NUMBER}>
              <span className={cn(DESK_BONE, "h-3.5 w-4 rounded")} />
            </span>
            <span className={DOTS} />
          </div>
        ))}
      </div>
    </div>
  );
}
