import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiBooking } from "@/lib/api/types";
import { bookingCallWindow, useBookingMeeting } from "@/components/bookings/use-booking-meeting";

const calls = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@/lib/api/resources", () => ({ openBookingMeeting: calls.open }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
const start = Date.parse("2026-11-01T10:00:00Z");
const booking: ApiBooking = { id: "booking", serviceId: "service", advisorId: "advisor", adviseeId: "advisee", state: "BOOKED", startTime: new Date(start).toISOString(), endTime: new Date(start + 1_800_000).toISOString(), unavailableUntil: new Date(start + 1_800_000).toISOString(), createdAt: "2026-10-01T00:00:00Z", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null };
beforeEach(() => { calls.open.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); window.location.hash = ""; });

describe("meeting entry", () => {
  it("opens exactly ten minutes early and closes at the booked end", () => {
    expect(bookingCallWindow(booking, start - 600_001)).toEqual({ open: false, opensAt: new Date(start - 600_000), ended: false });
    expect(bookingCallWindow(booking, start - 600_000).open).toBe(true);
    expect(bookingCallWindow(booking, start + 1_800_000).open).toBe(false);
    expect(bookingCallWindow({ ...booking, state: "IN_PROGRESS" }, start + 3_600_000).open).toBe(true);
    expect(bookingCallWindow({ ...booking, state: "CANCELLED" }, start).open).toBe(false);
  });
  it("says the session has ended once there is no call left to join", () => {
    expect(bookingCallWindow(booking, start + 1_799_999)).toEqual({ open: true, opensAt: null, ended: false });
    expect(bookingCallWindow(booking, start + 1_800_000)).toEqual({ open: false, opensAt: null, ended: true });
    expect(bookingCallWindow({ ...booking, state: "COMPLETED" }, start).ended).toBe(true);
    expect(bookingCallWindow({ ...booking, state: "NO_SHOW" }, start + 3_600_000).ended).toBe(true);
    // Still running past the booked end, never paid for, or called off: not "ended".
    expect(bookingCallWindow({ ...booking, state: "IN_PROGRESS" }, start + 3_600_000).ended).toBe(false);
    expect(bookingCallWindow({ ...booking, state: "PENDING_PAYMENT" }, start + 3_600_000).ended).toBe(false);
    expect(bookingCallWindow({ ...booking, state: "CANCELLED" }, start + 3_600_000).ended).toBe(false);
  });
  it("turns to ended while the page stays open past the booked end", () => {
    vi.useFakeTimers().setSystemTime(start + 1_790_000);
    const { result } = renderHook(() => useBookingMeeting(booking, start + 1_790_000));
    expect(result.current).toMatchObject({ open: true, ended: false });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current).toMatchObject({ open: false, opensAt: null, ended: true });
  });
  it("updates the entry window while the page remains open and removes its timer on unmount", () => {
    vi.useFakeTimers().setSystemTime(start - 610_000);
    const { result, unmount } = renderHook(() => useBookingMeeting(booking, start - 610_000));
    expect(result.current.open).toBe(false);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.open).toBe(true);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("opens the API's room in the synchronously created tab and cuts its opener", async () => {
    vi.spyOn(window, "open").mockReturnValue(window);
    calls.open.mockResolvedValue({ url: `${window.location.href.split("#")[0]}#meeting-room` });
    const { result } = renderHook(() => useBookingMeeting(booking, start));
    await act(async () => { await result.current.join(); });
    expect(calls.open).toHaveBeenCalledWith(booking.id);
    expect(window.location.hash).toBe("#meeting-room");
    expect(window.opener).toBeNull();
    expect(result.current.joining).toBe(false);
  });
  it("closes a blank tab and presents a retryable error when the real API would reject entry", async () => {
    vi.spyOn(window, "open").mockReturnValue(window);
    const close = vi.spyOn(window, "close").mockImplementation(() => {});
    calls.open.mockRejectedValue(new Error("Meeting not open"));
    const { result } = renderHook(() => useBookingMeeting(booking, start));
    await act(async () => { await result.current.join(); });
    expect(close).toHaveBeenCalledOnce();
    expect(result.current.problem).toBe("joinFailed");
    expect(result.current.joining).toBe(false);
  });
});
