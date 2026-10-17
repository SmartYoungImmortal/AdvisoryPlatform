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

test.describe("password reset screen", () => {
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

    await expect(
      page.getByText("ลิงก์นี้หมดอายุหรือถูกใช้แล้ว ขอรับลิงก์ใหม่ได้จากหน้าลืมรหัสผ่าน"),
    ).toBeVisible();
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

    await expect(page.getByText("ลิงก์นี้หมดอายุหรือถูกใช้แล้ว ขอรับลิงก์ใหม่ได้จากหน้าลืมรหัสผ่าน")).toHaveCount(0);
    await expect(
      page.getByText("รหัสผ่านต้องมี 8–64 ตัวอักษร พร้อมตัวเลขและอักขระพิเศษ"),
    ).toBeVisible();
  });
});
