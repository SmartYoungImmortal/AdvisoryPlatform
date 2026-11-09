import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS, matchesLength, serviceQuery } from "@/lib/catalogue/filters";

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const page = (items: unknown[]) =>
  new Response(JSON.stringify({ data: { items, total: items.length, page: 1, limit: 12, totalPages: 1 } }), {
    headers: { "Content-Type": "application/json" },
  });
const service = { id: "service", advisorId: "advisor", categoryId: "category", name: "Tax", priceSatang: 90_000 };

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

describe("search asks the API", () => {
  it("sends nothing for the defaults, so an API without sort or minRating still answers", () => {
    expect(serviceQuery("  ", DEFAULT_FILTERS, "recommended", "2026-11-03")).toEqual({
      q: undefined, categoryId: undefined, minRating: undefined, availableOn: undefined, sort: undefined,
    });
  });
  it("turns each filter and sort into the API's parameters", () => {
    const filters = { category: "category", price: "mid", length: "any", rating: "4.5", today: true } as const;
    expect(serviceQuery(" ภาษี ", filters, "priceLow", "2026-11-03")).toEqual({
      q: "ภาษี", categoryId: "category", minPriceSatang: 80_001, maxPriceSatang: 150_000,
      minRating: 4.5, availableOn: "2026-11-03", sort: "price_asc",
    });
    expect(serviceQuery("", { ...DEFAULT_FILTERS, price: "under" }, "priceHigh", "")).toMatchObject({ maxPriceSatang: 80_000, sort: "price_desc" });
    expect(serviceQuery("", { ...DEFAULT_FILTERS, price: "over" }, "rating", "")).toMatchObject({ minPriceSatang: 150_001, sort: "rating" });
    expect(serviceQuery("", DEFAULT_FILTERS, "newest", "").sort).toBe("newest");
    expect(serviceQuery("x".repeat(200), DEFAULT_FILTERS, "newest", "").q).toHaveLength(120);
  });
  it("keeps the length bands the API has no parameter for", () => {
    expect([30, 45, 46, 60, 61].map((minutes) => matchesLength("hour", minutes))).toEqual([false, false, true, true, false]);
    expect(matchesLength("any", 240)).toBe(true);
  });
});

describe("a service's card fields", () => {
  it("reads an API without them as no cover and no advisor", async () => {
    fetchMock.mockResolvedValueOnce(page([service]));
    const { listServices } = await import("@/lib/api/resources");
    const { items } = await listServices({ sort: "rating", page: 2, limit: 12 });
    expect(items[0]).toMatchObject({ ...service, cover: null, advisor: null });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/services?sort=rating&page=2&limit=12");
  });
  it("keeps the cover and the advisor's card facts the API sends", async () => {
    const advisor = { id: "advisor", name: "Nok", avatarUrl: null, rating: 4.8, reviewCount: 12, verified: true };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...service, cover: "https://cdn.example.test/c.jpg", advisor } })));
    const { getService } = await import("@/lib/api/resources");
    expect(await getService("service")).toMatchObject({ cover: "https://cdn.example.test/c.jpg", advisor });
  });
});
