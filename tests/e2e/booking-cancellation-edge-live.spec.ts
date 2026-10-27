import { execFileSync } from "node:child_process";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { z } from "zod";

// Only the named disposable database is used for fixture changes. API responses are real.
test.skip(process.env.BOOKING_EDGE_PROOF !== "1", "Requires the isolated seeded proof API and Docker database");
test.use({ video: { mode: "on", size: { width: 1280, height: 960 } }, launchOptions: { slowMo: 300 }, viewport: { width: 1280, height: 960 } });

function proofSql(query: string): string {
  return execFileSync("docker", ["exec", "advisory-booking-proof-db", "psql", "-U", "advisory", "-d", "advisory_proof", "-Atc", query], { encoding: "utf8" }).trim();
}

async function signIn(context: BrowserContext, email = "nattapong.d@advisory.demo") {
  const response = await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
    data: { email, password: "AdvisoryDemo!2026" }, headers: { origin: "http://localhost:3001" },
  });
  expect(response.status()).toBe(200);
}

async function openBooking(page: Page, context: BrowserContext) {
  const id = z.uuid().parse(proofSql("SELECT a.id FROM service_appointments a JOIN public.user u ON a.advisee_id=u.id WHERE u.email='nattapong.d@advisory.demo' AND a.start_time > now() ORDER BY a.start_time LIMIT 1"));
  proofSql(`UPDATE service_appointments SET state='BOOKED', blocks_availability=true, cancelled_at=NULL, cancelled_by_user_id=NULL WHERE id='${id}'`);
  await signIn(context);
  const response = await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`);
  expect(response.status()).toBe(200);
  expect((await response.json()).data.state).toBe("BOOKED");
  await page.goto(`/bookings/detail?bookingId=${id}`);
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toBeEnabled();
  return id;
}

// The card asks once before it calls a booking off: open the prompt, then confirm.
async function confirmCancel(page: Page) {
  await page.getByRole("button", { name: "ยกเลิกการจอง", exact: true }).click();
  await page.getByRole("button", { name: "ยืนยันการยกเลิก", exact: true }).click();
}

// Pause only for the review recording, after assertions have established the state.
async function showForReview(page: Page) {
  await page.waitForTimeout(1500);
}

test("offline cancellation requires a status check before retrying", async ({ page, context }) => {
  const id = await openBooking(page, context);
  await context.setOffline(true);
  await confirmCancel(page);
  await expect(page.getByRole("button", { name: "ตรวจสอบสถานะ", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toBeDisabled();
  await showForReview(page);
  await context.setOffline(false);
  await page.getByRole("button", { name: "ตรวจสอบสถานะ", exact: true }).click();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toBeEnabled();
  expect((await (await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`)).json()).data.state).toBe("BOOKED");
  await showForReview(page);
});

test("a lost response after the API commits is reconciled without a second cancellation", async ({ page, context }) => {
  const id = await openBooking(page, context);
  let posts = 0;
  await page.route(`**/bookings/${id}/cancel`, async (route) => {
    posts += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("connectionreset"); // Lose only the response; the real API already committed.
  });
  await confirmCancel(page);
  await expect(page.getByText("การจองนี้ถูกยกเลิกแล้ว", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toHaveCount(0);
  expect(posts).toBe(1);
  expect((await (await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`)).json()).data.state).toBe("CANCELLED");
  await showForReview(page);
});

test("two tabs cancelling the same booking converge on the API state", async ({ page, context }) => {
  const id = await openBooking(page, context);
  const other = await context.newPage();
  await other.goto(`/bookings/detail?bookingId=${id}`);
  await expect(other.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toBeVisible();
  await confirmCancel(other);
  await expect(other.getByText("การจองนี้ถูกยกเลิกแล้ว", { exact: true })).toBeVisible();
  const conflict = page.waitForResponse((response) => response.url().endsWith(`/bookings/${id}/cancel`));
  await confirmCancel(page);
  expect((await conflict).status()).toBe(409);
  await expect(page.getByText("การจองนี้ถูกยกเลิกแล้ว", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toHaveCount(0);
  await showForReview(page);
  await other.close();
});

test("expired sessions offer sign in and do not claim cancellation", async ({ page, context }) => {
  const id = await openBooking(page, context);
  await context.clearCookies();
  const denied = page.waitForResponse((response) => response.url().endsWith(`/bookings/${id}/cancel`));
  await confirmCancel(page);
  expect((await denied).status()).toBe(401);
  await expect(page.getByText("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งเพื่อตรวจสอบการจอง", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toBeDisabled();
  await showForReview(page);
  await page.locator('a[href="/login"]').filter({ hasText: "เข้าสู่ระบบอีกครั้ง" }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await signIn(context);
  expect((await (await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`)).json()).data.state).toBe("BOOKED");
  await showForReview(page);
});

test("a delayed response keeps double clicks to one cancellation request", async ({ page, context }) => {
  const id = await openBooking(page, context);
  let posts = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/bookings/${id}/cancel`, async (route) => {
    posts += 1;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "ยกเลิกการจอง", exact: true }).click();
  const confirm = page.getByRole("button", { name: "ยืนยันการยกเลิก", exact: true });
  await confirm.dblclick();
  await expect(confirm).toBeDisabled();
  await expect.poll(() => posts).toBe(1);
  await showForReview(page);
  release();
  await expect(page.getByText("การจองนี้ถูกยกเลิกแล้ว", { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  await showForReview(page);
});

test("an advisor starting the session prevents stale cancellation", async ({ page, context, browser }) => {
  const id = await openBooking(page, context);
  const email = proofSql(`SELECT u.email FROM public.user u JOIN service_appointments a ON a.advisor_id=u.id WHERE a.id='${id}'`);
  const advisor = await browser.newContext();
  await signIn(advisor, email);
  const started = await advisor.request.post(`http://localhost:3200/api/v1/advisors/me/bookings/${id}/start`);
  expect(started.status()).toBe(200);
  await confirmCancel(page);
  await expect(page.getByText("สถานะการจองเปลี่ยนไปและไม่สามารถยกเลิกได้แล้ว โปรดตรวจสอบสถานะล่าสุด", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toHaveCount(0);
  expect((await (await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`)).json()).data.state).toBe("IN_PROGRESS");
  await showForReview(page);
  await advisor.close();
});

test("the booking list also blocks cancellation until an offline result is checked", async ({ page, context }) => {
  const id = await openBooking(page, context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bookings");
  // A plain click on the row opens the booking over the list.
  await page.locator(`a[href="/bookings/detail?bookingId=${id}"]`).click();
  const booking = page.getByRole("dialog");
  const cancel = booking.getByRole("button", { name: "ยกเลิกการจอง", exact: true });
  await expect(cancel).toBeEnabled();
  await context.setOffline(true);
  await cancel.click();
  await booking.getByRole("button", { name: "ยืนยันการยกเลิก", exact: true }).click();
  await expect(booking.getByRole("button", { name: "ตรวจสอบสถานะ", exact: true })).toBeVisible();
  await expect(cancel).toBeDisabled();
  await showForReview(page);
  await context.setOffline(false);
  await page.getByRole("button", { name: "ตรวจสอบสถานะ", exact: true }).click();
  await expect(cancel).toBeEnabled();
  expect((await (await context.request.get(`http://localhost:3200/api/v1/bookings/${id}`)).json()).data.state).toBe("BOOKED");
  await showForReview(page);
});
