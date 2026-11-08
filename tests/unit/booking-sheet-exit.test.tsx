import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/th.json";
import { formats } from "@/lib/i18n/requests";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

// FE #114 in the popup itself: which way out it draws, in the words the reader reads.
const reads = vi.hoisted(() => ({ invoice: undefined as unknown, invoiceError: null as Error | null, cases: [] as unknown }));
vi.mock("@/lib/api/use-resource", () => ({
  invalidate: vi.fn(),
  useLastAnswer: (resource: { data: unknown }) => resource.data,
  useResource: (key: string) => {
    const reload = () => undefined;
    if (key.startsWith("payment/invoices/for-booking/"))
      return { data: reads.invoice, loading: false, error: reads.invoiceError, reload };
    if (key.startsWith("refunds/me")) return { data: reads.cases, loading: false, error: null, reload };
    return { data: undefined, loading: true, error: null, reload };
  },
}));
vi.mock("@/components/bookings/use-booking-meeting", () => ({
  useBookingMeeting: () => ({ open: false, opensAt: null, ended: false, joining: false, problem: null, join: vi.fn() }),
}));
vi.mock("@/lib/api/resources", () => ({ getMyBookingInvoice: vi.fn(), listMyRefundCases: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));

// The sheet's module graph registers a scroll plugin that asks the window for media queries.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

const { BookingSheet } = await import("@/components/bookings/booking-sheet");
const { ApiError } = await import("@/lib/api/client");

const now = Date.parse("2026-11-04T12:00:00Z");
const booking: ApiBooking = {
  id: "550e8400-e29b-41d4-a716-446655440000", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: "2026-11-11T03:30:00Z", endTime: "2026-11-11T04:00:00Z", unavailableUntil: "2026-11-11T04:00:00Z",
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-11-01T00:00:00Z",
};
const invoice: ApiAdviseeInvoice = {
  id: "invoice", invoiceNumber: "INV-2026-000001", status: "paid", amountSatang: 100000, platformFeeSatang: 20000,
  priceSatang: 80000, refundSatang: null, createdAt: "2026-11-01T00:00:00Z", paidAt: "2026-11-01T00:01:00Z",
  service: { id: "service", name: "Service" }, advisor: { id: "advisor", displayName: "Advisor" },
  session: { startTime: booking.startTime, endTime: booking.endTime }, booking: "confirmed",
  card: { brand: "Visa", lastDigits: "1111" },
};
const refundPage = `/bookings/refund?bookingId=${booking.id}`;
/** A capsule that is a link: Base UI draws it as an anchor in the button role. */
const capsule = (name: string) => screen.queryByRole("button", { name });

function show(subject: ApiBooking) {
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
      <BookingSheet entry={{ booking: subject, service: undefined, advisor: undefined }} now={now} onChanged={() => undefined} />
    </NextIntlClientProvider>,
  );
}
/** Everything the card says or names, for the words that must not be in it. */
const said = (container: HTMLElement) => container.textContent ?? "";

afterEach(() => {
  cleanup();
  reads.invoice = undefined;
  reads.invoiceError = null;
  reads.cases = [];
});

describe("the booking popup's way out (FE #114)", () => {
  it("gives a paid booking still ahead one way out, to the refund page, and no plain cancel", () => {
    reads.invoice = invoice;
    show(booking);
    expect(capsule("ยกเลิกและขอคืนเงิน")?.getAttribute("href")).toBe(refundPage);
    expect(capsule("ยกเลิกการจอง")).toBeNull();
    expect(screen.queryByText("คำขอคืนเงิน")).toBeNull();
  });

  it("draws no way out of a booking still ahead until its payment is known", () => {
    show(booking);
    expect(capsule("ยกเลิกการจอง")).toBeNull();
    expect(capsule("ยกเลิกและขอคืนเงิน")).toBeNull();
  });

  it("keeps the plain cancel for an unpaid booking, asks on white, and says nothing about money back", () => {
    reads.invoiceError = new ApiError(404, "Invoice not found");
    const { container } = show({ ...booking, state: "PENDING_PAYMENT" });
    const cancel = capsule("ยกเลิกการจอง");
    expect(cancel?.tagName).toBe("BUTTON");
    fireEvent.click(cancel!);
    const confirm = screen.getByRole("group", { name: "ยกเลิกการจองนี้ใช่ไหม" });
    expect(confirm.className).not.toMatch(/\bbg-/);
    expect(confirm.parentElement?.className ?? "").not.toMatch(/\bbg-/);
    expect(capsule("ยืนยันการยกเลิก")).toBeTruthy();
    // Paying is still the way on; nothing speaks of a refund or a receipt.
    expect(said(confirm)).not.toMatch(/เงิน|ใบเสร็จ/);
    expect(said(container)).not.toMatch(/คืนเงิน|ใบเสร็จ/);
    expect(container.querySelector(`a[href="${refundPage}"]`)).toBeNull();
  });

  it("lets a paid booking that has ended report a problem, in the ordinary ink", () => {
    reads.invoice = invoice;
    show({ ...booking, startTime: "2026-11-04T02:00:00Z", endTime: "2026-11-04T02:30:00Z" });
    const way = capsule("แจ้งปัญหาและขอคืนเงิน");
    expect(way?.getAttribute("href")).toBe(refundPage);
    expect(way?.className).not.toContain("text-destructive");
    expect(capsule("ยกเลิกและขอคืนเงิน")).toBeNull();
    expect(capsule("ยกเลิกการจอง")).toBeNull();
  });

  it.each([
    ["OPEN", "รอตรวจสอบ"],
    ["APPROVED", "อนุมัติแล้ว"],
    ["REJECTED", "ไม่อนุมัติ"],
  ] as const)("shows a %s request in the payment line, and no other way out", (status, word) => {
    reads.invoice = invoice;
    const refund: ApiRefundCase = {
      id: "case", invoiceId: invoice.id, reason: "reason", status, createdAt: "2026-11-02T00:00:00Z",
      resolvedAt: status === "OPEN" ? null : "2026-11-03T00:00:00Z",
    };
    reads.cases = [refund];
    show(booking);
    const line = screen.getByRole("link", { name: new RegExp(`^คำขอคืนเงิน\\s*${word}$`) });
    expect(line.getAttribute("href")).toBe(refundPage);
    expect(capsule("ยกเลิกและขอคืนเงิน")).toBeNull();
    expect(capsule("แจ้งปัญหาและขอคืนเงิน")).toBeNull();
    expect(capsule("ยกเลิกการจอง")).toBeNull();
    expect(screen.queryByText("คำขอคืนเงิน / สถานะ")).toBeNull();
  });
});
