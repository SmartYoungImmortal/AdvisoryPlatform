import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import type { ApiBooking } from "@/lib/api/types";
import { cancelAndCheck, checkCancellation, useBookingCancellation } from "@/components/bookings/use-booking-cancellation";

const calls = vi.hoisted(() => ({ cancel: vi.fn(), get: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/api/resources", () => ({ cancelBooking: calls.cancel, getBooking: calls.get }));
vi.mock("@/lib/api/use-resource", () => ({ invalidate: calls.invalidate }));
const booking: ApiBooking = {
  id: "550e8400-e29b-41d4-a716-446655440000", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: "2026-12-20T03:00:00Z", endTime: "2026-12-20T04:00:00Z", unavailableUntil: "2026-12-20T04:00:00Z",
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-10-26T00:00:00Z",
};
beforeEach(() => { calls.cancel.mockReset(); calls.get.mockReset(); calls.invalidate.mockReset(); });
afterEach(cleanup);

describe("cancellation outcomes", () => {
  it("accepts a successful cancellation without issuing another mutation", async () => {
    calls.cancel.mockResolvedValue({ ...booking, state: "CANCELLED" });
    expect(await cancelAndCheck(booking.id)).toBe("cancelled");
    expect(calls.cancel).toHaveBeenCalledTimes(1);
    expect(calls.get).not.toHaveBeenCalled();
  });

  it("recognizes a committed cancellation when its response was lost", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("response lost"));
    calls.get.mockResolvedValue({ ...booking, state: "CANCELLED" });
    expect(await cancelAndCheck(booking.id)).toBe("cancelled");
    expect(calls.cancel).toHaveBeenCalledTimes(1);
  });

  it("allows retry only after reading an active booking", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("offline"));
    calls.get.mockResolvedValue(booking);
    expect(await cancelAndCheck(booking.id)).toBe("retry");
  });

  it("refreshes a booking that started before the cancellation", async () => {
    calls.cancel.mockRejectedValue(new ApiError(409, "state changed"));
    calls.get.mockResolvedValue({ ...booking, state: "IN_PROGRESS" });
    expect(await cancelAndCheck(booking.id)).toBe("changed");
  });

  it.each([401, 403, 404])("handles access failure %s without retrying the mutation", async (status) => {
    calls.cancel.mockRejectedValue(new ApiError(status, "denied"));
    expect(await cancelAndCheck(booking.id)).toBe(status === 401 ? "signIn" : "unavailable");
    expect(calls.cancel).toHaveBeenCalledTimes(1);
    expect(calls.get).not.toHaveBeenCalled();
  });

  it("keeps the result uncertain when neither mutation nor read can reach the API", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("offline"));
    calls.get.mockRejectedValue(new ApiUnreachableError("offline"));
    expect(await cancelAndCheck(booking.id)).toBe("uncertain");
  });

  it("requests sign in if the session expires during reconciliation", async () => {
    calls.get.mockRejectedValue(new ApiError(401, "expired"));
    expect(await checkCancellation(booking.id)).toBe("signIn");
    expect(calls.cancel).not.toHaveBeenCalled();
  });
});

describe("cancellation controls", () => {
  it("suppresses two submissions before React renders the disabled button", async () => {
    let complete = (value: ApiBooking) => { void value; };
    calls.cancel.mockReturnValue(new Promise<ApiBooking>((resolve) => { complete = resolve; }));
    const refresh = vi.fn();
    const { result } = renderHook(() => useBookingCancellation(refresh));
    let first: Promise<void>;
    await act(async () => {
      first = result.current.cancel(booking.id);
      await result.current.cancel(booking.id);
    });
    expect(calls.cancel).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(true);
    await act(async () => { complete({ ...booking, state: "CANCELLED" }); await first; });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
  });

  it("blocks another cancellation until a read-only status check succeeds", async () => {
    calls.cancel.mockRejectedValue(new ApiUnreachableError("offline"));
    calls.get.mockRejectedValue(new ApiUnreachableError("offline"));
    const refresh = vi.fn();
    const { result } = renderHook(() => useBookingCancellation(refresh));
    await act(() => result.current.cancel(booking.id));
    expect(result.current.blocked).toBe(true);
    await act(() => result.current.cancel(booking.id));
    expect(calls.cancel).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    calls.get.mockResolvedValue(booking);
    await act(() => result.current.check());
    expect(calls.cancel).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
