import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";

const calls = vi.hoisted(() => ({ invoice: vi.fn(), cases: vi.fn() }));
vi.mock("@/lib/api/resources", () => ({ getMyBookingInvoice: calls.invoice, listMyRefundCases: calls.cases }));
vi.mock("next-intl", () => ({ useLocale: () => "th" }));
vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");

const { ApiError } = await import("@/lib/api/client");
const { invalidate } = await import("@/lib/api/use-resource");
const { useBookingExit } = await import("@/components/bookings/use-booking-exit");

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

  it("reads a missing receipt as unpaid and never asks for its requests", async () => {
    calls.invoice.mockRejectedValue(new ApiError(404, "Invoice not found"));
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.exit).toEqual({ kind: "cancel" }));
    expect(result.current.money.invoice).toBeNull();
    expect(result.current.money.error).toBeNull();
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

  it("offers nothing and reports the failure when the invoice cannot be read", async () => {
    calls.invoice.mockRejectedValue(new ApiError(500, "down"));
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.money.error).not.toBeNull());
    expect(result.current.exit).toEqual({ kind: "waiting" });
  });

  it("offers nothing when the requests of a paid invoice cannot be read, and reads both again on reload", async () => {
    calls.invoice.mockResolvedValue(invoice);
    calls.cases.mockRejectedValueOnce(new ApiError(500, "down"));
    const { result } = renderHook(() => useBookingExit(booking, now));
    await waitFor(() => expect(result.current.money.error).not.toBeNull());
    expect(result.current.exit).toEqual({ kind: "waiting" });

    calls.cases.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 });
    result.current.money.reload();
    await waitFor(() => expect(result.current.exit).toMatchObject({ kind: "cancelRefund", share: "full" }));
    expect(calls.invoice).toHaveBeenCalledTimes(2);
  });
});
