import { describe, expect, it } from "vitest";
import {
  REFUND_POLICY,
  bookingExit,
  bookingPopupHref,
  currentRefundCase,
  refundHref,
  rescheduleWay,
  sameOffer,
  signInHref,
  type BookingExitInput,
} from "@/components/bookings/booking-exit";
import { terms } from "@/lib/legal/terms";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const S = Date.parse("2026-11-11T03:30:00Z");
const E = S + HOUR;

const booking: ApiBooking = {
  id: "15638839-49d1-4553-b79c-59821ff58f2e", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: new Date(S).toISOString(), endTime: new Date(E).toISOString(), unavailableUntil: new Date(E).toISOString(),
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-11-01T00:00:00Z",
};
const invoice: ApiAdviseeInvoice = {
  id: "invoice", invoiceNumber: "INV-2026-000123", status: "paid", amountSatang: 100_000, platformFeeSatang: 20_000,
  priceSatang: 80_000, refundSatang: null, createdAt: "2026-11-01T00:00:00Z", paidAt: "2026-11-01T00:01:00Z",
  service: { id: "service", name: "Tax" }, advisor: { id: "advisor", displayName: "Araya" },
  session: { startTime: booking.startTime, endTime: booking.endTime }, booking: "confirmed", card: { brand: "Visa", lastDigits: "1111" },
};
const refundCase = (status: ApiRefundCase["status"], createdAt: string, id: string = status): ApiRefundCase => ({
  id, invoiceId: invoice.id, reason: "r", status, createdAt, resolvedAt: status === "OPEN" ? null : createdAt,
});
const cancelledBooking = (by: string | null, at: number): ApiBooking => ({
  ...booking, state: "CANCELLED", cancelledByUserId: by, cancelledAt: new Date(at).toISOString(), blocksAvailability: false,
});
const exit = (input: Partial<BookingExitInput>) =>
  bookingExit({ booking, invoice, cases: [], now: S - 3 * DAY, ...input });

describe("R10 nothing is offered while the money is still loading", () => {
  it("waits for the invoice", () => {
    expect(exit({ invoice: undefined })).toEqual({ kind: "waiting" });
  });

  it("waits for a paid invoice's refund requests", () => {
    expect(exit({ cases: undefined })).toEqual({ kind: "waiting" });
  });

  it("never waits on the invoice of a held slot, which its own state says is unpaid", () => {
    const held = { ...booking, state: "PENDING_PAYMENT" as const };
    expect(exit({ booking: held, invoice: undefined, cases: undefined })).toEqual({ kind: "cancel" });
    expect(exit({ booking: held, invoice: undefined, now: S })).toEqual({ kind: "none" });
  });

  it("never waits on requests for a receipt that is not paid, which has none", () => {
    const held = { ...booking, state: "PENDING_PAYMENT" as const };
    expect(exit({ booking: held, invoice: { ...invoice, status: "pending" }, cases: undefined })).toEqual({ kind: "cancel" });
    expect(exit({ invoice: { ...invoice, status: "failed" }, cases: undefined })).toEqual({ kind: "paidElsewhere", receipt: "unpaid" });
  });
});

describe("R1 a held slot keeps the plain cancel until it starts", () => {
  const held = { ...booking, state: "PENDING_PAYMENT" as const };
  const pending = { ...invoice, status: "pending" as const };
  const failed = { ...invoice, status: "failed" as const };

  it.each([
    ["no receipt", null],
    ["a pending receipt", pending],
    ["a failed receipt", failed],
  ])("offers the plain cancel on a held slot with %s", (_, receipt) => {
    expect(exit({ booking: held, invoice: receipt })).toEqual({ kind: "cancel" });
  });

  it("offers nothing once the start has passed, whatever says it is unpaid", () => {
    expect(exit({ booking: held, invoice: null, now: S })).toEqual({ kind: "none" });
    expect(exit({ booking: held, invoice: failed, now: S })).toEqual({ kind: "none" });
    expect(exit({ booking: held, invoice: pending, now: S + HOUR })).toEqual({ kind: "none" });
  });

  it.each([
    ["no receipt", null],
    ["a failed receipt", failed],
  ])("offers nothing on a cancelled booking with %s", (_, receipt) => {
    expect(exit({ invoice: receipt, booking: cancelledBooking("advisee", S - 3 * DAY) })).toEqual({ kind: "none" });
  });
});

