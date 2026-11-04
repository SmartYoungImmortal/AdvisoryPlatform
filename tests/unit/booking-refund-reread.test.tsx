import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, type Messages } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import th from "@/messages/th.json";

/**
 * The refund page over the real cache (`useResource`, `invalidate`) and the
 * real cancel-then-request: only the HTTP calls are stood in for. A press
 * that succeeds drops the booking and its money from the cache and reads
 * them again; that read failing must not take the status just reached away.
 */

vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  });
});

vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  isApiConfigured: true,
}));
const http = vi.hoisted(() => ({
  getBooking: vi.fn(),
  getMyBookingInvoice: vi.fn(),
  listMyRefundCases: vi.fn(),
  cancelBooking: vi.fn(),
  openRefundCase: vi.fn(),
  getService: vi.fn(),
}));
vi.mock("@/lib/api/resources", async (original) => ({
  ...(await original<typeof import("@/lib/api/resources")>()),
  ...http,
}));
vi.mock("@/components/account/app-frame", () => ({ AppFrame: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/account/account-shell", async (original) => ({
  ...(await original<object>()),
  AccountShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

const { ApiError } = await import("@/lib/api/client");
const { invalidate } = await import("@/lib/api/use-resource");
const { BookingRefundScreen } = await import("@/components/bookings/booking-refund-screen");

const HOUR = 3_600_000;
const NOW = Date.parse("2026-11-04T12:00:00Z");
const id = "15638839-49d1-4553-b79c-59821ff58f2e";

const booked: ApiBooking = {
  id, serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: new Date(NOW + 72 * HOUR).toISOString(), endTime: new Date(NOW + 73 * HOUR).toISOString(),
  unavailableUntil: new Date(NOW + 73 * HOUR).toISOString(), state: "BOOKED", blocksAvailability: true,
  cancelledAt: null, cancelledByUserId: null, createdAt: "2026-10-25T00:00:00Z",
};
const invoice: ApiAdviseeInvoice = {
  id: "invoice", invoiceNumber: "INV-2026-001104", status: "paid", amountSatang: 100_000, platformFeeSatang: 20_000,
  priceSatang: 80_000, refundSatang: null, createdAt: "2026-10-25T00:00:00Z", paidAt: "2026-10-25T00:01:00Z",
  service: { id: "service", name: "วางแผนภาษี" }, advisor: { id: "advisor", displayName: "กัญญา" },
  session: { startTime: booked.startTime, endTime: booked.endTime }, booking: "confirmed",
  card: { brand: "Visa", lastDigits: "1111" },
};
const opened: ApiRefundCase = {
  id: "case", invoiceId: "invoice", reason: "r", status: "OPEN", createdAt: new Date(NOW).toISOString(), resolvedAt: null,
};
const page = (items: ApiRefundCase[]) => ({ items, total: items.length, page: 1, limit: 100, totalPages: 1 });

function show() {
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={th as Messages} timeZone="Asia/Bangkok">
      <BookingRefundScreen />
    </NextIntlClientProvider>,
  );
}

/** Let every pending read settle and the screen draw what it got. */
const settle = () => act(async () => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
});

beforeEach(() => {
  invalidate();
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  window.history.replaceState(null, "", `/bookings/refund?bookingId=${id}`);
  for (const fn of Object.values(http)) fn.mockReset();
  http.getBooking.mockResolvedValue(booked);
  http.getMyBookingInvoice.mockResolvedValue(invoice);
  http.listMyRefundCases.mockResolvedValue(page([]));
  // The page reads the service while the money loads, so its skeleton wraps the name as the card will.
  http.getService.mockResolvedValue({ id: "service", name: "วางแผนภาษี", priceSatang: 80_000 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the refund page over the real cache", () => {
  it("keeps the status a press reached when the read again after it fails, and says so with a retry", async () => {
    show();
    await settle();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelFull);

    http.cancelBooking.mockResolvedValue({ ...booked, state: "CANCELLED" });
    http.openRefundCase.mockResolvedValue(opened);
    http.getBooking.mockRejectedValue(new ApiError(503, "Service Unavailable"));
    http.getMyBookingInvoice.mockRejectedValue(new ApiError(503, "Service Unavailable"));
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    await settle();

    expect(http.getBooking).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(screen.queryByText(th.bookingRefund.states.loadFailed)).toBeNull();
    expect(screen.queryByText(th.bookingRefund.states.moneyFailed)).toBeNull();
    expect(screen.getByText(th.bookingRefund.errors.rereadFailed, { exact: false })).toBeTruthy();

    http.getBooking.mockResolvedValue({ ...booked, state: "CANCELLED", cancelledByUserId: "advisee", cancelledAt: new Date(NOW).toISOString() });
    http.getMyBookingInvoice.mockResolvedValue(invoice);
    http.listMyRefundCases.mockResolvedValue(page([opened]));
    await act(async () => screen.getByRole("button", { name: th.bookingRefund.actions.retry }).click());
    await settle();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(screen.queryByText(th.bookingRefund.errors.rereadFailed, { exact: false })).toBeNull();
  });

  it("offers no claim on a paid cancelled booking whose requests never loaded: it may already have one", async () => {
    http.getBooking.mockResolvedValue({ ...booked, state: "CANCELLED", cancelledByUserId: "advisor", cancelledAt: new Date(NOW).toISOString() });
    http.listMyRefundCases.mockRejectedValue(new ApiError(500, "Internal Server Error"));
    show();
    await settle();

    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    expect(screen.getByText(th.bookingRefund.states.requestsFailed)).toBeTruthy();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.retry })).toBeTruthy();
  });

  it("offers nothing while a paid booking's requests load, even after it was read as unpaid for a moment", async () => {
    let paid: (invoice: ApiAdviseeInvoice) => void = () => {};
    http.getBooking.mockResolvedValue({ ...booked, state: "CANCELLED", cancelledByUserId: "advisor", cancelledAt: new Date(NOW).toISOString() });
    http.getMyBookingInvoice.mockReturnValue(new Promise((resolve) => (paid = resolve)));
    http.listMyRefundCases.mockReturnValue(new Promise(() => {}));
    show();
    await settle();
    await act(async () => paid(invoice));
    await settle();

    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(th.bookingRefund.busy.loading);
  });

  it("reads the booking again when it opens on a cached one, which another tab may have cancelled and claimed since", async () => {
    const soon = {
      ...booked,
      startTime: new Date(NOW + 5 * HOUR).toISOString(),
      endTime: new Date(NOW + 6 * HOUR).toISOString(),
      unavailableUntil: new Date(NOW + 6 * HOUR).toISOString(),
    };
    http.getBooking.mockResolvedValue(soon);
    http.getMyBookingInvoice.mockResolvedValue({ ...invoice, session: { startTime: soon.startTime, endTime: soon.endTime } });
    http.listMyRefundCases.mockResolvedValue(page([]));
    const first = show();
    await settle();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelHalf);
    first.unmount();

    http.getBooking.mockResolvedValue({ ...soon, state: "CANCELLED", cancelledByUserId: "advisee", cancelledAt: new Date(NOW).toISOString() });
    http.listMyRefundCases.mockResolvedValue(page([opened]));
    show();
    await settle();

    expect(http.getBooking).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(document.body.textContent).toContain("฿400");
    expect(document.body.textContent).not.toContain(th.bookingRefund.stage.reviewing);
  });

  it("shows the full-page failure only when the booking never answered", async () => {
    http.getBooking.mockRejectedValue(new ApiError(503, "Service Unavailable"));
    show();
    await settle();
    expect(screen.getByText(th.bookingRefund.states.loadFailed)).toBeTruthy();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.retry })).toBeTruthy();
  });
});
