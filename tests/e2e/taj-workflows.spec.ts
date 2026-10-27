import { expect, test, type Page } from "@playwright/test";

const api = "http://localhost:3200/api/v1";

function apiSuccess(data: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ statusCode: 200, message: "OK", data }),
  };
}

function paginated<T>(items: readonly T[], limit: number) {
  return { items, total: items.length, page: 1, limit, totalPages: 1 };
}

async function mockSession(
  page: Page,
  { id, displayName, email, roles }: {
    readonly id: string;
    readonly displayName: string;
    readonly email: string;
    readonly roles: readonly string[];
  },
) {
  await page.route(`${api}/users/me`, (route) =>
    route.fulfill(apiSuccess({
      id,
      displayName,
      email,
      emailVerified: true,
      fullName: displayName,
      avatarKey: null,
      timezone: "Asia/Bangkok",
      roles,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  );
}

test("advisee can cancel an upcoming booking and see it in cancelled bookings", async ({
  page,
}) => {
  let bookingState = "PENDING_PAYMENT";
  let cancelCalls = 0;
  await mockSession(page, {
    id: "advisee-test",
    displayName: "Reader",
    email: "reader@example.test",
    roles: ["ADVISEE"],
  });
  await page.route(`${api}/bookings/me?limit=50`, (route) =>
    route.fulfill(apiSuccess(paginated([
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
          ], 50))),
  );
  await page.route(`${api}/services?limit=100`, (route) =>
    route.fulfill(apiSuccess(paginated([
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
          ], 100))),
  );
  await page.route(`${api}/advisors?limit=100`, (route) =>
    route.fulfill(apiSuccess(paginated([
            {
              id: "advisor-1",
              displayName: "Taj Advisor",
              headline: "Career advisor",
              bio: null,
              avatarKey: null,
              skills: [],
              publishedServiceCount: 1,
            },
          ], 100))),
  );
  await page.route(`${api}/bookings/booking-1/cancel`, async (route) => {
    cancelCalls += 1;
    bookingState = "CANCELLED";
    await route.fulfill(apiSuccess({}));
  });

  await page.goto("/bookings");
  await expect(page.getByText("Career consultation").first()).toBeVisible();
  const cancellation = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "POST" &&
      url.pathname === "/api/v1/bookings/booking-1/cancel"
    );
  });
  // The row opens the booking over the list, where cancelling asks once.
  await page.getByRole("link", { name: "Career consultation" }).click();
  const booking = page.getByRole("dialog");
  await booking.getByRole("button", { name: "ยกเลิกการจอง", exact: true }).click();
  await booking.getByRole("button", { name: "ยืนยันการยกเลิก", exact: true }).click();
  await cancellation;
  expect(cancelCalls).toBe(1);

  // Verify the server-persisted state through a fresh page load.
  await page.reload();
  await page.getByRole("button", { name: "ยกเลิกแล้ว", exact: true }).click();

  const row = page.getByRole("listitem").filter({ hasText: "Career consultation" });
  await expect(row).toBeVisible();
  await expect(row.getByText("ยกเลิกแล้ว", { exact: true })).toBeVisible();
  expect(cancelCalls).toBe(1);
});

test("service creation blocks publishing before an availability profile exists", async ({
  page,
}) => {
  await mockSession(page, {
    id: "advisor-test",
    displayName: "Taj Test Advisor",
    email: "taj@example.test",
    roles: ["ADVISEE", "ADVISOR"],
  });
  await page.goto("/advisor/services/new/no-profile");

  await expect(page.getByRole("button", { name: "เผยแพร่บริการ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "บันทึกร่าง" })).toBeEnabled();
});

test("availability editor keeps save disabled when the profile has an invalid range", async ({
  page,
}) => {
  await mockSession(page, {
    id: "advisor-test",
    displayName: "Taj Test Advisor",
    email: "taj@example.test",
    roles: ["ADVISEE", "ADVISOR"],
  });
  await page.goto("/availability/profiles/edit/error");

  await expect(page.getByRole("button", { name: "บันทึกชุดเวลา" })).toBeDisabled();
});

test("onboarding file selection enables continuation and displays the chosen filename", async ({
  page,
}) => {
  await mockSession(page, {
    id: "advisor-test",
    displayName: "Taj Test Advisor",
    email: "taj@example.test",
    roles: ["ADVISEE", "ADVISOR"],
  });
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