describe("a held slot whose receipt already reads paid follows the paid rules", () => {
  const held = { ...booking, state: "PENDING_PAYMENT" as const };

  it("offers the cancel with its refund, never the plain cancel, once the paid receipt is read", () => {
    expect(exit({ booking: held, now: S - 3 * DAY })).toMatchObject({ kind: "cancelRefund", share: "full", refundSatang: 100_000 });
    expect(exit({ booking: held, now: S - 5 * HOUR })).toMatchObject({ kind: "cancelRefund", share: "half", refundSatang: 40_000 });
  });

  it("waits for its requests, and shows one already sent", () => {
    expect(exit({ booking: held, cases: undefined })).toEqual({ kind: "waiting" });
    expect(exit({ booking: held, cases: [refundCase("OPEN", "2026-11-04T00:00:00Z")] })).toMatchObject({ kind: "status" });
  });

  it("shows a refund on record, and a report once it has started", () => {
    expect(exit({ booking: held, invoice: { ...invoice, status: "refunded", refundSatang: 100_000 } })).toEqual({ kind: "refunded", refundSatang: 100_000 });
    expect(exit({ booking: held, now: E })).toMatchObject({ kind: "report" });
  });

  it("keeps the plain cancel while its receipt is still loading", () => {
    expect(exit({ booking: held, invoice: undefined, cases: undefined })).toEqual({ kind: "cancel" });
  });
});

describe("a booking past its hold without a paid receipt was paid somewhere support can see", () => {
  it.each(["BOOKED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"] as const)(
    "sends a %s one with no receipt to support, before and after the start, never to the plain cancel",
    (state) => {
      expect(exit({ booking: { ...booking, state }, invoice: null })).toEqual({ kind: "paidElsewhere", receipt: "missing" });
      expect(exit({ booking: { ...booking, state }, invoice: null, now: E + DAY })).toEqual({ kind: "paidElsewhere", receipt: "missing" });
    },
  );

  it.each([
    ["pending", "BOOKED"],
    ["failed", "BOOKED"],
    ["failed", "IN_PROGRESS"],
    ["pending", "COMPLETED"],
  ] as const)("sends one whose receipt reads %s (%s) to support, never to the plain cancel", (status, state) => {
    const receipt = { ...invoice, status };
    expect(exit({ booking: { ...booking, state }, invoice: receipt })).toEqual({ kind: "paidElsewhere", receipt: "unpaid" });
    expect(exit({ booking: { ...booking, state }, invoice: receipt, now: S })).toEqual({ kind: "paidElsewhere", receipt: "unpaid" });
  });
});

describe("R2 a paid booking cancelled 24 hours or more ahead refunds the whole charge", () => {
  it("refunds the amount charged three days ahead", () => {
    expect(exit({ now: S - 3 * DAY })).toEqual({
      kind: "cancelRefund", share: "full", refundSatang: 100_000, fullUntil: new Date(S - DAY), startsAt: new Date(S),
    });
  });

  it("still refunds in full at exactly 24 hours before the start", () => {
    expect(exit({ now: S - DAY })).toMatchObject({ kind: "cancelRefund", share: "full", refundSatang: 100_000 });
  });
});

describe("R3 a paid booking cancelled inside 24 hours refunds half the service fee", () => {
  it("refunds half of ฿800 and keeps the ฿200 platform fee five hours ahead", () => {
    expect(exit({ now: S - 5 * HOUR })).toMatchObject({ kind: "cancelRefund", share: "half", refundSatang: 40_000 });
  });

  it("turns half one millisecond after the 24-hour line", () => {
    expect(exit({ now: S - DAY + 1 })).toMatchObject({ share: "half" });
  });

  it("rounds half a fee with an odd satang to the nearest satang", () => {
    expect(exit({ now: S - HOUR, invoice: { ...invoice, priceSatang: 80_001 } })).toMatchObject({ refundSatang: 40_001 });
  });
});

describe("R4 there is no cancel from the start time or once the session runs", () => {
  it("offers no cancel at the start time", () => {
    expect(exit({ now: S }).kind).not.toBe("cancelRefund");
  });

  it("offers no cancel for a session the advisor started early", () => {
    expect(exit({ now: S - HOUR, booking: { ...booking, state: "IN_PROGRESS" } })).toMatchObject({ kind: "report" });
  });

  it.each(["COMPLETED", "NO_SHOW"] as const)("reads a %s session before its start time as started, open to a report", (state) => {
    expect(exit({ now: S - 5 * 60_000, booking: { ...booking, state } })).toEqual({
      kind: "report", maxSatang: 100_000, until: new Date(E + 7 * DAY),
    });
  });
});

