import { expect, test, type Page } from "@playwright/test";

const api = "http://localhost:3200/api/v1";

async function mockAdvisorSession(page: Page) {
  await page.route(`${api}/users/me`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 200,
        message: "OK",
        data: {
          id: "advisor-test",
          displayName: "Taj Test Advisor",
          email: "taj@example.test",
          emailVerified: true,
          fullName: "Taj Test Advisor",
          avatarKey: null,
          timezone: "Asia/Bangkok",
          roles: ["ADVISEE", "ADVISOR"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    }),
  );
}

test("advisee can cancel an upcoming booking and see it in cancelled bookings", async ({
  page,
}) => {
  let bookingState = "PENDING_PAYMENT";
  let cancelCalls = 0;
  await page.route(`${api}/users/me`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 200,
        message: "OK",
        data: {
          id: "advisee-test",
          displayName: "Reader",
          email: "reader@example.test",
          emailVerified: true,
          fullName: "Reader",
          avatarKey: null,
          timezone: "Asia/Bangkok",
          roles: ["ADVISEE"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    }),
  );
  await page.route(`${api}/bookings/me?limit=50`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 200,
        message: "OK",
        data: {
          items: [
            {
              id: "booking-1",
              serviceId: "service-1",
              advisorId: "advisor-1",
              adviseeId: "advisee-test",
              startTime: "2099-05-01T02:00:00.000Z",
              endTime: "2099-05-01T03:00:00.000Z",
              unavailableUntil: "2099-05-01T03:00:00.000Z",
              state: bookingState,
              blocksAvailability: bookingState !== "CANCELLED",
              cancelledAt: bookingState === "CANCELLED" ? "2099-04-01T00:00:00.000Z" : null,
              cancelledByUserId: bookingState === "CANCELLED" ? "advisee-test" : null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      }),
    }),
  );
  await page.route(`${api}/services?limit=100`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 200,
        message: "OK",
        data: {
          items: [
            {
              id: "service-1",
              advisorId: "advisor-1",
              categoryId: "category-1",
              name: "Career consultation",
              description: "A consultation",
              priceSatang: 100000,
              durationMinutes: 60,
              screeningRequired: false,
              trialEnabled: false,
              trialDurationMinutes: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        },
      }),
    }),
  );
  await page.route(`${api}/advisors?limit=100`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: 200,
        message: "OK",
        data: {
          items: [
            {
              id: "advisor-1",
              displayName: "Taj Advisor",
              headline: "Career advisor",
              bio: null,
              avatarKey: null,
              skills: [],
              publishedServiceCount: 1,
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        },
      }),
    }),
  );
  await page.route(`${api}/bookings/booking-1/cancel`, async (route) => {
    cancelCalls += 1;
    bookingState = "CANCELLED";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ statusCode: 200, message: "OK", data: {} }),
    });
  });

  await page.goto("/bookings");
  await expect(page.getByText("Career consultation").first()).toBeVisible();
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await page.getByRole("tab", { name: "ยกเลิก" }).click();

  await expect(page.getByText("ยกเลิกแล้ว", { exact: true })).toBeVisible();
  expect(cancelCalls).toBe(1);
});

test("service creation blocks publishing before an availability profile exists", async ({
  page,
}) => {
  await mockAdvisorSession(page);
  await page.goto("/advisor/services/new/no-profile");

  await expect(page.getByRole("button", { name: "เผยแพร่บริการ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "บันทึกร่าง" })).toBeEnabled();
});

test("availability editor keeps save disabled when the profile has an invalid range", async ({
  page,
}) => {
  await mockAdvisorSession(page);
  await page.goto("/availability/profiles/edit/error");

  await expect(page.getByRole("button", { name: "บันทึกชุดเวลา" })).toBeDisabled();
});

test("onboarding file selection enables continuation and displays the chosen filename", async ({
  page,
}) => {
  await mockAdvisorSession(page);
  await page.goto("/advisor-onboarding/stage-2");

  const continueButton = page.getByRole("button", { name: "ต่อไป" });
  await expect(continueButton).toBeDisabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "national-id.png",
    mimeType: "image/png",
    buffer: Buffer.from("fixture image"),
  });

  await expect(page.getByText("national-id.png")).toBeVisible();
  await expect(continueButton).toBeEnabled();
});
