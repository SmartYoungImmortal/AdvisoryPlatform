import { z } from "zod";

import { Id, IsoDateTime, Money } from "./common";

export const BookingStatus = z.enum([
  "pending-payment",
  "confirmed",
  "completed",
  "cancelled",
]);

/**
 * A bookable slot. `/checkout/slot-taken` exists because two advisees can reach
 * checkout for the same slot — so the backend must re-check availability at
 * payment time and return `SLOT_TAKEN`, not trust this flag.
 */
export const Slot = z.object({
  id: Id,
  advisorId: Id,
  startAt: IsoDateTime,
  durationMinutes: z.int(),
  available: z.boolean(),
});

export const Booking = z.object({
  id: Id,
  advisorId: Id,
  advisorName: z.string(),
  adviseeId: Id,
  status: BookingStatus,
  startAt: IsoDateTime,
  durationMinutes: z.int(),
  price: Money,
  /** Set for the free 15-minute trial, which skips checkout entirely. */
  isTrial: z.boolean(),
  /** Live once the session is joinable; null before and after. */
  joinUrl: z.url().nullable(),
});

export const CreateBookingInput = z.object({
  slotId: Id,
  isTrial: z.boolean().default(false),
});

export type BookingStatus = z.infer<typeof BookingStatus>;
export type Slot = z.infer<typeof Slot>;
export type Booking = z.infer<typeof Booking>;
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;
