"use client";

import { useCallback, useEffect, useRef } from "react";

import { bookingExit, type BookingExit } from "@/components/bookings/booking-exit";
import { ApiError } from "@/lib/api/client";
import { getMyBookingInvoice, listMyRefundCases } from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { useLastAnswer, useResource } from "@/lib/api/use-resource";

export function isNotFound(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 404;
}

export type BookingMoney = {
  /** Undefined while it loads or after it failed; null when the booking has no receipt. */
  readonly invoice: ApiAdviseeInvoice | null | undefined;
  /** Undefined while they load or after they failed; empty for an unpaid invoice. */
  readonly cases: readonly ApiRefundCase[] | undefined;
  /** A failed read (a missing receipt is not one). */
  readonly error: Error | null;
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
  const invoice = useResource<ApiAdviseeInvoice | null>(`payment/invoices/for-booking/${bookingId}`, fetchInvoice);
  // A cancel or a new request drops these from the cache; until they are read
  // again the screen keeps what it knew rather than falling back to "loading".
  const lastInvoice = useLastAnswer(invoice);
  const knownInvoice = invoice.data === null ? null : lastInvoice;
  const paidId =
    knownInvoice && (knownInvoice.status === "paid" || knownInvoice.status === "refunded") ? knownInvoice.id : null;
  const fetchCases = useCallback(
    (signal: AbortSignal): Promise<readonly ApiRefundCase[]> =>
      paidId
        ? listMyRefundCases({ invoiceId: paidId, limit: 100 }, signal).then((page) => page.items)
        : Promise.resolve([]),
    [paidId],
  );
  const cases = useResource<readonly ApiRefundCase[]>(`refunds/me?invoiceId=${paidId ?? "unpaid"}`, fetchCases);
  const knownCases = useLastAnswer(cases);
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

  return {
    invoice: knownInvoice,
    cases: paidId ? knownCases : [],
    error: invoice.error ?? (paidId ? cases.error : null),
    reload,
  };
}

/** The one way out of this booking, once its money is known (`bookingExit`). */
export function useBookingExit(booking: ApiBooking, now: number): { readonly exit: BookingExit; readonly money: BookingMoney } {
  const money = useBookingMoney(booking.id);
  return { exit: bookingExit({ booking, invoice: money.invoice, cases: money.cases, now }), money };
}
