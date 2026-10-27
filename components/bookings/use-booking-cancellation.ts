"use client";

import { useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { cancelBooking, getBooking } from "@/lib/api/resources";
import { invalidate } from "@/lib/api/use-resource";
import { isCancellable } from "@/components/bookings/booking-flow";

export type CancellationOutcome = "cancelled" | "changed" | "retry" | "signIn" | "unavailable" | "uncertain";

type CancellationState =
  | { readonly kind: "idle" }
  | { readonly kind: "pending"; readonly bookingId: string; readonly action: "cancel" | "check" }
  | { readonly kind: "settled"; readonly bookingId: string; readonly outcome: CancellationOutcome };

function accessFailure(cause: unknown): "signIn" | "unavailable" | undefined {
  if (!(cause instanceof ApiError)) return undefined;
  if (cause.status === 401) return "signIn";
  if (cause.status === 403 || cause.status === 404) return "unavailable";
  return undefined;
}

/** A failed POST may have committed. Read the appointment before offering another POST. */
export async function checkCancellation(bookingId: string): Promise<CancellationOutcome> {
  try {
    const booking = await getBooking(bookingId, AbortSignal.timeout(15_000));
    if (booking.state === "CANCELLED") return "cancelled";
    return isCancellable(booking.state) ? "retry" : "changed";
  } catch (cause) {
    return accessFailure(cause) ?? "uncertain";
  }
}

export async function cancelAndCheck(bookingId: string): Promise<CancellationOutcome> {
  try {
    await cancelBooking(bookingId, AbortSignal.timeout(15_000));
    return "cancelled";
  } catch (cause) {
    return accessFailure(cause) ?? await checkCancellation(bookingId);
  }
}

/** One pending cancellation per view, including clicks before React disables the button. */
export function useBookingCancellation(refresh: () => void) {
  const [state, setState] = useState<CancellationState>({ kind: "idle" });
  const busy = useRef(false);
  const locked = useRef(false);

  async function run(bookingId: string, action: "cancel" | "check") {
    if (busy.current || (action === "cancel" && locked.current)) return;
    busy.current = true;
    locked.current = true;
    setState({ kind: "pending", bookingId, action });
    try {
      const outcome = action === "cancel"
        ? await cancelAndCheck(bookingId)
        : await checkCancellation(bookingId);
      locked.current = outcome === "uncertain" || outcome === "signIn";
      setState({ kind: "settled", bookingId, outcome });
      if (outcome !== "uncertain" && outcome !== "signIn") {
        invalidate("bookings/");
        refresh();
      }
    } finally {
      busy.current = false;
    }
  }

  const blocked = state.kind === "pending" || (state.kind === "settled" && (state.outcome === "uncertain" || state.outcome === "signIn"));
  return {
    state,
    blocked,
    cancel: (bookingId: string) => run(bookingId, "cancel"),
    check: () => state.kind !== "idle" ? run(state.bookingId, "check") : Promise.resolve(),
  };
}
