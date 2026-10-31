import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { z } from "zod";

const cleanupScript = process.env.REFUND_EVIDENCE_CLEANUP_SCRIPT;
test.skip(
  process.env.BOOKING_LIVE_PROOF !== "1" || !cleanupScript,
  "Requires the disposable proof services and REFUND_EVIDENCE_CLEANUP_SCRIPT",
);
test.use({ video: "on" });
const api = "http://localhost:3200/api/v1";
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
const auth = (email: string) => ({
  data: { email, password: "AdvisoryDemo!2026" },
  headers: { origin: "http://localhost:3001" },
});

for (const width of [1440, 390]) {
  test(`cancellation, refund evidence and ${width === 1440 ? "approval" : "rejection"} persist at ${width}px`, async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(120_000);
    const bookingId = randomUUID();
    const invoiceId = randomUUID();
    let caseId = "";
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      // Synthetic paid invoice/booking only in the named disposable proof database.
      // No payment-provider charge is performed or claimed by this test.
      sql(`BEGIN;
        INSERT INTO service_invoices (id, amount_satang, platform_fee_satang, status, paid_at)
          VALUES ('${invoiceId}',120000,20000,'HELD_IN_ESCROW',now());
        INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability)
          SELECT '${bookingId}',a.service_id,a.advisor_id,a.advisee_id,now()+interval '8 days',now()+interval '8 days 1 hour',now()+interval '8 days 1 hour','BOOKED',false
          FROM service_appointments a JOIN "user" u ON u.id=a.advisee_id WHERE u.email='nattapong.d@advisory.demo' LIMIT 1;
        INSERT INTO service_appointments_on_service_invoices ("serviceAppointmentId","serviceInvoiceId") VALUES ('${bookingId}','${invoiceId}'); COMMIT;`);
      expect(
        (
          await context.request.post(
            "http://localhost:3200/api/auth/sign-in/email",
            auth("nattapong.d@advisory.demo"),
          )
        ).status(),
      ).toBe(200);
      await page.goto(`/bookings/detail?bookingId=${bookingId}`);
      await page
        .getByRole("link", { name: "คำขอคืนเงิน / สถานะ", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "ขอยกเลิกและคืนเงิน", exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("รายละเอียด", { exact: true })
        .fill(
          "Disposable proof: consultation not delivered. Review this evidence.",
        );
      await page
        .getByLabel("หลักฐานที่แนบมา", { exact: true })
        .setInputFiles("public/icon-512.png");
      await expect(
        page.getByRole("button", { name: "ส่งคำขอคืนเงิน", exact: true }),
      ).toBeEnabled();
      await page.screenshot({
        path: `test-results/refund-request-${width}.png`,
        fullPage: true,
      });
      const opened = page.waitForResponse(
        (r) => r.url() === `${api}/refunds` && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "ส่งคำขอคืนเงิน", exact: true })
        .click();
      const response = await opened;
      expect(response.status()).toBe(201);
      caseId = z
        .object({ data: z.object({ id: z.uuid() }) })
        .parse(await response.json()).data.id;
      await expect(
        page.getByRole("heading", {
          name: "คำขอคืนเงินอยู่ระหว่างตรวจสอบ",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "icon-512.png", exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("heading", {
          name: "คำขอคืนเงินอยู่ระหว่างตรวจสอบ",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "icon-512.png", exact: true }),
      ).toBeVisible();
      expect(
        (
          await (
            await context.request.get(`${api}/bookings/${bookingId}`)
          ).json()
        ).data.state,
      ).toBe("CANCELLED");
      const files = z
        .object({ data: z.array(z.object({ objectKey: z.string() })).min(1) })
        .parse(
          await (
            await context.request.get(`${api}/refunds/${caseId}/evidence`)
          ).json(),
        ).data;
      const signed = z
        .object({ data: z.object({ url: z.url() }) })
        .parse(
          await (
            await context.request.get(`${api}/refunds/${caseId}/evidence-url`, {
              params: { objectKey: files[0].objectKey },
            })
          ).json(),
        ).data.url;
      const bytes = await context.request.get(signed);
      expect(bytes.status()).toBe(200);
      expect(await bytes.body()).toEqual(readFileSync("public/icon-512.png"));
      expect((await context.request.get(signed.split("?")[0])).status()).toBe(
        403,
      );
      if (width === 1440) {
        const docs = await context.newPage();
        await docs.goto("http://localhost:3200/api/v1/docs");
        const operation = docs
          .locator(".opblock-get")
          .filter({ hasText: "/api/v1/refunds/{refundCaseId}/evidence" })
          .filter({ hasNotText: "evidence-url" });
        await operation.locator(".opblock-summary").click();
        await operation
          .getByRole("button", { name: "Try it out", exact: true })
          .click();
        for (const [id, status] of [
          [caseId, 200],
          [randomUUID(), 404],
        ] as const) {
          await operation.locator('input[placeholder="refundCaseId"]').fill(id);
          const result = docs.waitForResponse(
            (r) => r.url() === `${api}/refunds/${id}/evidence`,
          );
          await operation
            .getByRole("button", { name: "Execute", exact: true })
            .click();
          expect((await result).status()).toBe(status);
          const responses = operation.locator(".live-responses-table");
          await expect(responses).toContainText(String(status));
          await responses.scrollIntoViewIfNeeded();
          await docs.screenshot({
            path: `test-results/refund-swagger-${status}.png`,
          });
        }
        await docs.close();
      }
      const admin = await browser.newContext();
      try {
        expect(
          (
            await admin.request.post(
              "http://localhost:3200/api/auth/sign-in/email",
              auth("admin@advisory.demo"),
            )
          ).status(),
        ).toBe(200);
        const review = await admin.newPage();
        await review.goto(`/admin/refunds/review?id=${caseId}`);
        await expect(
          review.getByRole("link", { name: "icon-512.png", exact: true }),
        ).toBeVisible();
        await review.screenshot({
          path: `test-results/refund-admin-evidence-${width}.png`,
          fullPage: true,
        });
        const action = width === 1440 ? "approve" : "reject";
        expect(
          (
            await admin.request.post(
              `${api}/admin/refunds/${caseId}/${action}`,
              {
                data:
                  action === "reject"
                    ? { reason: "Disposable proof rejection" }
                    : undefined,
              },
            )
          ).status(),
        ).toBe(200);
      } finally {
        await admin.close();
      }
      await page
        .getByRole("button", { name: "รีเฟรชสถานะคำขอ", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name:
            width === 1440
              ? "คำขอคืนเงินได้รับอนุมัติ"
              : "คำขอคืนเงินถูกปฏิเสธ",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "นี่คือสถานะคำขอ การอนุมัติไม่ได้ยืนยันว่าโอนเงินคืนแล้ว ตรวจสอบผลการชำระเงินได้ที่ใบเสร็จ",
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        (
          await (
            await context.request.get(`${api}/payment/invoices/${invoiceId}`)
          ).json()
        ).data.status,
      ).toBe("paid");
      await page.screenshot({
        path: `test-results/refund-status-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      // Object cleanup is kept outside Git and uses only local SeaweedFS credentials.
      try {
        if (caseId && cleanupScript)
          execFileSync("node", [cleanupScript, caseId]);
      } finally {
        sql(`BEGIN; DELETE FROM refund_case_evidence WHERE refund_case_id IN (SELECT id FROM refund_cases WHERE invoice_id='${invoiceId}');
        DELETE FROM refund_cases WHERE invoice_id='${invoiceId}'; DELETE FROM notifications WHERE resource_id='${bookingId}';
        DELETE FROM service_appointments_on_service_invoices WHERE "serviceInvoiceId"='${invoiceId}';
        DELETE FROM service_appointments WHERE id='${bookingId}'; DELETE FROM service_invoices WHERE id='${invoiceId}'; COMMIT;`);
      }
    }
  });
}
