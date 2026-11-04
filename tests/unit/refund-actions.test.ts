import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { cancelThenRefund, openRefundOnce } from "@/components/bookings/refund-actions";

const calls = vi.hoisted(() => ({ cancel: vi.fn(), get: vi.fn(), open: vi.fn(), list: vi.fn(), invalidate: vi.fn(), log: [] as string[] }));
vi.mock("@/lib/api/resources", () => ({
  cancelBooking: (...args: unknown[]) => (calls.log.push("POST cancel"), calls.cancel(...args)),
  getBooking: (...args: unknown[]) => (calls.log.push("GET booking"), calls.get(...args)),
  openRefundCase: (...args: unknown[]) => (calls.log.push("POST refunds"), calls.open(...args)),
  listMyRefundCases: (...args: unknown[]) => (calls.log.push("GET refunds/me"), calls.list(...args)),
}));
vi.mock("@/lib/api/use-resource", () => ({ invalidate: calls.invalidate }));

const bookingId = "15638839-49d1-4553-b79c-59821ff58f2e";
const invoiceId = "invoice";
const reason = "ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000";
const opened: ApiRefundCase = { id: "case", invoiceId, reason, status: "OPEN", createdAt: "2026-11-04T13:56:00Z", resolvedAt: null };
const page = (items: ApiRefundCase[]) => ({ items, total: items.length, page: 1, limit: 100, totalPages: 1 });
const booked = { id: bookingId, state: "BOOKED" } as ApiBooking;

beforeEach(() => {
  for (const fn of [calls.cancel, calls.get, calls.open, calls.list, calls.invalidate]) fn.mockReset();
  calls.log.length = 0;
});

describe("openRefundOnce", () => {
  it("opens the request with the invoice and the reason, and drops the cached requests", async () => {
    calls.open.mockResolvedValue(opened);
    await expect(openRefundOnce(invoiceId, reason)).resolves.toBe(opened);
    expect(calls.open).toHaveBeenCalledWith({ invoiceId, reason }, expect.any(AbortSignal));
    expect(calls.log).toEqual(["POST refunds"]);
    expect(calls.invalidate).toHaveBeenCalledWith("refunds/me");
  });

  it("reads the invoice's requests after a lost response and returns the one that committed", async () => {
    calls.open.mockRejectedValue(new ApiUnreachableError("response lost"));
    calls.list.mockResolvedValue(page([{ ...opened, status: "REJECTED", id: "old" }, opened]));
    await expect(openRefundOnce(invoiceId, reason)).resolves.toBe(opened);
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
    expect(calls.list).toHaveBeenCalledWith({ invoiceId, limit: 100 }, expect.any(AbortSignal));
  });

  it("gives back the POST's own error when no open request exists", async () => {
    const refused = new ApiError(409, "already resolved");
    calls.open.mockRejectedValue(refused);
    calls.list.mockResolvedValue(page([]));
    await expect(openRefundOnce(invoiceId, reason)).rejects.toBe(refused);
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
    expect(calls.invalidate).not.toHaveBeenCalled();
  });

  it("gives back the POST's error when the requests cannot be read either", async () => {
    const offline = new ApiUnreachableError("offline");
    calls.open.mockRejectedValue(offline);
    calls.list.mockRejectedValue(new ApiUnreachableError("still offline"));
    await expect(openRefundOnce(invoiceId, reason)).rejects.toBe(offline);
    expect(calls.log.filter((call) => call === "POST refunds")).toHaveLength(1);
  });
});

describe("cancelThenRefund", () => {
  it("cancels, then opens the refund, in that order", async () => {
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockResolvedValue(opened);
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "opened", refund: opened });
    expect(calls.log).toEqual(["POST cancel", "POST refunds"]);
    expect(calls.cancel).toHaveBeenCalledWith(bookingId, expect.any(AbortSignal));
    expect(calls.open).toHaveBeenCalledWith({ invoiceId, reason }, expect.any(AbortSignal));
    expect(calls.invalidate).toHaveBeenCalledWith("bookings/");
    expect(calls.invalidate).toHaveBeenCalledWith("refunds/me");
  });

  it("opens no request on a booking whose cancel did not go through", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("offline"));
    calls.get.mockResolvedValue(booked);
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "notCancelled", outcome: "retry" });
    expect(calls.open).not.toHaveBeenCalled();
    expect(calls.invalidate).not.toHaveBeenCalled();
  });

  it("counts a cancel whose response was lost but which committed, then opens the refund", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("response lost"));
    calls.get.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockResolvedValue(opened);
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toMatchObject({ kind: "opened" });
    expect(calls.log).toEqual(["POST cancel", "GET booking", "POST refunds"]);
  });

  it("reports a cancel that stood while the refund did not", async () => {
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockRejectedValue(new ApiUnreachableError("offline"));
    calls.list.mockRejectedValue(new ApiUnreachableError("offline"));
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "cancelledOnly" });
    expect(calls.invalidate).toHaveBeenCalledWith("bookings/");
  });

  it("reads the requests after a lost refund response before any second POST", async () => {
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockRejectedValue(new ApiUnreachableError("response lost"));
    calls.list.mockResolvedValue(page([opened]));
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "opened", refund: opened });
    expect(calls.log).toEqual(["POST cancel", "POST refunds", "GET refunds/me"]);
  });
});
