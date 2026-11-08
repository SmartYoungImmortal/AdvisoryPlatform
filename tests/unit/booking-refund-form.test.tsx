import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/th.json";
import { formats } from "@/lib/i18n/requests";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

// The refund page's press: whenever it calls the booking off first, the line
// above it says so, and the press says so while it works.
const reads = vi.hoisted(() => ({ data: undefined as unknown }));
const api = vi.hoisted(() => ({ cancelAndCheck: vi.fn(), openRefundCase: vi.fn(), listMyRefundCases: vi.fn() }));
vi.mock("@/lib/api/use-resource", () => ({
  invalidate: vi.fn(),
  useLastAnswer: (resource: { data: unknown }) => resource.data,
  useResource: (key: string) => {
    const reload = () => undefined;
    if (key.startsWith("booking-refund/")) return { data: reads.data, loading: false, error: null, reload };
    if (key.startsWith("refunds/")) return { data: [], loading: false, error: null, reload };
    return { data: undefined, loading: true, error: null, reload };
  },
}));
vi.mock("@/components/bookings/use-booking-cancellation", () => ({
  cancelAndCheck: api.cancelAndCheck,
  useBookingCancellation: vi.fn(),
}));
vi.mock("@/lib/api/resources", () => ({
  openRefundCase: api.openRefundCase,
  listMyRefundCases: api.listMyRefundCases,
  getBooking: vi.fn(),
  getMyBookingInvoice: vi.fn(),
  listRefundEvidence: vi.fn(),
  uploadRefundEvidence: vi.fn(),
  getRefundEvidenceUrl: vi.fn(),
}));
// The page's frame (top bar, side rail, account column) is not what is under test.
vi.mock("@/components/bookings/booking-detail-screen", () => ({
  DetailColumn: ({ children }: { readonly children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/bookings/use-booking-meeting", () => ({ useBookingMeeting: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));

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
// jsdom has no pointer events; the radio re-dispatches its click as one.
window.PointerEvent ??= class extends MouseEvent {} as typeof PointerEvent;

const { BookingRefundScreen } = await import("@/components/bookings/booking-refund-screen");

const hour = 3_600_000;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();
const id = "550e8400-e29b-41d4-a716-446655440000";
function bookingAt(start: number, state: ApiBooking["state"]): ApiBooking {
  return {
    id, serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
    startTime: at(start), endTime: at(start + hour / 2), unavailableUntil: at(start + hour / 2),
    state, blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: at(-72 * hour),
  };
}
const invoice: ApiAdviseeInvoice = {
  id: "invoice", invoiceNumber: "INV-2026-000001", status: "paid", amountSatang: 100000, platformFeeSatang: 20000,
  priceSatang: 80000, refundSatang: null, createdAt: at(-72 * hour), paidAt: at(-72 * hour),
  service: { id: "service", name: "Service" }, advisor: { id: "advisor", displayName: "Advisor" },
  session: { startTime: at(0), endTime: at(0) }, booking: "confirmed", card: { brand: "Visa", lastDigits: "1111" },
};
const refund: ApiRefundCase = {
  id: "case", invoiceId: invoice.id, reason: "reason", status: "OPEN", createdAt: at(0), resolvedAt: null,
};

const ENDED_WARNING = "เมื่อกด นัดนี้จะถูกบันทึกเป็นยกเลิกเพื่อให้ทีมงานตรวจคืนเงินได้ และย้อนกลับไม่ได้";
const AHEAD_WARNING = "เมื่อกด การจองจะถูกยกเลิกทันทีและย้อนกลับไม่ได้ เวลานี้จะว่างให้คนอื่นจอง";

function show(booking: ApiBooking) {
  reads.data = { booking, invoice };
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={messages} timeZone="Asia/Bangkok">
      <BookingRefundScreen />
    </NextIntlClientProvider>,
  );
}
/** The press under the card, by what it says. */
const press = (name: string) => screen.getByRole("button", { name });
/** Picks a reason and presses; the cancel is held so the press can be read while it works. */
async function send(reason: string, label: string) {
  fireEvent.click(screen.getByRole("radio", { name: reason }));
  await act(async () => {
    fireEvent.click(press(label));
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", `/bookings/refund?bookingId=${id}`);
  api.openRefundCase.mockResolvedValue(refund);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  reads.data = undefined;
});

describe("the refund page's press", () => {
  it("warns before it cancels a session that has ended but is still booked, and says so while it works", async () => {
    let settle: (outcome: string) => void = () => undefined;
    api.cancelAndCheck.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    show(bookingAt(-2 * hour, "BOOKED"));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("แจ้งปัญหาและขอคืนเงิน");
    expect(screen.getByText(ENDED_WARNING)).toBeTruthy();
    expect(screen.queryByText(AHEAD_WARNING)).toBeNull();
    // Still named for the money; the way back is not "keep the booking".
    expect(press("ส่งคำขอคืนเงิน")).toBeTruthy();
    expect(screen.getByRole("button", { name: "กลับไปที่การจอง" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "เก็บการจองไว้" })).toBeNull();

    await send("ผู้ให้คำปรึกษาไม่เข้านัด", "ส่งคำขอคืนเงิน");
    expect(press("กำลังยกเลิกการจอง…")).toBeTruthy();
    expect(api.cancelAndCheck).toHaveBeenCalledWith(id);
    expect(api.openRefundCase).not.toHaveBeenCalled();

    await act(async () => settle("cancelled"));
    expect(api.openRefundCase).toHaveBeenCalledOnce();
    expect(api.cancelAndCheck.mock.invocationCallOrder[0]).toBeLessThan(api.openRefundCase.mock.invocationCallOrder[0]);
  });

  it("neither warns nor cancels a session the API has already closed", async () => {
    show(bookingAt(-2 * hour, "COMPLETED"));
    expect(screen.queryByText(ENDED_WARNING)).toBeNull();
    expect(screen.queryByText(AHEAD_WARNING)).toBeNull();

    let settle: (value: ApiRefundCase) => void = () => undefined;
    api.openRefundCase.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    await send("ผู้ให้คำปรึกษาไม่เข้านัด", "ส่งคำขอคืนเงิน");
    expect(press("กำลังส่งคำขอ…")).toBeTruthy();
    expect(api.cancelAndCheck).not.toHaveBeenCalled();
    await act(async () => settle(refund));
  });

  it("names the press for cancelling a session still ahead, and offers to keep it", async () => {
    api.cancelAndCheck.mockResolvedValue("cancelled");
    show(bookingAt(7 * 24 * hour, "BOOKED"));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("ยกเลิกการจองและขอคืนเงิน");
    expect(screen.getByText(AHEAD_WARNING)).toBeTruthy();
    expect(screen.getByRole("button", { name: "เก็บการจองไว้" }).getAttribute("href")).toBe(`/bookings?bookingId=${id}`);
    // Nothing chosen for the reader: the press waits for a reason.
    expect(press("ยกเลิกการจองและขอคืนเงิน").hasAttribute("disabled")).toBe(true);

    await send("ติดธุระ ไปตามนัดไม่ได้", "ยกเลิกการจองและขอคืนเงิน");
    expect(api.cancelAndCheck).toHaveBeenCalledWith(id);
    expect(api.cancelAndCheck.mock.invocationCallOrder[0]).toBeLessThan(api.openRefundCase.mock.invocationCallOrder[0]);
  });

  it("sends nothing when the cancellation can't be confirmed", async () => {
    api.cancelAndCheck.mockResolvedValue("uncertain");
    show(bookingAt(-2 * hour, "BOOKED"));
    await send("ผู้ให้คำปรึกษาไม่เข้านัด", "ส่งคำขอคืนเงิน");
    expect(api.openRefundCase).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("ยังยืนยันการยกเลิกไม่ได้");
  });
});