describe("R5 from the start to 7 days after the end a problem can be reported", () => {
  it("reports for at most the whole charge, until 7 days after the end", () => {
    expect(exit({ now: E + 2 * HOUR })).toEqual({ kind: "report", maxSatang: 100_000, until: new Date(E + 7 * DAY) });
  });

  it.each(["IN_PROGRESS", "COMPLETED", "NO_SHOW"] as const)("reports a %s session", (state) => {
    expect(exit({ now: E, booking: { ...booking, state } })).toMatchObject({ kind: "report" });
  });

  it("still reports at exactly 7 days after the end", () => {
    expect(exit({ now: E + 7 * DAY })).toMatchObject({ kind: "report" });
  });
});

describe("R6 after 7 days from the end the window is closed", () => {
  it("is closed, with the instant it closed", () => {
    expect(exit({ now: E + 7 * DAY + 1 })).toEqual({ kind: "closed", closedAt: new Date(E + 7 * DAY) });
  });

  it("is closed for a completed session too", () => {
    expect(exit({ now: E + 30 * DAY, booking: { ...booking, state: "COMPLETED" } })).toMatchObject({ kind: "closed" });
  });
});

describe("R7 a cancelled, paid booking with no request is owed its refund", () => {
  it("owes the whole charge when the advisor or the team cancelled", () => {
    expect(exit({ booking: cancelledBooking("advisor", S - HOUR), now: S + DAY })).toEqual({
      kind: "claim", share: "full", by: "other", refundSatang: 100_000,
    });
  });

  it("owes the whole charge when nobody is on record as cancelling", () => {
    expect(exit({ booking: cancelledBooking(null, S - HOUR) })).toMatchObject({ share: "full", by: "other" });
  });

  it("owes the whole charge when the advisee cancelled 24 hours or more ahead", () => {
    expect(exit({ booking: cancelledBooking("advisee", S - DAY) })).toMatchObject({ share: "full", by: "advisee", refundSatang: 100_000 });
  });

  it("owes half the service fee when the advisee cancelled inside 24 hours", () => {
    expect(exit({ booking: cancelledBooking("advisee", S - 5 * HOUR) })).toMatchObject({ share: "half", by: "advisee", refundSatang: 40_000 });
  });

  it("says the booking moved, and nothing about money, for one rescheduled to a new time", () => {
    const moved = { ...invoice, session: { startTime: new Date(S + 2 * DAY).toISOString(), endTime: new Date(E + 2 * DAY).toISOString() } };
    expect(exit({ booking: cancelledBooking("advisee", S - 3 * DAY), invoice: moved, cases: [refundCase("OPEN", "2026-11-05T00:00:00Z")] })).toEqual({ kind: "rescheduled" });
  });

  it("matches the session's time by instant, not by how it is written", () => {
    const sameInstant = { ...invoice, session: { startTime: "2026-11-11T10:30:00+07:00", endTime: booking.endTime } };
    expect(exit({ booking: cancelledBooking("advisor", S - HOUR), invoice: sameInstant })).toMatchObject({ kind: "claim" });
  });
});

