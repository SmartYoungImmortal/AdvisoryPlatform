import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(process.cwd(), "../.audit/auth-proof-2026-10-27");
const password = "Auth-Proof-2026!";
const replacement = "Auth-Changed-2026!";
const api = "http://localhost:3200";
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 });

test("real invalid reset link and anonymous account access are denied", async ({ page, request }) => {
  test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local proof API");
  await mkdir(output, { recursive: true });
  expect((await request.get(`${api}/api/v1/users/me`)).status()).toBe(401);
  await page.goto("/reset-password?token=invalid-auth-proof-token");
  await page.locator("#reset-password").fill(password);
  await page.locator("#reset-password-confirm").fill(password);
  const rejected = page.waitForResponse(response => response.url().endsWith("/api/auth/reset-password"));
  await page.locator('button[type="submit"]').click();
  expect((await rejected).status()).toBe(400);
  await expect(page.getByText("ลิงก์นี้หมดอายุหรือถูกใช้แล้ว ขอรับลิงก์ใหม่ได้จากหน้าลืมรหัสผ่าน")).toBeVisible();
  await page.screenshot({ path: `${output}/invalid-reset-link.png`, fullPage: true });
});

async function emailLink(request: APIRequestContext, email: string, subject: string) {
  let link = "";
  await expect.poll(async () => {
    const messages = await (await request.get("http://localhost:8025/api/v1/messages")).json();
    const item = messages.messages.find((message: { Subject: string; To: { Address: string }[] }) =>
      message.Subject.toLowerCase().includes(subject) && message.To.some(recipient => recipient.Address === email));
    if (!item) return false;
    const body = await (await request.get(`http://localhost:8025/api/v1/message/${item.ID}`)).json();
    link = (body.Text.match(/https?:\/\/[^\s<>]+/)?.[0] ?? "").replace(/&amp;/g, "&");
    return Boolean(link);
  }, { timeout: 20_000 }).toBe(true);
  return link;
}

async function login(page: Page, email: string, secret: string, options: { next: string } = { next: "/profile" }) {
  await page.goto(`/login?next=${encodeURIComponent(options.next)}`);
  await page.locator("#login-email").fill(email);
  await page.locator('button[type="submit"]').click();
  await page.locator("#login-password").fill(secret);
  const response = page.waitForResponse(response => response.url().endsWith("/api/auth/sign-in/email"));
  await page.locator('button[type="submit"]').click();
  return response;
}

