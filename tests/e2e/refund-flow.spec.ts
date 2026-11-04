import type { Locator } from "@playwright/test";
import { expect, test, type Page } from "./support/coverage";
import { before, ids, mockRefundApi, names, type RefundScenario } from "./support/refund-api";

const refundPage = `/bookings/refund?bookingId=${ids.booking}`;
const sizes = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

/** What the reader sees: the rendered size, zoom included (the desktop frame is drawn at 1710 and scaled). */
async function shown(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const zoom = element instanceof HTMLElement && element.offsetWidth ? box.width / element.offsetWidth : 1;
    return {
      height: Math.round(box.height),
      width: Math.round(box.width),
      x: Math.round(box.x),
      fontSize: Math.round(Number.parseFloat(getComputedStyle(element).fontSize) * zoom),
    };
  });
}

/** One row of the card at 1440 as drawn: a step's two lines and the gap after them. */
const ROW = 64;

/** Next keeps an empty route announcer in the alert role, so an alert is found by what it says. */
function alertSaying(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

async function open(page: Page, scenario: RefundScenario, width = 1440) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  const api = await mockRefundApi(page, scenario);
  await page.goto(refundPage);
  return api;
}

for (const size of sizes) {
  test.describe(`at ${size.name}`, () => {
    test("a paid booking three days out goes from the popup to a full refund, and the page turns into its status", async ({ page }) => {
      await page.setViewportSize(size);
      const api = await mockRefundApi(page, { startsIn: before.days(3) });
      await page.goto(`/bookings?bookingId=${ids.booking}`);

      const popup = page.getByRole("dialog");
      await expect(popup.getByText(/^ยกเลิกได้ คืนเต็มจำนวน ถึง /)).toBeVisible();
      await expect(popup.getByRole("button", { name: "ยกเลิกการจอง", exact: true })).toHaveCount(0);
      await popup.getByRole("button", { name: "ยกเลิกและรับเงินคืน", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/bookings/refund\\?bookingId=${ids.booking}$`));

      const title = page.getByRole("heading", { level: 1 });
      await expect(title).toHaveText("ยกเลิกการจอง · คืนเต็มจำนวน");
      await expect(page.getByText("฿1,000", { exact: true })).toBeVisible();
      const rows = page.getByRole("listitem").filter({ has: page.getByText("ตอนนี้", { exact: true }) });
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText("คืนเต็มจำนวน");
      await expect(page.getByRole("navigation", { name: /breadcrumb|เส้นทาง/i })).toHaveCount(0);

      const amount = await shown(page.getByText("฿1,000", { exact: true }));
      expect(amount.fontSize).toBe(size.width === 1440 ? 32 : 24);
      const status = await shown(title);
      expect(status.fontSize).toBe(size.width === 1440 ? 14 : 12);
      const confirm = page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" });
      const pill = await shown(confirm);
      expect(pill.height).toBe(size.width === 1440 ? 47 : 44);
      const card = await shown(page.locator("article").filter({ has: title }));
      if (size.width === 1440) {
        expect(Math.abs(pill.x + pill.width / 2 - (card.x + card.width / 2)), "centred under the whole card").toBeLessThanOrEqual(1);
        expect(pill.width, "the receipt's column").toBe(485);
      } else {
        expect([pill.x, pill.width], "the card's own width").toEqual([card.x, card.width]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);

      await confirm.click();
      await expect(title).toHaveText("ส่งเรื่องคืนเงินแล้ว");
      await expect(page).toHaveURL(new RegExp(`/bookings/refund\\?bookingId=${ids.booking}$`));
      await expect(page.getByRole("list").filter({ hasText: "ยกเลิกการจองแล้ว" }).getByRole("listitem")).toHaveCount(3);
      await expect(page.getByText("รอทีมงานตรวจสอบ")).toHaveCount(0);
      expect(api.calls).toEqual([`POST /bookings/${ids.booking}/cancel`, "POST /refunds"]);
      expect(api.reasons[0]?.split("\n")[0]).toBe("ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000");
    });

    test("inside 24 hours the refund is half the service fee, itemised", async ({ page }) => {
      await open(page, { startsIn: before.hours(5) }, size.width);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("ยกเลิกการจอง · คืน 50% ของค่าบริการ");
      await expect(page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿400" })).toBeVisible();
      await expect(page.getByText("ค่าบริการ · คืน 50%")).toBeVisible();
      await expect(page.getByText("ค่าบริการแพลตฟอร์ม · ไม่คืน")).toBeVisible();
      await expect(page.getByText("รวมได้คืน")).toBeVisible();
      const now = page.getByRole("listitem").filter({ has: page.getByText("ตอนนี้", { exact: true }) });
      await expect(now).toContainText("คืน 50% ของค่าบริการ");
    });

    test("the report form says what is missing instead of greying its button, and sending never cancels", async ({ page }) => {
      const api = await open(page, { startsIn: -before.hours(2) }, size.width);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("แจ้งปัญหาและขอคืนเงิน");
      const send = page.getByRole("button", { name: "ส่งคำขอคืนเงิน" });
      await expect(send).toBeEnabled();
      expect((await shown(send)).height).toBe(size.width === 1440 ? 47 : 44);

      await send.click();
      await expect(alertSaying(page, "เลือกว่าเกิดอะไรขึ้นก่อนส่ง")).toBeVisible();
      const group = page.getByRole("radiogroup");
      await expect(group).toHaveAttribute("aria-invalid", "true");
      expect(await group.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      expect(api.calls).toEqual([]);

      // 44 on a phone; from lg the chat report's own row (min-h-12 in the zoomed frame).
      for (const option of await page.getByRole("radio").all()) {
        expect((await shown(option.locator("xpath=ancestor::label[1]"))).height).toBeGreaterThanOrEqual(size.width === 390 ? 44 : 40);
      }
      const details = page.getByRole("textbox");
      if (size.width === 390) expect((await shown(details)).fontSize).toBe(16);

      await page.getByRole("radio", { name: "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน" }).check();
      await details.fill("รอในห้อง 20 นาที");
      await send.click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("รอทีมงานตรวจสอบ");
      expect(api.calls).toEqual(["POST /refunds"]);
      expect(api.reasons).toEqual(["ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน\n\nรอในห้อง 20 นาที"]);
      expect(api.booking().state).toBe("BOOKED");
    });
  });
}

test("a cancel that stood while the refund did not lands on one press to claim it", async ({ page }) => {
  const api = await open(page, { startsIn: before.days(3), openAnswer: "fail" });
  await page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click();
  await expect(alertSaying(page, "ยกเลิกการจองแล้ว แต่ยังส่งเรื่องคืนเงินไม่สำเร็จ")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("การจองนี้ยกเลิกแล้ว");
  await expect(page.getByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeVisible();
  expect(api.calls).toEqual([`POST /bookings/${ids.booking}/cancel`, "POST /refunds"]);
});

test("a cancel that did not go through says the booking is unchanged", async ({ page }) => {
  const api = await open(page, { startsIn: before.days(3), cancelAnswer: "fail" });
  await page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click();
  await expect(alertSaying(page, "ยกเลิกไม่สำเร็จ การจองยังอยู่เหมือนเดิม")).toBeVisible();
  expect(api.calls.filter((call) => call === "POST /refunds")).toEqual([]);
});

test("a booking the advisor cancelled is owed the whole charge with one press", async ({ page }) => {
  const api = await open(page, { startsIn: before.days(2), cancelled: { by: "advisor", before: before.days(2) + before.hours(1) } });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("การจองนี้ยกเลิกแล้ว");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ส่งเรื่องคืนเงินแล้ว");
  expect(api.calls).toEqual(["POST /refunds"]);
  expect(api.reasons[0]?.split("\n")[0]).toBe("ที่ปรึกษาหรือทีมงานยกเลิก · คืนเต็มจำนวน ฿1,000");
});

test("a late cancellation of the advisee's own is owed half the service fee", async ({ page }) => {
  await open(page, { startsIn: before.days(1), cancelled: { by: "advisee", before: before.hours(3) } });
  await expect(page.getByRole("button", { name: "รับเงินคืน ฿400" })).toBeVisible();
  await expect(page.getByText("รวมได้คืน")).toBeVisible();
});

test("a rescheduled booking says nothing about money", async ({ page }) => {
  await open(page, { startsIn: before.days(2), cancelled: { by: "advisee", before: before.days(3) }, invoice: { movedBy: before.days(7) } });
  await expect(page.getByText("ไม่มียอดที่ต้องคืน")).toBeVisible();
  await expect(page.getByRole("button", { name: /฿/ })).toHaveCount(0);
});

test.describe("a request's status", () => {
  test("an open report is reviewed by the team and takes more evidence", async ({ page }) => {
    await open(page, { startsIn: -before.days(1), cases: [{ status: "OPEN", createdAgo: before.hours(5) }] });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("รอทีมงานตรวจสอบ");
    await expect(page.getByText("ทีมงาน Advisory ตรวจสอบ")).toBeVisible();
    await expect(page.getByRole("button", { name: "ส่งคำขอคืนเงิน" })).toHaveCount(0);
    await expect(page.getByText("แนบหลักฐานเพิ่ม")).toBeVisible();
  });

  test("an approved request waits on the refund, and never says the money is back or on its way", async ({ page }) => {
    await open(page, { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "APPROVED", createdAgo: before.days(1) }] });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("อนุมัติแล้ว · รอคืนเงิน");
    await expect(page.getByText("รอดำเนินการคืนเงิน แล้วเงินเข้าตามรอบของธนาคารผู้ออกบัตร")).toBeVisible();
    await expect(page.getByText(/คืนเงินแล้ว|กำลังคืน/)).toHaveCount(0);
  });

  test("a rejected request ends at the team, with support as the way on", async ({ page }) => {
    await open(page, { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "REJECTED", createdAgo: before.days(1) }] });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ไม่อนุมัติคืนเงิน");
    await expect(page.getByRole("link", { name: "ติดต่อฝ่ายช่วยเหลือ" }).first()).toHaveAttribute("href", /INV-2026-001104/);
  });

  test("a refunded invoice points at its receipt", async ({ page }) => {
    await open(page, { startsIn: -before.days(2), state: "COMPLETED", invoice: { status: "refunded", refundSatang: 100_000 } });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("คืนเงินแล้ว");
    // A capsule that is a link: Base UI draws it as an anchor in the button role.
    await expect(page.getByRole("button", { name: "ดูใบเสร็จ" })).toHaveAttribute("href", `/transactions/detail?id=${ids.invoice}`);
  });
});

/**
 * Where each cell's last section ends, on screen. The grid gives both cells
 * one height, so the gap between the two is the blank the shorter one shows.
 * A foot runs under both and is no cell's.
 */
async function cellEnds(page: Page) {
  return page.locator("article").first().evaluate((card) => {
    const end = (cell: string) =>
      Math.max(0, ...[...card.querySelectorAll(`:scope > [data-cell="${cell}"] section`)].map((section) => section.getBoundingClientRect().bottom));
    const foot = card.querySelector(':scope > [data-cell="foot"]');
    return {
      left: Math.round(Math.max(end("head"), end("aside"))),
      right: Math.round(end("sections")),
      foot: foot ? Math.round(foot.getBoundingClientRect().top) : null,
    };
  });
}

test.describe("at 1440 the card's two cells end level", () => {
  const scenes: readonly (readonly [string, RefundScenario])[] = [
    ["cancel, full", { startsIn: before.days(3) }],
    ["cancel, half", { startsIn: before.hours(5) }],
    ["claim, half", { startsIn: before.days(1), cancelled: { by: "advisee", before: before.hours(3) } }],
    ["claim, full", { startsIn: before.days(2), cancelled: { by: "advisor", before: before.days(2) + before.hours(1) } }],
    ["status of a cancellation", { startsIn: before.days(2), cancelled: { by: "advisee", before: before.days(3) }, cases: [{ status: "OPEN", createdAgo: before.hours(5) }] }],
    ["report", { startsIn: -before.hours(2) }],
    ["status of a report", { startsIn: -before.days(1), cases: [{ status: "OPEN", createdAgo: before.hours(5) }] }],
  ];
  for (const [name, scene] of scenes) {
    test(name, async ({ page }) => {
      await open(page, scene);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const ends = await cellEnds(page);
      expect(Math.abs(ends.left - ends.right), `left ends at ${ends.left}, right at ${ends.right}`).toBeLessThanOrEqual(ROW);
      if (ends.foot !== null) expect(ends.foot, "the foot starts under both cells").toBeGreaterThanOrEqual(Math.max(ends.left, ends.right));
    });
  }

  test("on a phone the half refund reads head, box, then the rule, one under the other", async ({ page }) => {
    await open(page, { startsIn: before.hours(5) }, 390);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const order = await page.locator("article").first().evaluate((card) =>
      [...card.querySelectorAll("h1, h2")].map((heading) => [heading.textContent, Math.round(heading.getBoundingClientRect().top)] as const),
    );
    expect(order.map(([name]) => name)).toEqual(["ยกเลิกการจอง · คืน 50% ของค่าบริการ", "ยอดที่ได้คืน", "เงื่อนไขการยกเลิก"]);
    expect(order.map(([, y]) => y)).toEqual([...order.map(([, y]) => y)].sort((a, b) => a - b));
  });
});

test("past seven days after the end the window is closed, with the day it closed", async ({ page }) => {
  await open(page, { startsIn: -before.days(8) });
  await expect(page.getByText("เลยระยะขอคืนเงินแล้ว")).toBeVisible();
  await expect(page.getByText(/^ขอคืนเงินได้ถึง /)).toBeVisible();
  await expect(page.getByRole("button", { name: "ส่งคำขอคืนเงิน" })).toHaveCount(0);
});

test("a booking that is not this account's is not found, and a failed read can be retried", async ({ page }) => {
  await open(page, { startsIn: before.days(3), bookingStatus: 404 });
  await expect(page.getByText("ไม่พบการจองนี้")).toBeVisible();
  await expect(page.getByRole("link", { name: "ไปที่การจองของฉัน" })).toHaveAttribute("href", "/bookings");
});

test("a failed read offers to try again", async ({ page }) => {
  await open(page, { startsIn: before.days(3), bookingStatus: 500 });
  await expect(page.getByRole("button", { name: "ลองอีกครั้ง" })).toBeVisible();
});

test("the popup of a finished booking offers one way to report, with the last day", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRefundApi(page, { startsIn: -before.days(1) });
  await page.goto(`/bookings?bookingId=${ids.booking}`);
  const popup = page.getByRole("dialog");
  await expect(popup.getByText("เลยเวลานัดแล้ว")).toBeVisible();
  await expect(popup.getByText(/^แจ้งปัญหาและขอคืนเงินได้ถึง /)).toBeVisible();
  await expect(popup.getByRole("button", { name: "ขอคืนเงิน", exact: true })).toHaveCount(1);
  await expect(popup.getByText(names.service).first()).toBeVisible();
});
