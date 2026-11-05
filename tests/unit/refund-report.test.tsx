import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";

// refund-sheet reaches GSAP's ScrollTrigger through the receipt screens, and it reads matchMedia on load.
// A Base UI radio clicks its hidden input with a PointerEvent, which jsdom does not have.
vi.hoisted(() => {
  const media = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  Object.defineProperty(window, "matchMedia", { writable: true, value: media });
  window.PointerEvent ??= window.MouseEvent as typeof PointerEvent;
});

const actions = vi.hoisted(() => ({ openRefundOnce: vi.fn(), cancelThenRefund: vi.fn() }));
vi.mock("@/components/bookings/refund-actions", async (original) => ({ ...(await original<object>()), ...actions }));
const api = vi.hoisted(() => ({ uploadRefundEvidence: vi.fn(), cancelBooking: vi.fn() }));
vi.mock("@/lib/api/resources", async (original) => ({ ...(await original<object>()), ...api }));

import type { OpenedRefund } from "@/components/bookings/refund-actions";
import { ReportMode } from "@/components/bookings/refund-report";
import { ApiError } from "@/lib/api/client";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

/** A session that ran 3 Nov 2569, 15:00 to 16:00 Bangkok, reported a day later. */
const session = { startTime: "2026-11-03T08:00:00.000Z", endTime: "2026-11-03T09:00:00.000Z" };
const booking = {
  ...session,
  id: "1fba6ff8-1d9a-4aff-9a19-752c89fcd30d", state: "BOOKED", serviceId: "svc", advisorId: "adv", adviseeId: "me",
  unavailableUntil: session.endTime, blocksAvailability: true, cancelledAt: null, cancelledByUserId: null, createdAt: "2026-10-30T02:00:00.000Z",
} satisfies ApiBooking;
const invoice = {
  id: "inv-report", invoiceNumber: "INV-2026-000777", status: "paid", booking: "confirmed", session,
  amountSatang: 100_000, priceSatang: 80_000, platformFeeSatang: 20_000, refundSatang: null,
  createdAt: "2026-10-30T02:00:00.000Z", paidAt: "2026-10-30T02:01:00.000Z", card: { brand: "Visa", lastDigits: "1111" },
  service: { id: "svc", name: "วางแผนภาษีฟรีแลนซ์" }, advisor: { id: "adv", displayName: "กัญญา พรหมมา" },
} satisfies ApiAdviseeInvoice;
const opened: ApiRefundCase = { id: "case-9", invoiceId: invoice.id, reason: "", status: "OPEN", createdAt: "2026-11-04T05:00:00.000Z", resolvedAt: null };
/** The request this form wrote, and one another tab opened first, which carries nothing this form says. */
const ours: OpenedRefund = { refund: opened, alreadyOpen: false };
const theirs: OpenedRefund = { refund: opened, alreadyOpen: true };

function renderForm({
  offered = true,
  notice,
  state = booking.state,
}: { readonly offered?: boolean; readonly notice?: string; readonly state?: ApiBooking["state"] } = {}) {
  const onOpened = vi.fn();
  const exit = { kind: "report", maxSatang: 100_000, until: new Date("2026-11-10T09:00:00.000Z") } as const;
  render(
    <NextIntlClientProvider formats={formats} locale="th" messages={th} timeZone="Asia/Bangkok">
      <ReportMode booking={{ ...booking, state }} exit={exit} invoice={invoice} notice={notice} onOpened={onOpened} stillOffered={() => offered} />
    </NextIntlClientProvider>,
  );
  return onOpened;
}

const send = () => screen.getByRole("button", { name: "ส่งคำขอคืนเงิน" });
const details = () => screen.getByRole<HTMLTextAreaElement>("textbox");
const picker = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;

function file(name: string, type: string, bytes = 1024): File {
  const made = new File(["x"], name, { type });
  Object.defineProperty(made, "size", { value: bytes });
  return made;
}

function attach(...files: File[]) {
  fireEvent.change(picker(), { target: { files } });
}

const rows = () => [...document.querySelectorAll("li")].map((row) => row.textContent);
const reasons = () => within(screen.getByRole("radiogroup")).getAllByRole("radio").map((radio) => radio.closest("label")?.textContent);

