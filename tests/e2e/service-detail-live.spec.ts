import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { expect, test } from "./support/coverage";
import { bookingDay } from "@/lib/work/booking-calendar";

test.skip(
  process.env.BOOKING_LIVE_PROOF !== "1",
  "Requires the disposable local proof services",
);
test.use({ video: "on", trace: "retain-on-failure" });
const api = "http://localhost:3200/api/v1";
const row = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  advisorId: z.uuid(),
});
const slotRows = z.object({
  data: z.array(
    z.object({ startTime: z.iso.datetime(), endTime: z.iso.datetime() }),
  ),
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
for (const width of [1440, 390]) {
  test(`service detail and calendar use saved owner data at ${width}px`, async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    expect(
      (
        await context.request.post(
          "http://localhost:3200/api/auth/sign-in/email",
          {
            data: {
              email: "kanya.p@advisory.demo",
              password: "AdvisoryDemo!2026",
            },
            headers: { origin: "http://localhost:3001" },
          },
        )
      ).status(),
    ).toBe(200);
    const source = row.parse(
      (await (await context.request.get(`${api}/advisors/me/services`)).json())
        .data.items[0],
    );
    const owner = z.object({ data: z.object({ timezone: z.string() }) }).parse(await (await context.request.get(`${api}/users/me`)).json()).data;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 2);
    const day = bookingDay(date.getTime(), owner.timezone);
    const blocked = new Date(`${day}T12:00:00Z`);
    blocked.setUTCDate(blocked.getUTCDate() + 1);
    const blockedDay = blocked.toISOString().slice(0, 10);
    let serviceId = "",
      profileId = "";
    const bookingId = randomUUID();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const profile = await context.request.post(
        `${api}/advisors/me/availability/profiles`,
        {
          data: {
            name: `Detail profile ${width}`,
            weeklyWindows: [],
            specificWindows: [
              { availableDate: day, startTime: "09:00", endTime: "12:00" },
              {
                availableDate: blockedDay,
                startTime: "09:00",
                endTime: "12:00",
              },
            ],
            blockedPeriods: [{ blockedDate: blockedDay }],
          },
        },
      );
      expect(profile.status()).toBe(201);
      profileId = z.uuid().parse((await profile.json()).data.id);
      const created = await context.request.post(
        `${api}/advisors/me/services`,
        {
          data: {
            name: `Owned detail proof ${width}`,
            description: "Persisted service detail",
            categoryId: source.categoryId,
            availabilityProfileId: profileId,
            priceSatang: 45600,
            durationMinutes: 30,
            dailyConsultationLimitMinutes: 90,
            screeningRequired: true,
            isPublished: false,
          },
        },
      );
      expect(created.status()).toBe(201);
      serviceId = row.parse((await created.json()).data).id;
      await page.goto(`/advisor/services/view?serviceId=${serviceId}`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(`Owned detail proof ${width}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "เผยแพร่บริการเพื่อดูช่วงเวลาที่จองได้ การตั้งค่าเวลาว่างที่บันทึกไว้ยังแสดงอยู่",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.locator(`a[href="/availability/profiles/edit?id=${profileId}"]`),
      ).toBeVisible();
      const uploaded = await context.request.post(
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
      );
      expect(uploaded.status()).toBe(201);
      expect(
        (
          await context.request.patch(
            `${api}/advisors/me/services/${serviceId}`,
            { data: { isPublished: true } },
          )
        ).status(),
      ).toBe(200);
      const adviseeId = z
        .uuid()
        .parse(
          sql(
            "SELECT id FROM public.user WHERE email='nattapong.d@advisory.demo'",
          ),
        );
      sql(
        `INSERT INTO service_appointments (id,service_id,advisor_id,advisee_id,start_time,end_time,unavailable_until,state,blocks_availability) SELECT '${bookingId}','${serviceId}','${source.advisorId}','${adviseeId}',at,at+interval '30 minutes',at+interval '30 minutes','BOOKED',true FROM (SELECT '${day} 09:00'::timestamp AT TIME ZONE '${owner.timezone}' AS at) times`,
      );
      const slotsResponse = await context.request.get(
        `${api}/services/${serviceId}/slots?from=${day}&to=${day}`,
      );
      expect(
        slotsResponse.status(),
        "An owner can inspect screened service slots without screening themselves",
      ).toBe(200);
      const expectedSlots = slotRows.parse(await slotsResponse.json()).data;
      expect(expectedSlots.length).toBeGreaterThan(0);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.locator(`a[href="/work/session?id=${bookingId}"]`),
      ).toBeVisible();
      await expect(
        page.getByRole("img", {
          name: `Owned detail proof ${width}`,
          exact: true,
        }),
      ).toBeVisible();
      await page.goto("/advisor/services", { waitUntil: "domcontentloaded" });
      await page.locator(`a[href="/advisor/services/view?serviceId=${serviceId}"]`).click();
      await expect(page.getByText(`Owned detail proof ${width}`, { exact: true })).toBeVisible();
      await page.locator(`a[href="/availability/profiles/edit?id=${profileId}"]`).click();
      await expect(page.locator('input[name="name"]')).toHaveValue(`Detail profile ${width}`);
      await page.locator('input[name="name"]').fill(`Updated detail profile ${width}`);
      await page.getByRole("button", { name: "บันทึกชุดเวลา", exact: true }).filter({ visible: true }).click();
      await expect(page.getByText("บันทึกชุดเวลาว่างแล้ว", { exact: true })).toBeVisible();
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect(page.getByText(`Updated detail profile ${width}`, { exact: true })).toBeVisible();
      const nextSlot = new Intl.DateTimeFormat("th", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: owner.timezone,
      }).format(new Date(expectedSlots[0].startTime));
      await expect(page.getByText(nextSlot, { exact: true })).toBeVisible();
      await page.screenshot({
        path: `test-results/service-detail-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("link", { name: "ดูตารางเวลา", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/advisor/services/schedule\\?serviceId=${serviceId}`),
      );
      const targetMonth = day.slice(0, 7);
      if (!bookingDay(Date.now(), owner.timezone).startsWith(targetMonth))
        await page
          .getByRole("button", { name: "เดือนถัดไป", exact: true })
          .click();
      await page.getByRole("button", { name: day, exact: true }).click();
      await expect(
        page.getByText(`จองได้ ${expectedSlots.length} ช่วง`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(`a[href="/work/session?id=${bookingId}"]`),
      ).toBeVisible();
      await page.screenshot({
        path: `test-results/service-schedule-${width}.png`,
        fullPage: true,
      });
      await page.getByText("แสดงกฎที่บันทึกไว้ ช่วงเวลาว่างมาจากระบบจัดตาราง ยังไม่มีข้อมูลสาเหตุของทุกช่วงที่จองไม่ได้หรือจำนวนช่วงเวลาทั้งหมด", { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/service-schedule-rules-${width}.png` });
      const clock = new Intl.DateTimeFormat("th", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: owner.timezone,
      });
      for (const slot of expectedSlots)
        await expect(
          page.getByText(
            `${clock.format(new Date(slot.startTime))}–${clock.format(new Date(slot.endTime))}`,
            { exact: true },
          ),
        ).toBeVisible();
      if (!blockedDay.startsWith(targetMonth))
        await page
          .getByRole("button", { name: "เดือนถัดไป", exact: true })
          .click();
      await page.getByRole("button", { name: blockedDay, exact: true }).click();
      await expect(
        page.getByText("จองได้ 0 ช่วง", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("ทั้งวัน", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "เดือนก่อนหน้า", exact: true })
        .click();
      await page
        .getByRole("button", { name: "เดือนถัดไป", exact: true })
        .click();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "ตารางเวลาของบริการ", exact: true }),
      ).toBeVisible();
      await page.goto(`/advisor/services/view?serviceId=${serviceId}`, { waitUntil: "domcontentloaded" });
      await page.locator(`a[href="/work/session?id=${bookingId}"]`).click();
      await expect(page).toHaveURL(
        new RegExp(`/work/session\\?id=${bookingId}`),
      );
      await expect(
        page.getByText(`Owned detail proof ${width} · 30 นาที`, {
          exact: true,
        }),
      ).toBeVisible();
      if (width === 1440) {
        const docs = await context.newPage();
        await docs.goto("http://localhost:3200/api/v1/docs", { waitUntil: "domcontentloaded" });
        const operation = docs.locator(".opblock-get").filter({ hasText: "/api/v1/services/{serviceId}/slots" });
        await operation.locator(".opblock-summary").click();
        await operation.getByRole("button", { name: "Try it out", exact: true }).click();
        await operation.locator('input[placeholder="serviceId"]').fill(serviceId);
        await operation.locator('input[placeholder="from"]').fill(day);
        await operation.locator('input[placeholder="to"]').fill(day);
        const response = docs.waitForResponse((response) => response.url().includes(`/services/${serviceId}/slots?`) && response.request().method() === "GET");
        await operation.getByRole("button", { name: "Execute", exact: true }).click();
        expect((await response).status()).toBe(200);
        await expect(operation.locator(".live-responses-table")).toContainText(expectedSlots[0].startTime);
        await operation.locator(".live-responses-table").scrollIntoViewIfNeeded();
        await docs.screenshot({ path: "test-results/service-slots-swagger.png" });
        await docs.close();
      }
      const other = await browser.newContext();
      try {
        expect(
          (
            await other.request.post(
              "http://localhost:3200/api/auth/sign-in/email",
              {
                data: {
                  email: "nattapong.d@advisory.demo",
                  password: "AdvisoryDemo!2026",
                },
              },
            )
          ).status(),
        ).toBe(200);
        expect(
          (
            await other.request.get(`${api}/advisors/me/services/${serviceId}`)
          ).status(),
        ).toBe(403);
        expect(
          (
            await other.request.get(
              `${api}/services/${serviceId}/slots?from=${day}&to=${day}`,
            )
          ).status(),
        ).toBe(400);
      } finally {
        await other.close();
      }
      await page.route(
        `**/api/v1/advisors/me/services/${serviceId}`,
        (route) => route.abort("failed"),
      );
      await page.goto(`/advisor/services/view?serviceId=${serviceId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("button", { name: "ลองอีกครั้ง", exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/service-detail-retry-${width}.png` });
      await page.unroute(`**/api/v1/advisors/me/services/${serviceId}`);
      await page
        .getByRole("button", { name: "ลองอีกครั้ง", exact: true })
        .click();
      await expect(
        page.getByText(`Owned detail proof ${width}`, { exact: true }),
      ).toBeVisible();
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      sql(`DELETE FROM service_appointments WHERE id='${bookingId}'`);
      if (serviceId)
        expect(
          (
            await context.request.delete(
              `${api}/advisors/me/services/${serviceId}`, { timeout: 10000 },
            )
          ).status(),
        ).toBe(200);
      if (profileId)
        expect(
          (
            await context.request.delete(
              `${api}/advisors/me/availability/profiles/${profileId}`, { timeout: 10000 },
            )
          ).status(),
        ).toBe(200);
    }
  });
}
