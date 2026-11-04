import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useQueryValue } from "@/components/bookings/booking-flow";
import { useLocationSearch } from "@/lib/navigation/use-location-search";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

/**
 * A client navigation to the same route with a new query (a `<Link>`,
 * `router.push`, or the page's own `history.pushState`) writes the URL with
 * pushState or replaceState and never fires popstate (FE #108).
 */
describe.each([
  ["pushState", (url: string) => window.history.pushState({}, "", url)],
  ["replaceState", (url: string) => window.history.replaceState({}, "", url)],
] as const)("after history.%s to the same path, no popstate", (_, navigate) => {
  it("useQueryValue reads the new value", async () => {
    window.history.replaceState({}, "", "/advisors/sarah-jenskins?advisorId=A");
    const { result } = renderHook(() => useQueryValue("advisorId"));
    expect(result.current).toBe("A");
    await act(async () => navigate("/advisors/sarah-jenskins?advisorId=B"));
    expect(result.current).toBe("B");
  });

  it("useLocationSearch reads the new query string", async () => {
    window.history.replaceState({}, "", "/matching?q=tax");
    const { result } = renderHook(() => useLocationSearch());
    expect(result.current).toBe("?q=tax");
    await act(async () => navigate("/matching?q=inheritance"));
    expect(result.current).toBe("?q=inheritance");
  });
});

describe("back and forward", () => {
  it("still follow popstate", async () => {
    window.history.replaceState({}, "", "/service?serviceId=first");
    const { result } = renderHook(() => useQueryValue("serviceId"));
    await act(async () => {
      window.history.pushState({}, "", "/service?serviceId=second");
    });
    expect(result.current).toBe("second");
    await act(async () => {
      window.history.replaceState({}, "", "/service?serviceId=first");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current).toBe("first");
  });

  it("stop listening once nothing reads the query", async () => {
    window.history.replaceState({}, "", "/x?a=1");
    const first = renderHook(() => useLocationSearch());
    first.unmount();
    const second = renderHook(() => useLocationSearch());
    await act(async () => window.history.pushState({}, "", "/x?a=2"));
    expect(second.result.current).toBe("?a=2");
  });
});
