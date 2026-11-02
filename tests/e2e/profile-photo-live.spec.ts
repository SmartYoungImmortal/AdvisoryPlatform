import { readFile } from "node:fs/promises";
import { z } from "zod";
import { expect, test } from "./support/coverage";

test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local proof API and storage");
test.use({ video: "on" });
const api = "http://localhost:3200/api/v1";
const avatar = `${api}/users/me/avatar`;
const signedAvatar = z.object({ data: z.object({ url: z.url() }) });

for (const width of [1440, 390]) {
  test(`profile photo rejects invalid files and persists a real upload at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    expect((await context.request.post("http://localhost:3200/api/auth/sign-in/email", {
      headers: { origin: "http://localhost:3001" },
      data: { email: "nattapong.d@advisory.demo", password: "AdvisoryDemo!2026" },
    })).status()).toBe(200);
    // Refuse to overwrite an existing portrait in this disposable fixture.
    expect((await context.request.get(avatar)).status()).toBe(404);
    const bytes = await readFile("public/icon-192.png");
    const photo = { name: "profile-proof.png", mimeType: "image/png", buffer: bytes };
    let release: (() => void) | undefined;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let uploads = 0;
    page.on("request", request => {
      if (request.url() === avatar && request.method() === "POST") uploads += 1;
    });
    async function choose(file: { name: string; mimeType: string; buffer: Buffer }) {
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "เปลี่ยนรูป", exact: true }).last().click();
      await (await chooser).setFiles(file);
    }
    try {
      await page.goto("/profile/edit");
      await expect(page.locator("#display-name")).toBeEnabled();
      await choose({ name: "unsupported.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") });
      await expect(page.getByRole("form").getByRole("alert")).toContainText("ใช้ได้เฉพาะไฟล์ JPG, PNG หรือ WebP");
      await choose({ name: "oversize.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
      await expect(page.getByRole("form").getByRole("alert")).toContainText("ไฟล์ใหญ่เกิน 5 MB");
      expect(uploads).toBe(0);
      await page.route(avatar, route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
      await choose(photo);
      await expect(page.getByRole("form").getByRole("alert")).toContainText("The API could not be reached");
      await page.screenshot({ path: `test-results/profile-photo-failed-${width}.png` });
      await page.unroute(avatar);
      const held = new Promise<void>(resolve => { release = resolve; });
      let uploaded: (() => void) | undefined;
      const stored = new Promise<void>(resolve => { uploaded = resolve; });
      await page.route(avatar, async route => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        uploaded?.();
        await held;
        await route.fulfill({ response });
      });
      await choose(photo);
      await stored;
      await expect(page.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })).toBeDisabled();
      const controls = page.getByRole("button", { name: "กำลังอัปโหลดรูป…", exact: true });
      await expect(controls).toHaveCount(1);
      for (const control of await controls.all()) {
        await expect(control).toBeDisabled();
      }
      release?.();
      const portrait = page.locator('form img[src*="X-Amz-"]:visible').first();
      await expect(portrait).toBeVisible();
      await expect.poll(() => portrait.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
      await page.reload();
      await expect(portrait).toBeVisible();
      await expect.poll(() => portrait.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
      const persisted = signedAvatar.parse(await (await context.request.get(avatar)).json());
      expect(await (await context.request.get(persisted.data.url)).body()).toEqual(bytes);
      await page.screenshot({ path: `test-results/profile-photo-saved-${width}.png` });
      expect(errors).toEqual([]);
    } finally {
      release?.();
      await page.unrouteAll({ behavior: "wait" });
      expect((await context.request.delete(avatar)).status()).toBe(200);
      expect((await context.request.get(avatar)).status()).toBe(404);
    }
  });
}
