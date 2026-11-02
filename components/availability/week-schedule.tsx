"use client";

import { useTranslations } from "next-intl";

import { DESK_BONE } from "@/components/work/desk-parts";
import type { WeeklyAvailabilityWindow } from "@/lib/availability/api";
import { cn } from "@/lib/utils";

/** ISO weekday order, Monday first, as `dayOfWeek` counts (1–7). */
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** A shorter week still stands a working day tall. */
const MIN_HOURS = 8;

/** The working day an empty week is drawn over. */
const EMPTY_SPAN = { first: 9, last: 17 } as const;

/** Up to this many hours each gets a roomy row and its own label; past it rows are shorter, labelled every second hour. */
const ROOMY_HOURS = 12;

/** The grid's box, at the month box's radius and hairline. */
const BOX = "w-full rounded-2xl border border-border p-3 lg:p-5";

/** The hours' column at the left, its labels right-aligned against the grid. */
const AXIS = "relative w-10 shrink-0 lg:w-14";

/** An hour's label, centred on its hairline. */
const HOUR_LABEL = "absolute right-1.5 -translate-y-1/2 font-latin text-xs text-muted-foreground tabular-nums lg:right-3 lg:text-frame-label";

/** "09:00" or "09:00:00" as minutes since midnight. */
function minutesOf(time: string): number {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/** A window's end in minutes; one at or before its start ("00:00") runs to midnight. */
function endOf(window: WeeklyAvailabilityWindow): number {
  const end = minutesOf(window.endTime);
  return end <= minutesOf(window.startTime) ? 24 * 60 : end;
}

/** The whole hours the grid spans: the earliest start to the latest end, never under `MIN_HOURS`. */
function spanOf(windows: readonly WeeklyAvailabilityWindow[]): { readonly first: number; readonly last: number } {
  if (windows.length === 0) return EMPTY_SPAN;
  let first = Math.floor(Math.min(...windows.map((window) => minutesOf(window.startTime))) / 60);
  let last = Math.ceil(Math.max(...windows.map(endOf)) / 60);
  if (last - first < MIN_HOURS) {
    last = Math.min(24, first + MIN_HOURS);
    first = Math.max(0, last - MIN_HOURS);
  }
  return { first, last };
}

/** How an hour is drawn at a span: its row's height, which hours are named, and how long a window must be to print its times. */
function scaleOf(hours: number) {
  const roomy = hours <= ROOMY_HOURS;
  return {
    row: roomy ? "h-8 lg:h-11" : "h-5 lg:h-7",
    labelEvery: roomy ? 1 : 2,
    printFrom: roomy ? 60 : 120,
  };
}

const hourText = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

function WeekHead() {
  const s = useTranslations("serviceSchedule");
  return (
    <div aria-hidden className="ml-10 grid grid-cols-7 pb-1 lg:ml-14 lg:pb-2">
      {DAYS.map((day) => (
        <span className="text-center text-xs text-muted-foreground lg:text-frame-label" key={day}>
          {s(`weekdayShort.${day}`)}
        </span>
      ))}
    </div>
  );
}

/** The hours' rows, a faint hairline on each hour and one under the last. */
function HourRows({ hours, row }: { readonly hours: number; readonly row: string }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: hours }, (_, index) => (
        <div className={cn("border-t border-border/70 last:border-b", row)} key={index} />
      ))}
    </div>
  );
}

/**
 * A schedule's week as a host's week view: Monday to Sunday across, the hours
 * down from the earliest opening to the latest close (whole hours, at least a
 * working day), each hour named at the left on its hairline, and each weekly
 * window a soft block over its hours with its times inside when it is tall
 * enough. A reader without sight hears each day with its hours, or that it is
 * closed. With no weekly hours the grid stands empty over a working day and
 * says so.
 */
export function WeekSchedule({ windows }: { readonly windows: readonly WeeklyAvailabilityWindow[] }) {
  const t = useTranslations("availability");
  const s = useTranslations("schedule");
  const { first, last } = spanOf(windows);
  const hours = last - first;
  const scale = scaleOf(hours);
  const labels = Array.from({ length: hours + 1 }, (_, index) => first + index).filter(
    (hour) => (hour - first) % scale.labelEvery === 0,
  );
  const position = (from: number, to: number) => ({
    top: `calc(${((from - first * 60) / (hours * 60)) * 100}% + 1px)`,
    height: `calc(${((to - from) / (hours * 60)) * 100}% - 2px)`,
  });

  return (
    <div className={BOX}>
      <WeekHead />
      <div className="flex py-2.5">
        <div aria-hidden className={AXIS}>
          {labels.map((hour) => (
            <span className={HOUR_LABEL} key={hour} style={{ top: `${((hour - first) / hours) * 100}%` }}>
              {hourText(hour)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <HourRows hours={hours} row={scale.row} />
          <ul className="absolute inset-0 grid grid-cols-7">
            {DAYS.map((day, index) => {
              const own = windows
                .filter((window) => window.dayOfWeek === index + 1)
                .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <li className="relative" key={day}>
                  <span className="sr-only">
                    {t(`weekday.${day}`)}
                    {own.length === 0 ? ` ${t("dayClosed")}` : null}
                  </span>
                  {own.map((window) => {
                    const from = minutesOf(window.startTime);
                    const to = endOf(window);
                    return (
                      <span
                        className="absolute inset-x-0.5 flex overflow-hidden rounded-md bg-foreground/10 px-1 py-0.5 lg:inset-x-1 lg:rounded-lg lg:px-1.5"
                        key={`${window.startTime}-${window.endTime}`}
                        style={position(from, to)}
                      >
                        <span
                          className={cn(
                            "flex min-w-0 flex-wrap self-start font-latin text-2xs text-foreground tabular-nums lg:text-frame-label",
                            to - from < scale.printFrom && "sr-only",
                          )}
                        >
                          <span>{window.startTime.slice(0, 5)}</span>
                          {/* On a phone the column holds one time to a line: the start over the end, the dash left out. */}
                          <span className="whitespace-nowrap">
                            <span className="max-lg:hidden">–</span>
                            {window.endTime.slice(0, 5)}
                          </span>
                        </span>
                      </span>
                    );
                  })}
                </li>
              );
            })}
          </ul>
          {windows.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground lg:text-frame-meta">
              {s("noWeeklyHours")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The week while it is read, in the shape an office week lands in: the
 * weekdays' row as it reads, the hours' labels as bones on their hairlines,
 * and the rows of a working day.
 */
export function WeekScheduleBones() {
  const hours = EMPTY_SPAN.last - EMPTY_SPAN.first;
  return (
    <div aria-hidden className={BOX}>
      <WeekHead />
      <div className="flex py-2.5">
        <div className={AXIS}>
          {Array.from({ length: hours + 1 }, (_, index) => (
            <span
              className={cn(HOUR_LABEL, "flex h-lh items-center")}
              key={index}
              style={{ top: `${(index / hours) * 100}%` }}
            >
              <span className={cn(DESK_BONE, "h-3 w-7 rounded lg:h-3.5 lg:w-9")} />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <HourRows hours={hours} row={scaleOf(hours).row} />
        </div>
      </div>
    </div>
  );
}