/** True when the nodes come in this order in the page, as a reader and the Tab key meet them. */
function inOrder(...nodes: readonly Node[]): boolean {
  return nodes.every((node, i) => i === 0 || Boolean(nodes[i - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
}

describe("ReportMode", () => {
  it("heads the card with the most that can come back and the day reporting closes", () => {
    renderForm();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("แจ้งปัญหาและขอคืนเงิน");
    expect(screen.getByText("฿1,000")).toBeTruthy();
    const meta = screen.getByText((_, node) => node?.tagName === "P" && (node.textContent ?? "").startsWith("ขอคืนได้สูงสุด"));
    // No notice reaches the advisee when the team rules (the API notifies nobody), so it says where the result shows.
    expect(meta.textContent?.replaceAll("\u{a0}", " ")).toMatch(
      /^ขอคืนได้สูงสุดเท่านี้ · ผลแสดงที่หน้านี้และในการจองภายใน 14 วันทำการ · แจ้งได้ถึง \S+ 10 พ\.ย\. 2569 · 16:00$/,
    );
    // The page's own back link is the way out; the form draws no second one.
    expect(screen.queryByRole("button", { name: "กลับไปที่การจอง" })).toBeNull();
    expect(screen.getAllByRole("button").filter((pill) => pill.textContent === "ส่งคำขอคืนเงิน")).toHaveLength(1);
  });

  it("offers the four reasons of section 8, none picked, and a send button that can be pressed", () => {
    renderForm();
    expect(reasons()).toEqual([
      "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน",
      "เข้าห้องไม่ได้เพราะระบบขัดข้อง",
      "ไม่ตรงกับคำอธิบายบริการไม่รวมกรณีไม่เห็นด้วยกับคำ\u{2060}แนะนำหรือผลไม่เป็นอย่างที่หวัง",
      "เรื่องอื่น",
    ]);
    for (const radio of screen.getAllByRole("radio")) expect(radio.getAttribute("aria-checked")).toBe("false");
    expect(send().hasAttribute("disabled")).toBe(false);
    expect(send().getAttribute("aria-disabled")).not.toBe("true");
  });

  it.each(["BOOKED", "COMPLETED"] as const)("offers all four reasons for a booking that is %s", (state) => {
    renderForm({ state });
    expect(reasons()).toHaveLength(4);
  });

  it("offers only the two grounds its line names after the advisor recorded a no-show", () => {
    renderForm({ state: "NO_SHOW" });
    expect(reasons()).toEqual(["ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน", "เข้าห้องไม่ได้เพราะระบบขัดข้อง"]);
  });

  it("keeps the whole form in one place under the head, in the order it is filled in, and sends it from the button under the card", () => {
    renderForm();
    const card = screen.getByRole("article");
    const parts = [screen.getByRole("radiogroup"), details(), picker()];
    expect(parts.every((part) => card.contains(part))).toBe(true);
    expect(new Set(parts.map((part) => part.closest("[data-cell]"))).size).toBe(1);
    expect(parts[0].closest("[data-cell]")?.contains(screen.getByRole("heading", { level: 1 }))).toBe(false);
    expect(inOrder(...parts)).toBe(true);

    expect(card.contains(send())).toBe(false);
    const form = (send() as HTMLButtonElement).form;
    expect(form?.contains(parts[0])).toBe(true);
    expect(form?.contains(parts[1])).toBe(true);
  });

  it("says a reason is missing under the legend, marks the group and moves focus into it, and sends nothing", () => {
    renderForm();
    fireEvent.click(send());
    const group = screen.getByRole("radiogroup");
    expect(screen.getByRole("alert").textContent).toBe("เลือกว่าเกิดอะไรขึ้นก่อนส่ง");
    expect(group.getAttribute("aria-invalid")).toBe("true");
    expect(group.contains(document.activeElement)).toBe(true);
    expect(actions.openRefundOnce).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: /เข้าห้องไม่ได้/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(group.hasAttribute("aria-invalid")).toBe(false);
  });

  it("makes the details required for something else, and stops a blank one at the field", () => {
    renderForm();
    expect(screen.getByText("รายละเอียด (ไม่บังคับ)")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "เรื่องอื่น" }));
    expect(screen.getByLabelText("รายละเอียด")).toBe(details());
    fireEvent.change(details(), { target: { value: "   " } });
    fireEvent.click(send());

    expect(screen.getByRole("alert").textContent).toBe("เล่าสั้น ๆ ว่าเกิดอะไรขึ้น");
    expect(details().getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(details());
    expect(actions.openRefundOnce).not.toHaveBeenCalled();
  });

  it("opens one request on a double press as reason then details, uploads the files, then hands the request back", async () => {
    actions.openRefundOnce.mockResolvedValue(ours);
    api.uploadRefundEvidence.mockResolvedValue({});
    const onOpened = renderForm();
    const proof = file("proof.png", "image/png");
    attach(proof);
    fireEvent.click(screen.getByRole("radio", { name: "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน" }));
    fireEvent.change(details(), { target: { value: "  รอ 20 นาที \n" } });

    await act(async () => {
      fireEvent.click(send());
      fireEvent.click(send());
    });

    expect(actions.openRefundOnce).toHaveBeenCalledTimes(1);
    expect(actions.openRefundOnce).toHaveBeenCalledWith(invoice.id, "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน\n\nรอ 20 นาที");
    expect(api.uploadRefundEvidence).toHaveBeenCalledExactlyOnceWith(opened.id, proof);
    expect(actions.openRefundOnce.mock.invocationCallOrder[0]).toBeLessThan(api.uploadRefundEvidence.mock.invocationCallOrder[0]);
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(ours, undefined);
    expect(api.cancelBooking).not.toHaveBeenCalled();
    expect(actions.cancelThenRefund).not.toHaveBeenCalled();
  });

  it("attaches nothing to a request another tab opened first, and hands that request back as theirs", async () => {
    actions.openRefundOnce.mockResolvedValue(theirs);
    const onOpened = renderForm();
    attach(file("proof.png", "image/png"));
    fireEvent.click(screen.getByRole("radio", { name: "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน" }));
    await act(async () => fireEvent.click(send()));

    expect(actions.openRefundOnce).toHaveBeenCalledOnce();
    expect(api.uploadRefundEvidence).not.toHaveBeenCalled();
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(theirs);
  });

  it("sends nothing once the rule, read again at the press, says the 7 days are over", async () => {
    renderForm({ offered: false });
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(actions.openRefundOnce).not.toHaveBeenCalled();
  });

  it("shows the page's notice above the send button as an alert", () => {
    renderForm({ notice: "นัดนี้เริ่มแล้วจึงยกเลิกไม่ได้" });
    expect(screen.getByRole("alert").textContent).toBe("นัดนี้เริ่มแล้วจึงยกเลิกไม่ได้");
  });

  it("sends the reason alone when no details were written", async () => {
    actions.openRefundOnce.mockResolvedValue(ours);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(actions.openRefundOnce).toHaveBeenCalledExactlyOnceWith(invoice.id, "เข้าห้องไม่ได้เพราะระบบขัดข้อง");
  });

  it("is busy and keeps focus while it sends, and says so in words", async () => {
    let answer: (opened: OpenedRefund) => void = () => {};
    actions.openRefundOnce.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เรื่องอื่น" }));
    fireEvent.change(details(), { target: { value: "ห้องเงียบ" } });
    fireEvent.click(send());

    const busy = screen.getByRole("button", { name: "กำลังส่ง…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    await act(async () => answer(ours));
  });

  it("still hands the open request back when a file does not upload, naming the file", async () => {
    actions.openRefundOnce.mockResolvedValue(ours);
    api.uploadRefundEvidence.mockRejectedValue(new Error("413"));
    const onOpened = renderForm();
    attach(file("chat.pdf", "application/pdf"));
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(ours, "อัปโหลด chat.pdf ไม่สำเร็จ ลองอีกครั้ง");
  });

  it("says the request did not go and lets it be sent again when nothing opened", async () => {
    actions.openRefundOnce.mockRejectedValue(new Error("offline"));
    const onOpened = renderForm();
    attach(file("proof.png", "image/png"));
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));

    expect(screen.getByRole("alert").textContent).toBe("ส่งคำขอไม่สำเร็จ ลองอีกครั้ง");
    expect(onOpened).not.toHaveBeenCalled();
    expect(api.uploadRefundEvidence).not.toHaveBeenCalled();
    expect(rows()).toContain("proof.png");
    await act(async () => fireEvent.click(send()));
    expect(actions.openRefundOnce).toHaveBeenCalledTimes(2);
  });

  it.each([
    { name: "a lapsed session", cause: new ApiError(401, "Unauthorized"), says: "เซสชันหมดอายุ ยังไม่ได้ส่งอะไร เข้าสู่ระบบอีกครั้งแล้วกลับมาที่หน้านี้" },
    { name: "no disputable receipt", cause: new ApiError(404, "Not Found"), says: "ไม่พบใบเสร็จที่ขอคืนเงินได้ของการจองนี้ ติดต่อฝ่ายช่วยเหลือ" },
    { name: "someone else's receipt", cause: new ApiError(403, "Forbidden"), says: "ไม่พบใบเสร็จที่ขอคืนเงินได้ของการจองนี้ ติดต่อฝ่ายช่วยเหลือ" },
    { name: "a refusal", cause: new ApiError(400, "Bad Request"), says: th.bookingRefund.errors.refundRefused },
    { name: "a server fault", cause: new ApiError(503, "Unavailable"), says: "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง" },
    { name: "a request already open that could not be read back", cause: new ApiError(409, "Conflict"), says: "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง" },
    { name: "no network", cause: new TypeError("Failed to fetch"), says: "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง" },
  ])("after $name, says what will help, and asks to try again only when that can", async ({ cause, says }) => {
    actions.openRefundOnce.mockRejectedValue(cause);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(screen.getByRole("alert").textContent).toBe(says);
  });

  it("swaps the send button for a sign-in that comes back to this page once the session has lapsed", async () => {
    actions.openRefundOnce.mockRejectedValue(new ApiError(401, "Unauthorized"));
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));

    expect(screen.queryByRole("button", { name: "ส่งคำขอคืนเงิน" })).toBeNull();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบอีกครั้ง" }).getAttribute("href")).toBe(
      "/login?next=%2Fbookings%2Frefund%3FbookingId%3D1fba6ff8-1d9a-4aff-9a19-752c89fcd30d",
    );
  });

  it.each([
    ["no disputable receipt", 404],
    ["someone else's receipt", 403],
    ["a refusal", 400],
  ])("swaps the send button for the email to support after %s, which sending again would meet the same way", async (_, status) => {
    actions.openRefundOnce.mockRejectedValue(new ApiError(status, "refused"));
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));

    expect(screen.queryByRole("button", { name: "ส่งคำขอคืนเงิน" })).toBeNull();
    const mail = screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport });
    expect(decodeURIComponent(mail.getAttribute("href") ?? "")).toMatch(/^mailto:[^?]+\?subject=.*INV-/);
    // One way to support: the help line under the button would only say it again.
    expect(document.querySelectorAll('a[href^="mailto:"]')).toHaveLength(1);
  });

  it.each([
    ["a server fault", new ApiError(503, "Unavailable")],
    ["no network", new TypeError("Failed to fetch")],
  ])("keeps the send button after %s, where sending again can help", async (_, cause) => {
    actions.openRefundOnce.mockRejectedValue(cause);
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(send()).toBeTruthy();
    expect(screen.queryByRole("button", { name: th.bookingRefund.actions.mailSupport })).toBeNull();
  });

  it.each([
    { status: 401, says: "ยังไม่ได้อัปโหลด chat.pdf เพราะเซสชันหมดอายุ เข้าสู่ระบบอีกครั้งแล้วแนบใหม่" },
    { status: 400, says: "แนบ chat.pdf ไม่ได้ คำขอนี้ปิดรับหลักฐานแล้วหรือมีไฟล์ครบแล้ว" },
    { status: 413, says: "chat.pdf ใหญ่เกิน 50 MB" },
    { status: 503, says: "อัปโหลด chat.pdf ไม่สำเร็จ ลองอีกครั้ง" },
  ])("hands the open request back with why a file answered $status did not go", async ({ status, says }) => {
    actions.openRefundOnce.mockResolvedValue(ours);
    api.uploadRefundEvidence.mockRejectedValue(new ApiError(status, "refused"));
    const onOpened = renderForm();
    attach(file("chat.pdf", "application/pdf"));
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(ours, says);
  });

  it("names the files that failed for one reason together, each reason once", async () => {
    actions.openRefundOnce.mockResolvedValue(ours);
    const big = new ApiError(413, "Payload Too Large");
    api.uploadRefundEvidence.mockRejectedValueOnce(big).mockResolvedValueOnce({}).mockRejectedValueOnce(big).mockRejectedValueOnce(new ApiError(502, "Bad Gateway"));
    const onOpened = renderForm();
    attach(file("a.pdf", "application/pdf"), file("b.png", "image/png"), file("c.pdf", "application/pdf"), file("d.png", "image/png"));
    fireEvent.click(screen.getByRole("radio", { name: "เข้าห้องไม่ได้เพราะระบบขัดข้อง" }));
    await act(async () => fireEvent.click(send()));
    // Thai joins a list with no spaces around "และ".
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(ours, "a.pdfและc.pdf ใหญ่เกิน 50 MB อัปโหลด d.png ไม่สำเร็จ ลองอีกครั้ง");
  });

  it("tells an advisee the advisor marked absent that a missed session gets nothing back, before the reasons", () => {
    renderForm({ state: "NO_SHOW" });
    const line = screen.getByText(/^ที่ปรึกษาบันทึกว่าคุณไม่ได้เข้าร่วมนัดนี้/);
    expect(line.textContent).toContain("ไม่ได้เงินคืน");
    expect(line.compareDocumentPosition(screen.getByRole("radiogroup")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(["BOOKED", "COMPLETED"] as const)("says nothing of a no-show for a booking that is %s", (state) => {
    renderForm({ state });
    expect(screen.queryByText(/ที่ปรึกษาบันทึกว่าคุณไม่ได้เข้าร่วม/)).toBeNull();
  });

  it("counts what has been written against the cap", () => {
    renderForm();
    expect(screen.getByText("0/3800")).toBeTruthy();
    fireEvent.change(details(), { target: { value: "รอ 20 นาที" } });
    expect(screen.getByText("10/3800")).toBeTruthy();
  });

  it("caps the details so the longest reason, a blank line and the details fit the API's 4000 characters", () => {
    renderForm();
    const cap = details().maxLength;
    expect(cap).toBeGreaterThan(0);
    for (const reasons of [th.bookingRefund.reasons, en.bookingRefund.reasons]) {
      const longest = Math.max(reasons.advisorAbsent.length, reasons.platformFailed.length, reasons.notAsDescribed.length, reasons.other.length);
      expect(longest + 2 + cap).toBeLessThanOrEqual(4000);
    }
  });
});

describe("EvidencePicker in the form", () => {
  it("lists a PNG by name and offers to add more", () => {
    renderForm();
    expect(screen.getByText("แนบหลักฐาน")).toBeTruthy();
    attach(file("proof.png", "image/png"));
    expect(rows()).toEqual(["proof.png"]);
    expect(screen.getByText("แนบหลักฐานเพิ่ม")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps five files and refuses a sixth", () => {
    renderForm();
    attach(...["a", "b", "c", "d", "e", "f"].map((name) => file(`${name}.jpg`, "image/jpeg")));
    expect(rows()).toEqual(["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"]);
    expect(screen.getByRole("alert").textContent).toBe("แนบได้สูงสุด 5 ไฟล์");
  });

  it("refuses a file over 50 MB, in MB", () => {
    renderForm();
    attach(file("screen.mov.png", "image/png", 51 * 1024 * 1024));
    expect(rows()).toEqual([]);
    expect(screen.getByRole("alert").textContent).toBe("screen.mov.png ใหญ่เกิน 50 MB");
  });

  it("takes a file of exactly 50 MB", () => {
    renderForm();
    attach(file("big.pdf", "application/pdf", 50 * 1024 * 1024));
    expect(rows()).toEqual(["big.pdf"]);
  });

  it("refuses a Word file and an empty file, each in its own words", () => {
    renderForm();
    attach(file("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), file("blank.png", "image/png", 0));
    expect(rows()).toEqual([]);
    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "notes.docx ไม่ใช่ไฟล์ JPG, PNG, WebP หรือ PDF",
      "blank.png เป็นไฟล์ว่าง",
    ]);
  });

  it("removes a file with a button named after it, and puts focus back on the add control", () => {
    renderForm();
    attach(file("proof.png", "image/png"), file("chat.pdf", "application/pdf"));
    fireEvent.click(screen.getByRole("button", { name: "ลบ proof.png" }));
    expect(rows()).toEqual(["chat.pdf"]);
    expect(document.activeElement).toBe(picker());
  });

  it("holds a pick back until the form is sent, and so says nothing of files going to the team at once", () => {
    renderForm();
    attach(file("proof.png", "image/png"));
    expect(screen.getByRole("button", { name: "ลบ proof.png" })).toBeTruthy();
    expect(api.uploadRefundEvidence).not.toHaveBeenCalled();
    expect(screen.queryByText(th.bookingRefund.attachments.instant)).toBeNull();
  });

  it("takes only the four file types, and many at once", () => {
    renderForm();
    expect(picker().accept).toBe("image/jpeg,image/png,image/webp,application/pdf");
    expect(picker().multiple).toBe(true);
  });
});
