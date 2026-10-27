import { describe, expect, it } from "vitest";
import { bookingCalendar } from "@/components/bookings/booking-calendar";
import type { ApiBooking } from "@/lib/api/types";

const booking: ApiBooking = {
  id: "550e8400-e29b-41d4-a716-446655440000", serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
  startTime: "2026-12-20T10:00:00+07:00", endTime: "2026-12-20T11:00:00+07:00", unavailableUntil: "2026-12-20T04:15:00Z",
  state: "BOOKED", blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-10-26T00:00:00Z",
};

describe("booking calendar export", () => {
  it("exports the actual session instant and duration without the availability buffer", () => {
    const calendar = bookingCalendar(booking, "Consultation");
    expect(calendar).toContain("DTSTART:20261220T030000Z\r\nDTEND:20261220T040000Z");
    expect(calendar).toContain(`UID:${booking.id}@advisory-platform`);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("escapes text so a service name cannot inject calendar properties", () => {
    const calendar = bookingCalendar(booking, "Tax, freelance; planning\\income\rATTENDEE:someone");
    expect(calendar).toContain("SUMMARY:Tax\\, freelance\\; planning\\\\income\\nATTENDEE:someone");
    expect(calendar).not.toContain("\r\nATTENDEE:");
  });
  it("folds long Thai names at UTF-8 boundaries and preserves the full name", () => {
    const title = "ปรึกษาเรื่องภาษีสำหรับฟรีแลนซ์".repeat(4);
    const calendar = bookingCalendar(booking, title);
    for (const line of calendar.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(calendar.replace(/\r\n /g, "")).toContain(`SUMMARY:${title}`);
  });
});
