import { isCancellable } from "@/components/bookings/booking-flow";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

/**
 * The numbers of /terms §8 (`lib/legal/terms.ts`, id "cancellation"), which
 * every way out of a booking is drawn from. A unit test reads them back out
 * of the terms in both languages, so a change there fails here first.
 */
export const REFUND_POLICY = {
  /** Cancelling at least this long before the start refunds the whole charge. */
  fullRefundHours: 24,
  /** Inside that window, this share of the service fee comes back; the platform fee does not. */
  lateSharePercent: 50,
  /** A problem with a session can be reported until this long after its end. */
  reportDays: 7,
  /** The team answers a report within this many business days. */
  decisionBusinessDays: 14,
} as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type RefundShare = "full" | "half";

/**
 * Where a refund request stands, in the words the advisee reads. Approving a
 * request moves no money yet (API #86), so nothing before `refunded` says the
 * money is on its way: `requested` and `reviewing` wait on the team,
 * `approved` waits on the refund itself.
 */
export type RefundStage = "requested" | "reviewing" | "approved" | "refunded" | "rejected";

/**
 * A cancellation under the rule is money owed, which the team confirms; only
 * a reported problem is reviewed. Which one a request is follows from the
 * booking: a request on a cancelled booking is the cancellation's refund.
 */
export type RefundCaseType = "cancellation" | "report";

/**
 * The one way out of a booking that the screens offer, and what it pays.
 *
 * - `waiting`: the invoice or the requests are still loading; nothing is offered yet.
 * - `none`: an unpaid booking with nothing left to do (started, or already off).
 * - `rescheduled`: moved to a new time; its payment went with it.
 * - `paidElsewhere`: under way or booked with no receipt of its own, so paid on the booking it replaced; support settles it.
 * - `cancel`: unpaid and not started; the plain cancel, nothing about money.
 * - `cancelRefund`: paid, booked and not started; cancelling refunds `refundSatang`.
 * - `report`: started, up to `until`; a problem can be reported for at most `maxSatang`.
 * - `closed`: the report window shut at `closedAt`.
 * - `claim`: cancelled and paid with no request yet; `refundSatang` is owed.
 * - `status`: a request exists; it is shown, never sent again.
 * - `refunded`: the invoice was refunded without a request on record.
 */
export type BookingExit =
  | { readonly kind: "waiting" }
  | { readonly kind: "none" }
  | { readonly kind: "rescheduled" }
  | { readonly kind: "paidElsewhere" }
  | { readonly kind: "cancel" }
  | {
      readonly kind: "cancelRefund";
      readonly share: RefundShare;
      readonly refundSatang: number;
      readonly fullUntil: Date;
      readonly startsAt: Date;
    }
  | { readonly kind: "report"; readonly maxSatang: number; readonly until: Date }
  | { readonly kind: "closed"; readonly closedAt: Date }
  | {
      readonly kind: "claim";
      readonly share: RefundShare;
      readonly refundSatang: number;
      readonly by: "advisee" | "other";
    }
  | {
      readonly kind: "status";
      readonly refund: ApiRefundCase;
      readonly type: RefundCaseType;
      readonly stage: RefundStage;
      readonly refundSatang: number;
    }
  | { readonly kind: "refunded"; readonly refundSatang: number };

export type BookingExitInput = {
  readonly booking: ApiBooking;
  /** Undefined while it loads, null when the booking has no receipt (a 404). */
  readonly invoice: ApiAdviseeInvoice | null | undefined;
  /** The invoice's refund requests; undefined while they load. Only read for a paid invoice. */
  readonly cases: readonly ApiRefundCase[] | undefined;
  readonly now: number;
};

/** The request a booking's money hangs on: an open one first, else the newest. */
export function currentRefundCase(cases: readonly ApiRefundCase[]): ApiRefundCase | undefined {
  const open = cases.find((item) => item.status === "OPEN");
  if (open) return open;
  return cases.reduce<ApiRefundCase | undefined>(
    (newest, item) => (!newest || Date.parse(item.createdAt) > Date.parse(newest.createdAt) ? item : newest),
    undefined,
  );
}