test("real two-mailbox email change, resend and advisee permission boundaries", async ({ browser }) => {
  test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local proof API and Mailpit");
  test.setTimeout(120_000);
  await mkdir(output, { recursive: true });
  const email = `email-proof-${Date.now()}@example.test`;
  const changedEmail = email.replace("email-proof", "changed-proof");
  const context = await browser.newContext({ baseURL: "http://localhost:3001", viewport: { width: 1440, height: 1000 }, recordVideo: { dir: output } });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  const created = await context.request.post(`${api}/api/auth/sign-up/email`, {
    headers: { origin: "http://localhost:3001" },
    data: { email, password, name: "Email Proof", fullName: "Email Proof User", timezone: "Asia/Bangkok", callbackURL: "http://localhost:3001/email-verified" },
  });
  expect(created.status()).toBe(200);
  const createdBody = await created.json();
  try {
    await page.goto(await emailLink(context.request, email, "verify"));
    expect((await login(page, email, password)).status()).toBe(200);
    await expect(page).toHaveURL(/\/profile$/);
    await test.step("A normalized external next destination cannot redirect a signed-in user", async () => {
      await context.request.post(`${api}/api/auth/sign-out`, { data: {}, headers: { origin: "http://localhost:3001" } });
      expect((await login(page, email, password, { next: "/\\outside.example/" })).status()).toBe(200);
      await expect(page).toHaveURL("http://localhost:3001/");
      await page.screenshot({ path: `${output}/unsafe-next-stays-on-app.png`, fullPage: true });
    });
    await test.step("Advisee cannot read advisor/admin data or grant themselves admin", async () => {
      expect((await context.request.get(`${api}/api/v1/advisors/me/services`)).status()).toBe(403);
      expect((await context.request.get(`${api}/api/v1/admin/services`)).status()).toBe(403);
      const roleAttempt = await context.request.post(`${api}/api/auth/admin/set-role`, {
        headers: { origin: "http://localhost:3001" }, data: { userId: createdBody.user.id, role: "admin" },
      });
      expect(roleAttempt.status()).toBe(403);
      await page.goto("/advisor/services");
      await expect(page).toHaveURL("http://localhost:3001/");
      await page.screenshot({ path: `${output}/advisee-role-redirect.png`, fullPage: true });
    });
    await test.step("Reject same email, request change and resend to current mailbox", async () => {
      await page.goto("/settings/email");
      await page.locator("#new-email").fill(email);
      await page.locator('button[type="submit"]').click();
      await expect(page.locator("#new-email")).toHaveAttribute("aria-invalid", "true");
      await page.locator("#new-email").fill(changedEmail);
      const requested = page.waitForResponse(response => response.url().endsWith("/api/auth/change-email"));
      await page.locator('button[type="submit"]').click();
      expect((await requested).status()).toBe(200);
      await expect(page).toHaveURL(/settings\/email\/verify/);
      const resent = page.waitForResponse(response => response.url().endsWith("/api/auth/change-email"));
      await page.getByRole("button", { name: "ส่งลิงก์อีกครั้ง", exact: true }).click();
      expect((await resent).status()).toBe(200);
      await expect(page.getByRole("status").filter({ hasText: "ส่งอีเมลยืนยันอีกครั้งแล้ว" })).toBeVisible();
      await page.screenshot({ path: `${output}/email-change-resent.png`, fullPage: true });
    });
    await test.step("Confirm current mailbox first, then new mailbox", async () => {
      const before = await (await context.request.get(`${api}/api/auth/get-session?disableCookieCache=true`)).json();
      expect(before.user.email).toBe(email);
      await page.goto(await emailLink(context.request, email, "confirm"));
      expect.soft(new URL(page.url()).origin, "Email confirmation must return to frontend, not API origin").toBe("http://localhost:3001");
      const interim = await (await context.request.get(`${api}/api/auth/get-session?disableCookieCache=true`)).json();
      expect(interim.user.email).toBe(email);
      await page.goto(await emailLink(context.request, changedEmail, "verify"));
      expect.soft(new URL(page.url()).origin, "New-address verification must return to frontend").toBe("http://localhost:3001");
      const after = await (await context.request.get(`${api}/api/auth/get-session?disableCookieCache=true`)).json();
      expect(after.user.email).toBe(changedEmail);
      expect(after.user.emailVerified).toBe(true);
      await page.goto("/settings/email");
      await expect(page.getByText(changedEmail, { exact: true })).toBeVisible();
      await page.screenshot({ path: `${output}/email-change-complete.png`, fullPage: true });
      await context.request.post(`${api}/api/auth/sign-out`, { data: {}, headers: { origin: "http://localhost:3001" } });
      expect((await login(page, email, password)).status()).toBe(401);
      expect((await login(page, changedEmail, password)).status()).toBe(200);
      await expect(page).toHaveURL(/\/profile$/);
    });
  } finally {
    await context.request.delete(`${api}/api/v1/users/me`);
    await context.close();
  }
});