describe("R8 a booking with a request shows its status and is never requested again", () => {
  it("reads an open request on a cancelled booking as the cancellation's refund, requested and not yet moving", () => {
    const open = refundCase("OPEN", "2026-11-04T13:56:00Z");
    expect(exit({ booking: cancelledBooking("advisee", S - 6 * DAY), cases: [open] })).toEqual({
      kind: "status", refund: open, type: "cancellation", stage: "requested", refundSatang: 100_000,
    });
  });

  it("owes half on the status of a late cancellation", () => {
    expect(exit({ booking: cancelledBooking("advisee", S - HOUR), cases: [refundCase("OPEN", "2026-11-11T02:31:00Z")] })).toMatchObject({ refundSatang: 40_000 });
  });

  it("reads a request on a booking still on as a reported problem, reviewed", () => {
    expect(exit({ now: E + DAY, cases: [refundCase("OPEN", "2026-11-12T00:00:00Z")] })).toMatchObject({
      type: "report", stage: "reviewing", refundSatang: 100_000,
    });
  });

  it.each([
    ["APPROVED", "approved"],
    ["REJECTED", "rejected"],
  ] as const)("names a %s request %s", (status, stage) => {
    expect(exit({ now: E + DAY, cases: [refundCase(status, "2026-11-12T00:00:00Z")] })).toMatchObject({ kind: "status", stage });
  });

  it("names the request refunded once the invoice is, with the amount on the invoice", () => {
    const refunded = { ...invoice, status: "refunded" as const, refundSatang: 95_000 };
    expect(exit({ now: E + DAY, invoice: refunded, cases: [refundCase("APPROVED", "2026-11-12T00:00:00Z")] })).toMatchObject({
      kind: "status", stage: "refunded", refundSatang: 95_000,
    });
  });

  it("follows the open request over a newer resolved one", () => {
    const open = refundCase("OPEN", "2026-11-01T00:00:00Z", "older-open");
    const approved = refundCase("APPROVED", "2026-11-09T00:00:00Z", "newer-approved");
    expect(exit({ now: E + DAY, cases: [approved, open] })).toMatchObject({ refund: open, stage: "reviewing" });
  });

  it("follows the newest request when none is open", () => {
    const rejected = refundCase("REJECTED", "2026-11-01T00:00:00Z", "old");
    const approved = refundCase("APPROVED", "2026-11-09T00:00:00Z", "new");
    expect(currentRefundCase([approved, rejected])).toBe(approved);
    expect(currentRefundCase([rejected, approved])).toBe(approved);
    expect(currentRefundCase([])).toBeUndefined();
  });

  it("shows the status before the cancel a paid booking would otherwise offer", () => {
    expect(exit({ now: S - 3 * DAY, cases: [refundCase("REJECTED", "2026-11-02T00:00:00Z")] })).toMatchObject({ kind: "status" });
  });
});

describe("R9 a refunded invoice with no request shows the refund on record", () => {
  it("shows the refunded amount", () => {
    expect(exit({ invoice: { ...invoice, status: "refunded", refundSatang: 100_000 } })).toEqual({ kind: "refunded", refundSatang: 100_000 });
  });

  it("falls back to the charge when the invoice names no refund amount", () => {
    expect(exit({ invoice: { ...invoice, status: "refunded" }, now: E + 30 * DAY })).toEqual({ kind: "refunded", refundSatang: 100_000 });
  });
});

describe("a press acts only on the offer it was shown", () => {
  it("still stands while the clock stays on the same side of every line", () => {
    expect(sameOffer(exit({ now: S - 3 * DAY }), exit({ now: S - 2 * DAY }))).toBe(true);
    expect(sameOffer(exit({ now: E }), exit({ now: E + DAY }))).toBe(true);
  });

  it("no longer stands once the 24-hour line is crossed, though it is still a cancel", () => {
    expect(sameOffer(exit({ now: S - DAY - 2 * 60_000 }), exit({ now: S - DAY + 2 * 60_000 }))).toBe(false);
  });

  it("no longer stands once the session has started", () => {
    expect(sameOffer(exit({ now: S - 60_000 }), exit({ now: S + 60_000 }))).toBe(false);
  });
});

describe("§8 one free reschedule, at least 24 hours ahead", () => {
  const way = (input: Partial<Omit<BookingExitInput, "cases">>) =>
    rescheduleWay({ booking, invoice, now: S - 3 * DAY, ...input });
  const held = { ...booking, state: "PENDING_PAYMENT" as const };

  it("withholds a paid booking's move, and says so, three days ahead and at exactly 24 hours", () => {
    expect(way({})).toBe("withheld");
    expect(way({ now: S - DAY })).toBe("withheld");
  });

  it("moves a held slot over the slots, even before its invoice is known", () => {
    expect(way({ booking: held, invoice: undefined })).toBe("slots");
    expect(way({ booking: held, invoice: { ...invoice, status: "failed" } })).toBe("slots");
  });

  it("withholds the move of a held slot whose receipt already reads paid", () => {
    expect(way({ booking: held })).toBe("withheld");
  });

  it("offers no move on a confirmed booking without a paid receipt, which goes to support", () => {
    expect(way({ invoice: { ...invoice, status: "failed" } })).toBeNull();
    expect(way({ invoice: { ...invoice, status: "pending" } })).toBeNull();
  });

  it("is not offered inside 24 hours, where a move would turn a half refund into a full one", () => {
    expect(way({ now: S - DAY + 1 })).toBeNull();
    expect(way({ booking: held, now: S - 5 * HOUR })).toBeNull();
  });

  it("is not offered on a booking paid on the one it replaced, which has had its move", () => {
    expect(way({ invoice: null })).toBeNull();
  });

  it("waits for the invoice, and is never offered on a booking that is off or under way", () => {
    expect(way({ invoice: undefined })).toBeNull();
    expect(way({ booking: { ...booking, state: "IN_PROGRESS" } })).toBeNull();
    expect(way({ booking: cancelledBooking("advisee", S - 4 * DAY) })).toBeNull();
  });
});

