import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import messages from "@/messages/th.json";

/**
 * The reads as `useResource` hands them over: the invoice (null when the API
 * answered 404, no receipt) and the invoice's refund requests; undefined is a
 * read still in flight.
 */
const reads = vi.hoisted(() => ({
  invoice: undefined as ApiAdviseeInvoice | null | undefined,
  cases: [] as readonly ApiRefundCase[] | undefined,
}));
vi.mock("@/lib/api/use-resource", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/use-resource")>()),
  useResource: (key: string) => {
    let data: unknown;
    if (key.startsWith("payment/invoices/for-booking/")) data = reads.invoice;
    else if (key.startsWith("refunds/me")) data = reads.cases;
    return { data, loading: data === undefined, error: null, reload: () => undefined };
  },
}));
vi.mock("@/components/bookings/use-booking-meeting", () => ({
  useBookingMeeting: () => ({ open: false, opensAt: null, ended: false, joining: false, problem: null, join: vi.fn() }),
}));
vi.mock("next/image", () => ({ default: () => null }));

// invoice-screens reaches GSAP's ScrollTrigger, which asks matchMedia as its module loads.
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

import { BookingSheet } from "@/components/bookings/booking-sheet";

const HOUR = 3_600_000;
/** Wednesday 4 Nov 2026, 12:00 in Bangkok. */
const now = Date.parse("2026-11-04T05:00:00Z");
const BOOKING_ID = "15638839-49d1-4553-b79c-59821ff58f2e";
const refundPage = `/bookings/refund?bookingId=${BOOKING_ID}`;

/** An hour's session from `startTime`, booked by the advisee and held. */
function bookingAt(startTime: string, changes: Partial<ApiBooking> = {}): ApiBooking {
  const endTime = new Date(Date.parse(startTime) + HOUR).toISOString();
  return {
    id: BOOKING_ID,
    serviceId: "service",
    advisorId: "advisor",
    adviseeId: "advisee",
    startTime,
    endTime,
    unavailableUntil: endTime,
    state: "BOOKED",
    blocksAvailability: true,
    cancelledAt: null,
    cancelledByUserId: null,
    createdAt: "2026-10-30T03:00:00Z",
    ...changes,
  };
}

/** ฿1,000 paid: ฿800 for the session, ฿200 to the platform. */
function paidFor(booking: ApiBooking, changes: Partial<ApiAdviseeInvoice> = {}): ApiAdviseeInvoice {
  return {
    id: "invoice",
    invoiceNumber: "INV-2026-000001",
    status: "paid",
    amountSatang: 100_000,
    platformFeeSatang: 20_000,
    priceSatang: 80_000,
    refundSatang: null,
    createdAt: "2026-10-30T03:00:00Z",
    paidAt: "2026-10-30T03:01:00Z",
    service: { id: "service", name: "Service" },
    advisor: { id: "advisor", displayName: "Advisor" },
    session: { startTime: booking.startTime, endTime: booking.endTime },
    booking: "confirmed",
    card: { brand: "Visa", lastDigits: "1111" },
    ...changes,
  };
}

const openCase: ApiRefundCase = {
  id: "case",
  invoiceId: "invoice",
  reason: "reason",
  status: "OPEN",
  createdAt: "2026-11-03T03:00:00Z",
  resolvedAt: null,
};

/** Saturday 7 Nov 2026, 16:00 in Bangkok: three days out. */
const THREE_DAYS_OUT = "2026-11-07T09:00:00Z";
/** Tuesday 3 Nov 2026, 15:00 to 16:00 in Bangkok: yesterday. */
const YESTERDAY = "2026-11-03T08:00:00Z";

function show(booking: ApiBooking) {
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
      <BookingSheet entry={{ booking, service: undefined, advisor: undefined }} now={now} onChanged={() => undefined} />
    </NextIntlClientProvider>,
  );
}

