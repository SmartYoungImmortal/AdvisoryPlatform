import { expect, test } from "@playwright/test";
import { z } from "zod";

import { addDays, isoDay } from "@/components/bookings/booking-flow";

test.skip(process.env.BOOKING_LIVE_PROOF !== "1", "Requires the isolated seeded proof API on localhost:3200");
test.use({ viewport: { width: 1440, height: 1000 }, video: "on" });

const api = "http://localhost:3200/api/v1";
const bookingSchema = z.object({ data: z.object({ id: z.uuid(), state: z.string() }) });

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
test(`a stale slot is rejected, refreshed, and replaced by a real booking at ${viewport.width}px`, async ({ page, context }) => {
  await page.setViewportSize(viewport);
  const login = await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
    data: { email: "nattapong.d@advisory.demo", password: "AdvisoryDemo!2026" },
    headers: { origin: "http://localhost:3001" },
  });
  expect(login.status()).toBe(200);
  const catalogue = await context.request.get(`${api}/services?limit=100`);
  expect(catalogue.status()).toBe(200);
  const service = z.object({ data: z.object({ items: z.array(z.object({ id: z.uuid(), name: z.string() })) }) })
    .parse(await catalogue.json()).data.items.find((item) => item.name === "ตรวจแผนภาษีก่อนยื่น");
  if (!service) throw new Error("Seeded tax-review service is required for booking proof");
  const serviceId = service.id;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const createdIds: string[] = [];
  try {
    const slotsResponse = page.waitForResponse((response) => response.url().includes(`/services/${serviceId}/slots?`));
    await page.goto(`/service/tax-freelance?serviceId=${serviceId}`);
    await page.getByRole("button", { name: "เลือกเวลาที่สะดวก", exact: true }).filter({ visible: true }).click();
    const slots = z.object({ data: z.array(z.object({ startTime: z.iso.datetime() })) }).parse(await (await slotsResponse).json()).data;
    const first = slots.find((slot) => isoDay(new Date(slot.startTime)) < isoDay(addDays(new Date(), 7)));
    if (!first) throw new Error("Disposable proof service needs an available slot in the next seven days");
    const label = new Intl.DateTimeFormat("th", { hour: "2-digit", minute: "2-digit" }).format(new Date(first.startTime));
    await page.getByRole("button", { name: label, exact: true }).filter({ visible: true }).click();

    // A real booking takes the selected time after the browser loaded it.
    const competitor = await context.request.post(`${api}/bookings`, { data: { serviceId, startTime: first.startTime } });
    expect(competitor.status()).toBe(201);
    createdIds.push(bookingSchema.parse(await competitor.json()).data.id);
    const rejected = page.waitForResponse((response) => response.url() === `${api}/bookings` && response.request().method() === "POST");
    const refreshed = page.waitForResponse((response) => response.url().includes(`/services/${serviceId}/slots?`));
    await page.getByRole("dialog").getByRole("button", { name: "ถัดไป", exact: true }).click();
    expect((await rejected).status()).toBe(400);
    expect((await refreshed).status()).toBe(200);
    await expect(page.getByRole("alert").filter({ hasText: "จองเวลานี้ไม่ได้" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "ถัดไป", exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/booking-selection-refreshed-${viewport.width}.png`, fullPage: true });

    await page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).filter({ visible: true }).first().click();
    const booked = page.waitForResponse((response) => response.url() === `${api}/bookings` && response.request().method() === "POST");
    await page.getByRole("dialog").getByRole("button", { name: "ถัดไป", exact: true }).click();
    const response = await booked;
    expect(response.status()).toBe(201);
    const booking = bookingSchema.parse(await response.json()).data;
    createdIds.push(booking.id);
    await expect(page).toHaveURL(new RegExp(`/checkout/card\\?bookingId=${booking.id}`));
    const persisted = await context.request.get(`${api}/bookings/${booking.id}`);
    expect(bookingSchema.parse(await persisted.json()).data.state).toBe("PENDING_PAYMENT");
    expect(errors).toEqual([]);
  } finally {
    for (const id of createdIds) {
      expect((await context.request.post(`${api}/bookings/${id}/cancel`)).status()).toBe(200);
    }
  }
});
}
