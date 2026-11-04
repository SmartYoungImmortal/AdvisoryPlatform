import { expect, test, type Page, type Route } from "./support/coverage";

const API = "http://localhost:3200";
const advisorId = "6f1d3c7e-2b4a-4c8e-9a51-0d2f7b3e1a01";

const SKILL = {
  a: { id: "11111111-1111-4111-8111-111111111111", name: "วางแผนการเงิน" },
  b: { id: "22222222-2222-4222-8222-222222222222", name: "ภาษีเงินได้บุคคล" },
  c: { id: "33333333-3333-4333-8333-333333333333", name: "กฎหมายธุรกิจ" },
  d: { id: "44444444-4444-4444-8444-444444444444", name: "การตลาดออนไลน์" },
  e: { id: "55555555-5555-4555-8555-555555555555", name: "ออกแบบประสบการณ์ผู้ใช้" },
} as const;

type Status = "PENDING" | "APPROVED" | "REJECTED";

function proof(
  id: string,
  skill: { readonly id: string; readonly name: string },
  originalFileName: string,
  reviewStatus: Status,
  rejectionReason: string | null,
  createdAt: string,
) {
  return {
    id,
    skillId: skill.id,
    skillName: skill.name,
    originalFileName,
    reviewStatus,
    rejectionReason,
    reviewedAt: reviewStatus === "PENDING" ? null : createdAt,
    createdAt,
  };
}

/** A APPROVED, B PENDING, C REJECTED, D turned down once and now PENDING again; oldest first, as the API answers. */
const SENT = [
  proof("p-a", SKILL.a, "a.pdf", "APPROVED", null, "2026-09-01T03:00:00.000Z"),
  proof("p-b", SKILL.b, "b.png", "PENDING", null, "2026-09-01T03:00:01.000Z"),
  proof("p-c", SKILL.c, "c.jpg", "REJECTED", "ภาพไม่ชัด", "2026-09-01T03:00:02.000Z"),
  proof("p-d1", SKILL.d, "d-old.jpg", "REJECTED", "เอกสารหมดอายุ", "2026-09-01T03:00:03.000Z"),
  proof("p-d2", SKILL.d, "d.pdf", "PENDING", null, "2026-10-20T03:00:00.000Z"),
];

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);

function page1<T>(items: readonly T[]) {
  return { items, total: items.length, page: 1, limit: 100, totalPages: 1 };
}

async function fulfill(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ statusCode: status, message: "OK", data }),
  });
}

/** The value of one text field in a multipart body. */
function formField(route: Route, name: string): string | null {
  const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
  return new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body)?.[1] ?? null;
}

type Call = { readonly method: string; readonly path: string; readonly skillId?: string | null };

/**
 * An applicant whose ID card was turned down, with `proofs` on file. Every call
 * the pages make is answered here; anything else lands in `unmocked`.
 */