/** A capsule by its name; one drawn as a link is an anchor in the button role. */
const capsules = (name: string) => screen.queryAllByRole("button", { name });
/** Everything the card says, a no-break space read as the space it shows. */
const said = (container: HTMLElement) => (container.textContent ?? "").replaceAll(" ", " ");
/** Every way on to the booking's refund page. */
const toRefundPage = (container: HTMLElement) => container.querySelectorAll(`a[href="${refundPage}"]`);

afterEach(() => {
  cleanup();
  reads.invoice = undefined;
  reads.cases = [];
});

describe("the booking popup's one way out (FE #114)", () => {
  it("gives a paid booking three days out one way out, to cancel for the whole charge", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    const exits = capsules("ยกเลิกและรับเงินคืน");
    expect(exits).toHaveLength(1);
    expect(exits[0].getAttribute("href")).toBe(refundPage);
    expect(toRefundPage(container)).toHaveLength(1);
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(said(container)).toMatch(/ยกเลิกได้ คืนเต็มจำนวน ถึง \S+ 6 พ\.ย\. 2569 · 16:00/);
    expect(said(container)).not.toContain("คำขอคืนเงิน / สถานะ");
    // Moving the time is not a way out; it stays.
    expect(capsules("เปลี่ยนเวลานัด")).toHaveLength(1);
  });

  it("keeps the plain cancel and its confirm for an unpaid booking, with no word of a refund", () => {
    reads.invoice = null;
    const { container } = show(bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" }));

    const cancel = capsules("ยกเลิกการจอง");
    expect(cancel).toHaveLength(1);
    expect(cancel[0].tagName).toBe("BUTTON");
    expect(toRefundPage(container)).toHaveLength(0);
    expect(said(container)).not.toMatch(/คืน/);

    fireEvent.click(cancel[0]);
    expect(screen.getByText("ยกเลิกการจองนี้ใช่ไหม")).toBeTruthy();
    expect(screen.getByText("เวลานี้จะกลับไปว่างในปฏิทินของที่ปรึกษา และคนอื่นจองได้")).toBeTruthy();
    expect(capsules("ยืนยันการยกเลิก")).toHaveLength(1);
    expect(said(container)).not.toMatch(/คืน/);
  });

  it("lets a paid booking whose time has gone by ask for a refund until a week after its end", () => {
    const booking = bookingAt(YESTERDAY);
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(screen.getByText("เลยเวลานัดแล้ว")).toBeTruthy();
    const exits = capsules("ขอคืนเงิน");
    expect(exits).toHaveLength(1);
    expect(exits[0].getAttribute("href")).toBe(refundPage);
    expect(toRefundPage(container)).toHaveLength(1);
    expect(said(container)).toMatch(/แจ้งปัญหาและขอคืนเงินได้ถึง \S+ 10 พ\.ย\. 2569 · 16:00/);
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(0);
  });

  it.each([
    [
      "a cancellation's",
      bookingAt(THREE_DAYS_OUT, {
        state: "CANCELLED",
        cancelledAt: "2026-11-02T03:00:00Z",
        cancelledByUserId: "advisee",
        blocksAvailability: false,
      }),
      "เงินคืน ฿1,000 · ส่งเรื่องคืนเงินแล้ว",
    ],
    ["a reported problem's", bookingAt(YESTERDAY), "เงินคืน ฿1,000 · รอทีมงานตรวจสอบ"],
  ])("shows %s request already sent as one row to where it stands, and no way out", (_, booking, row) => {
    reads.invoice = paidFor(booking);
    reads.cases = [openCase];
    const { container } = show(booking);

    const rows = toRefundPage(container);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toBe(row);
    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "ขอคืนเงิน", "รับเงินคืน ฿1,000"]) {
      expect(capsules(exit)).toHaveLength(0);
    }
    expect(said(container)).not.toContain("คำขอคืนเงิน / สถานะ");
  });

  it("says inside the last day that cancelling returns half the session's fee, until the start", () => {
    const booking = bookingAt(new Date(now + 5 * HOUR).toISOString());
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);
    expect(said(container)).toMatch(/ยกเลิกได้ คืน 50% ของค่าบริการ ถึง \S+ 4 พ\.ย\. 2569 · 17:00/);
    expect(said(container)).not.toContain("คืนเต็มจำนวน");
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
  });

  it("offers no cancel once an unpaid booking's time has begun", () => {
    const booking = bookingAt(new Date(now - 15 * 60_000).toISOString(), { state: "PENDING_PAYMENT" });
    reads.invoice = paidFor(booking, { status: "pending", paidAt: null });
    const { container } = show(booking);

    expect(screen.getByText("รอชำระ")).toBeTruthy();
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(toRefundPage(container)).toHaveLength(0);
    expect(said(container)).not.toMatch(/คืน/);
  });

  it("offers no cancel during the session, only a refund request", () => {
    const booking = bookingAt(new Date(now - 15 * 60_000).toISOString(), { state: "IN_PROGRESS" });
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(0);
    expect(capsules("ขอคืนเงิน")).toHaveLength(1);
    expect(said(container)).toMatch(/แจ้งปัญหาและขอคืนเงินได้ถึง \S+ 11 พ\.ย\. 2569 · 12:45/);
  });

  it("offers nothing about money more than a week after the session ended", () => {
    const booking = bookingAt("2026-10-27T03:00:00Z", { state: "COMPLETED" });
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(screen.getByText("ชำระแล้ว")).toBeTruthy();
    expect(toRefundPage(container)).toHaveLength(0);
    expect(said(container)).not.toMatch(/คืน/);
  });

  it("owes the whole charge back when the advisor called the booking off", () => {
    const booking = bookingAt(THREE_DAYS_OUT, {
      state: "CANCELLED",
      cancelledAt: "2026-11-04T04:00:00Z",
      cancelledByUserId: "advisor",
      blocksAvailability: false,
    });
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    const exits = capsules("รับเงินคืน ฿1,000");
    expect(exits).toHaveLength(1);
    expect(exits[0].getAttribute("href")).toBe(refundPage);
    expect(toRefundPage(container)).toHaveLength(1);
    expect(said(container)).toContain("การจองนี้ยกเลิกแล้ว คุณได้คืน ฿1,000");
  });

  it("says nothing about money on a booking moved to a new time, whose payment went with it", () => {
    const booking = bookingAt(THREE_DAYS_OUT, {
      state: "CANCELLED",
      cancelledAt: "2026-11-02T03:00:00Z",
      cancelledByUserId: "advisee",
      blocksAvailability: false,
    });
    reads.invoice = paidFor(booking, {
      session: { startTime: "2026-11-09T09:00:00Z", endTime: "2026-11-09T10:00:00Z" },
    });
    const { container } = show(booking);

    expect(toRefundPage(container)).toHaveLength(0);
    expect(said(container)).not.toMatch(/คืน/);
  });

  it("says what came back on a refunded invoice, with no way out", () => {
    const booking = bookingAt(YESTERDAY, { state: "COMPLETED" });
    reads.invoice = paidFor(booking, { status: "refunded", refundSatang: 40_000 });
    const { container } = show(booking);

    expect(said(container)).toContain("คืนเงินแล้ว ฿400");
    expect(toRefundPage(container)).toHaveLength(0);
    expect(capsules("ขอคืนเงิน")).toHaveLength(0);
  });

  it("does not say a whole refund twice: the payment line already reads refunded with the charge", () => {
    const booking = bookingAt(YESTERDAY, { state: "COMPLETED" });
    reads.invoice = paidFor(booking, { status: "refunded", refundSatang: 100_000 });
    const { container } = show(booking);

    expect(said(container).match(/คืนเงินแล้ว/g)).toHaveLength(1);
    expect(said(container)).toContain("฿1,000");
  });

  it.each([
    ["its invoice", undefined, []],
    ["its refund requests", "paid", undefined],
  ] as const)("draws no cancel and no money line while %s are still being read", (_, paid, cases) => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = paid ? paidFor(booking) : undefined;
    reads.cases = cases;
    const { container } = show(booking);

    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน"]) expect(capsules(exit)).toHaveLength(0);
    expect(toRefundPage(container)).toHaveLength(0);
    expect(said(container)).not.toMatch(/คืน/);
  });
});
