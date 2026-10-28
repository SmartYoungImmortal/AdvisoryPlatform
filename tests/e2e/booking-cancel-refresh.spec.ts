import { expect, test, type Page, type Route } from "@playwright/test";

const bookingId = "booking-cancel-refresh-test";
const serviceId = "service-cancel-refresh-test";
const advisorId = "advisor-cancel-refresh-test";
const adviseeId = "advisee-cancel-refresh-test";
const serviceName = "บริการทดสอบการยกเลิก";

function envelope(data: unknown) {
  return { statusCode: 200, message: "OK", data };
}

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(envelope(data)),
  });
}

async function mockBookingApi(page: Page) {
  let cancelled = false;
  const booking = () => ({
    id: bookingId,
    serviceId,
    advisorId,
    adviseeId,
    startTime: "2026-12-20T03:00:00.000Z",
    endTime: "2026-12-20T03:30:00.000Z",
    unavailableUntil: "2026-12-20T03:30:00.000Z",
    state: cancelled ? "CANCELLED" : "BOOKED",
    blocksAvailability: !cancelled,
    cancelledAt: cancelled ? "2026-10-17T12:00:00.000Z" : null,
    cancelledByUserId: cancelled ? adviseeId : null,
    createdAt: "2026-10-01T12:00:00.000Z",
  });

  await page.route("http://localhost:3200/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;

    if (pathname === "/api/v1/users/me") {
      await fulfill(route, {
        id: adviseeId,
        displayName: "ผู้รับคำปรึกษาทดสอบ",
        email: "booking-cancel@example.test",
        emailVerified: true,
        fullName: "ผู้รับคำปรึกษาทดสอบ",
        avatarKey: null,
        timezone: "Asia/Bangkok",
        roles: ["ADVISEE"],
        createdAt: "2026-10-01T12:00:00.000Z",
        updatedAt: "2026-10-01T12:00:00.000Z",
      });
      return;
    }

    if (pathname === "/api/v1/bookings/me") {
      await fulfill(route, {
        items: [booking()],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
      return;
    }

    if (pathname === `/api/v1/bookings/${bookingId}/cancel` && route.request().method() === "POST") {
      cancelled = true;
      await fulfill(route, booking());
      return;
    }

    if (pathname === "/api/v1/services") {
      await fulfill(route, {
        items: [{
          id: serviceId,
          advisorId,
          categoryId: "category-test",
          name: serviceName,
          description: "",
          priceSatang: 80000,
          durationMinutes: 30,
          screeningRequired: false,
          trialEnabled: false,
          trialDurationMinutes: null,
        }],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });
      return;
    }

    if (pathname === "/api/v1/advisors") {
      await fulfill(route, {
        items: [{
          id: advisorId,
          displayName: "ที่ปรึกษาทดสอบ",
          headline: "",
          bio: null,
          avatarKey: null,
          skills: [],
          publishedServiceCount: 1,
        }],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });
      return;
    }

    if (pathname === "/api/v1/notifications/unread-count") {
      await fulfill(route, { count: 0 });
      return;
    }

    await fulfill(route, {});
  });
}

test("cancelling a booking moves it to the cancelled list without reloading", async ({ page }) => {
  await mockBookingApi(page);
  await page.goto("/bookings");

  await expect(page.getByRole("heading", { name: "การจองของฉัน" })).toBeVisible();
  // The row opens the booking over the list, where cancelling asks once.
  await page.getByRole("link", { name: serviceName }).click();
  const booking = page.getByRole("dialog");
  await booking.getByRole("button", { name: "ยกเลิกการจอง", exact: true }).click();
  await booking.getByRole("button", { name: "ยืนยันการยกเลิก", exact: true }).click();
  await expect(booking.getByText("ยกเลิกแล้ว", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  // The tabs are capsules that say which is chosen with aria-pressed.
  const cancelledTab = page.getByRole("button", { name: "ยกเลิกแล้ว", exact: true });
  await expect(cancelledTab).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(serviceName, { exact: true })).toHaveCount(0);

  await cancelledTab.click();
  await expect(cancelledTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(serviceName, { exact: true }).first()).toBeVisible();
});
