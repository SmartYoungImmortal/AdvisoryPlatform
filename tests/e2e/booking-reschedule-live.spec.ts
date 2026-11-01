import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { z } from "zod";
import { expect, test, type APIRequestContext } from "./support/coverage";

// The real proof is conditional on named disposable services; ordinary CI does not provision them.
test.skip(
  process.env.BOOKING_LIVE_PROOF !== "1",
  "Requires the disposable proof API, database and storage",
);
test.use({
  video: { mode: "on", size: { width: 1440, height: 1000 } },
  trace: "retain-on-failure",
});
const api = "http://localhost:3200/api/v1";
const bookingSchema = z.object({
  id: z.uuid(),
  packageId: z.uuid().nullable(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  state: z.string(),
});
const policySchema = z.object({
  bufferMinutes: z.number(),
  bookingHorizonDays: z.number(),
  minimumBookingNoticeMinutes: z.number(),
  dailyConsultationLimitMinutes: z.number().nullable(),
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
async function login(request: APIRequestContext, email: string) {
  expect(
    (
      await request.post("http://localhost:3200/api/auth/sign-in/email", {
        data: { email, password: "AdvisoryDemo!2026" },
        headers: { origin: "http://localhost:3001" },
      })
    ).status(),
  ).toBe(200);
}

for (const width of [1440, 390]) {
  for (const mode of ["package", "daily-limit"]) {
    test(`reschedule preserves booked duration and handles ${mode} at ${width}px`, async ({
      page,
      context,
      playwright,
      browser,
    }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 1000 });
      const advisor = await playwright.request.newContext({ timeout: 15000 });
      await login(advisor, "kanya.p@advisory.demo");
      await login(context.request, "nattapong.d@advisory.demo");
      const source = z
        .object({
          data: z.object({
            items: z.array(z.object({ categoryId: z.uuid() })).min(1),
          }),
        })
        .parse(await (await advisor.get(`${api}/advisors/me/services`)).json())
        .data.items[0];
      const globalUrl = `${api}/advisors/me/availability/global`;
      const originalPolicy = policySchema.parse(
        (await (await advisor.get(globalUrl)).json()).data,
      );
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + 7);
      const day = date.toISOString().slice(0, 10);
      const at = (time: string) =>
        new Date(`${day}T${time}:00+07:00`).toISOString();
      let serviceId = "",
        profileId = "";
      const errors: string[] = [];
      const diagnostics: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") diagnostics.push(message.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          diagnostics.push(
            `${response.status()} ${new URL(response.url()).pathname}`,
          );
      });
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        expect(
          (
            await advisor.put(globalUrl, {
              data: {
                bufferMinutes: 0,
                minimumBookingNoticeMinutes: 0,
                bookingHorizonDays: 60,
                dailyConsultationLimitMinutes:
                  mode === "daily-limit" ? 60 : null,
              },
            })
          ).status(),
        ).toBe(200);
        const profile = await advisor.post(
          `${api}/advisors/me/availability/profiles`,
          {
            data: {
              name: `Reschedule proof ${width} ${mode}`,
              weeklyWindows: [],
              specificWindows: [
                { availableDate: day, startTime: "09:00", endTime: "10:00" },
                { availableDate: day, startTime: "11:00", endTime: "13:00" },
              ],
              blockedPeriods: [],
            },
          },
        );
        expect(profile.status()).toBe(201);
        profileId = z.uuid().parse((await profile.json()).data.id);
        const created = await advisor.post(`${api}/advisors/me/services`, {
          data: {
            name: `Reschedule proof ${width} ${mode}`,
            categoryId: source.categoryId,
            availabilityProfileId: profileId,
            priceSatang: 10000,
            durationMinutes: 30,
            dailyConsultationLimitMinutes: mode === "daily-limit" ? 60 : null,
            isPublished: false,
          },
        });
        expect(created.status()).toBe(201);
        serviceId = z.uuid().parse((await created.json()).data.id);
        expect(
          (
            await advisor.post(
              `${api}/advisors/me/services/${serviceId}/images`,
              {
                multipart: {
                  file: {
                    name: "proof.png",
                    mimeType: "image/png",
                    buffer: readFileSync("public/icon-512.png"),
                  },
                },
              },
            )
          ).status(),
        ).toBe(201);
        expect(
          (
            await advisor.patch(`${api}/advisors/me/services/${serviceId}`, {
              data: { isPublished: true },
            })
          ).status(),
        ).toBe(200);
        const packages = await advisor.put(
          `${api}/advisors/me/services/${serviceId}/packages`,
          {
            data: {
              packages: [
                {
                  name: "Booked one-hour session",
                  durationMinutes: 60,
                  priceSatang: 20000,
                },
              ],
            },
          },
        );
        expect(packages.status()).toBe(200);
        const packageId = z.uuid().parse((await packages.json()).data[0].id);
        const initial = await context.request.post(`${api}/bookings`, {
          data: { serviceId, packageId, startTime: at("11:00") },
        });
        expect(initial.status()).toBe(201);
        const original = bookingSchema.parse((await initial.json()).data);
        expect(
          (
            await advisor.put(
              `${api}/advisors/me/services/${serviceId}/packages`,
              {
                data: {
                  packages: [
                    {
                      id: packageId,
                      name: "Edited package",
                      durationMinutes: 30,
                      priceSatang: 20000,
                    },
                  ],
                },
              },
            )
          ).status(),
        ).toBe(200);
        if (width === 1440 && mode === "daily-limit") {
          const showSlots = async (
            docs: typeof page,
            expectedStatus: number,
            scenario: string,
          ) => {
            await docs.goto("http://localhost:3200/api/v1/docs", {
              waitUntil: "domcontentloaded",
            });
            const operation = docs.locator(".opblock-get").filter({
              hasText: "/api/v1/bookings/{bookingId}/reschedule-slots",
            });
            await operation.locator(".opblock-summary").click();
            await operation
              .getByRole("button", { name: "Try it out", exact: true })
              .click();
            await operation
              .locator('input[placeholder="bookingId"]')
              .fill(original.id);
            await operation.locator('input[placeholder="from"]').fill(day);
            await operation.locator('input[placeholder="to"]').fill(day);
            const response = docs.waitForResponse(
              (response) =>
                response
                  .url()
                  .includes(`/bookings/${original.id}/reschedule-slots?`) &&
                response.request().method() === "GET",
            );
            await operation
              .getByRole("button", { name: "Execute", exact: true })
              .click();
            expect((await response).status()).toBe(expectedStatus);
            await expect(
              operation.locator(".live-responses-table"),
            ).toContainText(String(expectedStatus));
            await operation
              .locator(".live-responses-table")
              .scrollIntoViewIfNeeded();
            await docs.screenshot({
              path: `test-results/reschedule-swagger-${scenario}.png`,
            });
            await docs.waitForTimeout(1800);
          };
          const docs = await context.newPage();
          await showSlots(docs, 200, "owner");
          await docs.close();
          const anonymous = await browser.newContext({
            recordVideo: {
              dir: testInfo.outputPath("swagger-anonymous"),
              size: { width: 1440, height: 1000 },
            },
            viewport: { width: 1440, height: 1000 },
          });
          try {
            await showSlots(await anonymous.newPage(), 401, "anonymous");
          } finally {
            await anonymous.close();
          }
        }
        await page.goto(`/bookings/detail?bookingId=${original.id}`, {
          waitUntil: "domcontentloaded",
        });
        await page
          .getByRole("button", { name: "เปลี่ยนเวลานัด", exact: true })
          .click();
        // A 09:30 start fits the default 30 minutes but not this booked 60-minute session.
        const target = page.getByRole("button", { name: /09:00/ });
        await expect(target).toBeVisible();
        await expect(page.getByRole("button", { name: /09:30/ })).toHaveCount(
          0,
        );
        await page.screenshot({
          path: `test-results/reschedule-${mode}-${width}.png`,
        });
        await page.waitForTimeout(1400);
        await target.click();
        if (mode === "package") {
          // A real second request takes the selected time before this browser submits.
          const competitor = await context.request.post(`${api}/bookings`, {
            data: { serviceId, packageId, startTime: at("09:00") },
          });
          expect(competitor.status()).toBe(201);
          const rejected = page.waitForResponse(
            (response) =>
              response.url().endsWith(`/bookings/${original.id}/reschedule`) &&
              response.request().method() === "POST",
          );
          await page
            .getByRole("button", { name: "ยืนยันเวลาใหม่", exact: true })
            .click();
          expect([400, 409]).toContain((await rejected).status());
          await expect(
            page.getByRole("alert").filter({ hasText: /\S/ }),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "ยืนยันเวลาใหม่", exact: true }),
          ).toBeDisabled();
          await expect(target).toHaveCount(0);
          await page.screenshot({
            path: `test-results/reschedule-conflict-${width}.png`,
          });
          await page.waitForTimeout(1400);
          await page.getByRole("button", { name: /12:00/ }).click();
        }
        const moved = page.waitForResponse(
          (response) =>
            response.url().endsWith(`/bookings/${original.id}/reschedule`) &&
            response.request().method() === "POST",
        );
        await page
          .getByRole("button", { name: "ยืนยันเวลาใหม่", exact: true })
          .click();
        const response = await moved;
        expect(response.status()).toBe(200);
        const replacement = bookingSchema.parse((await response.json()).data);
        expect(replacement.id).not.toBe(original.id);
        expect(replacement.packageId).toBe(packageId);
        expect(
          new Date(replacement.endTime).getTime() -
            new Date(replacement.startTime).getTime(),
        ).toBe(60 * 60000);
        expect(replacement.startTime).toBe(
          at(mode === "package" ? "12:00" : "09:00"),
        );
        await expect(page).toHaveURL(
          new RegExp(`/bookings/detail\\?bookingId=${replacement.id}`),
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(
          page.getByRole("button", { name: "เปลี่ยนเวลานัด", exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: `test-results/reschedule-result-${mode}-${width}.png`,
        });
        await page.waitForTimeout(1800);
        const old = bookingSchema.parse(
          (
            await (
              await context.request.get(`${api}/bookings/${original.id}`)
            ).json()
          ).data,
        );
        expect(old.state).toBe("CANCELLED");
        const saved = bookingSchema.parse(
          (
            await (
              await context.request.get(`${api}/bookings/${replacement.id}`)
            ).json()
          ).data,
        );
        expect(saved).toEqual(replacement);
        expect(errors).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      } finally {
        if (serviceId) {
          sql(
            `BEGIN; CREATE TEMP TABLE proof_rooms ON COMMIT DROP AS SELECT DISTINCT chat_room_id AS id FROM service_appointments WHERE service_id='${serviceId}' AND chat_room_id IS NOT NULL; DELETE FROM service_appointments WHERE service_id='${serviceId}'; DELETE FROM chat_members WHERE chat_room_id IN (SELECT id FROM proof_rooms); DELETE FROM chat_rooms WHERE id IN (SELECT id FROM proof_rooms); COMMIT;`,
          );
          expect(
            (
              await advisor.delete(`${api}/advisors/me/services/${serviceId}`)
            ).status(),
          ).toBe(200);
        }
        if (profileId)
          expect(
            (
              await advisor.delete(
                `${api}/advisors/me/availability/profiles/${profileId}`,
              )
            ).status(),
          ).toBe(200);
        expect(
          (await advisor.put(globalUrl, { data: originalPolicy })).status(),
        ).toBe(200);
        await advisor.dispose();
        writeFileSync(
          `test-results/reschedule-diagnostics-${mode}-${width}.json`,
          JSON.stringify(diagnostics, null, 2),
        );
      }
    });
  }
}
