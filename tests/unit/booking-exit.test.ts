import { describe, expect, it } from "vitest";
import { bookingExit, canRequestRefund, currentRefundCase } from "@/components/bookings/booking-exit";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

// FE #114: a paid booking has one way out, and it asks for the money back.
const now = Date.parse("2026-11-04T12:00:00Z");
const booking: ApiBooking = {
  id: "550e8400-e29b-41d4-a716-446655440000", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: "2026-11-11T03:30:00Z", endTime: "2026-11-11T04:00:00Z", unavailableUntil: "2026-11-11T04:00:00Z",
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-11-01T00:00:00Z",
};
const ended: ApiBooking = { ...booking, startTime: "2026-11-04T02:00:00Z", endTime: "2026-11-04T02:30:00Z" };
const invoice: ApiAdviseeInvoice = {
  id: "invoice", invoiceNumber: "INV-2026-000001", status: "paid", amountSatang: 100000, platformFeeSatang: 20000,
  priceSatang: 80000, refundSatang: null, createdAt: "2026-11-01T00:00:00Z", paidAt: "2026-11-01T00:01:00Z",
  service: { id: "service", name: "Service" }, advisor: { id: "advisor", displayName: "Advisor" },
  session: { startTime: booking.startTime, endTime: booking.endTime }, booking: "confirmed",
  card: { brand: "Visa", lastDigits: "1111" },
};
const request = (status: ApiRefundCase["status"], createdAt = "2026-11-02T00:00:00Z"): ApiRefundCase => ({
  id: `case-${status}-${createdAt}`, invoiceId: invoice.id, reason: "reason", status, createdAt,
  resolvedAt: status === "OPEN" ? null : "2026-11-03T00:00:00Z",
});

describe("a paid booking still ahead", () => {
  it("has one way out, to cancel and ask for the money back", () => {
    expect(bookingExit(booking, now, invoice, [])).toEqual({ kind: "cancelAndRefund" });
  });
  it("is never offered the plain cancel while its payment or its requests are still being read", () => {
    expect(bookingExit(booking, now, undefined, undefined)).toEqual({ kind: "waiting" });
    expect(bookingExit(booking, now, invoice, undefined)).toEqual({ kind: "waiting" });
  });
  it("offers nothing to cancel once the session is running", () => {
    expect(bookingExit({ ...booking, state: "IN_PROGRESS" }, now, invoice, [])).toEqual({ kind: "none" });
  });
});

describe("an unpaid booking", () => {
  it("keeps the plain cancel, without an invoice or with one never charged", () => {
    expect(bookingExit({ ...booking, state: "PENDING_PAYMENT" }, now, null, undefined)).toEqual({ kind: "cancel" });
    expect(bookingExit(booking, now, { ...invoice, status: "pending" }, undefined)).toEqual({ kind: "cancel" });
    expect(bookingExit(booking, now, { ...invoice, status: "failed" }, undefined)).toEqual({ kind: "cancel" });
  });
  it("offers nothing once its time has gone by", () => {
    expect(bookingExit({ ...ended, state: "PENDING_PAYMENT" }, now, null, undefined)).toEqual({ kind: "none" });
  });
});

describe("a paid booking that has ended", () => {
  it("can report a problem and ask for the money back, worded as no cancellation", () => {
    expect(bookingExit(ended, now, invoice, [])).toEqual({ kind: "requestRefund", after: "ended" });
    expect(bookingExit({ ...ended, state: "COMPLETED" }, now, invoice, [])).toEqual({ kind: "requestRefund", after: "ended" });
  });
  it("can ask for the money back after it was called off without a request", () => {
    expect(bookingExit({ ...booking, state: "CANCELLED" }, now, invoice, [])).toEqual({ kind: "requestRefund", after: "cancelled" });
  });
  it("asks nothing when the money is already back", () => {
    expect(bookingExit(ended, now, { ...invoice, status: "refunded" }, [])).toEqual({ kind: "none" });
  });
});

describe("a booking with a refund request", () => {
  it.each(["OPEN", "APPROVED", "REJECTED"] as const)("shows the %s request and no other way out", (status) => {
    const refund = request(status);
    for (const subject of [booking, ended, { ...booking, state: "CANCELLED" as const }]) {
      expect(bookingExit(subject, now, invoice, [refund])).toEqual({ kind: "refundStatus", refund });
    }
    expect(bookingExit(ended, now, { ...invoice, status: "refunded" }, [refund])).toEqual({ kind: "refundStatus", refund });
  });
  it("shows the one under review before a later decided one, else the latest", () => {
    const open = request("OPEN", "2026-11-01T00:00:00Z");
    const rejected = request("REJECTED", "2026-11-02T00:00:00Z");
    const approved = request("APPROVED", "2026-11-03T00:00:00Z");
    expect(currentRefundCase([rejected, open])).toBe(open);
    expect(currentRefundCase([rejected, approved])).toBe(approved);
    expect(currentRefundCase([])).toBeUndefined();
  });
});

it("lets only a paid invoice ask for its money back, as the API does today", () => {
  expect(canRequestRefund(invoice)).toBe(true);
  for (const status of ["refunded", "failed", "pending"] as const) expect(canRequestRefund({ ...invoice, status })).toBe(false);
});
