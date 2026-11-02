"use client";

import { DESK_BONE } from "@/components/work/desk-parts";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { cn } from "@/lib/utils";

/**
 * What the desk's dashboard (`/work`) is built from beside the desk's own
 * pieces (`desk-parts`): the gap a section keeps, the link at its right, the
 * error card at the frame's steps, a bone's line box, and which bookings are
 * still the advisor's to keep.
 */

/** A section's heading over its body, at the gap the dashboard's lists keep. */
export const LIST_SECTION = "gap-3 lg:gap-4";

/** A section's way to its own page, at the right of its heading: underlined ink at the frame's meta step. */
export const SECTION_LINK =
  "rounded-sm text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta";

/** `ApiErrorCard` at the frame's type steps from `lg`, as the transactions page draws it. */
export const ERROR_CARD_LG =
  "lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure";

/** One line box of a type step (`text`) with its bone inside, so a skeleton's line stands as tall as the text it holds. */
export function BoneLine({ text, bone }: { readonly text: string; readonly bone: string }) {
  return (
    <span aria-hidden className={cn("flex h-lh items-center", text)}>
      <span className={cn(DESK_BONE, "rounded", bone)} />
    </span>
  );
}

/** A booking still to happen, or happening: held-for-payment ones are not the advisor's yet. */
export function isAhead(booking: AdvisorBooking, now: number): boolean {
  return (booking.state === "BOOKED" || booking.state === "IN_PROGRESS") && Date.parse(booking.endTime) > now;
}
