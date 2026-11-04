import { failedCancellation, type CancellationOutcome } from "@/components/bookings/use-booking-cancellation";
import { ApiError } from "@/lib/api/client";
import { cancelBooking, listMyRefundCases, openRefundCase } from "@/lib/api/resources";
import type { ApiRefundCase } from "@/lib/api/types";
import { invalidate } from "@/lib/api/use-resource";

const TIMEOUT = 15_000;

/**
 * What a refused refund call asks of the advisee next. Pressing again helps
 * only after a network failure, a timeout or a server fault (and a 409, which
 * the next press reads back as the request already open). A lapsed session
 * needs a sign-in, a missing receipt or a refusal needs support.
 */
export type RefundFailure = "signIn" | "notFound" | "refused" | "retry";

const RETRYABLE = new Set([408, 409, 429]);

export function refundFailure(cause: unknown): RefundFailure {
  if (!(cause instanceof ApiError)) return "retry";
  if (cause.status === 401) return "signIn";
  if (cause.status === 403 || cause.status === 404) return "notFound";
  return cause.status >= 500 || RETRYABLE.has(cause.status) ? "retry" : "refused";
}

/**
 * The request the invoice's money now hangs on. `alreadyOpen`: it is not the
 * one this press wrote but one opened before it (another tab, another press),
 * so nothing this press carried, its reason or its files, is in it.
 */
export type OpenedRefund = { readonly refund: ApiRefundCase; readonly alreadyOpen: boolean };

/** A failure the POST may have committed behind: no answer, a timeout, a server fault. */
function mayHaveCommitted(cause: unknown): boolean {
  return !(cause instanceof ApiError) || cause.status === 408 || cause.status >= 500;
}

/**
 * Open the invoice's refund request, once.
 *
 * The API keeps one open request per invoice. After a POST that may have
 * committed, the open request on the invoice is this one. After a 409 it is
 * this one only if it carries the reason this press sent: an earlier press
 * whose answer was lost, pressed again. Otherwise it is someone else's, taken
 * as the request but flagged. Only when none is open, or the refusal says
 * nothing was written, does the POST's own error come back.
 */
export async function openRefundOnce(invoiceId: string, reason: string): Promise<OpenedRefund> {
  let opened: OpenedRefund;
  try {
    opened = { refund: await openRefundCase({ invoiceId, reason }, AbortSignal.timeout(TIMEOUT)), alreadyOpen: false };
  } catch (error) {
    const conflict = error instanceof ApiError && error.status === 409;
    if (!conflict && !mayHaveCommitted(error)) throw error;
    const found = await listMyRefundCases({ invoiceId, limit: 100 }, AbortSignal.timeout(TIMEOUT)).then(
      (page) => page.items.find((item) => item.status === "OPEN"),
      () => undefined,
    );
    if (!found) throw error;
    opened = { refund: found, alreadyOpen: conflict && found.reason !== reason };
  }
  invalidate("refunds/me");
  return opened;
}

export type CancelRefundResult =
  | { readonly kind: "opened"; readonly refund: ApiRefundCase; readonly alreadyOpen: boolean }
  | { readonly kind: "notCancelled"; readonly outcome: Exclude<CancellationOutcome, "cancelled"> }
  | { readonly kind: "foundCancelled" }
  | { readonly kind: "cancelledOnly"; readonly failure: RefundFailure };

/**
 * Cancel a paid booking under the rule, then open the refund it is owed.
 *
 * Only this page's own cancel opens a request with this page's rule. When the
 * POST fails and the booking reads cancelled anyway, the cancel may be
 * someone else's (the advisor's, answered with a 409) or a reply lost on the
 * way; either way the share follows who cancelled and when, so nothing is
 * sent (`foundCancelled`) and the booking, read again, decides the claim.
 * When the cancel stands and the request does not, the booking reads as
 * cancelled-and-unclaimed, which the page offers to claim with one press.
 */
export async function cancelThenRefund(bookingId: string, invoiceId: string, reason: string): Promise<CancelRefundResult> {
  try {
    await cancelBooking(bookingId, AbortSignal.timeout(TIMEOUT));
  } catch (cause) {
    const outcome = await failedCancellation(bookingId, cause);
    if (outcome !== "cancelled") return { kind: "notCancelled", outcome };
    invalidate("bookings/");
    return { kind: "foundCancelled" };
  }
  invalidate("bookings/");
  invalidate("payment/invoices");
  try {
    return { kind: "opened", ...(await openRefundOnce(invoiceId, reason)) };
  } catch (cause) {
    return { kind: "cancelledOnly", failure: refundFailure(cause) };
  }
}
