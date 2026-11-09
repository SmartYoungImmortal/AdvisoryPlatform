import { bookingPhase, isCancellable } from "@/components/bookings/booking-flow";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

/**
 * Whether the money on an invoice can still be asked back. The API's rule
 * today is any invoice that is `paid`; API #86 is still deciding the real one
 * (a session long over, a refund already made). This is the one place to
 * change when it does: the booking's popup and the refund page both ask here.
 */
export function canRequestRefund(invoice: ApiAdviseeInvoice): boolean {
  return invoice.status === "paid";
}

/** The request an invoice is shown with: the one still under review, else the latest. */
export function currentRefundCase(cases: readonly ApiRefundCase[]): ApiRefundCase | undefined {
  return (
    cases.find((item) => item.status === "OPEN") ??
    cases.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
  );
}

/**
 * The one way out of a booking that touches it or its money, as its popup
 * offers it:
 *
 * - `cancel`: never paid for and still ahead. The plain cancel, nothing about money.
 * - `cancelAndRefund`: paid and still ahead. Cancelling it asks for the money
 *   back too; there is no way to cancel it alone.
 * - `requestRefund`: paid, nothing asked yet, and the session is `ended` or was
 *   `cancelled` already (by the advisor, or before this rule).
 * - `refundStatus`: a request exists, whatever it says. Its standing only.
 * - `waiting`: the invoice or its requests are still being read. Nothing yet,
 *   so a paid booking is never offered the plain cancel while that is unknown.
 * - `none`: nothing to offer (a session in progress, money already back).
 */
export type BookingExit =
  | { readonly kind: "waiting" }
  | { readonly kind: "none" }
  | { readonly kind: "cancel" }
  | { readonly kind: "cancelAndRefund" }
  | { readonly kind: "requestRefund"; readonly after: "ended" | "cancelled" }
  | { readonly kind: "refundStatus"; readonly refund: ApiRefundCase };

/**
 * `invoice`: undefined while it is read, null when the booking has none (it
 * was never paid for). `cases`: the invoice's refund requests, undefined while
 * they are read.
 */
export function bookingExit(
  booking: ApiBooking,
  now: number,
  invoice: ApiAdviseeInvoice | null | undefined,
  cases: readonly ApiRefundCase[] | undefined,
): BookingExit {
  if (invoice === undefined) return { kind: "waiting" };
  const phase = bookingPhase(booking, now);
  const paidFor = invoice !== null && (invoice.status === "paid" || invoice.status === "refunded");
  if (!paidFor) return phase === "ahead" && isCancellable(booking.state) ? { kind: "cancel" } : { kind: "none" };

  if (cases === undefined) return { kind: "waiting" };
  const refund = currentRefundCase(cases);
  if (refund) return { kind: "refundStatus", refund };
  if (!canRequestRefund(invoice)) return { kind: "none" };
  if (phase === "ahead") return isCancellable(booking.state) ? { kind: "cancelAndRefund" } : { kind: "none" };
  return { kind: "requestRefund", after: phase === "cancelled" ? "cancelled" : "ended" };
}

/** The refund page for a booking. */
export function refundHref(bookingId: string): string {
  return `/bookings/refund?bookingId=${bookingId}`;
}

/** The booking's own popup, open over the list: where every way out of the refund page goes. */
export function bookingPopupHref(bookingId: string): string {
  return `/bookings?bookingId=${bookingId}`;
}
