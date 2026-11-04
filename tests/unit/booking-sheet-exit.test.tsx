import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";

import { ApiError } from "@/lib/api/client";
import type { ApiAdviseeInvoice, ApiBooking, ApiPublicService, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import en from "@/messages/en.json";
import messages from "@/messages/th.json";

/**
 * The reads as `useResource` hands them over: the invoice (null when the API
 * answered 404, no receipt) and the invoice's refund requests; undefined is a
 * read still in flight.
 */
const reads = vi.hoisted(() => ({
  invoice: undefined as ApiAdviseeInvoice | null | undefined,
  cases: [] as readonly ApiRefundCase[] | undefined,
  /** The invoice read failed (a 500, or no answer). */
  invoiceError: null as Error | null,
  /** The refund requests' read failed (a 403 for an account without the refund permission). */
  casesError: null as Error | null,
  reloads: [] as string[],
}));
vi.mock("@/lib/api/use-resource", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/use-resource")>()),
  useResource: (key: string) => {
    let data: unknown;
    let error: Error | null = null;
    if (key.startsWith("payment/invoices/for-booking/")) [data, error] = [reads.invoice, reads.invoiceError];
    else if (key.startsWith("refunds/me")) [data, error] = [reads.casesError ? undefined : reads.cases, reads.casesError];
    return { data, loading: data === undefined && error === null, error, reload: () => reads.reloads.push(key) };
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

import { BookingDialog, BookingSheet } from "@/components/bookings/booking-sheet";

const HOUR = 3_600_000;
/** Wednesday 4 Nov 2026, 12:00 in Bangkok: the clock the card reads when it opens. */
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

function show(booking: ApiBooking, service?: ApiPublicService) {
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
      <BookingSheet entry={{ booking, service, advisor: undefined }} onChanged={() => undefined} />
    </NextIntlClientProvider>,
  );
}

/** A capsule by its name; one drawn as a link is an anchor in the button role. */
const capsules = (name: string) => screen.queryAllByRole("button", { name });
/** Everything the card says, a no-break space read as the space it shows. */
const said = (container: HTMLElement) => (container.textContent ?? "").replaceAll(" ", " ");
/** Every way on to the booking's refund page. */
const toRefundPage = (container: HTMLElement) => container.querySelectorAll(`a[href="${refundPage}"]`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  reads.invoice = undefined;
  reads.cases = [];
  reads.invoiceError = null;
  reads.casesError = null;
  reads.reloads.length = 0;
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
    // A paid booking's move is withheld (the API would read the moved original as owed its refund),
    // and where the move would be the card gives the way to another time and what it costs; the deadline is said once.
    expect(capsules("เปลี่ยนเวลานัด")).toHaveLength(0);
    expect(capsules("ขอเปลี่ยนเวลานัด")).toHaveLength(0);
    const plain = said(container).replaceAll("⁠", "");
    expect(plain).toContain("ต้องการเวลาอื่น ยกเลิกแล้วจองใหม่ นัดใหม่ชำระแยก ส่วนเงินนัดนี้คืนเมื่อทีมงานยืนยัน");
    expect(plain.match(/6 พ\.ย\. 2569 · 16:00/g)).toHaveLength(1);
    expect(plain).not.toContain("ระบบ");
  });

  it("judges the 24-hour line by when the popup opens, not by when the list behind it was loaded", () => {
    const booking = bookingAt(new Date(now + 24 * HOUR + 50_000).toISOString());
    reads.invoice = paidFor(booking);
    const entry = { booking, service: undefined, advisor: undefined };
    const dialog = (open: boolean) => (
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingDialog entry={entry} onChanged={() => undefined} onOpenChange={() => undefined} open={open} />
      </NextIntlClientProvider>
    );
    const { rerender } = render(dialog(false));

    vi.setSystemTime(now + 60_000);
    rerender(dialog(true));
    const card = said(document.body);
    expect(card).toMatch(/ยกเลิกได้ คืน 50% ของค่าบริการ ถึง/);
    expect(card).not.toContain("คืนเต็มจำนวน");
    expect(card).not.toContain("การจองที่ชำระแล้วยังเปลี่ยนเวลาเองไม่ได้");
  });

  it("moves an unpaid booking in place, over the advisor's open slots", () => {
    reads.invoice = null;
    show(bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" }));
    expect(capsules("เปลี่ยนเวลานัด")).toHaveLength(1);
    expect(capsules("เปลี่ยนเวลานัด")[0].tagName).toBe("BUTTON");
    expect(capsules("ขอเปลี่ยนเวลานัด")).toHaveLength(0);
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

  it("names a refused request as a request, not as a refund on its way", () => {
    const booking = bookingAt(YESTERDAY);
    reads.invoice = paidFor(booking);
    reads.cases = [{ ...openCase, status: "REJECTED", resolvedAt: "2026-11-04T03:00:00Z" }];
    const { container } = show(booking);

    const rows = toRefundPage(container);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toBe("คำขอคืนเงิน ฿1,000 · ไม่อนุมัติ");
  });

  it("says inside the last day that cancelling returns half the session's fee, until the start", () => {
    const booking = bookingAt(new Date(now + 5 * HOUR).toISOString());
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);
    expect(said(container)).toMatch(/ยกเลิกได้ คืน 50% ของค่าบริการ ถึง \S+ 4 พ\.ย\. 2569 · 17:00/);
    expect(said(container)).not.toContain("คืนเต็มจำนวน");
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    // §8 moves a booking free only 24 hours or more ahead: moving it now and cancelling later would turn ฿400 into ฿1,000.
    expect(capsules("เปลี่ยนเวลานัด")).toHaveLength(0);
  });

  it("sends a booking paid on the one it replaced to support: no cancel, no second move, no list price", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = null;
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    const { container } = show(booking, service);

    expect(said(container)).toContain("ชำระไว้กับการจองเดิมก่อนเปลี่ยนเวลา ติดต่อฝ่ายช่วยเหลือเรื่องการจองนี้");
    expect(said(container)).not.toContain("฿1,400");
    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด", "ขอเปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);
    expect(toRefundPage(container)).toHaveLength(0);
  });

  it("shows no price on a booked appointment while its receipt is still being read, then what was paid", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    const { container, rerender } = show(booking, service);
    expect(said(container)).not.toContain("฿1,400");
    expect(said(container)).not.toContain("ราคาบริการ");

    reads.invoice = paidFor(booking, { amountSatang: 80_000 });
    rerender(
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingSheet entry={{ booking, service, advisor: undefined }} onChanged={() => undefined} />
      </NextIntlClientProvider>,
    );
    expect(said(container)).toContain("฿800");
    expect(said(container)).not.toContain("฿1,400");
  });

  it("still shows today's price on a held slot with no receipt, waiting for payment", () => {
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    reads.invoice = null;
    const { container } = show(bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" }), service);
    expect(said(container)).toContain("ราคาบริการ ฿1,400");
  });

  it("offers a held slot nothing, no cancel, no move and no price, while its receipt is still being read", () => {
    const booking = bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" });
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    const entry = (state: ApiBooking["state"]) => (
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingSheet entry={{ booking: { ...booking, state }, service, advisor: undefined }} onChanged={() => undefined} />
      </NextIntlClientProvider>
    );
    const { container, rerender } = render(entry("PENDING_PAYMENT"));

    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);
    expect(said(container)).not.toContain("฿1,400");

    // Paid in another tab before this list was read: the receipt lands paid, and the paid rules follow.
    reads.invoice = paidFor(booking, { amountSatang: 80_000 });
    rerender(entry("PENDING_PAYMENT"));
    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(said(container)).toContain("ชำระแล้ว ฿800");
  });

  it("keeps a held slot's paid receipt through a failed read again, never falling back to the plain cancel", () => {
    const booking = bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" });
    reads.invoice = paidFor(booking, { amountSatang: 80_000 });
    const card = () => (
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingSheet entry={{ booking, service: undefined, advisor: undefined }} onChanged={() => undefined} />
      </NextIntlClientProvider>
    );
    const { container, rerender } = render(card());
    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);

    reads.invoice = undefined;
    reads.invoiceError = new ApiError(503, "down");
    rerender(card());
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);
    expect(said(container)).toContain("ชำระแล้ว ฿800");
    expect(said(container)).toContain(messages.bookings.moneyRead.invoice.retry);
  });

  it("offers a held slot whose first receipt read failed the retry and no way out", () => {
    reads.invoiceError = new ApiError(503, "down");
    const { container } = show(bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" }));
    expect(said(container)).toContain(messages.bookings.moneyRead.invoice.retry);
    expect(screen.getByRole("button", { name: "ลองอีกครั้ง" })).toBeTruthy();
    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);
  });

  it("reads a held slot whose receipt reads paid again, once, so its header and main capsule can follow the server", () => {
    const booking = bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" });
    reads.invoice = paidFor(booking);
    const changed = vi.fn();
    const card = () => (
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingSheet entry={{ booking, service: undefined, advisor: undefined }} onChanged={() => changed()} />
      </NextIntlClientProvider>
    );
    const { rerender } = render(card());
    rerender(card());
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("never reads a held slot with an unpaid receipt again on its own", () => {
    const changed = vi.fn();
    reads.invoice = null;
    render(
      <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
        <BookingSheet
          entry={{ booking: bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" }), service: undefined, advisor: undefined }}
          onChanged={changed}
        />
      </NextIntlClientProvider>,
    );
    expect(changed).not.toHaveBeenCalled();
  });

  it("says a failed money read failed, with a retry, instead of today's list price", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoiceError = new Error("500");
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    const { container } = show(booking, service);

    expect(said(container)).not.toContain("฿1,400");
    expect(said(container)).not.toContain("ราคาบริการ");
    expect(screen.getByText("โหลดยอดที่ชำระและเงินคืนไม่สำเร็จ", { exact: false })).toBeTruthy();
    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(reads.reloads.some((key) => key.startsWith("payment/invoices/for-booking/"))).toBe(true);
  });

  it("asks a lapsed session to sign in again, back to this popup, rather than to retry what would fail the same way", () => {
    reads.invoiceError = new ApiError(401, "Unauthorized");
    const { container } = show(bookingAt(THREE_DAYS_OUT));

    expect(said(container)).toContain(messages.bookings.moneyRead.invoice.signIn);
    expect(screen.queryByRole("button", { name: "ลองอีกครั้ง" })).toBeNull();
    const signIn = screen.getByRole("button", { name: "เข้าสู่ระบบอีกครั้ง" });
    expect(signIn.getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/bookings?bookingId=${BOOKING_ID}`)}`);
  });

  it.each([
    [400, messages.bookings.moneyRead.invoice.refused],
    [403, messages.bookings.moneyRead.invoice.forbidden],
  ])("sends a refused (%i) money read to support, with the booking in the subject, and offers no retry", (status, words) => {
    reads.invoiceError = new ApiError(status, "Refused");
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    const { container } = show(bookingAt(THREE_DAYS_OUT), service);

    expect(said(container)).toContain(words);
    expect(screen.queryByRole("button", { name: "ลองอีกครั้ง" })).toBeNull();
    const support = screen.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" });
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toMatch(/^mailto:[^?]+\?subject=สอบถามการจอง Service วันที่ 7 พ\.ย\. 2569$/);
  });

  it("names the refund requests, not what was paid, when only they are refused, as for an account without the refund permission", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = paidFor(booking, { amountSatang: 80_000 });
    reads.casesError = new ApiError(403, "Forbidden");
    const { container } = show(booking);

    expect(said(container)).toContain("ชำระแล้ว ฿800");
    expect(said(container)).toContain(messages.bookings.moneyRead.requests.forbidden);
    expect(said(container)).not.toContain("ยอดที่ชำระของการจองนี้");
    expect(screen.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" })).toBeTruthy();
    // One way to support: the help line would only say the payment line's link again.
    expect(container.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
    expect(said(container)).not.toContain(messages.bookings.helpPrompt);
    // An email stops no clock: the full refund's line, three days out, is said beside it.
    expect(said(container).replaceAll("⁠", "")).toMatch(/ยกเลิกถึง \S+ 6 พ\.ย\. 2569 · 16:00 ได้คืนเต็มจำนวน เวลานี้ไม่หยุดระหว่างรออีเมลตอบ/);
    for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);
  });

  it("keeps the help line where the payment line's failure offers a retry, not support", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = paidFor(booking);
    reads.casesError = new ApiError(503, "down");
    const { container } = show(booking);
    expect(said(container)).toContain(messages.bookings.helpPrompt);
    expect(said(container)).not.toContain("รออีเมลตอบ");
  });

  it("offers a retry when the refund requests fail to load, naming them", () => {
    const booking = bookingAt(THREE_DAYS_OUT);
    reads.invoice = paidFor(booking);
    reads.casesError = new ApiError(503, "down");
    const { container } = show(booking);

    expect(said(container)).toContain(messages.bookings.moneyRead.requests.retry);
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(reads.reloads.some((key) => key.startsWith("refunds/me"))).toBe(true);
  });

  it.each(["pending", "failed"] as const)(
    "sends a confirmed booking whose receipt reads %s to support: no plain cancel, no move, no unpaid receipt",
    (status) => {
      const booking = bookingAt(THREE_DAYS_OUT);
      reads.invoice = paidFor(booking, { status });
      const { container } = show(booking);

      expect(said(container)).toContain(messages.bookings.paidUnshown);
      expect(said(container).replaceAll("⁠", "")).toMatch(/ยกเลิกถึง \S+ 6 พ\.ย\. 2569 · 16:00 ได้คืนเต็มจำนวน เวลานี้ไม่หยุดระหว่างรออีเมลตอบ/);
      expect(screen.queryByRole("link", { name: "ดูใบเสร็จ" })).toBeNull();
      for (const exit of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด"]) expect(capsules(exit)).toHaveLength(0);
      expect(toRefundPage(container)).toHaveLength(0);
    },
  );

  it("gives a held slot whose receipt already reads paid the cancel with its refund, not the plain cancel or the move", () => {
    const booking = bookingAt(THREE_DAYS_OUT, { state: "PENDING_PAYMENT" });
    reads.invoice = paidFor(booking);
    const { container } = show(booking);

    expect(capsules("ยกเลิกและรับเงินคืน")).toHaveLength(1);
    expect(capsules("ยกเลิกการจอง")).toHaveLength(0);
    expect(capsules("เปลี่ยนเวลานัด")).toHaveLength(0);
    expect(said(container)).toContain("ชำระแล้ว ฿1,000");
  });

  it("shows no list price on a cancelled booking with no receipt of its own, which would pass for what was paid", () => {
    const service = { id: "service", priceSatang: 140_000, name: "Service" } as ApiPublicService;
    reads.invoice = null;
    const { container } = show(
      bookingAt(THREE_DAYS_OUT, { state: "CANCELLED", cancelledAt: "2026-11-02T03:00:00Z", cancelledByUserId: "advisee" }),
      service,
    );

    expect(said(container)).not.toContain("ราคาบริการ");
    expect(said(container)).not.toContain("฿1,400");
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

  it("says what was paid, then what came back, on a part refund, with no way out", () => {
    const booking = bookingAt(YESTERDAY, { state: "COMPLETED" });
    reads.invoice = paidFor(booking, { status: "refunded", amountSatang: 80_000, refundSatang: 40_000 });
    const { container } = show(booking);

    expect(said(container)).toContain("ชำระแล้ว ฿800");
    expect(said(container)).toContain("คืนเงินแล้ว ฿400");
    expect(said(container).match(/คืนเงินแล้ว/g)).toHaveLength(1);
    expect(toRefundPage(container)).toHaveLength(0);
    expect(capsules("ขอคืนเงิน")).toHaveLength(0);
  });

  it("calls only the refund refunded, once, on a whole refund", () => {
    const booking = bookingAt(YESTERDAY, { state: "COMPLETED" });
    reads.invoice = paidFor(booking, { status: "refunded", refundSatang: 100_000 });
    const { container } = show(booking);

    expect(said(container)).toContain("ชำระแล้ว ฿1,000");
    expect(said(container).match(/คืนเงินแล้ว/g)).toHaveLength(1);
    expect(said(container)).toContain("คืนเงินแล้ว ฿1,000");
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

  it("writes what was paid with the same ฿ as the refund under it, in English too", () => {
    const booking = bookingAt(YESTERDAY, { state: "CANCELLED", cancelledByUserId: "advisor-1", cancelledAt: "2026-11-02T08:00:00Z" });
    reads.invoice = paidFor(booking);
    const { container } = render(
      <NextIntlClientProvider formats={formats} locale="en" messages={en} timeZone="Asia/Bangkok">
        <BookingSheet entry={{ booking, service: undefined, advisor: undefined }} onChanged={() => undefined} />
      </NextIntlClientProvider>,
    );
    expect(said(container)).not.toContain("THB");
    expect(said(container).match(/฿1,000/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
