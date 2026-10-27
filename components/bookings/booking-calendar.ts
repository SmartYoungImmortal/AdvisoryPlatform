import type { ApiBooking } from "@/lib/api/types";

function calendarText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

// RFC 5545 limits a physical content line to 75 octets, including a continuation space.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let result = "";
  let length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) { result += "\r\n "; length = 1; }
    result += character;
    length += bytes;
  }
  return result;
}

/** UTC timestamps preserve the appointment instant in the calendar's own timezone. */
export function bookingCalendar(booking: ApiBooking, title: string): string {
  const timestamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Advisory Platform//Booking//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${booking.id}@advisory-platform`, `DTSTAMP:${timestamp(booking.createdAt)}`,
    `DTSTART:${timestamp(booking.startTime)}`, `DTEND:${timestamp(booking.endTime)}`,
    `SUMMARY:${calendarText(title)}`, "END:VEVENT", "END:VCALENDAR", "",
  ].map(foldLine).join("\r\n");
}

export function downloadBookingCalendar(booking: ApiBooking, title: string): void {
  const url = URL.createObjectURL(new Blob([bookingCalendar(booking, title)], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `booking-${booking.id}.ics`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
