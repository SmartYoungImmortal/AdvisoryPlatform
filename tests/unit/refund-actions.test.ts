import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { cancelThenRefund, openRefundOnce, refundFailure } from "@/components/bookings/refund-actions";

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
    await expect(openRefundOnce(invoiceId, reason)).resolves.toEqual({ refund: opened, alreadyOpen: false });
    expect(calls.open).toHaveBeenCalledWith({ invoiceId, reason }, expect.any(AbortSignal));
    expect(calls.log).toEqual(["POST refunds"]);
    expect(calls.invalidate).toHaveBeenCalledWith("refunds/me");
  });

  it.each([
    ["a lost response", new ApiUnreachableError("response lost")],
    ["a timeout", new ApiError(408, "Request Timeout")],
    ["a server fault", new ApiError(502, "Bad Gateway")],
  ])("reads the invoice's requests after %s and returns the one that committed, as this one", async (_, cause) => {
    calls.open.mockRejectedValue(cause);
    calls.list.mockResolvedValue(page([{ ...opened, status: "REJECTED", id: "old" }, opened]));
    await expect(openRefundOnce(invoiceId, reason)).resolves.toEqual({ refund: opened, alreadyOpen: false });
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
    expect(calls.list).toHaveBeenCalledWith({ invoiceId, limit: 100 }, expect.any(AbortSignal));
  });

  it("takes the open request after a 409 as someone else's, so the caller can say this press wrote nothing", async () => {
    const other = { ...opened, id: "other-tab", reason: "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน" };
    calls.open.mockRejectedValue(new ApiError(409, "A refund case is already open for this invoice"));
    calls.list.mockResolvedValue(page([other]));
    await expect(openRefundOnce(invoiceId, reason)).resolves.toEqual({ refund: other, alreadyOpen: true });
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
    expect(calls.invalidate).toHaveBeenCalledWith("refunds/me");
  });

  it("takes the open request after a 409 as this press's own when it carries the reason sent: an earlier press whose answer was lost", async () => {
    const report = "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน\n\nรอ 30 นาทีแล้วไม่มีใครเข้าห้อง";
    calls.open.mockRejectedValue(new ApiError(409, "A refund case is already open for this invoice"));
    calls.list.mockResolvedValue(page([{ ...opened, reason: report }]));
    await expect(openRefundOnce(invoiceId, report)).resolves.toEqual({ refund: { ...opened, reason: report }, alreadyOpen: false });
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
  });

  it("gives back the POST's own error when no open request exists", async () => {
    const refused = new ApiError(409, "already resolved");
    calls.open.mockRejectedValue(refused);
    calls.list.mockResolvedValue(page([]));
    await expect(openRefundOnce(invoiceId, reason)).rejects.toBe(refused);
    expect(calls.log).toEqual(["POST refunds", "GET refunds/me"]);
    expect(calls.invalidate).not.toHaveBeenCalled();
  });

  it.each([
    ["a lapsed session", new ApiError(401, "Unauthorized")],
    ["a receipt that is not this account's", new ApiError(404, "Not Found")],
    ["a refusal", new ApiError(400, "reason too long")],
  ])("gives back %s as it came, with no read: nothing was written", async (_, cause) => {
    calls.open.mockRejectedValue(cause);
    calls.list.mockResolvedValue(page([opened]));
    await expect(openRefundOnce(invoiceId, reason)).rejects.toBe(cause);
    expect(calls.log).toEqual(["POST refunds"]);
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
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({
      kind: "opened",
      refund: opened,
      alreadyOpen: false,
    });
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

  it.each([
    ["someone else's cancel, refused with a 409", new ApiError(409, "invalid transition")],
    ["a cancel whose response was lost", new ApiUnreachableError("response lost")],
  ])("files nothing after %s that left the booking cancelled", async (_, cause) => {
    calls.cancel.mockRejectedValue(cause);
    calls.get.mockResolvedValue({ ...booked, state: "CANCELLED", cancelledByUserId: "advisor" });
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "foundCancelled" });
    expect(calls.log).toEqual(["POST cancel", "GET booking"]);
    expect(calls.invalidate).toHaveBeenCalledWith("bookings/");
  });

  it.each([
    ["a network failure", new ApiUnreachableError("offline"), "retry"],
    ["a lapsed session", new ApiError(401, "unauthenticated"), "signIn"],
    ["no disputable receipt", new ApiError(404, "invoice not found"), "notFound"],
    ["a refusal", new ApiError(400, "reason too long"), "refused"],
  ] as const)("reports a cancel that stood while the refund met %s", async (_, cause, failure) => {
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockRejectedValue(cause);
    calls.list.mockResolvedValue(page([]));
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({ kind: "cancelledOnly", failure });
    expect(calls.invalidate).toHaveBeenCalledWith("bookings/");
  });

  it("reads the requests after a lost refund response before any second POST", async () => {
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockRejectedValue(new ApiUnreachableError("response lost"));
    calls.list.mockResolvedValue(page([opened]));
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({
      kind: "opened",
      refund: opened,
      alreadyOpen: false,
    });
    expect(calls.log).toEqual(["POST cancel", "POST refunds", "GET refunds/me"]);
  });

  it("hands up a request another tab opened first, flagged, after this page's own cancel stood", async () => {
    const other = { ...opened, id: "other-tab", reason: "ที่ปรึกษาหรือทีมงานยกเลิก · คืนเต็มจำนวน ฿1,000" };
    calls.cancel.mockResolvedValue({ ...booked, state: "CANCELLED" });
    calls.open.mockRejectedValue(new ApiError(409, "already open"));
    calls.list.mockResolvedValue(page([other]));
    await expect(cancelThenRefund(bookingId, invoiceId, reason)).resolves.toEqual({
      kind: "opened",
      refund: other,
      alreadyOpen: true,
    });
  });
});

describe("refundFailure", () => {
  it.each([
    ["a network failure", new ApiUnreachableError("offline"), "retry"],
    ["a server fault", new ApiError(503, "unavailable"), "retry"],
    ["a request already open, read back on the next press", new ApiError(409, "already open"), "retry"],
    ["a lapsed session", new ApiError(401, "unauthenticated"), "signIn"],
    ["a receipt that is not this account's", new ApiError(403, "forbidden"), "notFound"],
    ["no disputable receipt", new ApiError(404, "invoice not found"), "notFound"],
    ["a refused request", new ApiError(400, "bad request"), "refused"],
  ] as const)("asks for the right next step after %s", (_, cause, failure) => {
    expect(refundFailure(cause)).toBe(failure);
  });
});