/** The last instant a cancellation still refunds the whole charge. */
export function fullRefundUntil(booking: ApiBooking): Date {
  return new Date(Date.parse(booking.startTime) - REFUND_POLICY.fullRefundHours * HOUR);
}

/** The last instant a problem with the session can be reported. */
export function reportUntil(booking: ApiBooking): Date {
  return new Date(Date.parse(booking.endTime) + REFUND_POLICY.reportDays * DAY);
}

/** What a share of the refund pays: the whole charge, or half the service fee with the platform fee kept. */
export function refundFor(share: RefundShare, invoice: ApiAdviseeInvoice): number {
  return share === "full"
    ? invoice.amountSatang
    : Math.round((invoice.priceSatang * REFUND_POLICY.lateSharePercent) / 100);
}

/** The page where a booking's money is settled. */
export function refundHref(bookingId: string): string {
  return `/bookings/refund?bookingId=${bookingId}`;
}

/** The booking open over the calendar, where the refund page goes back to. */
export function bookingPopupHref(bookingId: string): string {
  return `/bookings?bookingId=${bookingId}`;
}

/** Sign in again and come back to `next`. */
export function signInHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

function isPaid(invoice: ApiAdviseeInvoice | null): invoice is ApiAdviseeInvoice {
  return invoice?.status === "paid" || invoice?.status === "refunded";
}

/**
 * A rescheduled booking is cancelled and its invoice moves to the new
 * appointment, so the old one's money is the new one's business.
 */
function rescheduledAway(booking: ApiBooking, invoice: ApiAdviseeInvoice): boolean {
  return (
    booking.state === "CANCELLED" &&
    invoice.session !== null &&
    Date.parse(invoice.session.startTime) !== Date.parse(booking.startTime)
  );
}

/**
 * Who called a cancelled booking off decides the share: the advisor or the
 * team (anyone but the advisee, or nobody on record) owes the whole charge;
 * the advisee's own cancellation follows the 24-hour line, judged at the
 * moment it was made.
 */
function cancelledShare(booking: ApiBooking): { readonly share: RefundShare; readonly by: "advisee" | "other" } {
  if (booking.cancelledByUserId === null || booking.cancelledByUserId !== booking.adviseeId) {
    return { share: "full", by: "other" };
  }
  const at = booking.cancelledAt === null ? Number.NEGATIVE_INFINITY : Date.parse(booking.cancelledAt);
  return { share: at <= fullRefundUntil(booking).getTime() ? "full" : "half", by: "advisee" };
}

function stageOf(refund: ApiRefundCase, type: RefundCaseType, invoice: ApiAdviseeInvoice): RefundStage {
  if (invoice.status === "refunded") return "refunded";
  if (refund.status === "APPROVED") return "approved";
  if (refund.status === "REJECTED") return "rejected";
  return type === "cancellation" ? "requested" : "reviewing";
}

/** States that say the session began (or is over) whatever the clock says: the room opens 10 minutes early. */
const STARTED: ReadonlySet<ApiBooking["state"]> = new Set(["IN_PROGRESS", "COMPLETED", "NO_SHOW"]);

/**
 * The one way out of a booking, from /terms §8 and the clock (S = start, E = end):
 *
 * - R10 nothing while the invoice, or a paid invoice's requests, still load.
 * - R1 unpaid (a held slot, or a pending/failed receipt) and before S: the plain cancel. After S, nothing.
 * - A booking past PENDING_PAYMENT with no receipt was paid on the booking it
 *   replaced: on API develop only a paid charge (`confirmPayment`) or a
 *   reschedule's replacement leaves PENDING_PAYMENT, and the replacement gets
 *   no receipt of its own. Its money is on the original, so it offers no
 *   cancel, no move and no price, only support. A cancelled one is "none".
 * - R7 cancelled and paid with no request: the refund owed, unless it was rescheduled away.
 * - R8 a request exists (open first, else the newest): its status, never a second request.
 * - R9 refunded with no request: the refund on record.
 * - R2 booked, paid, now ≤ S − 24 h: cancel for the whole charge.
 * - R3 booked, paid, S − 24 h < now < S: cancel for half the service fee.
 * - R4 from S, or once the session's state says it began: no cancel anywhere.
 * - R5 from S to E + 7 days: report a problem, for at most the whole charge.
 * - R6 after E + 7 days: closed.
 */
