import { expect, test } from "@playwright/test";

const password = "Browser-Test-123!";

test.describe("password reset screen", () => {
  test("sends the emailed token and shows success after the API accepts it", async ({
    page,
  }) => {
    let submitted: unknown;
    await page.route("http://localhost:3200/api/auth/reset-password", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: true }),
      });
    });

    await page.goto("/reset-password?token=playwright-test-token");
    await page.getByRole("textbox", { name: "รหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("textbox", { name: "ยืนยันรหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }).click();

    await expect(
      page.getByRole("heading", { name: "เปลี่ยนรหัสผ่านแล้ว" }),
    ).toBeVisible();
    expect(submitted).toEqual({
      token: "playwright-test-token",
      newPassword: password,
    });
  });

  test("shows the expired-link message only for an invalid token", async ({
    page,
  }) => {
    await page.route("http://localhost:3200/api/auth/reset-password", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          status: null,
          message: "Invalid token",
          code: "INVALID_TOKEN",
        }),
      }),
    );

    await page.goto("/reset-password?token=invalid-test-token");
    await page.getByRole("textbox", { name: "รหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("textbox", { name: "ยืนยันรหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }).click();

    await expect(
      page.getByText("ลิงก์นี้หมดอายุหรือถูกใช้แล้ว ขอรับลิงก์ใหม่ได้จากหน้าลืมรหัสผ่าน"),
    ).toBeVisible();
  });

  test("does not call an expired-link error for a password rejection", async ({
    page,
  }) => {
    await page.route("http://localhost:3200/api/auth/reset-password", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          status: null,
          message: "Password too short",
          code: "PASSWORD_TOO_SHORT",
        }),
      }),
    );

    await page.goto("/reset-password?token=valid-test-token");
    await page.getByRole("textbox", { name: "รหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("textbox", { name: "ยืนยันรหัสผ่านใหม่", exact: true }).fill(password);
    await page.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }).click();

    await expect(page.getByText("ลิงก์นี้หมดอายุหรือถูกใช้แล้ว ขอรับลิงก์ใหม่ได้จากหน้าลืมรหัสผ่าน")).toHaveCount(0);
    await expect(
      page.getByText("รหัสผ่านต้องมี 8–64 ตัวอักษร พร้อมตัวเลขและอักขระพิเศษ"),
    ).toBeVisible();
  });
});
