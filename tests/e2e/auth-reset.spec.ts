import { expect, test, type Page } from "@playwright/test";

const password = "Browser-Test-123!";

async function mockResetApi(
  page: Page,
  status: number,
  response: Record<string, unknown>,
) {
  let submitted: unknown;
  await page.route("http://localhost:3200/api/auth/reset-password", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
  return () => submitted;
}

async function submitResetForm(page: Page, token: string) {
  await page.goto(`/reset-password?token=${token}`);
  await page.getByRole("textbox", { name: "รหัสผ่านใหม่", exact: true }).fill(password);
  await page.getByRole("textbox", { name: "ยืนยันรหัสผ่านใหม่", exact: true }).fill(password);
  await page.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }).click();
}

async function mockRequestPasswordReset(page: Page) {
  let submitted: unknown;
  await page.route("http://localhost:3200/api/auth/request-password-reset", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true }),
    });
  });
  return () => submitted;
}

test.describe("password reset screen", () => {
  test("requests a reset link and shows the submitted email", async ({ page }) => {
    const getSubmitted = await mockRequestPasswordReset(page);

    await page.goto("/forgot-password");
    await page.getByRole("textbox", { name: "อีเมล" }).fill("reader@example.test");
    await page.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่านใหม่" }).click();

    await expect(page).toHaveURL(/\/reset-sent\?email=reader%40example\.test$/);
    await expect(page.getByText("reader@example.test")).toBeVisible();
    expect(getSubmitted()).toEqual({
      email: "reader@example.test",
      redirectTo: "http://localhost:3001/reset-password",
    });
  });

  test("resends a reset link from the confirmation screen", async ({ page }) => {
    const getSubmitted = await mockRequestPasswordReset(page);

    await page.goto("/reset-sent?email=reader%40example.test");
    await page.getByRole("button", { name: "ส่งลิงก์อีกครั้ง" }).click();

    await expect(page.getByText("ส่งอีเมลอีกครั้งแล้ว")).toBeVisible();
    expect(getSubmitted()).toEqual({
      email: "reader@example.test",
      redirectTo: "http://localhost:3001/reset-password",
    });
  });

  test("resends verification to the email shown on the confirmation screen", async ({ page }) => {
    let submitted: unknown;
    await page.route("http://localhost:3200/api/auth/send-verification-email", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: true }),
      });
    });

    await page.goto("/verification-sent?email=reader%40example.test");
    await page.getByRole("button", { name: "ส่งลิงก์ยืนยันอีกครั้ง" }).click();

    await expect(page.getByText("ส่งลิงก์ยืนยันอีกครั้งแล้ว")).toBeVisible();
    expect(submitted).toEqual({
      email: "reader@example.test",
      callbackURL: "http://localhost:3001/email-verified?email=reader%40example.test",
    });
  });

  test("sends the emailed token and shows success after the API accepts it", async ({
    page,
  }) => {
    const getSubmitted = await mockResetApi(page, 200, { status: true });
    await submitResetForm(page, "playwright-test-token");

    await expect(
      page.getByRole("heading", { name: "เปลี่ยนรหัสผ่านแล้ว" }),
    ).toBeVisible();
    expect(getSubmitted()).toEqual({
      token: "playwright-test-token",
      newPassword: password,
    });
  });

  test("shows the expired-link message only for an invalid token", async ({
    page,
  }) => {
    await mockResetApi(page, 400, {
      status: null,
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
    await submitResetForm(page, "invalid-test-token");

    await expect(page.getByRole("heading", { name: "ลิงก์นี้ใช้ไม่ได้แล้ว" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ขอลิงก์ใหม่" })).toHaveAttribute("href", "/forgot-password");
  });

  test("does not call an expired-link error for a password rejection", async ({
    page,
  }) => {
    await mockResetApi(page, 400, {
      status: null,
      message: "Password too short",
      code: "PASSWORD_TOO_SHORT",
    });
    await submitResetForm(page, "valid-test-token");

    await expect(page.getByRole("heading", { name: "ลิงก์นี้ใช้ไม่ได้แล้ว" })).toHaveCount(0);
    await expect(
      page.getByText("รหัสผ่านต้องมี 8–64 ตัวอักษร พร้อมตัวเลขและอักขระพิเศษ"),
    ).toBeVisible();
  });
});
