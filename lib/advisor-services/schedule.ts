/**
 * Figma "Service availability" (1594:33136) — one service's month, one selected day,
 * and where that day's bookable slots came from.
 *
 * The month is a fixed September 2026 (พ.ศ. 2569) and the grid is computed from it
 * in UTC. Fixed, because the frame is a specific month; UTC, because a grid built
 * from local midnight would shift a column for any viewer west of Greenwich.
 */

export const SCHEDULE_YEAR = 2026;
/** 1-based, as a person reads it. */
export const SCHEDULE_MONTH = 9;
export const SELECTED_DAY = 22;

/** Days the frame shades as having open time. */
export const AVAILABLE_DAYS: ReadonlySet<number> = new Set([
  18, 22, 23, 24, 25, 29,
]);

export interface CalendarCell {
  readonly day: number;
  readonly inMonth: boolean;
}

/**
 * The 5- or 6-week grid for a month, Sunday first, padded with the neighbouring
 * months' dates so every row is full.
 */
export function monthGrid(year: number, month: number): readonly CalendarCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysInPrevious = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const cells: CalendarCell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    cells.push({ day: daysInPrevious - i, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, inMonth: true });
  }
  for (let day = 1; cells.length % 7 !== 0; day += 1) {
    cells.push({ day, inMonth: false });
  }
  return cells;
}

export const MONTH_SUMMARY = { freeDays: 12, bookings: 4 } as const;

/**
 * Why a slot on the selected day is or is not bookable. The frame names four
 * reasons, and the order they appear in is the order they are checked in.
 */
export type SlotKind = "booked" | "buffer" | "free" | "over-limit";

export interface DaySlotFixture {
  readonly range: string;
  readonly kind: SlotKind;
}

export const DAY_SLOTS: readonly DaySlotFixture[] = [
  { range: "09:00 – 10:00", kind: "booked" },
  { range: "10:00 – 10:30", kind: "buffer" },
  { range: "10:30 – 11:00", kind: "free" },
  { range: "11:00 – 11:30", kind: "free" },
  { range: "13:00 – 13:30", kind: "free" },
  { range: "13:30 – 14:00", kind: "free" },
  { range: "14:00 – 17:00", kind: "over-limit" },
];

/** Figma "ที่มาของช่วงเวลาที่จองได้วันนี้" — the arithmetic behind the list above. */
export const DAY_SOURCE = {
  profileName: "งานให้คำปรึกษาทั่วไป",
  weeklyWindows: ["09:00–12:00", "14:00–16:00", "18:00–20:00"],
  booked: "1 นัด · 09:00–10:00",
  bufferMinutes: 30,
  ceiling: { hours: 3, used: 1 },
  bookableSlots: 4,
  slotMinutes: 30,
} as const;
