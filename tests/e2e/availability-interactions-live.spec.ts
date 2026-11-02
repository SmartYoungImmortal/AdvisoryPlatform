import { randomUUID } from "node:crypto";
import { z } from "zod";
import { expect, test } from "./support/coverage";

test.skip(process.env.AVAILABILITY_LIVE_PROOF !== "1", "Requires disposable local proof API");
test.use({ video: "on", trace: "retain-on-failure", actionTimeout: 10_000 });
const api = "http://localhost:3200/api/v1/advisors/me/availability/profiles";
const profileSchema = z.object({
  id: z.uuid(),
  weeklyWindows: z.array(z.object({ dayOfWeek: z.number(), startTime: z.string(), endTime: z.string() })),
  specificWindows: z.array(z.object({ availableDate: z.string(), startTime: z.string(), endTime: z.string() })),
});

for (const width of [1440, 390]) {
  test(`availability picker and add-date sheet persist real changes at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    expect((await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
      data: { email: "kanya.p@advisory.demo", password: "AdvisoryDemo!2026" },
      headers: { origin: "http://localhost:3001" },
    })).status()).toBe(200);
    const created = await context.request.post(api, { data: {
      name: `Date editor proof ${randomUUID()}`,
      weeklyWindows: [{ dayOfWeek: 1, startTime: "14:00", endTime: "16:00" }],
      specificWindows: [], blockedPeriods: [],
    } });
    expect(created.status()).toBe(201);
    const { id } = profileSchema.parse((await created.json()).data);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const save = async () => {
      const response = page.waitForResponse((r) => r.url() === `${api}/${id}` && r.request().method() === "PATCH");
      await page.locator('button[type="submit"]').filter({ visible: true }).click();
      expect((await response).status()).toBe(200);
    };
    try {
      await page.goto(`/availability/profiles/edit?id=${id}`);
      await page.getByRole("button", { name: "เวลาสิ้นสุด", exact: true }).first().click();
      const picker = page.getByRole("dialog", { name: "เวลาสิ้นสุด", exact: true });
      await expect(picker).toBeVisible();
      await expect(picker.getByRole("button", { name: "15:30 1.5 ชม.", exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/availability-picker-${width}.png`, animations: "disabled" });
      await picker.getByRole("button", { name: "15:30 1.5 ชม.", exact: true }).click();
      await expect(picker).toBeHidden();
      await expect(page.locator('input[name="weeklyEnd-mon-0"]')).toHaveValue("15:30");
      await save();
      await page.reload();
      await expect(page.locator('input[name="weeklyEnd-mon-0"]')).toHaveValue("15:30");
      await page.locator('input[name="weeklyStart-mon-0"]').fill("23:00");
      await page.getByRole("button", { name: "เวลาสิ้นสุด", exact: true }).first().click();
      await expect(picker.getByRole("button")).toHaveCount(1);
      await expect(picker.getByRole("button")).toHaveAccessibleName("23:30 30 นาที");
      await page.keyboard.press("Escape");
      await expect(picker).toBeHidden();

      await page.goto(`/availability/profiles/edit/specific?id=${id}`);
      await page.getByRole("link", { name: "+ เพิ่มวันที่เฉพาะ", exact: true }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet).toBeVisible();
      await sheet.locator('input[name="newSpecificDate"]').fill("2099-07-12");
      await sheet.locator('input[name="newSpecificStart"]').fill("15:00");
      await sheet.locator('input[name="newSpecificEnd"]').fill("14:00");
      await sheet.getByRole("button", { name: "เพิ่มวันที่", exact: true }).click();
      await expect(sheet.getByRole("alert")).toContainText("เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด");
      await sheet.locator('input[name="newSpecificEnd"]').fill("16:00");
      await sheet.getByRole("button", { name: "+ เพิ่มอีกช่วง", exact: true }).click();
      await expect(sheet.locator('input[name="newSpecificStart"]')).toHaveCount(2);
      await sheet.locator('input[name="newSpecificStart"]').nth(1).fill("18:00");
      await sheet.locator('input[name="newSpecificEnd"]').nth(1).fill("19:00");
      await page.screenshot({ path: `test-results/availability-add-date-${width}.png`, animations: "disabled" });
      await sheet.screenshot({ path: `test-results/availability-add-date-dialog-${width}.png`, animations: "disabled" });
      await page.route(`${api}/${id}`, (route) => route.request().method() === "PATCH" ? route.abort("failed") : route.continue());
      await sheet.getByRole("button", { name: "เพิ่มวันที่", exact: true }).click();
      await expect(sheet.getByRole("alert")).toContainText("API");
      await expect(sheet.locator('input[name="newSpecificStart"]').nth(1)).toHaveValue("18:00");
      await page.unroute(`${api}/${id}`);
      const updated = page.waitForResponse((r) => r.url() === `${api}/${id}` && r.request().method() === "PATCH");
      await sheet.getByRole("button", { name: "เพิ่มวันที่", exact: true }).click();
      expect((await updated).status()).toBe(200);
      await expect(sheet).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`/availability/profiles/edit/specific\\?id=${id}`));
      await page.reload();
      await expect(page.locator('input[name="specificStart-2099-07-12-0"]')).toHaveValue("15:00");
      await expect(page.locator('input[name="specificStart-2099-07-12-1"]')).toHaveValue("18:00");
      await page.getByRole("link", { name: "+ เพิ่มวันที่เฉพาะ", exact: true }).click();
      await sheet.locator('input[name="newSpecificDate"]').fill("2099-07-12");
      await sheet.locator('input[name="newSpecificStart"]').fill("15:30");
      await sheet.locator('input[name="newSpecificEnd"]').fill("16:30");
      await sheet.getByRole("button", { name: "เพิ่มวันที่", exact: true }).click();
      await expect(sheet.getByRole("alert")).toContainText("ช่วงเวลาทับซ้อนกัน");
      await sheet.locator('input[name="newSpecificStart"]').fill("20:00");
      await sheet.locator('input[name="newSpecificEnd"]').fill("21:00");
      const append = page.waitForResponse((r) => r.url() === `${api}/${id}` && r.request().method() === "PATCH");
      await sheet.getByRole("button", { name: "เพิ่มวันที่", exact: true }).click();
      expect((await append).status()).toBe(200);
      await expect(sheet).toBeHidden();
      await page.reload();
      const persisted = z.array(profileSchema).parse((await (await context.request.get(api)).json()).data).find((profile) => profile.id === id);
      expect(persisted).toBeDefined();
      expect(persisted?.weeklyWindows).toEqual([{ dayOfWeek: 1, startTime: "14:00:00", endTime: "15:30:00" }]);
      expect(persisted?.specificWindows).toEqual([
        { availableDate: "2099-07-12", startTime: "15:00:00", endTime: "16:00:00" },
        { availableDate: "2099-07-12", startTime: "18:00:00", endTime: "19:00:00" },
        { availableDate: "2099-07-12", startTime: "20:00:00", endTime: "21:00:00" },
      ]);
      await page.screenshot({ path: `test-results/availability-date-saved-${width}.png`, animations: "disabled" });
      await page.getByRole("link", { name: "+ เพิ่มวันที่เฉพาะ", exact: true }).click();
      await sheet.locator('input[name="newSpecificDate"]').fill("2099-08-12");
      await sheet.getByRole("button", { name: "ยกเลิก", exact: true }).click();
      await expect(sheet).toBeHidden();
      await page.reload();
      await expect(page.getByText("2099-08-12", { exact: true })).toHaveCount(0);
      expect(errors).toEqual([]);
    } finally {
      expect((await context.request.delete(`${api}/${id}`)).status()).toBe(200);
    }
  });
}
