import { cancelAndCheck, type CancellationOutcome } from "@/components/bookings/use-booking-cancellation";
import { listMyRefundCases, openRefundCase } from "@/lib/api/resources";
import type { ApiRefundCase } from "@/lib/api/types";
import { invalidate } from "@/lib/api/use-resource";

const TIMEOUT = 15_000;

/**
 * Open the invoice's refund request, once.
 *
 * A failed POST may still have committed, and the API refuses a second open
 * request on the same invoice, so before anything is offered again the
 * invoice's requests are read: an open one there is this request. Only when
 * none is open does the POST's own error come back.
 */
export async function openRefundOnce(invoiceId: string, reason: string): Promise<ApiRefundCase> {
  let opened: ApiRefundCase;
  try {
    opened = await openRefundCase({ invoiceId, reason }, AbortSignal.timeout(TIMEOUT));
  } catch (error) {
    const found = await listMyRefundCases({ invoiceId, limit: 100 }, AbortSignal.timeout(TIMEOUT)).then(
      (page) => page.items.find((item) => item.status === "OPEN"),
      () => undefined,
    );
    if (!found) throw error;
    opened = found;
  }
  invalidate("refunds/me");
  return opened;
}

export type CancelRefundResult =
  | { readonly kind: "opened"; readonly refund: ApiRefundCase }
  | { readonly kind: "notCancelled"; readonly outcome: Exclude<CancellationOutcome, "cancelled"> }
  | { readonly kind: "cancelledOnly" };

/**
 * Cancel a paid booking under the rule, then open the refund it is owed.
 *
 * The cancel goes first and is checked (`cancelAndCheck`), so a request is
 * never opened on a booking that is still on. When the cancel stands and the
 * request does not, the booking reads as cancelled-and-unclaimed, which the
 * page offers to claim with one press: nothing is lost between the two calls.
 */
export async function cancelThenRefund(bookingId: string, invoiceId: string, reason: string): Promise<CancelRefundResult> {
  const outcome = await cancelAndCheck(bookingId);
  if (outcome !== "cancelled") return { kind: "notCancelled", outcome };
  invalidate("bookings/");
  invalidate("payment/invoices");
  try {
    return { kind: "opened", refund: await openRefundOnce(invoiceId, reason) };
  } catch {
    return { kind: "cancelledOnly" };
  }
}
