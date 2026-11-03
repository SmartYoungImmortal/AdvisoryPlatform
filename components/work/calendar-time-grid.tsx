"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useStanding } from "@/components/bookings/booking-sheet";
import { DESK_BONE } from "@/components/work/desk-parts";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { cn } from "@/lib/utils";

/**
 * The calendar's time grid, shared by the phone's day and the desk's week:
 * the hours down a fixed column at the left, each label on its hour's
 * hairline, and each session a block from its start to its end. A date is a
 * `YYYY-MM-DD` string read at noon UTC, so no zone moves it to a neighbour.
 */

/** Noon UTC of a date: what every label of it is formatted from. */
export function noonOf(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

/** The date `offset` days from `day`. */
export function shiftDay(day: string, offset: number): string {
  const date = noonOf(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** The seven dates of the week holding `day`, Sunday first as every calendar here starts. */
export function weekOf(day: string): string[] {
  const start = shiftDay(day, -noonOf(day).getUTCDay());
  return Array.from({ length: 7 }, (_, index) => shiftDay(start, index));
}

/** `value` when it is a real `YYYY-MM-DD` date, otherwise null. */
export function asDay(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = noonOf(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

/** The minute of its day a moment falls on, in the advisor's zone. */
export function minuteOfDay(value: string | number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") * 60 + read("minute");
}

/** `part` of `whole` as a CSS percentage. */
export function share(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}

const DAY_MINUTES = 24 * 60;

/** The least a block stands for, so a session that short still shows. */
const SHORTEST = 15;

/** A session on the grid: its minutes in its day, and which of how many side-by-side columns it takes. */
export type Slot = {
  readonly booking: AdvisorBooking;
  readonly start: number;
  readonly end: number;
  readonly column: number;
  readonly columns: number;
};

/**
 * A day's sessions placed on the grid. Sessions that run into each other
 * form a group; each takes the first column free at its start, and every
 * one of the group shares the width by the group's count of columns.
 */
export function laySessions(bookings: readonly AdvisorBooking[], timeZone: string): Slot[] {
  const sorted = bookings
    .map((booking) => {
      const start = minuteOfDay(booking.startTime, timeZone);
      const length = Math.round((Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60_000);
      return { booking, start, end: Math.min(DAY_MINUTES, start + Math.max(length, SHORTEST)) };
    })
    .toSorted((a, b) => a.start - b.start || b.end - a.end);
  const slots: { booking: AdvisorBooking; start: number; end: number; column: number; columns: number }[] = [];
  let group: typeof slots = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const close = () => {
    for (const slot of group) slot.columns = ends.length;
    group = [];
    ends = [];
  };
  for (const item of sorted) {
    if (item.start >= groupEnd) close();
    groupEnd = Math.max(groupEnd, item.end);
    const free = ends.findIndex((end) => end <= item.start);
    const column = free === -1 ? ends.length : free;
    ends[column] = item.end;
    const slot = { ...item, column, columns: 1 };
    group.push(slot);
    slots.push(slot);
  }
  close();
  return slots;
}

/**
 * The hours a grid shows: `from` to `to` at the least, widened to `pad`
 * hours either side of the sessions it holds.
 */
export function hourSpan(
  slots: readonly Slot[],
  from: number,
  to: number,
  pad: number,
): { readonly first: number; readonly last: number } {
  return {
    first: Math.max(0, Math.min(from, ...slots.map((slot) => Math.floor(slot.start / 60) - pad))),
    last: Math.min(24, Math.max(to, ...slots.map((slot) => Math.ceil(slot.end / 60) + pad))),
  };
}

/** The phone's grid and the desk's: each hour's height, and its label's type. */
const HOURS = {
  phone: { row: "h-14", label: "pr-3 text-xs text-foreground/70", bone: "h-3 w-8" },
  desk: { row: "h-16", label: "pr-2 text-fine font-medium text-foreground", bone: "h-2.5 w-7" },
} as const;

export type GridSize = keyof typeof HOURS;

/**
 * The hours from `first` to `last`, a row each: its label in the fixed
 * column at the left, centred on the hairline across the rest. `children`
 * lie over the hairlines' column, from the first line to the last, so a
 * share of that height is a share of the hours. `bones` draws the labels
 * as placeholders.
 */
export function CalendarHours({
  first,
  last,
  size,
  bones = false,
  children,
}: {
  readonly first: number;
  readonly last: number;
  readonly size: GridSize;
  readonly bones?: boolean;
  readonly children?: ReactNode;
}) {
  const measure = HOURS[size];
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  return (
    <div className="relative">
      {hours.map((hour, index) => (
        <div aria-hidden className={cn("flex", index < hours.length - 1 ? measure.row : "h-0")} data-hour={hour} key={hour}>
          <span
            className={cn(
              "flex h-lh w-12 shrink-0 -translate-y-1/2 items-center justify-end self-start font-latin tabular-nums",
              measure.label,
            )}
          >
            {bones ? <span className={cn(DESK_BONE, "rounded", measure.bone)} /> : `${String(hour % 24).padStart(2, "0")}:00`}
          </span>
          <span className="flex-1 border-t border-border" />
        </div>
      ))}
      {children ? <div className="absolute inset-y-0 right-0 left-12">{children}</div> : null}
    </div>
  );
}

/**
 * Each state's colour: a booked session in the accent on its pale ground
 * (mixed into the card, so the hairlines under it do not show through), one
 * held for payment dashed, and the ended ones on the muted ground, struck
 * through when they did not happen.
 */
export const SESSION_TONE: Record<AdvisorBooking["state"], string> = {
  BOOKED: "border-primary/50 bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] text-primary",
  IN_PROGRESS: "border-primary/50 bg-[color-mix(in_oklab,var(--primary)_10%,var(--card))] text-primary",
  PENDING_PAYMENT: "border-dashed border-border bg-muted text-muted-foreground",
  COMPLETED: "border-border bg-muted text-foreground/70",
  CANCELLED: "border-border bg-muted text-foreground/70 line-through",
  NO_SHOW: "border-border bg-muted text-foreground/70 line-through",
};

/** Under an hour a session takes one line: two would not fit its block. */
const TWO_LINES_FROM = 60;

const BLOCK = {
  phone: "px-3 text-sm",
  desk: "px-2.5 text-frame-label",
} as const;

/**
 * One session on the grid, from its start to its end in the hours
 * `first`–`last`: the service in bold over who and when (and, held for
 * payment, that it waits on it). It opens the session.
 */
export function SessionBlock({
  slot,
  first,
  last,
  timeZone,
  now,
  size,
}: {
  readonly slot: Slot;
  readonly first: number;
  readonly last: number;
  readonly timeZone: string;
  readonly now: number;
  readonly size: GridSize;
}) {
  const t = useTranslations("advisorBookings");
  const format = useFormatter();
  const standing = useStanding()(slot.booking, now);
  const { booking } = slot;
  const span = (last - first) * 60;
  const clock = (value: string) =>
    format.dateTime(new Date(value), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const pending = booking.state === "PENDING_PAYMENT";
  const oneLine = slot.end - slot.start < TWO_LINES_FROM;
  const detail = (
    <>
      {booking.adviseeName} ·{" "}
      <span className="font-latin tabular-nums">
        {clock(booking.startTime)}–{clock(booking.endTime)}
      </span>
      {pending ? ` · ${t("pendingPayment")}` : null}
    </>
  );

  return (
    <li
      className={cn("absolute pb-0.5", slot.column > 0 && "pl-1")}
      style={{
        top: share(slot.start - first * 60, span),
        height: share(slot.end - slot.start, span),
        left: share(slot.column, slot.columns),
        width: share(1, slot.columns),
      }}
    >
      <Link
        className={cn(
          "flex size-full min-w-0 overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          BLOCK[size],
          oneLine ? "items-center" : "flex-col py-1.5",
          SESSION_TONE[booking.state],
        )}
        href={`/work/session?id=${booking.id}`}
      >
        {oneLine ? (
          <span className="min-w-0 truncate">
            <span className="font-semibold">{booking.serviceName}</span> · {detail}
          </span>
        ) : (
          <>
            <span className="truncate font-semibold">{booking.serviceName}</span>
            <span className="truncate">{detail}</span>
          </>
        )}
        {pending ? null : <span className="sr-only">, {standing.label}</span>}
      </Link>
    </li>
  );
}
