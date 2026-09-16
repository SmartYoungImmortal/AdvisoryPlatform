/**
 * Month grids for the prototype's calendars, computed rather than drawn.
 *
 * Every calendar here is a fixed month — the frames are specific months — and every
 * date is built in UTC, because a grid built from local midnight shifts a column for
 * any viewer west of Greenwich.
 *
 * Computing the grid is not a nicety. The August 2569 frame places the 16th on a
 * Saturday; the real 16 August 2026 is a Sunday. A drawn grid would have shipped
 * that, and a calendar that disagrees with the date is the one thing a calendar may
 * not do.
 */

export interface CalendarCell {
  readonly day: number;
  readonly inMonth: boolean;
}

/**
 * The 5- or 6-week grid for a month, Sunday first, padded with the neighbouring
 * months' dates so every row is full. `month` is 1-based, as a person reads it.
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

/** Sunday-first keys, matching `Date#getUTCDay`. */
export const WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** The weekday a real date falls on — never a drawn one. */
export function weekdayOf(year: number, month: number, day: number): WeekdayKey {
  return WEEKDAY_KEYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** Buddhist-era year, which is what every Thai date in the product shows. */
export function buddhistYear(year: number): number {
  return year + 543;
}
