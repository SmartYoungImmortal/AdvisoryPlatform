import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.skip(process.env.BOOKING_LIVE_PROOF !== "1", "Requires the isolated seeded proof API and database");
test.use({ video: "on" });

// This fixture touches only our named disposable container. It creates a pending
// invoice, never a provider payment, and removes every inserted row afterward.
function sql(statement: string): string {
  return execFileSync("docker", ["exec", "advisory-booking-proof-db", "psql", "-U", "advisory", "-d", "advisory_proof", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" }).trim();
}

test("both sessions open the exact shared receipt on desktop and phone", async ({ page, context, browser }) => {
  test.setTimeout(120_000);
  const invoiceId = randomUUID();
  const bookings = [randomUUID(), randomUUID()];
  try {
    sql(`BEGIN;
      INSERT INTO service_invoices (id, amount_satang, platform_fee_satang, created_at)
      VALUES ('${invoiceId}', 10000, 1000, '2000-01-01');
      INSERT INTO service_appointments (id, service_id, advisor_id, advisee_id, start_time, end_time, unavailable_until, state, blocks_availability)
      SELECT v.id::uuid, a.service_id, a.advisor_id, a.advisee_id, v.start::timestamptz,
        v.start::timestamptz + interval '1 hour', v.start::timestamptz + interval '1 hour', 'COMPLETED', false
      FROM (SELECT a.* FROM service_appointments a JOIN "user" u ON u.id=a.advisee_id
        WHERE u.email='nattapong.d@advisory.demo' LIMIT 1) a
      CROSS JOIN (VALUES ('${bookings[0]}', '2025-01-01 07:00Z'), ('${bookings[1]}', '2025-01-02 07:00Z')) v(id,start);
      INSERT INTO service_appointments_on_service_invoices ("serviceAppointmentId", "serviceInvoiceId")
      VALUES ('${bookings[0]}','${invoiceId}'), ('${bookings[1]}','${invoiceId}');
      COMMIT;`);
    const login = await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
      data: { email: "nattapong.d@advisory.demo", password: "AdvisoryDemo!2026" },
      headers: { origin: "http://localhost:3001" },
    });
    expect(login.status()).toBe(200);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const bookingId of bookings) {
        const lookup = page.waitForResponse((r) => r.url().endsWith(`/payment/invoices/for-booking/${bookingId}`));
        await page.goto(`/bookings/detail?bookingId=${bookingId}`);
        const response = await lookup;
        expect(response.status()).toBe(200);
        expect((await response.json()).data.id).toBe(invoiceId);
        const receipt = page.getByRole("link", { name: "ดูใบเสร็จ", exact: true });
        await expect(receipt).toHaveAttribute("href", `/transactions/detail?id=${invoiceId}`);
        await receipt.click();
        await expect(page).toHaveURL(new RegExp(`id=${invoiceId}`));
        await expect(page.getByText(/INV-\d{4}-\d+/).filter({ visible: true }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      await page.screenshot({ path: `test-results/booking-invoice-${width}.png`, fullPage: true });
    }
    const stranger = await browser.newContext();
    try {
      expect((await stranger.request.post("http://localhost:3200/api/auth/sign-in/email", {
        data: { email: "supaporn.t@advisory.demo", password: "AdvisoryDemo!2026" },
        headers: { origin: "http://localhost:3001" },
      })).status()).toBe(200);
      expect((await stranger.request.get(`http://localhost:3200/api/v1/payment/invoices/for-booking/${bookings[1]}`)).status()).toBe(404);
      expect((await context.request.get("http://localhost:3200/api/v1/payment/invoices/for-booking/invalid")).status()).toBe(400);
    } finally { await stranger.close(); }
  } finally {
    sql(`BEGIN;
      DELETE FROM service_appointments_on_service_invoices WHERE "serviceInvoiceId"='${invoiceId}';
      DELETE FROM service_appointments WHERE id IN ('${bookings[0]}','${bookings[1]}');
      DELETE FROM service_invoices WHERE id='${invoiceId}'; COMMIT;`);
  }
});
