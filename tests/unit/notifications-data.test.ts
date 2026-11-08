import { describe, expect, it } from "vitest";
import { liveServiceHref } from "@/components/bookings/booking-flow";
import {
  notificationAction,
  notificationCategory,
  notificationHref,
  type ApiNotification,
  type NotificationType,
} from "@/components/notifications/notifications-data";
import { receiptHref } from "@/components/payment/transactions-data";

const resourceId = "11111111-1111-4111-8111-111111111111";

function make(type: NotificationType, id: string | null = resourceId): ApiNotification {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    type,
    title: "title",
    content: null,
    resourceId: id,
    isRead: false,
    createdAt: "2026-11-07T00:00:00.000Z",
  };
}

describe("notificationAction", () => {
  it.each([
    ["BOOKING_RESCHEDULED", "/work/calendar", "actionCalendar"],
    ["REVIEW_REPLIED", `/bookings?bookingId=${resourceId}`, "actionBooking"],
    ["SCREENING_EXPIRED", liveServiceHref(resourceId), "actionService"],
    ["REFUND_DECIDED", receiptHref(resourceId), "actionReceipt"],
    ["PAYOUT_FAILED", "/work", "actionEarnings"],
    ["SKILL_PROOF_DECIDED", "/profile", "actionProfile"],
  ] as const)("sends %s to %s", (type, href, label) => {
    expect(notificationAction(make(type))).toEqual({ href, label });
  });

  it("has no way on for a notice that only informs", () => {
    expect(notificationAction(make("BOOKING_CANCELLED"))).toBeNull();
    expect(notificationAction(make("REPORT_RESOLVED"))).toBeNull();
  });

  it("falls back to the list when a review reply has no booking id", () => {
    expect(notificationAction(make("REVIEW_REPLIED", null))).toEqual({
      href: "/bookings",
      label: "actionBooking",
    });
  });
});

describe("notificationHref", () => {
  it("opens the calendar for a moved session and the page for a cancelled one", () => {
    expect(notificationHref(make("BOOKING_RESCHEDULED"))).toBe("/work/calendar");
    expect(notificationHref(make("BOOKING_CANCELLED"))).toBeNull();
  });
});

describe("notificationCategory", () => {
  it("files booking changes under bookings and money results under payments", () => {
    expect(notificationCategory("BOOKING_CANCELLED")).toBe("booking");
    expect(notificationCategory("BOOKING_RESCHEDULED")).toBe("booking");
    expect(notificationCategory("REFUND_DECIDED")).toBe("payment");
    expect(notificationCategory("PAYOUT_FAILED")).toBe("payment");
    expect(notificationCategory("REPORT_RESOLVED")).toBeNull();
  });
});
