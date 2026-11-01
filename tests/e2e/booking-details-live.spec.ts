import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "./support/coverage";

// Opt in only against the disposable, seeded proof API. No network interception.
test.skip(
  process.env.BOOKING_LIVE_PROOF !== "1",
  "Requires the isolated seeded API on localhost:3200",
);
test.use({
  video: "on",
  launchOptions: { slowMo: 250 },
  viewport: { width: 1440, height: 1000 },
});

function sql(statement: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "advisory-booking-proof-db",
      "psql",
      "-U",
      "advisory",
      "-d",
      "advisory_proof",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8" },
  ).trim();
}

test("sign in, open details on desktop and phone, cancel, and verify persistence", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120_000);
  const fixtureId = randomUUID();
  // Seed an unpaid disposable appointment, independent of yesterday's demo dates.
  // The browser still uses the real authenticated read/cancel APIs and persistence.
  const inserted =
    sql(`INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability)
    SELECT '${fixtureId}',s.id,s.advisor_id,u.id,now()+interval '1 hour',now()+interval '2 hours',now()+interval '2 hours','BOOKED',false
    FROM services s JOIN "user" a ON a.id=s.advisor_id CROSS JOIN "user" u
    WHERE a.email='araya.s@advisory.demo' AND u.email='nattapong.d@advisory.demo' AND s.name='ตรวจแผนภาษีก่อนยื่น' LIMIT 1 RETURNING id`);
  expect(inserted).toContain(fixtureId);
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("nattapong.d@advisory.demo");
    await page.locator('form button[type="submit"]').click();
    await page.locator('input[type="password"]').fill("AdvisoryDemo!2026");
    const signedIn = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/sign-in/email"),
    );
    await page.locator('form button[type="submit"]').click();
    expect((await signedIn).status()).toBe(200);
    await page.goto("/bookings");
    const persistedBefore = await context.request.get(
      `http://localhost:3200/api/v1/bookings/${fixtureId}`,
    );
    expect(persistedBefore.status()).toBe(200);
    const booking = (await persistedBefore.json()).data;
    // A plain click opens the booking over the list; its own page is the row's
    // link, for a new tab or a notification.
    const details = page.locator(
      `a[href="/bookings/detail?bookingId=${booking.id}"]`,
    );
    await expect(details).toBeVisible();
    await page.goto(`/bookings/detail?bookingId=${booking.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "ตำแหน่งของหน้านี้" })
        .getByRole("link", { name: "การจองของฉัน", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/ราคาบริการ|ดูใบเสร็จ/).first()).toBeVisible();
    const calendarDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "เพิ่มลงปฏิทิน", exact: true })
      .click();
    const calendar = await calendarDownload;
    expect(calendar.suggestedFilename()).toBe(`booking-${booking.id}.ics`);
    const calendarPath = await calendar.path();
    expect(calendarPath).toBeTruthy();
    if (!calendarPath) throw new Error("Calendar download missing");
    expect(await readFile(calendarPath, "utf8")).toContain(
      `UID:${booking.id}@advisory-platform`,
    );
    await page.screenshot({
      path: "test-results/booking-details-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/booking-details-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "แชทกับที่ปรึกษา", exact: true }),
    ).toHaveAttribute("href", /\/chat\/.*\?with=/);
    const cancelled = page.waitForResponse((response) =>
      response.url().endsWith(`/bookings/${booking.id}/cancel`),
    );
    // The card asks once before it calls the booking off.
    await page
      .getByRole("button", { name: "ยกเลิกการจอง", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ยืนยันการยกเลิก", exact: true })
      .click();
    expect((await cancelled).status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "ยกเลิกการจอง", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("ยกเลิกแล้ว", { exact: true })).toBeVisible();
    const persisted = await context.request.get(
      `http://localhost:3200/api/v1/bookings/${booking.id}`,
    );
    expect((await persisted.json()).data.state).toBe("CANCELLED");
    await page.screenshot({
      path: "test-results/booking-details-cancelled.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "ย้อนกลับ", exact: true }).click();
    await page.getByRole("button", { name: "ยกเลิกแล้ว", exact: true }).click();
    await expect(
      page.locator(`a[href="/bookings/detail?bookingId=${booking.id}"]`),
    ).toBeVisible();
    const stranger = await browser.newContext();
    const login = await stranger.request.post(
      "http://localhost:3200/api/auth/sign-in/email",
      {
        data: {
          email: "supaporn.t@advisory.demo",
          password: "AdvisoryDemo!2026",
        },
        headers: { origin: "http://localhost:3001" },
      },
    );
    expect(login.status()).toBe(200);
    const denied = await stranger.request.get(
      `http://localhost:3200/api/v1/bookings/${booking.id}`,
    );
    expect(denied.status()).toBe(404);
    await stranger.close();
    await page.goto("/bookings/detail?bookingId=invalid");
    await expect(
      page.getByText("ไม่พบรหัสการจอง", { exact: true }),
    ).toBeVisible();
  } finally {
    sql(
      `DELETE FROM notifications WHERE resource_id='${fixtureId}'; DELETE FROM service_appointments WHERE id='${fixtureId}'`,
    );
  }
});
