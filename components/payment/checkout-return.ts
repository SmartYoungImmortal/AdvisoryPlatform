/**
 * Which booking a payment that left for the bank was for.
 *
 * A card's 3-D Secure page, Google Pay's and a bank's app all return through
 * the API to `/checkout/failed` or `/checkout/unconfirmed` with only the
 * invoice's id. So the checkout notes the booking against that id before it
 * leaves, in this tab's session storage (which outlives the trip to the bank
 * and back), and the outcome reopens that booking's checkout with the outcome
 * as a popup over it. A return in another tab or browser finds nothing here,
 * and the outcome shows on its own page instead.
 */

const key = (invoiceId: string) => `checkout-booking:${invoiceId}`;

export function rememberCheckout(invoiceId: string, bookingId: string): void {
  try {
    sessionStorage.setItem(key(invoiceId), bookingId);
  } catch {
    // Storage off: the outcome shows on its own page.
  }
}

export function checkoutBookingOf(invoiceId: string): string | null {
  try {
    return sessionStorage.getItem(key(invoiceId));
  } catch {
    return null;
  }
}

/** A payment that did not end paid: declined, or not yet answered by the bank. */
export type CheckoutOutcome = "failed" | "unconfirmed";

export function isCheckoutOutcome(value: string | null): value is CheckoutOutcome {
  return value === "failed" || value === "unconfirmed";
}

/** The booking's checkout with an outcome over it. */
export function checkoutOutcomeHref(bookingId: string, outcome: CheckoutOutcome, invoiceId: string): string {
  const query = new URLSearchParams({ bookingId, outcome, invoiceId });
  return `/checkout/card?${query.toString()}`;
}