async function mockApi(page: Page, proofs: ReturnType<typeof proof>[]) {
  const calls: Call[] = [];
  const unmocked: string[] = [];
  const state = { proofsFail: false, identity: "REJECTED" as "REJECTED" | "SUBMITTED" };
  const profile = () => ({
    id: advisorId,
    displayName: "ผู้สมัครทดสอบ",
    email: "resubmit@example.test",
    headline: SKILL.a.name,
    bio: null,
    verificationStatus: state.identity,
    createdAt: "2026-09-01T02:00:00.000Z",
    modifiedAt: "2026-09-01T02:00:00.000Z",
  });

  await page.route(`${API}/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;

    if (path === "/api/v1/users/me" && method === "GET") {
      await fulfill(route, {
        id: advisorId,
        displayName: "ผู้สมัครทดสอบ",
        email: "resubmit@example.test",
        emailVerified: true,
        fullName: "ผู้สมัคร ทดสอบ",
        avatarKey: null,
        timezone: "Asia/Bangkok",
        roles: ["ADVISEE"],
        createdAt: "2026-09-01T02:00:00.000Z",
        updatedAt: "2026-09-01T02:00:00.000Z",
      });
      return;
    }
    if (path === "/api/v1/advisors/me/identity-verification" && method === "GET") {
      await fulfill(route, {
        advisorId,
        verificationStatus: state.identity,
        rejectionReason: state.identity === "REJECTED" ? "รูปบัตรเบลอ" : null,
        submittedAt: "2026-09-01T03:00:00.000Z",
        verifiedAt: null,
      });
      return;
    }
    if (path === "/api/v1/advisors/me/identity-verification" && method === "POST") {
      calls.push({ method, path });
      state.identity = "SUBMITTED";
      await fulfill(route, { verificationStatus: "SUBMITTED", submittedAt: "2026-11-04T03:00:00.000Z" }, 201);
      return;
    }
    if (path === "/api/v1/advisors/me" && method === "GET") {
      await fulfill(route, profile());
      return;
    }
    if (path === "/api/v1/advisors/me" && method === "PATCH") {
      calls.push({ method, path });
      await fulfill(route, profile());
      return;
    }
    if (path === "/api/v1/skills" && method === "GET") {
      await fulfill(route, page1(Object.values(SKILL)));
      return;
    }
    if (path === "/api/v1/advisors/me/skill-proofs" && method === "GET") {
      calls.push({ method, path });
      if (state.proofsFail) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ statusCode: 500, message: "Internal server error" }),
        });
        return;
      }
      await fulfill(route, page1(proofs));
      return;
    }
    if (path === "/api/v1/advisors/me/skill-proofs" && method === "POST") {
      const skillId = formField(route, "skillId");
      calls.push({ method, path, skillId });
      await fulfill(route, proof(`p-new-${calls.length}`, { id: skillId ?? "", name: "" }, "new.jpg", "PENDING", null, "2026-11-04T03:00:00.000Z"), 201);
      return;
    }
    unmocked.push(`${method} ${path}`);
    await route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ statusCode: 501, message: "unmocked" }) });
  });

  return {
    state,
    unmocked,
    posts: (path: string) => calls.filter((call) => call.method === "POST" && call.path === `/api/v1/advisors/me/${path}`),
    gets: (path: string) => calls.filter((call) => call.method === "GET" && call.path === `/api/v1/advisors/me/${path}`),
  };
}

/** From the rejection page, through a new ID card on stage 2, onto stage 3. */
async function resubmitToStage3(page: Page) {
  await page.goto("/advisor-onboarding/failed");
  await expect(page.getByText("รูปบัตรเบลอ")).toBeVisible();
  await page.getByRole("button", { name: "อัปโหลดเอกสารใหม่" }).click();
  await expect(page).toHaveURL(/\/advisor-onboarding\/stage-2\/?$/);
  await page.locator('input[type="file"]').setInputFiles({ name: "id-card-new.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await page.getByRole("button", { name: "ต่อไป" }).click();
  await expect(page).toHaveURL(/\/advisor-onboarding\/stage-3\/?$/);
}

const cards = (page: Page) => page.getByRole("region");
const card = (page: Page, skill: { readonly name: string }) => page.getByRole("region", { name: skill.name, exact: true });
const submit = (page: Page) => page.getByRole("button", { name: "ส่งตรวจสอบ" });
/** How full stage 3's bar is drawn, as the `scaleX` on its fill. */
const stageBar = (page: Page) => page.locator('li[aria-current="step"] span[style*="scaleX"]');

/** A, B and D are on file: their document and its review, and no way to take them off. */
async function expectSentCards(page: Page) {
  await expect(cards(page)).toHaveCount(4);
  for (const [skill, file, status] of [
    [SKILL.a, "a.pdf", "อนุมัติแล้ว"],
    [SKILL.b, "b.png", "กำลังตรวจสอบ"],
    [SKILL.d, "d.pdf", "กำลังตรวจสอบ"],
  ] as const) {
    const sent = card(page, skill);
    await expect(sent).toContainText(file);
    await expect(sent).toContainText(status);
    await expect(sent.getByRole("button", { name: "ลบทักษะนี้" })).toHaveCount(0);
    await expect(sent.locator('input[type="file"]')).toHaveCount(0);
  }
  await expect(card(page, SKILL.d)).not.toContainText("เอกสารหมดอายุ");
  const redo = card(page, SKILL.c);
  await expect(redo).toContainText("ภาพไม่ชัด");
  await expect(redo.getByRole("button", { name: "เลือกไฟล์หรือถ่ายรูป" })).toBeVisible();
}

test.describe("advisor resubmitting after a rejected ID card", () => {
  test.setTimeout(120_000);

  test("A9: stage 3 shows what was sent and sends only the turned-down proof", async ({ page }) => {
    const api = await mockApi(page, SENT);
    await resubmitToStage3(page);
    await expectSentCards(page);
    await expect(stageBar(page), "A, B and D count as done").toHaveAttribute("style", /scaleX\(0\.75\)/);

    await card(page, SKILL.c).locator('input[type="file"]').setInputFiles({ name: "c-clear.jpg", mimeType: "image/jpeg", buffer: JPEG });
    await expect(card(page, SKILL.c)).toContainText("c-clear.jpg");
    await expect(stageBar(page)).toHaveAttribute("style", /scaleX\(1\)/);
    await submit(page).click();

    await expect(page).toHaveURL(/\/advisor-onboarding\/thank-you\/?$/);
    expect(api.posts("identity-verification")).toHaveLength(1);
    expect(api.posts("skill-proofs").map((call) => call.skillId)).toEqual([SKILL.c.id]);
    expect(api.unmocked).toEqual([]);
  });

  test("A10: a turned-down proof without a file stops the send; removing it sends nothing for skills", async ({ page }) => {
    const api = await mockApi(page, SENT);
    await resubmitToStage3(page);
    await expectSentCards(page);

    await submit(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "ทุกทักษะต้องมีหลักฐาน" })).toBeVisible();
    await expect(card(page, SKILL.c)).toHaveClass(/\bborder-destructive\b/);
    for (const skill of [SKILL.a, SKILL.b, SKILL.d]) {
      await expect(card(page, skill)).not.toHaveClass(/\bborder-destructive\b/);
    }
    expect(api.posts("identity-verification")).toHaveLength(0);

    await card(page, SKILL.c).getByRole("button", { name: "ลบทักษะนี้" }).click();
    await expect(cards(page)).toHaveCount(3);
    await submit(page).click();

    await expect(page).toHaveURL(/\/advisor-onboarding\/thank-you\/?$/);
    expect(api.posts("identity-verification")).toHaveLength(1);
    expect(api.posts("skill-proofs")).toHaveLength(0);
    expect(api.unmocked).toEqual([]);
  });

  test("A11: a failed read of the sent proofs says so, blocks the send, and recovers on retry", async ({ page }) => {
    const api = await mockApi(page, SENT);
    api.state.proofsFail = true;
    await resubmitToStage3(page);

    const notice = page.getByRole("alert").filter({ has: page.getByRole("button", { name: "ลองอีกครั้ง" }) });
    await expect(notice).toBeVisible();
    await expect(submit(page)).toBeDisabled();

    api.state.proofsFail = false;
    await notice.getByRole("button", { name: "ลองอีกครั้ง" }).click();
    await expectSentCards(page);
    await expect(notice).toHaveCount(0);
    expect(api.gets("skill-proofs").length).toBeGreaterThanOrEqual(2);
    expect(api.unmocked).toEqual([]);
  });

  test("A12: with nothing sent before, stage 3 opens on one empty card", async ({ page }) => {
    const api = await mockApi(page, []);
    await resubmitToStage3(page);

    await expect(cards(page)).toHaveCount(1);
    const only = page.getByRole("region", { name: "ทักษะที่ 1" });
    await expect(only.getByRole("heading", { name: "ทักษะใหม่" })).toBeVisible();
    await expect(only.getByRole("button", { name: "ลบทักษะนี้" })).toBeDisabled();
    await expect(submit(page)).toBeDisabled();
    expect(api.gets("skill-proofs").length).toBeGreaterThanOrEqual(1);
    expect(api.unmocked).toEqual([]);
  });

  test("a turned-down proof the reviewer gave no reason for says so", async ({ page }) => {
    const api = await mockApi(page, [proof("p-c", SKILL.c, "c.jpg", "REJECTED", null, "2026-09-01T03:00:02.000Z")]);
    await resubmitToStage3(page);

    await expect(cards(page)).toHaveCount(1);
    await expect(card(page, SKILL.c)).toContainText("ผู้ตรวจสอบไม่ได้ระบุเหตุผลไว้");
    await expect(card(page, SKILL.c).getByRole("button", { name: "เลือกไฟล์หรือถ่ายรูป" })).toBeVisible();
    expect(api.unmocked).toEqual([]);
  });

  test("A13: the sent cards fit at 1440 and 390", async ({ page }, testInfo) => {
    const api = await mockApi(page, SENT);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await resubmitToStage3(page);
    await expectSentCards(page);

    for (const [width, height] of [[1440, 1000], [390, 844]] as const) {
      await page.setViewportSize({ width, height });
      await expect(cards(page)).toHaveCount(4);
      await page.screenshot({ path: testInfo.outputPath(`stage-3-resubmit-${width}.png`), fullPage: true });
      if (width === 390) {
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      }
      const overflowing = await page.evaluate(() =>
        Array.from(document.querySelectorAll("section[aria-label] h2, section[aria-label] p"))
          .filter((element) => element.scrollWidth > element.clientWidth)
          .map((element) => element.textContent),
      );
      expect(overflowing, `text cut off at ${width}`).toEqual([]);
    }
    expect(api.unmocked).toEqual([]);
  });

  test("a new card naming a skill already sent is refused before anything is posted", async ({ page }) => {
    const api = await mockApi(page, SENT);
    await resubmitToStage3(page);
    await expectSentCards(page);

    const offered = await page.locator("datalist option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
    expect(offered).toEqual([SKILL.e.name]);

    await page.getByRole("button", { name: "เพิ่มทักษะ" }).click();
    await expect(cards(page)).toHaveCount(5);
    const added = page.getByRole("region", { name: "ทักษะที่ 5" });
    await added.getByRole("combobox", { name: "ทักษะ" }).fill(SKILL.b.name);
    const named = card(page, SKILL.b).last();
    await expect(named.getByRole("combobox", { name: "ทักษะ" })).toHaveAttribute("aria-invalid", "true");
    await expect(named).toContainText("ทักษะนี้อยู่ในใบสมัครแล้ว");
    await expect(submit(page)).toBeDisabled();
    expect(api.posts("skill-proofs")).toHaveLength(0);
    expect(api.unmocked).toEqual([]);
  });
});