describe("the plain cancel and the slot move belong to an unpaid hold alone", () => {
  const states = ["PENDING_PAYMENT", "BOOKED", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;
  const receipts = [undefined, null, "pending", "failed", "paid", "refunded"] as const;
  const requests = [undefined, [], [refundCase("OPEN", "2026-11-04T00:00:00Z")]] as const;
  const clocks = [S - 3 * DAY, S - DAY, S - 5 * HOUR, S, E + DAY, E + 8 * DAY];
  const grid = states.flatMap((state) =>
    receipts.flatMap((receipt) =>
      requests.flatMap((cases) =>
        clocks.map((now) => ({
          booking: state === "CANCELLED" ? cancelledBooking("advisee", S - 2 * DAY) : { ...booking, state },
          invoice: receipt === undefined || receipt === null ? receipt : { ...invoice, status: receipt },
          cases,
          now,
        })),
      ),
    ),
  );

  it("never offers either on a booking whose receipt reads paid, or on one past its hold", () => {
    const wrong = grid.filter((input) => {
      const paid = input.invoice?.status === "paid" || input.invoice?.status === "refunded";
      if (!paid && input.booking.state === "PENDING_PAYMENT") return false;
      return bookingExit(input).kind === "cancel" || rescheduleWay(input) === "slots";
    });
    expect(grid).toHaveLength(648);
    expect(wrong.map((input) => `${input.booking.state} ${input.invoice?.status ?? input.invoice} ${input.now}`)).toEqual([]);
  });

  it("offers the plain cancel to every unpaid hold before its start", () => {
    const held = grid.filter(
      (input) =>
        input.booking.state === "PENDING_PAYMENT" &&
        !(input.invoice?.status === "paid" || input.invoice?.status === "refunded") &&
        input.now < S,
    );
    expect(held.every((input) => bookingExit(input).kind === "cancel")).toBe(true);
    expect(held).toHaveLength(36);
  });
});

describe("links", () => {
  it("names the refund page and the booking's popup", () => {
    expect(refundHref(booking.id)).toBe(`/bookings/refund?bookingId=${booking.id}`);
    expect(bookingPopupHref(booking.id)).toBe(`/bookings?bookingId=${booking.id}`);
  });

  it("signs in and comes back to the page it was sent from", () => {
    expect(signInHref(refundHref(booking.id))).toBe(`/login?next=%2Fbookings%2Frefund%3FbookingId%3D${booking.id}`);
  });
});

describe("the policy's numbers are the ones /terms §8 states", () => {
  const sectionText = (locale: "th" | "en") => {
    const section = terms[locale].sections.find((item) => item.id === "cancellation");
    expect(section).toBeDefined();
    return JSON.stringify(section);
  };

  it("matches the Thai terms", () => {
    const text = sectionText("th");
    expect(text).toContain(`อย่างน้อย ${REFUND_POLICY.fullRefundHours} ชั่วโมง: คืนเงินเต็มจำนวน`);
    expect(text).toContain(`ภายใน ${REFUND_POLICY.fullRefundHours} ชั่วโมงก่อนเวลาเริ่ม: คืนเงินร้อยละ ${REFUND_POLICY.lateSharePercent} ของค่าบริการ`);
    expect(text).toContain(`ภายใน ${REFUND_POLICY.reportDays} วันนับจากเวลาสิ้นสุด`);
    expect(text).toContain(`ภายใน ${REFUND_POLICY.decisionBusinessDays} วันทำการ`);
  });

  it("matches the English terms", () => {
    const text = sectionText("en");
    expect(text).toContain(`At least ${REFUND_POLICY.fullRefundHours} hours before the start: full refund`);
    expect(text).toContain(`Within ${REFUND_POLICY.fullRefundHours} hours of the start: ${REFUND_POLICY.lateSharePercent}% of the service fee refunded`);
    expect(text).toContain(`within ${REFUND_POLICY.reportDays} days of its end`);
    expect(text).toContain(`within ${REFUND_POLICY.decisionBusinessDays} business days`);
  });
});
