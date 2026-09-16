/**
 * Figma "Availability - Profiles" (1594:30909 / 31533 / 31904).
 *
 * An Availability Profile is the reusable weekly shape an Advisor attaches to a
 * Service — the API's `availability_profiles` plus its weekly windows. One profile is
 * the default; the rest are named sets a Service can point at instead.
 *
 * Windows are Advisor-local wall-clock strings on purpose. They are never converted
 * here: the API does that at the scheduling boundary, and a prototype that guessed a
 * timezone would be showing a different week from the one the Advisor configured.
 */

export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface AvailabilityProfileFixture {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  /** Absent from the map means the day is closed, which the row renders as such. */
  readonly windows: Partial<Record<Weekday, string>>;
  readonly serviceCount: number;
  /** The default profile cannot be deleted — its delete affordance is inert. */
  readonly isDefault: boolean;
}

export const AVAILABILITY_PROFILES: readonly AvailabilityProfileFixture[] = [
  {
    id: "general",
    name: "งานให้คำปรึกษาทั่วไป",
    timezone: "Asia/Bangkok",
    windows: { mon: "09:00–12:00, 14:00–16:00", wed: "13:00–17:00" },
    serviceCount: 1,
    isDefault: true,
  },
  {
    id: "career-coaching",
    name: "Career coaching",
    timezone: "Asia/Bangkok",
    windows: { mon: "10:00–16:00" },
    serviceCount: 1,
    isDefault: false,
  },
];

/** The frames the prototype routes render. */
export type ProfilesScreenState = "default" | "empty" | "delete";

/**
 * Figma "Delete profile confirm" — the Service that stops taking bookings if the
 * profile goes. Naming it is the whole point of the dialog.
 */
export const DELETE_TARGET = {
  profileId: "career-coaching",
  affectedServiceName: "ปรึกษาภาษีนิติบุคคล",
} as const;
