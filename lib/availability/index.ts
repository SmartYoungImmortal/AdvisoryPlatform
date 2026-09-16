/**
 * Figma "Availability (Light) Thai" — the Advisor's Global Availability record.
 *
 * The API models this as one row per Advisor (`advisor_global_availability`), with a
 * booking horizon, a buffer between appointments and an optional daily ceiling. The
 * slot interval is fixed at 30 minutes and is not a choice, which is why the screen
 * states it as a note rather than offering it.
 *
 * These are the option sets the design draws. They are values, not copy: the unit
 * words live in the message catalogue and the numbers are formatted against them.
 */

/** How far ahead an Advisee may book. `null` is the "custom" chip. */
export const HORIZON_DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

/** Minutes of recovery after each appointment. `0` is a real choice, not an absence. */
export const BUFFER_MINUTE_OPTIONS = [0, 5, 10, 15, 30] as const;

/** Ceilings offered once the daily limit is switched on. */
export const DAILY_LIMIT_HOUR_OPTIONS = [1, 2, 3, 4, 6, 8] as const;

/** The bounds the custom inputs advertise under themselves. */
export const CUSTOM_BOUNDS = {
  horizonDays: { min: 1, max: 365 },
  bufferMinutes: { min: 0, max: 120, step: 5 },
  dailyLimitHours: { min: 1, max: 12 },
} as const;

/** The three frames the prototype routes render. */
export type GlobalAvailabilityState = "default" | "configured" | "custom";

export interface GlobalAvailabilityFixture {
  /** Null when the custom chip is the selected one. */
  readonly horizonDays: number | null;
  readonly bufferMinutes: number | null;
  /** Null when the daily ceiling is switched off entirely. */
  readonly dailyLimitHours: number | null;
  readonly customHorizonDays?: number;
  readonly customBufferMinutes?: number;
  readonly customDailyLimitHours?: number;
  /** Figma "Row / ชุดเวลาว่างทั้งหมด" — the profile count line. */
  readonly profileCount: number;
  readonly serviceCount: number;
}

export const GLOBAL_AVAILABILITY: Record<
  GlobalAvailabilityState,
  GlobalAvailabilityFixture
> = {
  // "Availability - Global (default)" — a horizon and no buffer, ceiling off.
  default: {
    horizonDays: 60,
    bufferMinutes: 0,
    dailyLimitHours: null,
    profileCount: 2,
    serviceCount: 3,
  },
  // "Availability - Global (configured)" — a buffer chosen and the ceiling on.
  configured: {
    horizonDays: 60,
    bufferMinutes: 30,
    dailyLimitHours: 3,
    profileCount: 2,
    serviceCount: 3,
  },
  // "Availability - Global (custom)" — every row on its custom chip, each with the
  // numeric input the chip reveals.
  custom: {
    horizonDays: null,
    bufferMinutes: null,
    dailyLimitHours: null,
    customHorizonDays: 45,
    customBufferMinutes: 20,
    customDailyLimitHours: 5,
    profileCount: 2,
    serviceCount: 3,
  },
};
