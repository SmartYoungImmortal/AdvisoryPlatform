import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const booking = {
  id: "550e8400-e29b-41d4-a716-446655440000", serviceId: "550e8400-e29b-41d4-a716-446655440001",
  advisorId: "550e8400-e29b-41d4-a716-446655440002", adviseeId: "550e8400-e29b-41d4-a716-446655440003", packageId: null,
  startTime: "2026-11-01T00:30:00Z", endTime: "2026-11-01T01:00:00Z", unavailableUntil: "2026-11-01T01:00:00Z",
  createdAt: "2026-10-31T00:00:00Z", state: "BOOKED", blocksAvailability: true,
  cancelledAt: null, cancelledByUserId: null, adviseeName: "Client display name", serviceName: "Private service",
};
function response(data: unknown, status = 200) { return new Response(JSON.stringify({ data }), { status, headers: { "Content-Type": "application/json" } }); }
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("advisor booking reads", () => {
  it("reads every page, preserves booking states and deduplicates overlapping offset pages", async () => {
    const cancelled = { ...booking, id: "550e8400-e29b-41d4-a716-446655440004", state: "CANCELLED" };
    fetchMock.mockResolvedValueOnce(response({ items: [booking], total: 2, page: 1, limit: 100, totalPages: 2 }));
    fetchMock.mockResolvedValueOnce(response({ items: [booking, cancelled], total: 2, page: 2, limit: 100, totalPages: 2 }));
    const { listAllAdvisorBookings } = await import("@/lib/api/advisor-bookings");
    const controller = new AbortController();
    expect(await listAllAdvisorBookings(controller.signal)).toEqual([booking, cancelled].map(item => ({ ...item, adviseeAvatarUrl: null, serviceImageUrl: null })));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("page=2");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ signal: controller.signal, credentials: "include" });
  });

  it("preserves supplied avatar and service image URLs", async () => {
    const pictured = { ...booking, adviseeAvatarUrl: "https://images.example.test/avatar.png", serviceImageUrl: "https://images.example.test/service.png" };
    fetchMock.mockResolvedValueOnce(response({ items: [pictured], total: 1, page: 1, limit: 100, totalPages: 1 }));
    const { listAllAdvisorBookings } = await import("@/lib/api/advisor-bookings");
    expect(await listAllAdvisorBookings()).toEqual([pictured]);
  });

  it("accepts a real empty calendar without fetching another page", async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [], total: 0, page: 1, limit: 100, totalPages: 0 }));
    const { listAllAdvisorBookings } = await import("@/lib/api/advisor-bookings");
    expect(await listAllAdvisorBookings()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed dates at the API boundary rather than rendering an invented calendar", async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [{ ...booking, startTime: "not-a-date" }], total: 1, page: 1, limit: 100, totalPages: 1 }));
    const { listAllAdvisorBookings } = await import("@/lib/api/advisor-bookings");
    await expect(listAllAdvisorBookings()).rejects.toThrow();
  });

  it("loads the exact session and current screening request, keeping private reads authenticated", async () => {
    fetchMock.mockResolvedValueOnce(response({ ...booking, chatRoomId: null, latestScreeningRequestId: null }));
    const { getAdvisorBooking, getAdvisorBookingScreening } = await import("@/lib/api/advisor-bookings");
    expect(await getAdvisorBooking(booking.id)).toMatchObject({ id: booking.id, chatRoomId: null, latestScreeningRequestId: null });
    const id = "550e8400-e29b-41d4-a716-446655440005";
    const screening = { id, status: "EXPIRED", createdAt: booking.createdAt, answers: [{ questionId: booking.serviceId, questionText: "Saved question", answer: "Saved answer" }] };
    fetchMock.mockResolvedValueOnce(response(screening));
    expect(await getAdvisorBookingScreening(id)).toEqual(screening);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(`/advisors/me/bookings/${booking.id}`);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(`/advisors/me/screening-requests/${id}`);
  });
});
