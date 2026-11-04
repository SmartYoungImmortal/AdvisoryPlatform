import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

const calls = vi.hoisted(() => ({ invoice: vi.fn(), cases: vi.fn() }));
vi.mock("@/lib/api/resources", () => ({ getMyBookingInvoice: calls.invoice, listMyRefundCases: calls.cases }));
vi.mock("next-intl", () => ({ useLocale: () => "th" }));
vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");

const { ApiError } = await import("@/lib/api/client");
const { invalidate } = await import("@/lib/api/use-resource");
const { moneyReadProblem, useBookingExit } = await import("@/components/bookings/use-booking-exit");

const S = Date.parse("2026-11-11T03:30:00Z");
const booking: ApiBooking = {
  id: "15638839-49d1-4553-b79c-59821ff58f2e", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: new Date(S).toISOString(), endTime: new Date(S + 3_600_000).toISOString(), unavailableUntil: new Date(S + 3_600_000).toISOString(),
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-11-01T00:00:00Z",
};
const invoice = { id: "invoice", status: "paid", amountSatang: 100_000, priceSatang: 80_000, platformFeeSatang: 20_000, session: null } as ApiAdviseeInvoice;
const open: ApiRefundCase = { id: "case", invoiceId: "invoice", reason: "r", status: "OPEN", createdAt: "2026-11-04T13:56:00Z", resolvedAt: null };
const now = S - 3 * 24 * 3_600_000;

beforeEach(() => {
  invalidate();
  calls.invoice.mockReset();
  calls.cases.mockReset();
});
afterEach(cleanup);

describe("useBookingExit", () => {
  it("offers nothing until the invoice has answered", () => {
    calls.invoice.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useBookingExit(booking, now));
    expect(result.current.exit).toEqual({ kind: "waiting" });
  });

  it("reads a missing receipt as no receipt, not a failure, and never asks for its requests", async () => {
    calls.invoice.mockRejectedValue(new ApiError(404, "Invoice not found"));
    const { result } = renderHook(() => useBookingExit(booking, now));
    // A booked appointment with no receipt of its own was paid on the one it replaced.
    await waitFor(() => expect(result.current.exit).toEqual({ kind: "paidElsewhere", receipt: "missing" }));
    expect(result.current.money.invoice).toBeNull();
    expect(result.current.money.failure).toBeNull();
    expect(calls.cases).not.toHaveBeenCalled();
  });

  it("reads a paid invoice's requests and follows the open one", async () => {
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockResolvedValue({ items: [open], total: 1, page: 1, limit: 100, totalPages: 1 });
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.exit).toMatchObject({ kind: "status", refund: open }));
    expect(calls.cases).toHaveBeenCalledWith({ invoiceId: "invoice", limit: 100 }, expect.any(AbortSignal));
  });

  it("keeps what it knew while a change it made is dropped from the cache", async () => {
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockResolvedValue({ items: [open], total: 1, page: 1, limit: 100, totalPages: 1 });
    const { result, rerender } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.exit).toMatchObject({ kind: "status" }));
    invalidate("payment/invoices");
    invalidate("refunds/me");
    rerender();
    expect(result.current.exit).toMatchObject({ kind: "status", refund: open });
  });

  it("reads a cached request again when another screen opens on it, showing the cached answer meanwhile", async () => {
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockResolvedValue({ items: [open], total: 1, page: 1, limit: 100, totalPages: 1 });
    const popup = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(popup.result.current.exit).toMatchObject({ kind: "status", stage: "reviewing" }));
    popup.unmount();

    const approved: ApiRefundCase = { ...open, status: "APPROVED", resolvedAt: "2026-11-05T03:00:00Z" };
    calls.cases.mockResolvedValue({ items: [approved], total: 1, page: 1, limit: 100, totalPages: 1 });
    const page = renderHook(() => useBookingExit(booking, now));
    expect(page.result.current.exit).toMatchObject({ kind: "status", stage: "reviewing" });
    await waitFor(() => expect(page.result.current.exit).toMatchObject({ kind: "status", stage: "approved" }));
    expect(calls.cases).toHaveBeenCalledTimes(2);
  });

  it("tries a failed invoice again when the next screen opens, rather than keeping the failure for the tab's life", async () => {
    calls.invoice.mockRejectedValueOnce(new ApiError(500, "down"));
    const first = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(first.result.current.money.failure).not.toBeNull());
    first.unmount();

    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 });
    const again = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(again.result.current.exit).toMatchObject({ kind: "cancelRefund" }));
    expect(calls.invoice).toHaveBeenCalledTimes(2);
  });

  it("asks once on a first open with nothing cached", async () => {
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 });
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.exit).toMatchObject({ kind: "cancelRefund" }));
    expect(calls.invoice).toHaveBeenCalledTimes(1);
    expect(calls.cases).toHaveBeenCalledTimes(1);
  });

  it("offers nothing and reports the invoice as the read that failed", async () => {
    const down = new ApiError(500, "down");
    calls.invoice.mockRejectedValue(down);
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.money.failure).toEqual({ read: "invoice", error: down }));
    expect(result.current.exit).toEqual({ kind: "waiting" });
  });

  it("offers nothing when the requests of a paid invoice cannot be read, names that read, and reads both again on reload", async () => {
    const refused = new ApiError(403, "Forbidden");
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockRejectedValueOnce(refused);
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.money.failure).toEqual({ read: "requests", error: refused }));
    expect(result.current.money.invoice).toEqual(invoice);
    expect(result.current.exit).toEqual({ kind: "waiting" });

    calls.cases.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 });
    result.current.money.reload();
    await waitFor(() => expect(result.current.exit).toMatchObject({ kind: "cancelRefund", share: "full" }));
    expect(calls.invoice).toHaveBeenCalledTimes(2);
  });
});

describe("moneyReadProblem", () => {
  it.each([
    ["a network failure", new Error("offline"), "retry"],
    ["a server fault", new ApiError(503, "down"), "retry"],
    ["a lapsed session", new ApiError(401, "Unauthorized"), "signIn"],
    ["an account without the permission", new ApiError(403, "Forbidden"), "forbidden"],
    ["a missing record", new ApiError(404, "Not Found"), "refused"],
    ["a bad request", new ApiError(400, "Bad Request"), "refused"],
  ] as const)("asks for what helps after %s", (_, error, problem) => {
    expect(moneyReadProblem(error)).toBe(problem);
  });
});
