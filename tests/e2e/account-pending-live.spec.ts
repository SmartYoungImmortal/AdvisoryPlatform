import { randomUUID } from "node:crypto";
import { expect, test } from "./support/coverage";

test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local proof services");
test.use({ video: { mode: "on", size: { width: 1440, height: 1000 } }, trace: "retain-on-failure" });
const api = "http://localhost:3200";

for (const width of [1440, 390]) {
  for (const action of ["email", "password"]) {
    test(`account ${action} locks pending values and recovers at ${width}px`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 1000 });
      expect((await context.request.post(`${api}/api/auth/sign-in/email`, {
        data: { email: "nattapong.d@advisory.demo", password: "AdvisoryDemo!2026" },
        headers: { origin: "http://localhost:3001" },
      })).status()).toBe(200);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let release: (() => void) | undefined;
      const held = new Promise<void>((resolve) => { release = resolve; });
      let started: (() => void) | undefined;
      const received = new Promise<void>((resolve) => { started = resolve; });
      const url = `${api}/api/auth/change-${action}`;
      let writes = 0;
      try {
        await page.goto(`/settings/${action}`);
        await expect(page.getByRole("heading", { name: action === "email" ? "เปลี่ยนอีเมล" : "เปลี่ยนรหัสผ่าน", exact: true })).toHaveCount(1);
        await expect(page.locator(action === "email" ? "#new-email" : "#current-password")).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.screenshot({ path: `test-results/account-${action}-default-${width}.png`, animations: "disabled" });
        const email = `pending-${randomUUID()}@example.test`;
        if (action === "email") await page.locator("#new-email").fill(email);
        else {
          await page.locator("#current-password").fill("WrongCurrent!2026");
          await page.locator("#new-password").fill("PendingProof!2026");
          await page.locator("#confirm-password").fill("PendingProof!2026");
        }
        await page.route(url, async (route) => {
          writes += 1;
          const response = await route.fetch();
          expect(response.status()).toBe(action === "email" ? 200 : 400);
          started?.();
          await held;
          await route.fulfill({ response });
        });
        const submit = page.getByRole("button", { name: action === "email" ? "ส่งลิงก์ยืนยัน" : "อัปเดตรหัสผ่าน", exact: true });
        if (action === "email") {
          // Deliberately inject only a failure to verify that configuration errors
          // are not reported as someone else owning the requested address.
          await page.route(url, (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "CHANGE_EMAIL_DISABLED", message: "Change email is disabled" }) }), { times: 1 });
          await submit.click();
          await expect(page.locator("form").getByRole("alert")).toHaveText("ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง");
          await expect(page.locator("#new-email")).toHaveValue(email);
        }
        await submit.click();
        await received;
        const fields = action === "email" ? ["new-email"] : ["current-password", "new-password", "confirm-password"];
        for (const id of fields) await expect(page.locator(`#${id}`)).toBeDisabled();
        await expect(submit).toBeDisabled();
        expect(writes).toBe(1);
        await page.screenshot({ path: `test-results/account-${action}-pending-${width}.png`, animations: "disabled" });
        release?.();
        if (action === "email") {
          await expect(page).toHaveURL(/\/settings\/email\/verify\?to=/);
          await expect(page.getByText(email, { exact: false }).first()).toBeVisible();
          const session = await (await context.request.get(`${api}/api/auth/get-session`)).json();
          expect(session).toMatchObject({ user: { email: "nattapong.d@advisory.demo" } });
        } else {
          await expect(page.getByText("ไม่ตรงกับรหัสผ่านปัจจุบัน", { exact: true })).toBeVisible();
          await page.screenshot({ path: `test-results/account-password-wrong-${width}.png`, animations: "disabled" });
          await expect(page.locator("#current-password")).toBeEnabled();
          await expect(page.locator("#new-password")).toHaveValue("PendingProof!2026");
          await page.unroute(url);
          await page.route(url, (route) => route.abort("failed"));
          await submit.click();
          await expect(page.locator("form").getByRole("alert").filter({ hasText: "เปลี่ยนรหัสผ่านไม่สำเร็จ" })).toHaveText("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง");
          await expect(page.locator("#new-password")).toHaveValue("PendingProof!2026");
        }
        await page.screenshot({ path: `test-results/account-${action}-result-${width}.png`, animations: "disabled" });
        if (action === "password") {
          await page.getByRole("button", { name: "ตั้งรหัสใหม่ทางอีเมล", exact: true }).click();
          await expect(page.getByRole("dialog")).toBeVisible();
          let resetStarted: (() => void) | undefined;
          const resetSeen = new Promise<void>((resolve) => { resetStarted = resolve; });
          const resetHeld = new Promise<void>((resolve) => { release = resolve; });
          await page.route(`${api}/api/auth/request-password-reset`, async (route) => {
            const response = await route.fetch();
            expect(response.status()).toBe(200);
            resetStarted?.();
            await resetHeld;
            await route.fulfill({ response });
          });
          await page.getByRole("button", { name: "ส่งลิงก์", exact: true }).click();
          await resetSeen;
          await expect(page.getByRole("dialog").getByRole("button", { name: "ย้อนกลับ", exact: true })).toBeDisabled();
          await expect(page.getByRole("button", { name: "ส่งลิงก์", exact: true })).toBeDisabled();
          release?.();
          await expect(page.getByRole("heading", { name: "ส่งลิงก์แล้ว", exact: true })).toBeVisible();
          await page.getByRole("button", { name: "เรียบร้อย", exact: true }).click();
          await expect(page).toHaveURL(/\/settings$/);
        }
        expect(errors).toEqual([]);
      } finally {
        release?.();
        await page.unrouteAll({ behavior: "wait" });
      }
    });
  }
}
