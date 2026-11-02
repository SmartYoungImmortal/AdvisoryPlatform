"use client";

import { useTranslations } from "next-intl";

import { CalendarHours, share } from "@/components/work/calendar-time-grid";
import { DESK_BONE } from "@/components/work/desk-parts";
import type { WeeklyAvailabilityWindow } from "@/lib/availability/api";
import { WEEKDAY_KEYS } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/** The fewest hours the week shows, so a short schedule still reads as a day. */
const LEAST_HOURS = 8;

/** "09:00" or "09:00:00" as minutes into the day; "24:00" is the day's end. */
function minutesOf(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** The calendar's columns run Sunday first; a window's day counts Monday as 1 and Sunday as 7. */
function dayOfColumn(column: number): number {
  return column === 0 ? 7 : column;
}

/** The hours the week spans: an hour either side of its windows, eight at the least, 08:00–17:00 when it has none. */
function spanOf(windows: readonly WeeklyAvailabilityWindow[]): { readonly first: number; readonly last: number } {
  if (windows.length === 0) return { first: 8, last: 8 + LEAST_HOURS + 1 };
  const first = Math.max(0, Math.floor(Math.min(...windows.map((window) => minutesOf(window.startTime))) / 60) - 1);
  const last = Math.min(24, Math.ceil(Math.max(...windows.map((window) => minutesOf(window.endTime))) / 60) + 1);
  return last - first >= LEAST_HOURS ? { first, last } : { first, last: Math.min(24, first + LEAST_HOURS) };
}

/** The week's head: each day's short name over its column, the hours' column left blank. */
function WeekdayHead() {
  const s = useTranslations("serviceSchedule");
  return (
    <div aria-hidden className="flex pb-3">
      <span className="w-12 shrink-0" />
      <div className="grid flex-1 grid-cols-7">
        {WEEKDAY_KEYS.map((key) => (
          <span className="flex h-8 items-center justify-center text-sm text-muted-foreground lg:text-frame-label" key={key}>
            {s(`weekdayShort.${key}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A set of hours drawn as the calendar draws a week: the days as columns
 * between hairlines, an hour a row, and each open window a block from its
 * start to its end with its hours inside — the start over the end on a
 * phone, where a column is too narrow for both on a line.
 */
export function WeekHours({ windows }: { readonly windows: readonly WeeklyAvailabilityWindow[] }) {
  const s = useTranslations("serviceSchedule");
  const { first, last } = spanOf(windows);
  const span = (last - first) * 60;

  return (
    <div className="mt-6 lg:mt-7.5">
      <WeekdayHead />
      <div className="pt-2">
        <CalendarHours first={first} last={last} size="desk">
          <div className="grid h-full grid-cols-7">
            {WEEKDAY_KEYS.map((key, column) => {
              const own = windows
                .filter((window) => window.dayOfWeek === dayOfColumn(column))
                .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div className="relative border-l border-border" key={key}>
                  <ul aria-label={s(`weekdayShort.${key}`)}>
                    {own.map((window) => {
                      const from = Math.max(minutesOf(window.startTime), first * 60);
                      const to = Math.min(minutesOf(window.endTime), last * 60);
                      const start = window.startTime.slice(0, 5);
                      const end = window.endTime.slice(0, 5);
                      return (
                        <li
                          className="absolute inset-x-0 px-0.5 pb-0.5 lg:px-1"
                          key={`${window.startTime}-${window.endTime}`}
                          style={{ top: share(from - first * 60, span), height: share(to - from, span) }}
                        >
                          <span className="flex size-full flex-col overflow-hidden rounded-lg border border-success/40 bg-[color-mix(in_oklab,var(--success)_10%,var(--card))] px-1.5 py-1.5 font-latin text-xs font-semibold text-success tabular-nums lg:px-2.5 lg:text-frame-label">
                            <span className="lg:hidden">{start}</span>
                            <span className="lg:hidden">{end}</span>
                            <span className="hidden truncate lg:block">
                              {start}–{end}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </CalendarHours>
      </div>
    </div>
  );
}

/** The week while the sets are read: the days' head as it reads and an eight-hour grid with its labels as bones. */
export function WeekHoursBones() {
  return (
    <div aria-hidden className="mt-6 lg:mt-7.5">
      <WeekdayHead />
      <div className="pt-2">
        <CalendarHours bones first={8} last={8 + LEAST_HOURS + 1} size="desk">
          <div className="grid h-full grid-cols-7">
            {WEEKDAY_KEYS.map((key) => (
              <div className="border-l border-border" key={key} />
            ))}
          </div>
        </CalendarHours>
      </div>
    </div>
  );
}

/** A grey capsule's bone, at a capsule's height. */
export const PILL_BONE = cn(DESK_BONE, "h-10 rounded-full");
