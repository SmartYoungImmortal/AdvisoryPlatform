import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires the named disposable local proof database and API");
test.use({ video: "on" });
const api = "http://localhost:3200";
const password = "Disposable-Account-Guards-2026!";
function sql(statement: string) {
  return execFileSync("docker", ["exec", "advisory-booking-proof-db", "psql", "-U", "advisory", "-d", "advisory_proof", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" }).trim();
}

for (const width of [1440, 390]) {
  test(`five failed logins lock across clients and recover after expiry at ${width}px`, async ({ page, context, request }) => {
    await page.setViewportSize({ width, height: 1000 });
    const email = `lock-${randomUUID()}@example.test`;
    const key = `login-lock:${createHash("sha256").update(email).digest("hex")}`;
    const signup = await request.post(`${api}/api/auth/sign-up/email`, { data: { email, password, name: "Lock proof", fullName: "Lock proof", timezone: "Asia/Bangkok" } });
    expect(signup.status()).toBe(200);
    const id = z.object({ user: z.object({ id: z.uuid() }) }).parse(await signup.json()).user.id;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto("/login?next=%2Fprofile");
      await page.locator("#login-email").fill(email);
      await page.locator('button[type="submit"]').click();
      await page.locator("#login-password").fill("Wrong-password-2026!");
      for (let i = 0; i < 5; i++) {
        const response = page.waitForResponse(r => r.url().endsWith("/api/auth/sign-in/email"));
        await page.locator('button[type="submit"]').click();
        expect((await response).status()).toBe(i === 4 ? 429 : 401);
      }
      await expect(page.getByText("ลองลงชื่อเข้าใช้หลายครั้งเกินไป", { exact: true })).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await page.locator("#login-password").fill(password);
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      expect((await request.post(`${api}/api/auth/sign-in/email`, { data: { email, password }, headers: { origin: "http://localhost:3001" } })).status()).toBe(429);
      expect(sql(`SELECT count(*) FROM session WHERE user_id='${id}'`)).toBe("1"); // Signup only; failed logins created no sessions.
      await page.screenshot({ path: `test-results/login-locked-${width}.png`, fullPage: true });
      // Move only this disposable record past expiry, rather than waiting 15 minutes.
      sql(`UPDATE verification SET expires_at=now()-interval '1 second' WHERE identifier='${key}'`);
      await page.reload();
      await page.locator("#login-email").fill(email);
      await page.locator('button[type="submit"]').click();
      await page.locator("#login-password").fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/profile$/);
      expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(200);
      expect(errors).toEqual([]);
    } finally {
      sql(`DELETE FROM verification WHERE identifier='${key}' OR value='${id}'; DELETE FROM notifications WHERE owner_id='${id}'; DELETE FROM session WHERE user_id='${id}'; DELETE FROM account WHERE user_id='${id}'; DELETE FROM pdpa_consents WHERE user_id='${id}'; DELETE FROM "user" WHERE id='${id}'`);
    }
  });

  test(`unsettled earnings block deletion until a paid payout at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    const email = `earnings-${randomUUID()}@example.test`;
    const invoiceId = randomUUID(), bookingId = randomUUID(), serviceId = randomUUID(), payoutId = randomUUID();
    const signup = await context.request.post(`${api}/api/auth/sign-up/email`, { data: { email, password, name: "Earnings proof", fullName: "Earnings proof", timezone: "Asia/Bangkok" } });
    expect(signup.status()).toBe(200);
    const id = z.object({ user: z.object({ id: z.uuid() }) }).parse(await signup.json()).user.id;
    try {
      // Synthetic financial records in the disposable proof DB; no provider charge or transfer.
      sql(`BEGIN; INSERT INTO advisor_profiles (user_id,headline) VALUES ('${id}','Earnings proof');
        INSERT INTO services (id,advisor_id,category_id,name,price_satang,duration_minutes) SELECT '${serviceId}','${id}',id,'Earnings proof',10000,30 FROM service_categories LIMIT 1;
        INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability)
          SELECT '${bookingId}','${serviceId}','${id}',id,now()-interval '2 hours',now()-interval '1 hour',now()-interval '1 hour','COMPLETED',false FROM "user" WHERE email='nattapong.d@advisory.demo';
        INSERT INTO service_invoices (id,amount_satang,platform_fee_satang,status) VALUES ('${invoiceId}',10000,1000,'RELEASED');
        INSERT INTO service_appointments_on_service_invoices ("serviceAppointmentId","serviceInvoiceId") VALUES ('${bookingId}','${invoiceId}'); COMMIT;`);
      await page.goto("/settings");
      await page.getByRole("button", { name: "ลบ", exact: true }).click();
      await page.locator("#delete-confirm").fill("DELETE");
      const denied = page.waitForResponse(r => r.url().endsWith("/api/v1/users/me") && r.request().method() === "DELETE");
      await page.locator('button[type="submit"]').click();
      expect((await denied).status()).toBe(409);
      await expect(page.getByText("รายได้ที่ยังไม่ได้รับ", { exact: true })).toBeVisible();
      expect(sql(`SELECT status FROM "user" WHERE id='${id}'`)).toBe("ACTIVE");
      await page.screenshot({ path: `test-results/deletion-unsettled-${width}.png`, fullPage: true });
      if (width === 1440) {
        const docs = await context.newPage();
        await docs.goto(`${api}/api/v1/docs`);
        const operation = docs.locator(".opblock-get").filter({ hasText: "/api/v1/users/me/deletion-blockers" });
        await operation.locator(".opblock-summary").click();
        await operation.getByRole("button", { name: "Try it out", exact: true }).click();
        const response = docs.waitForResponse(r => r.url().endsWith("/api/v1/users/me/deletion-blockers"));
        await operation.getByRole("button", { name: "Execute", exact: true }).click();
        expect((await response).status()).toBe(200);
        const result = operation.locator(".live-responses-table");
        await expect(result).toContainText('"hasUnsettledEarnings": true');
        await result.scrollIntoViewIfNeeded();
        await docs.screenshot({ path: "test-results/deletion-blockers-swagger.png" });
        await docs.close();
      }
      sql(`INSERT INTO payouts (id,advisor_id,amount_satang,status,paid_at) VALUES ('${payoutId}','${id}',9000,'PAID',now()); INSERT INTO payout_invoices (payout_id,invoice_id) VALUES ('${payoutId}','${invoiceId}')`);
      await page.reload();
      await page.getByRole("button", { name: "ลบ", exact: true }).click();
      await page.locator("#delete-confirm").fill("DELETE");
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/login$/);
      expect(sql(`SELECT status FROM "user" WHERE id='${id}'`)).toBe("DELETED");
      expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(401);
    } finally {
      sql(`DELETE FROM payout_invoices WHERE payout_id='${payoutId}'; DELETE FROM payouts WHERE id='${payoutId}'; DELETE FROM service_appointments_on_service_invoices WHERE "serviceInvoiceId"='${invoiceId}'; DELETE FROM service_invoices WHERE id='${invoiceId}'; DELETE FROM service_appointments WHERE id='${bookingId}'; DELETE FROM services WHERE id='${serviceId}'; DELETE FROM advisor_profiles WHERE user_id='${id}'; DELETE FROM notifications WHERE owner_id='${id}'; DELETE FROM session WHERE user_id='${id}'; DELETE FROM account WHERE user_id='${id}'; DELETE FROM verification WHERE value='${id}'; DELETE FROM pdpa_consents WHERE user_id='${id}'; DELETE FROM "user" WHERE id='${id}'`);
    }
  });
}
