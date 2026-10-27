import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// Opt in only against the disposable, seeded proof API. No network interception.
test.skip(process.env.BOOKING_LIVE_PROOF !== "1", "Requires the isolated seeded API on localhost:3200");
test.use({ video: "on", launchOptions: { slowMo: 250 }, viewport: { width: 1440, height: 1000 } });

test("sign in, open details on desktop and phone, cancel, and verify persistence", async ({ page, context, browser }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("nattapong.d@advisory.demo");
  await page.locator('form button[type="submit"]').click();
  await page.locator('input[type="password"]').fill("AdvisoryDemo!2026");
  const signedIn = page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-in/email"));
  await page.locator('form button[type="submit"]').click();
  expect((await signedIn).status()).toBe(200);
  await page.goto("/bookings");
  const listResponse = await context.request.get("http://localhost:3200/api/v1/bookings/me?limit=50");
  expect(listResponse.status()).toBe(200);
  const { data } = await listResponse.json();
  const booking = data.items.find((item: { state: string }) => item.state === "BOOKED");
  expect(booking).toBeTruthy();
  const details = page.locator(`a[href="/bookings/detail?bookingId=${booking.id}"]`);
  await expect(details).toBeVisible();
  await details.click();
  await expect(page).toHaveURL(new RegExp(`bookingId=${booking.id}`));
  await expect(page.getByRole("heading", { name: "การจองยืนยันแล้ว" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ย้อนกลับ", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "สิ่งที่อยากปรึกษา" })).toBeVisible();
  await expect(page.getByText("ยังไม่มีข้อมูลการชำระเงินสำหรับการจองนี้")).toBeVisible();
  await expect(page.getByRole("button", { name: "เข้าร่วมเซสชัน", exact: true })).toBeDisabled();
  const calendarDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "เพิ่มลงปฏิทิน", exact: true }).click();
  const calendar = await calendarDownload;
  expect(calendar.suggestedFilename()).toBe(`booking-${booking.id}.ics`);
  const calendarPath = await calendar.path();
  expect(calendarPath).toBeTruthy();
  if (!calendarPath) throw new Error("Calendar download missing");
  expect(await readFile(calendarPath, "utf8")).toContain(`UID:${booking.id}@advisory-platform`);
  await page.screenshot({ path: "test-results/booking-details-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/booking-details-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('main a').filter({ hasText: /^แชท$/ })).toHaveAttribute("href", /\/chat\/.*\?with=/);
  const cancelled = page.waitForResponse((response) => response.url().endsWith(`/bookings/${booking.id}/cancel`));
  await page.getByRole("button", { name: "ยกเลิกการจอง", exact: true }).click();
  expect((await cancelled).status()).toBe(200);
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "การจองถูกยกเลิกแล้ว" })).toBeVisible();
  const persisted = await context.request.get(`http://localhost:3200/api/v1/bookings/${booking.id}`);
  expect((await persisted.json()).data.state).toBe("CANCELLED");
  await page.screenshot({ path: "test-results/booking-details-cancelled.png", fullPage: true });
  await page.getByRole("button", { name: "กลับไปที่การจอง", exact: true }).click();
  await page.getByRole("tab", { name: /ยกเลิก/ }).click();
  await expect(page.locator(`a[href="/bookings/detail?bookingId=${booking.id}"]`)).toBeVisible();
  const stranger = await browser.newContext();
  const login = await stranger.request.post("http://localhost:3200/api/auth/sign-in/email", {
    data: { email: "supaporn.t@advisory.demo", password: "AdvisoryDemo!2026" },
    headers: { origin: "http://localhost:3001" },
  });
  expect(login.status()).toBe(200);
  const denied = await stranger.request.get(`http://localhost:3200/api/v1/bookings/${booking.id}`);
  expect(denied.status()).toBe(404);
  await stranger.close();
  await page.goto("/bookings/detail?bookingId=invalid");
  await expect(page.getByText("ไม่พบรหัสการจอง", { exact: true })).toBeVisible();
});
