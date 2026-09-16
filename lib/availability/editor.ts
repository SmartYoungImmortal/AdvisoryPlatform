import { WEEKDAYS, type Weekday } from "@/lib/availability/profiles";

/**
 * Figma "Availability - Profile / …" (1594:30955, 31059, 31136, 31564) — the three
 * tabs an Availability Profile is edited through.
 *
 * Every time here is an Advisor-local wall-clock string and every date is already
 * formatted for display. The prototype has no formatting layer and the API converts
 * at the scheduling boundary; a date built from `new Date()` here would render
 * whatever the viewer's machine thinks today is, which is not what the frame shows.
 */

export type EditorTab = "weekly" | "specific" | "blocked";

export interface TimeRange {
  readonly start: string;
  readonly end: string;
}

export interface WeeklyDayFixture {
  readonly day: Weekday;
  /** Empty means the day is switched off; the card collapses to its header. */
  readonly ranges: readonly TimeRange[];
}

export const WEEKLY_DAYS: readonly WeeklyDayFixture[] = WEEKDAYS.map((day) => {
  if (day === "mon") {
    return {
      day,
      ranges: [
        { start: "09:00", end: "12:00" },
        { start: "14:00", end: "16:00" },
      ],
    };
  }
  if (day === "wed") {
    return { day, ranges: [{ start: "13:00", end: "17:00" }] };
  }
  return { day, ranges: [] };
});

/**
 * Figma "Weekly (error)" — the second Monday range both overlaps the first and runs
 * backwards, which is the one message the validation note describes in the abstract.
 */
export const WEEKLY_ERROR = {
  day: "mon" as Weekday,
  /** Index into that day's ranges. */
  rangeIndex: 1,
  ranges: [
    { start: "09:00", end: "12:00" },
    { start: "11:00", end: "10:00" },
  ] as readonly TimeRange[],
} as const;

export interface SpecificDateFixture {
  readonly id: string;
  /** Already formatted — see the note at the top of this file. */
  readonly label: string;
  readonly ranges: readonly TimeRange[];
}

export const SPECIFIC_DATES: readonly SpecificDateFixture[] = [
  {
    id: "2569-09-12",
    label: "เสาร์ 12 ก.ย. 2569",
    ranges: [{ start: "09:00", end: "12:00" }],
  },
  {
    id: "2569-09-27",
    label: "อาทิตย์ 27 ก.ย. 2569",
    ranges: [
      { start: "13:00", end: "15:00" },
      { start: "16:00", end: "18:00" },
    ],
  },
];

export interface BlockedDateFixture {
  readonly id: string;
  readonly label: string;
  /** A whole-day block has no range; a partial one blocks exactly this window. */
  readonly range?: TimeRange;
}

export const BLOCKED_DATES: readonly BlockedDateFixture[] = [
  { id: "2569-09-05", label: "ศุกร์ 5 ก.ย. 2569" },
  {
    id: "2569-09-15",
    label: "จันทร์ 15 ก.ย. 2569",
    range: { start: "12:00", end: "14:00" },
  },
];

/** The profile these frames are editing. */
export const EDITED_PROFILE_NAME = "งานให้คำปรึกษาทั่วไป";
