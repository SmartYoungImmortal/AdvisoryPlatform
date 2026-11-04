import { expect, test, type Page, type Route } from "./support/coverage";

const A = { id: "11111111-1111-4111-8111-111111111111", displayName: "ที่ปรึกษาทดสอบ เอ" };
const B = { id: "22222222-2222-4222-8222-222222222222", displayName: "ที่ปรึกษาทดสอบ บี" };
const profile = (id: string) => `/advisors/sarah-jenskins?advisorId=${id}`;

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ statusCode: 200, message: "OK", data }),
  });
}

const empty = { items: [], total: 0, page: 1, limit: 50, totalPages: 0 };

/** The page's own content: Next's route announcer reads the old `h1` aloud during the switch, outside it. */
const onPage = (page: Page, text: string) => page.locator("body > :not(next-route-announcer)").getByText(text);

/** An anonymous visitor, two published advisors with nothing else on their profiles. */
async function mockApi(page: Page) {
  const unanswered: string[] = [];
  await page.route("http://localhost:3200/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const advisor = [A, B].find((item) => pathname.startsWith(`/api/v1/advisors/${item.id}`));
    if (advisor) {
      const rest = pathname.slice(`/api/v1/advisors/${advisor.id}`.length);
      if (rest === "") {
        return fulfill(route, {
          ...advisor,
          headline: "ภาษีบุคคลธรรมดา",
          bio: null,
          avatarKey: null,
          image: null,
          skills: [],
          publishedServiceCount: 0,
        });
      }
      if (rest === "/background") return fulfill(route, { experiences: [], educations: [], languages: [], credentials: [] });
      if (rest === "/portfolio") return fulfill(route, []);
      if (rest === "/reviews/summary") return fulfill(route, { average: 0, total: 0, distribution: [] });
      if (rest === "/reviews") return fulfill(route, empty);
    }
    if (pathname === "/api/v1/services") return fulfill(route, empty);
    if (pathname === "/api/v1/advisors") return fulfill(route, empty);
    if (pathname === "/api/v1/service-categories") return fulfill(route, empty);
    if (pathname === "/api/v1/matching/status") return fulfill(route, { ai: false });
    if (pathname === "/api/v1/users/me") {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ statusCode: 401, message: "Unauthorized" }),
      });
    }
    unanswered.push(`${route.request().method()} ${pathname}`);
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ statusCode: 404, message: "Not Found" }) });
  });
  return unanswered;
}

/** Every script error and console error, less the 401 an anonymous `users/me` answers. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().includes("status of 401")) return;
    errors.push(`console: ${message.text()} ${message.location().url}`);
  });
  return errors;
}

test.describe("FE #108: a link to the same route with a new query", () => {
  test("router.push to another advisorId shows that advisor without a reload, and back returns", async ({ page }) => {
    const unanswered = await mockApi(page);
    const errors = watchErrors(page);
    await page.goto(profile(A.id));
    await expect(page.getByText(A.displayName).first()).toBeVisible();
    await page.evaluate(() => Object.assign(window, { __marker: 1 }));

    await page.evaluate((href) => {
      (window as unknown as { next: { router: { push: (href: string) => void } } }).next.router.push(href);
    }, profile(B.id));
    await expect(page.getByText(B.displayName).first()).toBeVisible({ timeout: 5_000 });
    await expect(onPage(page, A.displayName)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker), "no reload").toBe(1);

    await page.goBack();
    await expect(page.getByText(A.displayName).first()).toBeVisible({ timeout: 5_000 });
    await expect(onPage(page, B.displayName)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker), "no reload").toBe(1);

    expect(errors).toEqual([]);
    expect(unanswered).toEqual([]);
  });

  test("the page's own history.pushState to another advisorId is followed too", async ({ page }) => {
    await mockApi(page);
    const errors = watchErrors(page);
    await page.goto(profile(A.id));
    await expect(page.getByText(A.displayName).first()).toBeVisible();
    await page.evaluate((href) => window.history.pushState(null, "", href), profile(B.id));
    await expect(page.getByText(B.displayName).first()).toBeVisible({ timeout: 5_000 });
    await expect(onPage(page, A.displayName)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a full load of a profile hydrates without a mismatch", async ({ page }) => {
    await mockApi(page);
    const errors = watchErrors(page);
    await page.goto(profile(A.id));
    await expect(page.getByText(A.displayName).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(A.displayName).first()).toBeVisible();
    expect(errors.filter((line) => /hydrat|did not match/i.test(line))).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("history.pushState on /matching raises no error", async ({ page }) => {
    await mockApi(page);
    const errors = watchErrors(page);
    await page.goto("/matching?q=tax");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.history.pushState(null, "", "/matching?q=inheritance"));
    await expect.poll(() => page.evaluate(() => window.location.search)).toBe("?q=inheritance");
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