export function bookingExit({ booking, invoice, cases, now }: BookingExitInput): BookingExit {
  const startsAt = new Date(booking.startTime);
  // A held slot is unpaid by its own state, so its cancel never waits on (or fails with) the invoice read.
  if (booking.state === "PENDING_PAYMENT") return now < startsAt.getTime() ? { kind: "cancel" } : { kind: "none" };
  if (invoice === undefined) return { kind: "waiting" };
  if (invoice === null && booking.state !== "CANCELLED") return { kind: "paidElsewhere" };

  if (!isPaid(invoice)) {
    return isCancellable(booking.state) && now < startsAt.getTime() ? { kind: "cancel" } : { kind: "none" };
  }
  if (cases === undefined) return { kind: "waiting" };
  if (rescheduledAway(booking, invoice)) return { kind: "rescheduled" };

  const cancelled = booking.state === "CANCELLED";
  const refund = currentRefundCase(cases);
  if (refund) {
    const type: RefundCaseType = cancelled ? "cancellation" : "report";
    const stage = stageOf(refund, type, invoice);
    const owed = cancelled ? refundFor(cancelledShare(booking).share, invoice) : invoice.amountSatang;
    return {
      kind: "status",
      refund,
      type,
      stage,
      refundSatang: stage === "refunded" ? (invoice.refundSatang ?? owed) : owed,
    };
  }
  if (invoice.status === "refunded") {
    return { kind: "refunded", refundSatang: invoice.refundSatang ?? invoice.amountSatang };
  }
  if (cancelled) {
    const { share, by } = cancelledShare(booking);
    return { kind: "claim", share, by, refundSatang: refundFor(share, invoice) };
  }

  // Paid and still on from here: BOOKED until it starts, then under way or over.
  const started = now >= startsAt.getTime() || STARTED.has(booking.state);
  if (!started) {
    const fullUntil = fullRefundUntil(booking);
    const share: RefundShare = now <= fullUntil.getTime() ? "full" : "half";
    return { kind: "cancelRefund", share, refundSatang: refundFor(share, invoice), fullUntil, startsAt };
  }
  const until = reportUntil(booking);
  return now <= until.getTime()
    ? { kind: "report", maxSatang: invoice.amountSatang, until }
    : { kind: "closed", closedAt: until };
}

/**
 * Whether what a page shows is still what a press would do: the same way out,
 * at the same share. A page left open can cross the 24-hour line or the start
 * while it waits, and the API's cancel checks neither (API bookings.service.ts
 * `cancel`), so a press acts only on the offer it was shown.
 */
export function sameOffer(shown: BookingExit, current: BookingExit): boolean {
  if (shown.kind !== current.kind) return false;
  return shown.kind !== "cancelRefund" || (current.kind === "cancelRefund" && shown.share === current.share);
}

/** Whether a booking can move to another time: in place over the advisor's slots, or not yet, with the reason said. */
export type RescheduleWay = "slots" | "withheld";

/**
 * /terms §8: an advisee may move a booking once, at no cost, while it is at
 * least 24 hours away.
 *
 * A paid booking's move is withheld. API develop's `reschedule` cancels the
 * original as the advisee and marks it no other way, so the original would
 * read as the advisee's own early cancel, its whole charge owed, while the
 * new session goes ahead; and no staff route can move one for them
 * (docs/review/refund-request.md, API follow-ups). An unpaid booking owes
 * nothing either way, so it moves in place. One paid on the booking it
 * replaced has had its move. Until the invoice is known nothing is said.
 */
export function rescheduleWay({ booking, invoice, now }: Omit<BookingExitInput, "cases">): RescheduleWay | null {
  if (!isCancellable(booking.state) || now > fullRefundUntil(booking).getTime()) return null;
  if (booking.state === "PENDING_PAYMENT") return "slots";
  if (!invoice) return null;
  return isPaid(invoice) ? "withheld" : "slots";
}
