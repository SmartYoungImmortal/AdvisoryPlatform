import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const response = (items: unknown[], page: number, totalPages: number) =>
  new Response(
    JSON.stringify({
      data: { items, page, limit: 50, total: 101, totalPages },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("complete advisee timeline", () => {
  it("includes later-page appointments once and forwards authenticated cancellation signals", async () => {
    fetchMock.mockResolvedValueOnce(
      response([{ id: "old", state: "COMPLETED" }], 1, 3),
    );
    fetchMock.mockResolvedValueOnce(
      response(
        [
          { id: "old", state: "COMPLETED" },
          { id: "cancelled", state: "CANCELLED" },
        ],
        2,
        3,
      ),
    );
    fetchMock.mockResolvedValueOnce(
      response([{ id: "new", state: "BOOKED" }], 3, 3),
    );
    const { listAllMyBookings } = await import("@/lib/api/my-bookings");
    const signal = new AbortController().signal;
    expect((await listAllMyBookings(signal)).map((item) => item.id)).toEqual([
      "old",
      "cancelled",
      "new",
    ]);
    expect(fetchMock.mock.calls[2]?.[0]).toContain("page=3");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      signal,
      credentials: "include",
    });
  });
  it("returns an empty timeline without further requests", async () => {
    fetchMock.mockResolvedValueOnce(response([], 1, 0));
    const { listAllMyBookings } = await import("@/lib/api/my-bookings");
    expect(await listAllMyBookings()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects a failed later page instead of presenting an incomplete timeline as complete", async () => {
    fetchMock.mockResolvedValueOnce(response([{ id: "old" }], 1, 2));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const { listAllMyBookings } = await import("@/lib/api/my-bookings");
    await expect(listAllMyBookings()).rejects.toThrow();
  });
});

for (const [name, endpoint] of [
  ["listBookingServices", "services"],
  ["listBookingAdvisors", "advisors"],
] as const) {
  it(`includes later-page ${endpoint} referenced by a booking`, async () => {
    fetchMock.mockResolvedValueOnce(response([{ id: "first" }], 1, 2));
    fetchMock.mockResolvedValueOnce(response([{ id: "later" }], 2, 2));
    const resources = await import("@/lib/api/my-bookings");
    expect((await resources[name]()).map((item) => item.id)).toEqual([
      "first",
      "later",
    ]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      `/${endpoint}?limit=100&page=2`,
    );
  });
}
