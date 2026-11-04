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

/** WCAG contrast of an element's text on its own background, both as computed. */
async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const channels = (colour: string) => {
      const probe = document.createElement("canvas").getContext("2d");
      if (!probe) throw new Error("no 2d context");
      probe.fillStyle = colour;
      probe.fillRect(0, 0, 1, 1);
      return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (colour: string) => {
      const [r, g, b] = channels(colour).map((value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [light, dark] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
  });
}

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
      // A paid booking's move is withheld (the API would read the moved original as owed its refund);
      // where it would be, the popup gives the way to another time by the same deadline.
      await expect(popup.getByRole("button", { name: "เปลี่ยนเวลานัด", exact: true })).toHaveCount(0);
      await expect(popup.getByRole("button", { name: "ขอเปลี่ยนเวลานัด", exact: true })).toHaveCount(0);
      const another = popup.getByText(/^ต้องการ⁠เวลา⁠อื่น /);
      await expect(another).toBeVisible();
      expect((await another.textContent())?.replaceAll("⁠", "")).toMatch(/^ต้องการเวลาอื่น ยกเลิกรับเงินคืนเต็มจำนวนได้ถึง .+ แล้วจองเวลาใหม่$/);
      await popup.getByRole("button", { name: "ยกเลิกและรับเงินคืน", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/bookings/refund\\?bookingId=${ids.booking}$`));

      const title = page.getByRole("heading", { level: 1 });
      await expect(title).toHaveText("ยกเลิกการจอง · คืนเต็มจำนวน");
      await expect(page.getByText("฿1,000", { exact: true })).toBeVisible();
      const rows = page.getByRole("listitem").filter({ has: page.getByText("ตอนนี้", { exact: true }) });
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText("คืนเต็มจำนวน");
      const nowPill = page.getByText("ตอนนี้", { exact: true });
      expect(await contrast(nowPill), "the now pill's ink on its ground").toBeGreaterThanOrEqual(4.5);
      expect((await shown(nowPill)).fontSize, "no smaller than the row's sub line").toBe(12);
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
      // Before the press: the cancel is at once, the refund waits on the team. His question, answered where he presses.
      const waits = page.getByText(/^ยกเลิกมีผลทันทีและย้อนกลับไม่ได้ ส่วนเงินคืนรอทีมงานยืนยันภายใน 14 วันทำการ แล้วคืนเข้า Visa/);
      await expect(waits).toBeVisible();
      expect((await shown(waits)).fontSize).toBe(12);
      expect((await waits.boundingBox())!.y).toBeLessThan((await confirm.boundingBox())!.y);

      await confirm.click();
      await expect(title).toHaveText("ส่งเรื่องคืนเงินแล้ว");
      await expect(page).toHaveURL(new RegExp(`/bookings/refund\\?bookingId=${ids.booking}$`));
      // The press is a step of its own now done, so the trail after it never reads as the one before it.
      const trail = page.getByRole("list").filter({ hasText: "ยกเลิกการจองแล้ว" }).getByRole("listitem");
      await expect(trail).toHaveCount(4);
      await expect(trail.nth(1)).toContainText("ส่งเรื่องคืนเงินแล้ว");
      await expect(trail.nth(2)).toHaveAttribute("aria-current", "true");
      await expect(page.getByText("รอทีมงานตรวจสอบ")).toHaveCount(0);
      expect(api.calls).toEqual([`POST /bookings/${ids.booking}/cancel`, "POST /refunds"]);
      expect(api.reasons[0]?.split("\n")[0]).toBe("ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000");

      // Back where it started: the popup now reads the request, one row to it, and no way to cancel again.
      const back = size.width === 1440
        ? page.getByRole("link", { name: "กลับไปที่การจอง" })
        : page.getByRole("button", { name: "กลับไปที่การจอง" });
      await back.click();
      await expect(page).toHaveURL(new RegExp(`/bookings\\?bookingId=${ids.booking}$`));
      const after = page.getByRole("dialog");
      const row = after.getByRole("link", { name: "เงินคืน ฿1,000 · ส่งเรื่องคืนเงินแล้ว" });
      await expect(row).toHaveAttribute("href", refundPage);
      // Measured once the popup has finished growing in, not mid-way through its opening scale.
      await after.evaluate((dialog) => Promise.all(dialog.getAnimations({ subtree: true }).map((run) => run.finished)));
      expect((await shown(row)).height).toBeGreaterThanOrEqual(44);
      for (const name of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "รับเงินคืน ฿1,000"]) {
        await expect(after.getByRole("button", { name, exact: true })).toHaveCount(0);
      }
      expect(api.calls).toHaveLength(2);
    });

    test("inside 24 hours the refund is half the service fee, itemised", async ({ page }) => {
      await open(page, { startsIn: before.hours(5) }, size.width);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("ยกเลิกการจอง · คืน 50% ของค่าบริการ");
      await expect(page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿400" })).toBeVisible();
      // From what was paid to what comes back: each fee with its base, then what of it is refunded.
      await expect(page.getByText("ค่าบริการ ฿800 · คืน 50%")).toBeVisible();
      await expect(page.getByText("ค่าบริการแพลตฟอร์ม ฿200 · ไม่คืน")).toBeVisible();
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

test("a report sent after another tab opened one says so, and sends none of this form's files", async ({ page }) => {
  const api = await open(page, { startsIn: -before.hours(2), openAnswer: "taken" });
  await page.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }).check();
  await page.getByRole("textbox").fill("หน้าจอค้าง");
  await page.locator('input[type="file"]').setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  await page.getByRole("button", { name: "ส่งคำขอคืนเงิน" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("รอทีมงานตรวจสอบ");
  await expect(alertSaying(page, "มีคำขอคืนเงินของการจองนี้เปิดอยู่แล้ว รายละเอียดและไฟล์ที่คุณกรอกจึงยังไม่ได้ส่ง")).toBeVisible();
  expect(api.calls).toEqual(["POST /refunds"]);
});

test("a report pressed again after its first answer was lost is taken as its own, and its files go with it", async ({ page }) => {
  const api = await open(page, { startsIn: -before.hours(2), openAnswer: "lost" });
  await page.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }).check();
  await page.getByRole("textbox").fill("หน้าจอค้าง");
  await page.locator('input[type="file"]').setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  const send = page.getByRole("button", { name: "ส่งคำขอคืนเงิน" });
  await send.click();
  await expect(alertSaying(page, "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง")).toBeVisible();

  await send.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("รอทีมงานตรวจสอบ");
  await expect(page.getByText("ยังไม่ได้ส่ง")).toHaveCount(0);
  expect(api.calls).toEqual(["POST /refunds", "POST /refunds", `POST /refunds/${ids.refund}/evidence`]);
  expect(api.reasons[0]).toBe(api.reasons[1]);
});

test("an advisor's cancel that got there first files nothing, and the page claims the whole charge it owes", async ({ page }) => {
  const api = await open(page, { startsIn: before.hours(5), cancelAnswer: "taken" });
  await page.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿400" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("การจองนี้ยกเลิกแล้ว");
  await expect(alertSaying(page, "การจองนี้ถูกยกเลิกแล้ว ยอดคืนด้านบนคิดตามผู้ยกเลิกและเวลาที่ยกเลิก")).toBeVisible();
  await expect(page.getByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeVisible();
  await expect(page.getByText("฿400")).toHaveCount(0);
  expect(api.calls).toEqual([`POST /bookings/${ids.booking}/cancel`]);
});

test("a booked appointment with no receipt of its own is paid on the earlier booking: support, no cancel, no price", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRefundApi(page, { startsIn: before.days(3), invoice: null });
  await page.goto(`/bookings?bookingId=${ids.booking}`);
  const popup = page.getByRole("dialog");
  await expect(popup.getByText("ชำระไว้กับการจองเดิมก่อนเปลี่ยนเวลา ติดต่อฝ่ายช่วยเหลือเรื่องการจองนี้")).toBeVisible();
  for (const name of ["ยกเลิกการจอง", "ยกเลิกและรับเงินคืน", "เปลี่ยนเวลานัด", "ขอเปลี่ยนเวลานัด"]) {
    await expect(popup.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await expect(popup.getByText(/฿/)).toHaveCount(0);

  await page.goto(refundPage);
  await expect(page.getByText("ชำระไว้กับการจองเดิม", { exact: true })).toBeVisible();
  const support = page.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" });
  // The subject names the booking (service, day, id), so support can find it.
  const subject = decodeURIComponent((await support.getAttribute("href")) ?? "");
  expect(subject).toMatch(new RegExp(`^mailto:[^?]+\\?subject=สอบถามการจอง ${names.service} วันที่ .+ · ${ids.booking}$`));
  expect((await shown(support)).height).toBeGreaterThanOrEqual(44);
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
    await expect(page.getByText("รอทีมงานดำเนินการคืนเงิน แล้วเงินเข้าตามรอบของธนาคาร⁠ผู้ออกบัตร")).toBeVisible();
    await expect(page.getByText(/คืนเงินแล้ว|กำลังคืน/)).toHaveCount(0);
  });

  test("a rejected request ends at the team, with support as the way on", async ({ page }) => {
    await open(page, { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "REJECTED", createdAgo: before.days(1) }] });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ไม่อนุมัติคืนเงิน");
    // Two steps, the second the refusal: nothing is left to come, and the pill is the way on.
    await expect(page.getByRole("list").filter({ hasText: "ไม่อนุมัติ" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("ถ้ามีคำถามเกี่ยวกับผลนี้")).toHaveCount(0);
    // The card only paid; nothing goes back to it.
    await expect(page.getByText("ชำระด้วย", { exact: true })).toBeVisible();
    await expect(page.getByText("คืนเข้า", { exact: true })).toHaveCount(0);
    // One way to support: the pill, with no help line under it saying the same.
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" })).toHaveAttribute("href", /INV-2026-001104/);
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
    ["report of a recorded no-show", { startsIn: -before.hours(2), state: "NO_SHOW" }],
    ["status of a report", { startsIn: -before.days(1), cases: [{ status: "OPEN", createdAgo: before.hours(5) }] }],
    ["status, approved", { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "APPROVED", createdAgo: before.days(1) }] }],
    ["status, rejected", { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "REJECTED", createdAgo: before.days(1) }] }],
    ["refunded with no request, after the session", { startsIn: -before.days(2), state: "COMPLETED", invoice: { status: "refunded", refundSatang: 100_000 } }],
    ["refunded with no request, cancelled", { startsIn: before.days(2), cancelled: { by: "advisor", before: before.days(3) }, invoice: { status: "refunded", refundSatang: 100_000 } }],
  ];
  for (const [name, scene] of scenes) {
    test(name, async ({ page }) => {
      await open(page, scene);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const ends = await cellEnds(page);
      // A card with no right cell has its head across the width, and nothing stands beside it to end level with.
      if (ends.right > 0) {
        expect(Math.abs(ends.left - ends.right), `left ends at ${ends.left}, right at ${ends.right}`).toBeLessThanOrEqual(ROW);
      }
      if (ends.foot !== null) expect(ends.foot, "the foot starts under both cells").toBeGreaterThanOrEqual(Math.max(ends.left, ends.right));
    });
  }

  /**
   * Where each foot row's mark starts, against the head's columns: a two-cell
   * head's two fact columns, then its right cell's text and, for a fourth row,
   * that cell's second column at the left cell's spacing; or a wide head's
   * four fact columns.
   */
  async function footOnHead(page: Page) {
    return page.locator("article").first().evaluate((card) => {
      const x = (node: Element | null) => (node ? Math.round(node.getBoundingClientRect().x * 10) / 10 : null);
      const head = card.querySelector(':scope > [data-cell="head"]');
      const facts = [...card.querySelectorAll('[data-cell="head"] dt')].map(x);
      const right = x(card.querySelector('[data-cell="sections"] h2'));
      const pair = (facts[1] ?? 0) - (facts[0] ?? 0);
      // The third row carries the right cell's divider as its border, which the fourth does not.
      const third = card.querySelectorAll('[data-cell="foot"] li')[2];
      const divider = third ? parseFloat(getComputedStyle(third).borderLeftWidth) : 0;
      const columns = head?.hasAttribute("data-wide") ? facts : [facts[0], facts[1], right, right === null ? null : right + pair - divider];
      const rows = [...card.querySelectorAll('[data-cell="foot"] li')].map((row) => x(row.querySelector(":scope > svg")));
      return { columns, rows };
    });
  }

  for (const [name, scene] of [
    ["cancel, half", { startsIn: before.hours(5) }],
    ["claim, half", { startsIn: before.days(1), cancelled: { by: "advisee", before: before.hours(3) } }],
    ["status, rejected", { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "REJECTED", createdAgo: before.days(1) }] }],
    ["refunded with no request, cancelled", { startsIn: before.days(2), cancelled: { by: "advisor", before: before.days(3) }, invoice: { status: "refunded", refundSatang: 100_000 } }],
  ] as const) {
    test(`${name}: the foot's rows stand on the head's columns`, async ({ page }) => {
      await open(page, scene as RefundScenario);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const { columns, rows } = await footOnHead(page);
      expect(rows.length).toBeGreaterThan(1);
      rows.forEach((row, i) => expect(Math.abs((row ?? 0) - (columns[i] ?? -99)), `row ${i + 1} at ${row}, column at ${columns[i]}`).toBeLessThanOrEqual(1));
    });
  }

  test("the report form stays in one place under the head, reasons beside details, evidence under the reasons", async ({ page }) => {
    await open(page, { startsIn: -before.hours(2) });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("แจ้งปัญหาและขอคืนเงิน");
    const layout = await page.locator("article").first().evaluate((card) => {
      const box = (node: Element | null) => node!.getBoundingClientRect();
      const facts = [...card.querySelectorAll('[data-cell="head"] dt')].map((dt) => Math.round(box(dt).x));
      const reasons = box(card.querySelector('[role="radiogroup"]'));
      const details = box(card.querySelector("textarea"));
      const evidence = box(card.querySelector('input[type="file"]')!.closest("label"));
      return { facts, reasons: [Math.round(reasons.x + 8), Math.round(reasons.bottom)], details: [Math.round(details.x), Math.round(details.top)], evidence: [Math.round(evidence.x), Math.round(evidence.top)], counter: Math.round(box(card.querySelector("textarea")!.parentElement).bottom) };
    });
    expect(layout.reasons[0], "reasons on the first fact column").toBeLessThanOrEqual(layout.facts[0] + 1);
    expect(Math.abs(layout.details[0] - layout.facts[2]), "details on the third fact column").toBeLessThanOrEqual(1);
    expect(Math.abs(layout.reasons[1] - layout.counter), "the two columns end level").toBeLessThanOrEqual(2);
    expect(layout.evidence[1], "evidence under the reasons").toBeGreaterThan(layout.reasons[1]);
    expect(Math.abs(layout.evidence[0] - layout.facts[0])).toBeLessThanOrEqual(1);

    await page.keyboard.press("Tab");
    const order: string[] = [];
    for (let i = 0; i < 24; i += 1) {
      order.push(await page.evaluate(() => {
        const node = document.activeElement;
        if (!node) return "";
        if (node.getAttribute("role") === "radio") return "reason";
        if (node.tagName === "TEXTAREA") return "details";
        if (node instanceof HTMLInputElement && node.type === "file") return "evidence";
        return node.textContent?.trim() === "ส่งคำขอคืนเงิน" ? "send" : "";
      }));
      await page.keyboard.press("Tab");
    }
    const seen = order.filter(Boolean).filter((step, i, all) => all.indexOf(step) === i);
    expect(seen, "Tab meets the form in the order it is read").toEqual(["reason", "details", "evidence", "send"]);
  });

  // The skeleton is drawn for the common card: a service name of two lines on a phone, as names.service is.
  test("the skeleton is the loaded card's height, so nothing jumps when the money lands", async ({ page }) => {
    const scene: RefundScenario = { startsIn: before.days(2), cancelled: { by: "advisee", before: before.days(3) }, cases: [{ status: "OPEN", createdAgo: before.hours(5) }] };
    for (const width of [1440, 390]) {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await mockRefundApi(page, scene);
      await page.route(`**/payment/invoices/for-booking/${ids.booking}`, async (route) => {
        await held;
        await route.fallback();
      });
      await page.goto(refundPage);
      await expect(page.getByRole("status").filter({ hasText: "กำลังโหลดการจองและการชำระเงิน" })).toBeAttached();
      const height = async () => (await page.locator("article").first().boundingBox())?.height ?? 0;
      // The booking answers first, so the skeleton is drawn again under it: read it once it stands.
      await expect.poll(height).toBeGreaterThan(0);
      const bone = await height();
      release();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("ส่งเรื่องคืนเงินแล้ว");
      const loaded = await height();
      expect(Math.abs(bone - loaded), `${width}: skeleton ${bone}, loaded ${loaded}`).toBeLessThanOrEqual(2);
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  });

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

test.describe("in English at 390", () => {
  const scenes: readonly (readonly [string, RefundScenario, string])[] = [
    ["cancel, half", { startsIn: before.hours(5) }, "Cancel booking · 50% of the service fee back"],
    ["status, approved", { startsIn: -before.days(2), state: "COMPLETED", cases: [{ status: "APPROVED", createdAgo: before.days(1) }] }, "Approved · refund pending"],
    ["status, open cancellation", { startsIn: before.days(2), cancelled: { by: "advisee", before: before.days(3) }, cases: [{ status: "OPEN", createdAgo: before.hours(5) }] }, "Refund requested"],
  ];
  for (const [name, scene, heading] of scenes) {
    test(name, async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem("advisory.locale", "en"));
      await open(page, scene, 390);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByText(/bookingRefund\.|bookings\.[a-z]/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      const spill = await page.locator("article").first().evaluate((card) => {
        const edge = card.getBoundingClientRect();
        return [...card.querySelectorAll("h1, h2, p, dt, dd")]
          .filter((node) => node.scrollWidth > node.clientWidth + 1 || node.getBoundingClientRect().right > edge.right + 1)
          .map((node) => node.textContent);
      });
      expect(spill, "no line runs past its box or the card").toEqual([]);
    });
  }
});

test("past seven days after the end the window is closed, with the day it closed", async ({ page }) => {
  await open(page, { startsIn: -before.days(8) });
  await expect(page.getByText("เลยระยะขอคืนเงินแล้ว")).toBeVisible();
  await expect(page.getByText(/^ขอคืนเงินได้ถึง /)).toBeVisible();
  await expect(page.getByRole("button", { name: "ส่งคำขอคืนเงิน" })).toHaveCount(0);
});

test("a booking that is not this account's is not found, with a 44 px way to the bookings at 390", async ({ page }) => {
  await open(page, { startsIn: before.days(3), bookingStatus: 404 }, 390);
  await expect(page.getByText("ไม่พบการจองนี้")).toBeVisible();
  const pill = page.getByRole("button", { name: "ไปที่การจองของฉัน" }).filter({ hasText: "ไปที่การจองของฉัน" });
  await expect(pill).toHaveAttribute("href", "/bookings");
  expect((await shown(pill)).height).toBeGreaterThanOrEqual(44);
});

test("a failed read offers to try again, 44 px tall at 390", async ({ page }) => {
  await open(page, { startsIn: before.days(3), bookingStatus: 500 }, 390);
  const retry = page.getByRole("button", { name: "ลองอีกครั้ง" });
  await expect(retry).toBeVisible();
  expect((await shown(retry)).height).toBeGreaterThanOrEqual(44);
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
