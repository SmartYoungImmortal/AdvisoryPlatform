import { describe, expect, it } from "vitest";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";

describe("advisor-local calendar dates", () => {
  it("puts a UTC month-boundary session on the advisor's actual local day", () => {
    expect(bookingDay("2026-11-01T00:30:00Z", "America/New_York")).toBe("2026-10-31");
    expect(bookingDay("2026-11-01T00:30:00Z", "Asia/Bangkok")).toBe("2026-11-01");
  });
  it("keeps both repeated daylight-saving hours on their local calendar day", () => {
    expect(bookingDay("2026-11-01T05:30:00Z", "America/New_York")).toBe("2026-11-01");
    expect(bookingDay("2026-11-01T06:30:00Z", "America/New_York")).toBe("2026-11-01");
  });
  it("navigates year and leap-month boundaries without overflowing the day", () => {
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
    expect(moveMonth("2026-01", -1)).toBe("2025-12");
    expect(moveMonth("2028-01", 1)).toBe("2028-02");
  });
});
