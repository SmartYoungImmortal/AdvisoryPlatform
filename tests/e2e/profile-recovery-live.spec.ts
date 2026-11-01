import { z } from "zod";
import { expect, test } from "./support/coverage";

// Requires the named disposable proof API and seeded demo account.
test.skip(
  process.env.AUTH_LIVE_PROOF !== "1",
  "Requires disposable local proof services",
);
test.use({
  video: { mode: "on", size: { width: 1440, height: 1000 } },
  trace: "retain-on-failure",
});
const api = "http://localhost:3200";
const profileUrl = `${api}/api/v1/users/me`;
const names = z.object({
  displayName: z.string(),
  fullName: z.string().nullable(),
});
for (const width of [1440, 390]) {
  test(`profile save preserves edits on failure and locks pending changes at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      (
        await context.request.post(`${api}/api/auth/sign-in/email`, {
          data: {
            email: "nattapong.d@advisory.demo",
            password: "AdvisoryDemo!2026",
          },
          headers: { origin: "http://localhost:3001" },
        })
      ).status(),
    ).toBe(200);
    const original = names.parse(
      (await (await context.request.get(profileUrl)).json()).data,
    );
    const nextName = `Profile proof ${width} ${Date.now()}`;
    let release: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: (() => void) | undefined;
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto("/profile/edit");
      const field = page.locator("#display-name");
      await expect(field).toHaveValue(original.displayName);
      await field.fill(nextName);
      await page.route(profileUrl, (route) =>
        route.request().method() === "PATCH"
          ? route.abort("failed")
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "บันทึกการเปลี่ยนแปลง", exact: true })
        .click();
      await expect(page.getByRole("form").getByRole("alert")).toContainText(
        "บันทึกการเปลี่ยนแปลงไม่สำเร็จ",
      );
      await expect(field).toHaveValue(nextName);
      expect(
        names.parse(
          (await (await context.request.get(profileUrl)).json()).data,
        ),
      ).toEqual(original);
      await page.getByRole("form").getByRole("alert").scrollIntoViewIfNeeded();
      await page.screenshot({
        animations: "disabled",
        path: `test-results/profile-save-failed-${width}.png`,
      });
      await page.unroute(profileUrl);
      let writes = 0;
      await page.route(profileUrl, async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        writes += 1;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        started?.();
        await held;
        await route.fulfill({ response });
      });
      await page
        .getByRole("button", { name: "ลองอีกครั้ง", exact: true })
        .click();
      await requestStarted;
      await expect(field).toBeDisabled();
      await expect(page.locator("#full-name")).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "กำลังบันทึก…", exact: true }),
      ).toBeDisabled();
      expect(writes).toBe(1);
      for (const control of await page
        .getByRole("button", { name: "เปลี่ยนรูป", exact: true })
        .all())
        await expect(control).toBeDisabled();
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({
        animations: "disabled",
        path: `test-results/profile-save-pending-${width}.png`,
      });
      release?.();
      await expect(page).toHaveURL(/\/profile$/);
      await page.reload();
      await expect(
        page.getByRole("heading", { name: nextName, exact: true }),
      ).toBeVisible();
      expect(
        names.parse((await (await context.request.get(profileUrl)).json()).data)
          .displayName,
      ).toBe(nextName);
      await page.screenshot({
        animations: "disabled",
        path: `test-results/profile-save-result-${width}.png`,
      });
      expect(errors).toEqual([]);
    } finally {
      release?.();
      await page.unrouteAll({ behavior: "wait" });
      expect(
        (await context.request.patch(profileUrl, { data: original })).status(),
      ).toBe(200);
    }
  });
}
