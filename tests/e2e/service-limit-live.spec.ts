import { expect, test } from "@playwright/test";
import { z } from "zod";

test.skip(process.env.BOOKING_LIVE_PROOF !== "1", "Requires the isolated seeded proof API on localhost:3200");
test.use({ video: "on" });
const api = "http://localhost:3200/api/v1/advisors/me/services";
const serviceSchema = z.object({ id: z.uuid(), categoryId: z.uuid(), availabilityProfileId: z.uuid() });
const globalSchema = z.object({ bookingHorizonDays: z.number(), bufferMinutes: z.number(), minimumBookingNoticeMinutes: z.number(), dailyConsultationLimitMinutes: z.number().nullable() });

for (const width of [1440, 390]) {
  test(`service draft, publish, hide and delete persist at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    expect((await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
      data: { email: "kanya.p@advisory.demo", password: "AdvisoryDemo!2026" },
      headers: { origin: "http://localhost:3001" },
    })).status()).toBe(200);
    let id = "";
    let deleted = false;
    try {
      await page.goto("/advisor/services/new");
      await page.getByRole("textbox", { name: "ชื่อบริการ", exact: true }).fill(`Service lifecycle proof ${width}`);
      await page.locator('input[name="price"]').fill("450");
      await page.locator('input[name="duration"]').fill("30");
      for (const select of ["#service-category", "#service-profile"]) {
        await page.locator(select).click();
        await page.getByRole("option").first().click();
      }
      const created = page.waitForResponse((response) => response.url() === api && response.request().method() === "POST");
      await page.getByRole("button", { name: "บันทึกร่าง", exact: true }).filter({ visible: true }).click();
      const response = await created;
      expect(response.status()).toBe(201);
      id = z.object({ data: serviceSchema }).parse(await response.json()).data.id;
      await expect(page).toHaveURL(new RegExp(`/advisor/services/view\\?serviceId=${id}`));
      const readPublished = async () => z.object({ data: z.object({ isPublished: z.boolean() }) }).parse(await (await context.request.get(`${api}/${id}`)).json()).data.isPublished;
      expect(await readPublished()).toBe(false);
      await page.goto(`/advisor/services/manage?serviceId=${id}`);
      const published = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "เผยแพร่บริการ", exact: true }).click();
      expect((await published).status()).toBe(200);
      expect(await readPublished()).toBe(true);
      await page.reload();
      const hidden = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "ซ่อนบริการนี้", exact: true }).click();
      expect((await hidden).status()).toBe(200);
      expect(await readPublished()).toBe(false);
      await page.reload();
      await expect(page.getByRole("button", { name: "เผยแพร่บริการ", exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/service-lifecycle-${width}.png`, fullPage: true });
      await page.getByRole("link", { name: /ลบบริการนี้/ }).click();
      const removed = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "DELETE");
      await page.getByRole("button", { name: "ลบบริการ", exact: true }).click();
      expect((await removed).status()).toBe(200);
      deleted = true;
      await expect(page).toHaveURL(/\/advisor\/services$/);
      expect((await context.request.get(`${api}/${id}`)).status()).toBe(404);
      await page.reload();
      await expect(page.getByText(`Service lifecycle proof ${width}`, { exact: true })).toHaveCount(0);
    } finally {
      if (id && !deleted) expect((await context.request.delete(`${api}/${id}`)).status()).toBe(200);
    }
  });

  test(`editing a service preserves its real daily limit at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    const login = await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
      data: { email: "kanya.p@advisory.demo", password: "AdvisoryDemo!2026" },
      headers: { origin: "http://localhost:3001" },
    });
    expect(login.status()).toBe(200);
    const list = await context.request.get(api);
    const source = z.object({ data: z.object({ items: z.array(serviceSchema).min(1) }) }).parse(await list.json()).data.items[0];
    const created = await context.request.post(api, { data: {
      categoryId: source.categoryId, availabilityProfileId: source.availabilityProfileId,
      name: `Local limit proof ${width}`, description: "Disposable service-edit proof",
      priceSatang: 10000, durationMinutes: 30, dailyConsultationLimitMinutes: 90, isPublished: false,
    } });
    expect(created.status()).toBe(201);
    const id = z.object({ data: serviceSchema }).parse(await created.json()).data.id;
    const globalApi = "http://localhost:3200/api/v1/advisors/me/availability/global";
    const originalGlobal = globalSchema.parse((await (await context.request.get(globalApi)).json()).data);
    try {
      expect((await context.request.put(globalApi, { data: { ...originalGlobal, dailyConsultationLimitMinutes: 150 } })).status()).toBe(200);
      await page.goto(`/advisor/services/manage?serviceId=${id}`);
      const name = page.getByRole("textbox", { name: "ชื่อบริการ", exact: true });
      await expect(name).toHaveValue(`Local limit proof ${width}`);
      await expect(page.getByRole("switch", { name: "จำกัดชั่วโมงของบริการนี้", exact: true })).toBeChecked();
      await name.fill(`Edited limit proof ${width}`);
      const saved = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click();
      expect((await saved).status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`/advisor/services/view\\?serviceId=${id}`));
      const persisted = await context.request.get(`${api}/${id}`);
      const value = z.object({ data: z.object({ name: z.string(), dailyConsultationLimitMinutes: z.number() }) }).parse(await persisted.json()).data;
      expect(value).toEqual({ name: `Edited limit proof ${width}`, dailyConsultationLimitMinutes: 90 });
      await page.goto(`/advisor/services/manage?serviceId=${id}`);
      await expect(name).toHaveValue(`Edited limit proof ${width}`);
      await expect(page.getByRole("switch", { name: "จำกัดชั่วโมงของบริการนี้", exact: true })).toBeChecked();
      await page.screenshot({ path: `test-results/service-limit-${width}.png`, fullPage: true });
      const decrease = page.getByRole("button", { name: "ชั่วโมงสูงสุดต่อวัน − 1 ชม.", exact: true });
      const increase = page.getByRole("button", { name: "ชั่วโมงสูงสุดต่อวัน + 1 ชม.", exact: true });
      await decrease.click();
      await expect(decrease).toBeDisabled();
      await expect(page.getByText("1 ชม.", { exact: true })).toBeVisible();
      await increase.click();
      await expect(page.getByText("2 ชม.", { exact: true })).toBeVisible();
      await increase.click();
      await expect(increase).toBeDisabled();
      const adjusted = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click();
      expect((await adjusted).status()).toBe(200);
      expect(z.object({ data: z.object({ dailyConsultationLimitMinutes: z.number() }) }).parse(await (await context.request.get(`${api}/${id}`)).json()).data.dailyConsultationLimitMinutes).toBe(150);
      await page.goto(`/advisor/services/manage?serviceId=${id}`);
      await expect(increase).toBeDisabled();
      await expect(page.getByText("2.5 ชม.", { exact: true })).toBeVisible();
      await page.getByRole("switch", { name: "จำกัดชั่วโมงของบริการนี้", exact: true }).click();
      const unlimited = page.waitForResponse((response) => response.url() === `${api}/${id}` && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click();
      expect((await unlimited).status()).toBe(200);
      expect(z.object({ data: z.object({ dailyConsultationLimitMinutes: z.null() }) }).parse(await (await context.request.get(`${api}/${id}`)).json()).data.dailyConsultationLimitMinutes).toBeNull();
      await page.goto(`/advisor/services/manage?serviceId=${id}`);
      await expect(page.getByRole("switch", { name: "จำกัดชั่วโมงของบริการนี้", exact: true })).not.toBeChecked();
      await expect(increase).toHaveCount(0);
    } finally {
      expect((await context.request.delete(`${api}/${id}`)).status()).toBe(200);
      expect((await context.request.put(globalApi, { data: originalGlobal })).status()).toBe(200);
    }
  });
}
