"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { bookingExit, type BookingExit } from "@/components/bookings/booking-exit";
import { refundFailure } from "@/components/bookings/refund-actions";
import { ApiError } from "@/lib/api/client";
import { getMyBookingInvoice, listMyRefundCases } from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { useResource, type Resource } from "@/lib/api/use-resource";

export function isNotFound(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 404;
}

/** One empty list for every unpaid invoice, so a reader can tell "no change" by identity. */
const NO_CASES: readonly ApiRefundCase[] = [];

/**
 * The last answer to one request: while `key` is read again, or after that
 * read failed, its last answer stands in, and the failure is said beside it.
 * Dropped, a paid receipt would turn a held slot back into the plain cancel.
 * An answer to another key never stands in: an unpaid invoice's requests
 * (none) are no answer for the paid one's, which would read as unclaimed.
 */
function useLastAnswerTo<T>(key: string, resource: Resource<T>): T | undefined {
  const [last, setLast] = useState<{ readonly key: string; readonly data: T }>();
  if (resource.data !== undefined && (last?.key !== key || last.data !== resource.data)) {
    setLast({ key, data: resource.data });
  }
  if (resource.data !== undefined) return resource.data;
  return last?.key === key ? last.data : undefined;
}

/**
 * Which read failed, so the words name it: the receipt (what was paid), or
 * its refund requests, which an account without the refund permission is
 * refused even when it may read the receipt.
 */
export type MoneyReadFailure = { readonly read: "invoice" | "requests"; readonly error: Error };

/** What a failed money read asks of the advisee: press again, sign in, or support, for a refusal of this account or of this booking. */
export type MoneyReadProblem = "retry" | "signIn" | "forbidden" | "refused";

export function moneyReadProblem(error: Error): MoneyReadProblem {
  if (error instanceof ApiError && error.status === 403) return "forbidden";
  const failure = refundFailure(error);
  return failure === "notFound" ? "refused" : failure;
}

export type BookingMoney = {
  /** Undefined until a first answer (while it loads, or after it failed); null when the booking has no receipt. */
  readonly invoice: ApiAdviseeInvoice | null | undefined;
  /** Undefined until a first answer (while they load, or after they failed); empty for an unpaid invoice. */
  readonly cases: readonly ApiRefundCase[] | undefined;
  /** A failed read (a missing receipt is not one). */
  readonly failure: MoneyReadFailure | null;
  readonly reload: () => void;
};

/**
 * A booking's money as the exits need it: its invoice, where a 404 means "no
 * receipt" rather than a failure, and that invoice's refund requests, read
 * only once the invoice is known to be paid.
 */
export function useBookingMoney(bookingId: string): BookingMoney {
  const fetchInvoice = useCallback(
    (signal: AbortSignal) =>
      getMyBookingInvoice(bookingId, signal).catch((cause: unknown) => {
        if (isNotFound(cause)) return null;
        throw cause;
      }),
    [bookingId],
  );
  const invoiceKey = `payment/invoices/for-booking/${bookingId}`;
  const invoice = useResource<ApiAdviseeInvoice | null>(invoiceKey, fetchInvoice);
  // A cancel or a new request drops these from the cache; until they are read
  // again the screen keeps what it knew rather than falling back to "loading".
  const knownInvoice = useLastAnswerTo(invoiceKey, invoice);
  const paidId =
    knownInvoice && (knownInvoice.status === "paid" || knownInvoice.status === "refunded") ? knownInvoice.id : null;
  const fetchCases = useCallback(
    (signal: AbortSignal): Promise<readonly ApiRefundCase[]> =>
      paidId
        ? listMyRefundCases({ invoiceId: paidId, limit: 100 }, signal).then((page) => page.items)
        : Promise.resolve([]),
    [paidId],
  );
  const casesKey = `refunds/me?invoiceId=${paidId ?? "unpaid"}`;
  const cases = useResource<readonly ApiRefundCase[]>(casesKey, fetchCases);
  const knownCases = useLastAnswerTo(casesKey, cases);
  const { reload: reloadInvoice } = invoice;
  const { reload: reloadCases } = cases;
  const reload = useCallback(() => {
    reloadInvoice();
    reloadCases();
  }, [reloadInvoice, reloadCases]);

  // An admin can rule on a request while the tab stays open, and the cache
  // keeps a tab's first answer, or its failure, for as long as the tab lives.
  // A screen that opens on a cached answer reads it again once, showing that
  // answer meanwhile, so neither the popup nor the refund page stays stale.
  const cached = useRef(invoice.data !== undefined || invoice.error !== null);
  useEffect(() => {
    if (!cached.current) return;
    cached.current = false;
    reload();
  }, [reload]);

  let failure: MoneyReadFailure | null = null;
  if (invoice.error) failure = { read: "invoice", error: invoice.error };
  else if (paidId && cases.error) failure = { read: "requests", error: cases.error };
  return { invoice: knownInvoice, cases: paidId ? knownCases : NO_CASES, failure, reload };
}

/** The one way out of this booking, once its money is known (`bookingExit`). */
export function useBookingExit(booking: ApiBooking, now: number): { readonly exit: BookingExit; readonly money: BookingMoney } {
  const money = useBookingMoney(booking.id);
  return { exit: bookingExit({ booking, invoice: money.invoice, cases: money.cases, now }), money };
}
