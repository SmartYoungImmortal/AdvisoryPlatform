import { writeFileSync } from "node:fs";
import { expect, test } from "./support/coverage";

// These scenarios require the disposable proof API and seeded local demo accounts.
test.skip(
  process.env.AUTH_LIVE_PROOF !== "1",
  "Requires the disposable proof API",
);
test.use({
  video: { mode: "on", size: { width: 1440, height: 1000 } },
  trace: "retain-on-failure",
});
const api = "http://localhost:3200";
const signOutUrl = `${api}/api/auth/sign-out`;

for (const width of [1440, 390]) {
  for (const fault of ["connection", "lost-response"]) {
    test(`logout recovers from ${fault} at ${width}px`, async ({
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
      const sessionCookies = (await context.cookies(api)).filter((cookie) =>
        cookie.name.endsWith(".session_token"),
      );
      expect(sessionCookies).toHaveLength(1);
      const originalCookie = sessionCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      const errors: string[] = [];
      const diagnostics: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") diagnostics.push(message.text());
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          diagnostics.push(
            `${response.status()} ${new URL(response.url()).pathname}`,
          );
      });
      let requests = 0;
      await page.route(signOutUrl, async (route) => {
        requests += 1;
        if (fault === "lost-response")
          expect((await route.fetch()).status()).toBe(200);
        await route.abort("failed");
      });
      await page.goto("/settings/logout");
      const dialog = page.getByRole("dialog");
      const confirm = dialog.getByRole("button", {
        name: "ออกจากระบบ",
        exact: true,
      });
      await expect(dialog).toHaveCSS("opacity", "1");
      await confirm.click();
      await expect(dialog.getByRole("alert")).toContainText("ลองอีกครั้ง");
      await expect(page).toHaveURL(/\/settings\/logout$/);
      expect(requests).toBe(1);
      expect(
        (await context.request.get(`${api}/api/v1/users/me`)).status(),
      ).toBe(fault === "connection" ? 200 : 401);
      await page.screenshot({
        animations: "disabled",
        path: `test-results/logout-${fault}-${width}.png`,
      });
      await page.unroute(signOutUrl);
      let releaseResponse: (() => void) | undefined;
      const held = new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      let requestStarted: (() => void) | undefined;
      const started = new Promise<void>((resolve) => {
        requestStarted = resolve;
      });
      await page.route(signOutUrl, async (route) => {
        requests += 1;
        const response = await route.fetch();
        requestStarted?.();
        await held;
        await route.fulfill({ response });
      });
      try {
        // Two clicks in one task exercise the immediate duplicate-submit guard.
        await confirm.evaluate((button) => {
          if (button instanceof HTMLButtonElement) {
            button.click();
            button.click();
          }
        });
        await started;
        await expect(
          dialog.getByRole("button", { name: "กำลังออกจากระบบ…", exact: true }),
        ).toBeDisabled();
        await expect(
          dialog.getByRole("button", { name: "ยกเลิก", exact: true }),
        ).toBeDisabled();
        expect(requests).toBe(2);
        await page.screenshot({
          animations: "disabled",
          path: `test-results/logout-pending-${fault}-${width}.png`,
        });
      } finally {
        releaseResponse?.();
      }
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
      expect(
        (await context.request.get(`${api}/api/v1/users/me`)).status(),
      ).toBe(401);
      // Replaying the old token checks server revocation, beyond clearing this browser's cookie.
      expect(
        (
          await context.request.get(`${api}/api/v1/users/me`, {
            headers: { cookie: originalCookie },
          })
        ).status(),
      ).toBe(401);
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/login\?next=/);
      await page.screenshot({
        animations: "disabled",
        path: `test-results/logout-complete-${fault}-${width}.png`,
      });
      expect(errors).toEqual([]);
      writeFileSync(
        `test-results/logout-diagnostics-${fault}-${width}.json`,
        JSON.stringify(diagnostics, null, 2),
      );
    });
  }
}

for (const width of [1440, 402]) {
  test(`public legal pages and logout cancellation work at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: width === 402 ? 874 : 866 });
    for (const path of ["/terms", "/privacy-policy"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        path === "/terms" ? "ข้อกำหนดการให้บริการ" : "นโยบายความเป็นส่วนตัว",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(
      401,
    );
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
    let signOutRequests = 0;
    page.on("request", (request) => {
      if (request.url() === signOutUrl) signOutRequests += 1;
    });
    await page.goto("/settings/logout");
    await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `test-results/logout-confirm-${width}.png` });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "ยกเลิก", exact: true })
      .click();
    await expect(page).toHaveURL(/\/settings$/);
    expect(signOutRequests).toBe(0);
    expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(
      200,
    );
  });
}

test("admin logout reports a failed request and retries the real API", async ({
  page,
  context,
}) => {
  expect(
    (
      await context.request.post(`${api}/api/auth/sign-in/email`, {
        data: { email: "admin@advisory.demo", password: "AdvisoryDemo!2026" },
        headers: { origin: "http://localhost:3001" },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/admin/dashboard");
  await page.getByRole("button", { name: /เมนูบัญชี/ }).click();
  await page.route(signOutUrl, (route) => route.abort("failed"));
  await page.getByRole("menuitem", { name: "ออกจากระบบ", exact: true }).click();
  await expect(
    page.getByText("ยังยืนยันการออกจากระบบไม่ได้ กรุณาลองอีกครั้ง", {
      exact: true,
    }),
  ).toBeVisible();
  expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(
    200,
  );
  await page.screenshot({ path: "test-results/logout-admin-retry.png" });
  await page.unroute(signOutUrl);
  await page.getByRole("button", { name: /เมนูบัญชี/ }).click();
  await page.getByRole("menuitem", { name: "ออกจากระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login(?:\?.*)?$/);
  expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(
    401,
  );
});