test("real suspension denies login and unban restores access for disposable user", async ({ browser }) => {
  test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local proof API, seeded admin and Mailpit");
  test.setTimeout(90_000);
  const email = `suspension-proof-${Date.now()}@example.test`;
  const context = await browser.newContext({ baseURL: "http://localhost:3001", viewport: { width: 390, height: 844 } });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  const administrator = await browser.newContext();
  const page = await context.newPage();
  const created = await context.request.post(`${api}/api/auth/sign-up/email`, {
    headers: { origin: "http://localhost:3001" },
    data: { email, password, name: "Suspension Proof", fullName: "Suspension Proof User", timezone: "Asia/Bangkok", callbackURL: "http://localhost:3001/email-verified" },
  });
  expect(created.status()).toBe(200);
  const createdBody = await created.json();
  let banned = false;
  try {
    await page.goto(await emailLink(context.request, email, "verify"));
    const adminLogin = await administrator.request.post(`${api}/api/auth/sign-in/email`, {
      headers: { origin: "http://localhost:3001" }, data: { email: "admin@advisory.demo", password: "AdvisoryDemo!2026" },
    });
    expect(adminLogin.status()).toBe(200);
    await context.request.post(`${api}/api/auth/sign-out`, { data: {}, headers: { origin: "http://localhost:3001" } });
    const ban = await administrator.request.post(`${api}/api/auth/admin/ban-user`, {
      headers: { origin: "http://localhost:3001" }, data: { userId: createdBody.user.id, banReason: "Disposable local proof account only" },
    });
    expect(ban.status()).toBe(200);
    banned = true;
    expect((await login(page, email, password)).status()).toBe(403);
    await expect(page.getByText("บัญชีนี้ถูกระงับการใช้งาน", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/suspended-login-phone.png`, fullPage: true });
    const unban = await administrator.request.post(`${api}/api/auth/admin/unban-user`, {
      headers: { origin: "http://localhost:3001" }, data: { userId: createdBody.user.id },
    });
    expect(unban.status()).toBe(200);
    banned = false;
    expect((await login(page, email, password)).status()).toBe(200);
    await expect(page).toHaveURL(/\/profile$/);
  } finally {
    if (banned) await administrator.request.post(`${api}/api/auth/admin/unban-user`, {
      headers: { origin: "http://localhost:3001" }, data: { userId: createdBody.user.id },
    });
    await context.request.post(`${api}/api/auth/sign-in/email`, { headers: { origin: "http://localhost:3001" }, data: { email, password } });
    await context.request.delete(`${api}/api/v1/users/me`);
    await context.close();
    await administrator.close();
  }
});

test("real registration, verification, desktop/mobile profile, password reset and deletion", async ({ browser }) => {
  test.skip(process.env.AUTH_LIVE_PROOF !== "1", "Requires disposable local advisory_proof API and Mailpit");
  test.setTimeout(180_000);
  await mkdir(output, { recursive: true });
  const email = `auth-proof-${Date.now()}@example.test`;
  const context = await browser.newContext({ baseURL: "http://localhost:3001", viewport: { width: 1440, height: 1000 }, recordVideo: { dir: output } });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  const page = await context.newPage();
  const secondDevice = await browser.newContext();
  await test.step("Create a new account through the real form", async () => {
    await page.goto("http://localhost:3001/register", { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${output}/registration-initial.png`, fullPage: true });
    await page.locator("#register-display-name").fill("Auth Proof");
    await page.locator("#register-full-name").fill("Auth Proof User");
    await page.locator("#register-email").fill(email);
    await page.locator("#register-password").fill(password);
    await page.locator("#register-confirm").fill(password);
    await page.getByRole("checkbox").check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/verification-sent/);
    const resent = page.waitForResponse(response => response.url().endsWith("/api/auth/send-verification-email"));
    await page.getByRole("button", { name: "ส่งลิงก์ยืนยันอีกครั้ง", exact: true }).click();
    expect((await resent).status()).toBe(200);
    await expect(page.getByText("ส่งลิงก์ยืนยันอีกครั้งแล้ว", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/verification-sent.png`, fullPage: true });
  });
  await test.step("Open delivered verification link, then sign in", async () => {
    const link = await emailLink(context.request, email, "verify");
    await page.goto(link);
    await expect(page).toHaveURL(/email-verified/);
    expect((await login(page, email, password)).status()).toBe(200);
    await expect(page).toHaveURL(/\/profile$/);
    const otherLogin = await secondDevice.request.post(`${api}/api/auth/sign-in/email`, { data: { email, password }, headers: { origin: "http://localhost:3001" } });
    expect(otherLogin.status()).toBe(200);
  });
  await test.step("Update desktop profile and verify reload persistence", async () => {
    await page.goto("http://localhost:3001/profile/edit");
    await expect(page.locator("#display-name")).toHaveValue("Auth Proof");
    await page.locator("#display-name").fill("Verified Profile");
    const saved = page.waitForResponse(response => response.url().endsWith("/api/v1/users/me") && response.request().method() === "PATCH");
    await page.locator('button[type="submit"]').click();
    expect((await saved).status()).toBe(200);
    await page.goto("http://localhost:3001/profile/edit");
    await expect(page.locator("#display-name")).toHaveValue("Verified Profile");
    await page.screenshot({ path: `${output}/desktop-profile.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator("#display-name")).toHaveValue("Verified Profile");
    await page.screenshot({ path: `${output}/phone-profile.png`, fullPage: true });
  });
  await test.step("Reject wrong current password, then persist password change", async () => {
    await page.goto("http://localhost:3001/settings/password");
    await page.locator("#current-password").fill("Wrong-Password-2026!");
    await page.locator("#new-password").fill(replacement);
    await page.locator("#confirm-password").fill(replacement);
    const rejected = page.waitForResponse(response => response.url().endsWith("/api/auth/change-password"));
    await page.locator('button[type="submit"]').click();
    expect((await rejected).status()).toBe(400);
    await expect(page.locator("#current-password")).toHaveAttribute("aria-invalid", "true");
    await page.screenshot({ path: `${output}/wrong-current-password.png`, fullPage: true });
    await page.locator("#current-password").fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/settings\/updated/);
    const cachedAccess = await secondDevice.request.get(`${api}/api/v1/users/me`);
    const authoritative = await secondDevice.request.get(`${api}/api/auth/get-session?disableCookieCache=true`);
    const authoritativeBody: unknown = await authoritative.json();
    await writeFile(`${output}/session-revocation.json`, JSON.stringify({
      cachedAccessStatus: cachedAccess.status(),
      authoritativeStatus: authoritative.status(),
      authoritativeSessionAbsent: authoritativeBody === null,
      cacheWindowSeconds: 300,
      note: "Ordinary API access can retain its signed-cookie session for up to five minutes; authoritative session lookup must show revocation immediately.",
    }, null, 2));
    expect(authoritativeBody, "The second device session must be revoked in authoritative storage").toBeNull();
    await context.request.post(`${api}/api/auth/sign-out`, { data: {}, headers: { origin: "http://localhost:3001" } });
    expect((await login(page, email, password)).status()).toBe(401);
    await page.locator("#login-password").fill(replacement);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/profile$/);
  });
  await test.step("Request real reset mail and complete password reset", async () => {
    await page.goto("http://localhost:3001/forgot-password");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/reset-sent/);
    const resent = page.waitForResponse(response => response.url().endsWith("/api/auth/request-password-reset"));
    await page.getByRole("button", { name: "ส่งลิงก์อีกครั้ง", exact: true }).click();
    expect((await resent).status()).toBe(200);
    await expect(page.getByText("ส่งอีเมลอีกครั้งแล้ว", { exact: true })).toBeVisible();
    await page.goto(await emailLink(context.request, email, "reset"));
    await page.locator('input[type="password"]').nth(0).fill(password);
    await page.locator('input[type="password"]').nth(1).fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "เปลี่ยนรหัสผ่านแล้ว" })).toBeVisible();
    await page.screenshot({ path: `${output}/reset-complete.png`, fullPage: true });
    expect((await login(page, email, password)).status()).toBe(200);
  });
  await test.step("Delete only this new account and confirm access is revoked", async () => {
    await page.goto("http://localhost:3001/settings/delete");
    await page.locator("#delete-confirm").fill("DELETE");
    const deleted = page.waitForResponse(response => response.url().endsWith("/api/v1/users/me") && response.request().method() === "DELETE");
    await page.locator('button[type="submit"]').click();
    expect((await deleted).ok()).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.request.get(`${api}/api/v1/users/me`)).status()).toBe(401);
    expect((await login(page, email, password)).status()).toBe(401);
    await page.screenshot({ path: `${output}/deleted-account-denied.png`, fullPage: true });
  });
  await secondDevice.close();
  await context.close();
});
