import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  asUuid,
  baht,
  BOOKING_BUCKET,
  BOOKING_TONE,
  isCancellable,
  isoDay,
  liveAdvisorHref,
  liveServiceHref,
  useMountTime,
  useQueryValue,
} from "@/components/bookings/booking-flow";

afterEach(() => vi.restoreAllMocks());

describe("booking flow helpers", () => {
  it("reads query values and updates when browser history changes", () => {
    window.history.replaceState({}, "", "/service?booking=first");
    const { result } = renderHook(() => useQueryValue("booking"));
    expect(result.current).toBe("first");
    act(() => {
      window.history.pushState({}, "", "/service?booking=second");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current).toBe("second");
    expect(renderHook(() => useQueryValue("missing")).result.current).toBeNull();
  });

  it("holds mount time stable for one mounted flow", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100);
    const hook = renderHook(() => useMountTime());
    expect(hook.result.current).toBe(100);
    now.mockReturnValue(200);
    hook.rerender();
    expect(hook.result.current).toBe(100);
  });

  it("validates API ids and builds links and local date values", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(asUuid(id)).toBe(id);
    expect(asUuid("tax-freelance")).toBeUndefined();
    expect(asUuid(null)).toBeUndefined();
    expect(liveServiceHref(id)).toContain(`serviceId=${id}`);
    expect(liveAdvisorHref(id)).toContain(`advisorId=${id}`);
    expect(baht(12345)).toBe(123.45);
    expect(isoDay(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
    const next = addDays(new Date(2026, 0, 5, 12), 3);
    expect(isoDay(next)).toBe("2026-01-08");
    expect(isoDay(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("groups each appointment state and exposes only cancellable states", () => {
    expect(BOOKING_BUCKET).toMatchObject({
      PENDING_PAYMENT: "upcoming",
      BOOKED: "upcoming",
      IN_PROGRESS: "upcoming",
      COMPLETED: "completed",
      NO_SHOW: "completed",
      CANCELLED: "cancelled",
    });
    expect(BOOKING_TONE.PENDING_PAYMENT).toBe("warning");
    expect(BOOKING_TONE.BOOKED).toBe("accent");
    expect(BOOKING_TONE.IN_PROGRESS).toBe("info");
    expect(BOOKING_TONE.COMPLETED).toBe("success");
    expect(BOOKING_TONE.NO_SHOW).toBe("neutral");
    expect(BOOKING_TONE.CANCELLED).toBe("neutral");
    expect(isCancellable("PENDING_PAYMENT")).toBe(true);
    expect(isCancellable("BOOKED")).toBe(true);
    expect(isCancellable("IN_PROGRESS")).toBe(false);
    expect(isCancellable("COMPLETED")).toBe(false);
    expect(isCancellable("NO_SHOW")).toBe(false);
    expect(isCancellable("CANCELLED")).toBe(false);
  });
});
