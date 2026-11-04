import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The live picker reads through useResource, which only asks a configured API.
// refund-sheet reaches GSAP's ScrollTrigger through the receipt screens, and it reads matchMedia on load.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
  const media = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  Object.defineProperty(window, "matchMedia", { writable: true, value: media });
});

const api = vi.hoisted(() => ({ listRefundEvidence: vi.fn(), uploadRefundEvidence: vi.fn(), getRefundEvidenceUrl: vi.fn() }));
vi.mock("@/lib/api/resources", async (original) => ({ ...(await original<object>()), ...api }));

import type { BookingExit, RefundCaseType, RefundStage } from "@/components/bookings/booking-exit";
import { RefundStatusMode } from "@/components/bookings/refund-status";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import type { RefundEvidence } from "@/lib/api/resources";
import { invalidate } from "@/lib/api/use-resource";
import { formats } from "@/lib/i18n/requests";
import th from "@/messages/th.json";

beforeEach(() => {
  api.listRefundEvidence.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  invalidate();
  vi.resetAllMocks();
});

/** Cancelled 4 Nov 20:56, asked 4 Nov 21:00, answered 6 Nov 10:15, all Bangkok time. */
const AT = { cancelled: "2026-11-04T13:56:00.000Z", asked: "2026-11-04T14:00:00.000Z", answered: "2026-11-06T03:15:00.000Z" };
const SESSION = { startTime: "2026-11-11T03:30:00.000Z", endTime: "2026-11-11T04:30:00.000Z" };
const CASE_STATUS = { refunding: "OPEN", reviewing: "OPEN", approved: "APPROVED", refunded: "APPROVED", rejected: "REJECTED" } as const;

type Scene = { readonly type: RefundCaseType; readonly stage: RefundStage; readonly card?: boolean };

function scene({ type, stage, card = true }: Scene) {
  const cancelled = type === "cancellation";
  const booking: ApiBooking = {
    ...SESSION, id: "15638839-49d1-4553-b79c-59821ff58f2e", serviceId: "s", advisorId: "a", adviseeId: "me", createdAt: AT.cancelled,
    unavailableUntil: SESSION.endTime, blocksAvailability: !cancelled, state: cancelled ? "CANCELLED" : "COMPLETED",
    cancelledAt: cancelled ? AT.cancelled : null, cancelledByUserId: cancelled ? "me" : null,
  };
  const invoice: ApiAdviseeInvoice = {
    id: "inv-status", invoiceNumber: "INV-2026-000123", status: stage === "refunded" ? "refunded" : "paid", booking: "confirmed",
    amountSatang: 100_000, priceSatang: 80_000, platformFeeSatang: 20_000, refundSatang: stage === "refunded" ? 100_000 : null,
    createdAt: AT.cancelled, paidAt: AT.cancelled, session: SESSION, card: card ? { brand: "Visa", lastDigits: "1111" } : null,
    service: { id: "s", name: "วางแผนการเงินส่วนบุคคล" }, advisor: { id: "a", displayName: "ณัฐพงษ์ ดวงดี" },
  };
  const resolved = CASE_STATUS[stage] === "OPEN" ? null : AT.answered;
  const refund: ApiRefundCase = { id: `case-${type}-${stage}`, invoiceId: invoice.id, reason: "", status: CASE_STATUS[stage], createdAt: AT.asked, resolvedAt: resolved };
  const exit: BookingExit = { kind: "status", refund, type, stage, refundSatang: 100_000 };
  return { booking, invoice, exit, refund };
}

function show(view: { booking: ApiBooking; invoice: ApiAdviseeInvoice; exit: BookingExit }, notice?: string) {
  if (view.exit.kind !== "status" && view.exit.kind !== "refunded") throw new Error("not a status");
  return render(
    <NextIntlClientProvider formats={formats} locale="th" messages={th} timeZone="Asia/Bangkok">
      <RefundStatusMode booking={view.booking} exit={view.exit} invoice={view.invoice} notice={notice} />
    </NextIntlClientProvider>,
  );
}

const MARKS = { "lucide-circle-check-big": "done", "lucide-clock-3": "current", "lucide-circle": "next", "lucide-circle-x": "rejected" } as const;

/** Each step as the reader meets it: what it says, under it, and which mark it carries. */
function steps() {
  return within(screen.getByRole("list")).getAllByRole("listitem").map((step) => {
    const [title, sub] = [...step.querySelectorAll("p")].map((line) => line.textContent);
    const icon = step.querySelector("svg")?.getAttribute("class")?.split(" ") ?? [];
    const mark = Object.entries(MARKS).find(([name]) => icon.includes(name))?.[1];
    return { title, sub, mark, current: step.getAttribute("aria-current") === "true" };
  });
}

const pills = () => screen.getAllByRole("button").map((pill) => ({ name: pill.textContent, href: pill.getAttribute("href"), solid: pill.className.includes("bg-hero-action") }));
const settle = () => act(async () => {});

/** cardName keeps the brand and the last four on one line with no-break spaces. */
const VISA = "Visa •••• 1111";

/** Each step's words and the line under them, as the advisee should read them. */
const WORDS = {
  cancelled: ["ยกเลิกการจองแล้ว", "4 พ.ย. 2569 · 20:56"],
  refund: ["ทีมงานคืนเงิน ฿1,000", "ภายใน 14 วันทำการ"],
  arrive: [`เงินเข้า ${VISA}`, "ตามรอบของธนาคารผู้ออกบัตร"],
  sent: ["ส่งคำขอแล้ว", "4 พ.ย. 2569 · 21:00"],
  review: ["ทีมงาน Advisory ตรวจสอบ", "จากบันทึกการเข้าร่วมและแชต แจ้งผลภายใน 14 วันทำการ"],
  approved: ["อนุมัติแล้ว", "6 พ.ย. 2569 · 10:15"],
  toCard: ["คืนเงินเข้าบัตร", "ถ้าอนุมัติ"],
  rejected: ["ไม่อนุมัติ", "6 พ.ย. 2569 · 10:15"],
} as const;

const BACK = { name: "กลับไปที่การจอง", href: "/bookings?bookingId=15638839-49d1-4553-b79c-59821ff58f2e" };
/** The pills under the card, main one first: only the main one is solid. */
const PILLS = {
  back: [{ ...BACK, solid: true }],
  receipt: [{ name: "ดูใบเสร็จ", href: "/transactions/detail?id=inv-status", solid: true }, { ...BACK, solid: false }],
  support: [{ name: "ติดต่อฝ่ายช่วยเหลือ", href: null, solid: true }, { ...BACK, solid: false }],
} as const;

type Expected = Scene & {
  readonly head: string;
  readonly meta: string;
  readonly steps: readonly (readonly [keyof typeof WORDS, (typeof MARKS)[keyof typeof MARKS]])[];
  readonly pills: keyof typeof PILLS;
};

const STAGES: readonly Expected[] = [
  { type: "cancellation", stage: "refunding", head: "กำลังคืนเงิน", meta: "ยอดที่กำลังคืน", steps: [["cancelled", "done"], ["refund", "current"], ["arrive", "next"]], pills: "back" },
  { type: "cancellation", stage: "approved", head: "อนุมัติแล้ว กำลังคืนเงิน", meta: "ยอดที่กำลังคืน", steps: [["cancelled", "done"], ["refund", "current"], ["arrive", "next"]], pills: "back" },
  { type: "cancellation", stage: "refunded", head: "คืนเงินแล้ว", meta: "ยอดที่คืนแล้ว", steps: [["cancelled", "done"], ["refund", "done"], ["arrive", "done"]], pills: "receipt" },
  { type: "cancellation", stage: "rejected", head: "ไม่อนุมัติคืนเงิน", meta: "ยอดที่ขอคืน", steps: [["cancelled", "done"], ["rejected", "rejected"]], pills: "support" },
  { type: "report", stage: "reviewing", head: "รอทีมงานตรวจสอบ", meta: "ยอดที่ขอคืน", steps: [["sent", "done"], ["review", "current"], ["toCard", "next"]], pills: "back" },
  { type: "report", stage: "approved", head: "อนุมัติแล้ว กำลังคืนเงิน", meta: "ยอดที่กำลังคืน", steps: [["sent", "done"], ["approved", "done"], ["toCard", "current"]], pills: "back" },
  { type: "report", stage: "refunded", head: "คืนเงินแล้ว", meta: "ยอดที่คืนแล้ว", steps: [["sent", "done"], ["approved", "done"], ["toCard", "done"]], pills: "receipt" },
  { type: "report", stage: "rejected", head: "ไม่อนุมัติคืนเงิน", meta: "ยอดที่ขอคืน", steps: [["sent", "done"], ["rejected", "rejected"]], pills: "support" },
];

describe("RefundStatusMode", () => {
  it.each(STAGES)("$type $stage: says $head, its steps and their marks, and offers who to turn to next", async (expected) => {
    show(scene(expected));
    await settle();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(expected.head);
    expect(screen.getByText("฿1,000", { selector: "p" })).toBeTruthy();
    expect(screen.getByText(expected.meta)).toBeTruthy();
    expect(steps()).toEqual(
      expected.steps.map(([words, mark]) => ({ title: WORDS[words][0], sub: WORDS[words][1], mark, current: mark === "current" })),
    );
    const shown = pills();
    expect(shown.map(({ name, solid }) => ({ name, solid }))).toEqual(PILLS[expected.pills].map(({ name, solid }) => ({ name, solid })));
    for (const [i, pill] of PILLS[expected.pills].entries()) {
      if (pill.href) expect(shown[i].href).toBe(pill.href);
    }
    expect(screen.queryByRole("button", { name: "ส่งคำขอคืนเงิน" })).toBeNull();
  });

  it("mails support about this receipt when the request was turned down, and gives no reason of its own", async () => {
    show(scene({ type: "report", stage: "rejected" }));
    await settle();
    const mail = screen.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" }).getAttribute("href") ?? "";
    expect(mail).toMatch(/^mailto:/);
    expect(decodeURIComponent(mail)).toContain("INV-2026-000123");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("never says a cancellation is being reviewed, and takes no evidence for one", async () => {
    for (const stage of ["refunding", "approved", "refunded", "rejected"] as const) {
      const view = show(scene({ type: "cancellation", stage }));
      await settle();
      expect(document.body.textContent).not.toContain("ตรวจสอบ");
      expect(screen.queryByText("หลักฐาน (ไม่บังคับ)")).toBeNull();
      expect(document.querySelector('input[type="file"]')).toBeNull();
      view.unmount();
    }
    expect(api.listRefundEvidence).not.toHaveBeenCalled();
  });

  it("names the payment method instead of a card when there is none", async () => {
    const cancellation = show(scene({ type: "cancellation", stage: "refunding", card: false }));
    await settle();
    expect(steps()[2].title).toBe("เงินเข้าช่องทางที่ชำระ");
    cancellation.unmount();

    show(scene({ type: "report", stage: "reviewing", card: false }));
    await settle();
    expect(steps()[2].title).toBe("คืนเงินเข้าช่องทางที่ชำระ");
  });

  it("shows a refund with no request on record as done, with the receipt as its only button", () => {
    const { booking, invoice } = scene({ type: "report", stage: "refunded" });
    show({ booking, invoice, exit: { kind: "refunded", refundSatang: 60_000 } });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("คืนเงินแล้ว");
    expect(screen.getByText("฿600", { selector: "p" })).toBeTruthy();
    expect(steps()).toEqual([{ title: WORDS.arrive[0], sub: WORDS.arrive[1], mark: "done", current: false }]);
    expect(pills().map(({ name }) => name)).toEqual(["ดูใบเสร็จ"]);
  });

  it("puts a notice from the form above the buttons as an alert", async () => {
    show(scene({ type: "report", stage: "reviewing" }), "อัปโหลด chat.pdf ไม่สำเร็จ ลองอีกครั้ง");
    await settle();
    expect(screen.getByRole("alert").textContent).toBe("อัปโหลด chat.pdf ไม่สำเร็จ ลองอีกครั้ง");
  });
});

const evidence = (objectKey: string, originalFileName: string): RefundEvidence => ({ objectKey, originalFileName, mimeType: "application/pdf", createdAt: AT.asked });
const pick = (...files: File[]) => fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files } });
const png = (name: string) => new File(["png"], name, { type: "image/png" });
const files = () => [...document.querySelectorAll("li button")].map((row) => row.textContent);

describe("EvidencePicker on an open report", () => {
  const open = scene({ type: "report", stage: "reviewing" });

  it("lists the request's evidence and opens one privately in a new tab", async () => {
    api.listRefundEvidence.mockResolvedValue([evidence("k1", "chat-log.pdf")]);
    api.getRefundEvidenceUrl.mockResolvedValue({ url: "https://files.example.test/k1", expiresInSeconds: 60 });
    const opened = vi.spyOn(window, "open").mockReturnValue(null);
    show(open);
    await settle();

    expect(screen.getByText("แนบหลักฐานเพิ่ม")).toBeTruthy();
    expect(api.listRefundEvidence).toHaveBeenCalledWith(open.refund.id, expect.any(AbortSignal));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "chat-log.pdf" })));
    expect(api.getRefundEvidenceUrl).toHaveBeenCalledExactlyOnceWith(open.refund.id, "k1");
    expect(opened).toHaveBeenCalledExactlyOnceWith("https://files.example.test/k1", "_blank", "noopener,noreferrer");
    opened.mockRestore();
  });

  it("says so when a file will not open", async () => {
    api.listRefundEvidence.mockResolvedValue([evidence("k1", "chat-log.pdf")]);
    api.getRefundEvidenceUrl.mockRejectedValue(new Error("403"));
    show(open);
    await settle();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "chat-log.pdf" })));
    expect(screen.getByRole("alert").textContent).toBe("เปิดไฟล์ไม่สำเร็จ โปรดลองอีกครั้ง");
  });

  it("uploads a pick at once, busy while it goes, then lists it and says so politely", async () => {
    let land: (row: RefundEvidence) => void = () => {};
    api.uploadRefundEvidence.mockReturnValue(new Promise((resolve) => (land = resolve)));
    show(open);
    await settle();
    const proof = png("proof.png");
    pick(proof);

    expect(api.uploadRefundEvidence).toHaveBeenCalledExactlyOnceWith(open.refund.id, proof);
    expect(screen.getByText("กำลังอัปโหลด…").closest("[aria-busy]")?.getAttribute("aria-busy")).toBe("true");
    api.listRefundEvidence.mockResolvedValue([evidence("k2", "proof.png")]);
    await act(async () => land(evidence("k2", "proof.png")));

    expect(files()).toEqual(["proof.png"]);
    expect(screen.getByRole("status").textContent).toBe("แนบหลักฐานแล้ว 1 ไฟล์");
    expect(screen.getByText("แนบหลักฐานเพิ่ม")).toBeTruthy();
    expect(api.listRefundEvidence).toHaveBeenCalledTimes(2);
  });

  it("counts the files already sent against the five", async () => {
    api.listRefundEvidence.mockResolvedValue(["a", "b", "c", "d"].map((key) => evidence(key, `${key}.pdf`)));
    api.uploadRefundEvidence.mockResolvedValue(evidence("e", "e.png"));
    show(open);
    await settle();
    await act(async () => pick(png("e.png"), png("f.png")));

    expect(api.uploadRefundEvidence).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toBe("แนบได้สูงสุด 5 ไฟล์");
  });

  it("names a file that did not upload", async () => {
    api.uploadRefundEvidence.mockRejectedValue(new Error("413"));
    show(open);
    await settle();
    await act(async () => pick(png("proof.png")));
    expect(screen.getByRole("alert").textContent).toBe("อัปโหลด proof.png ไม่สำเร็จ ลองอีกครั้ง");
    expect(files()).toEqual([]);
  });

  it("says when the evidence cannot be read, and reads it again on request", async () => {
    api.listRefundEvidence.mockRejectedValueOnce(new Error("offline"));
    show(open);
    await settle();
    expect(screen.getByRole("alert").textContent).toBe("โหลดหลักฐานที่แนบไว้ไม่สำเร็จ");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" })));
    expect(api.listRefundEvidence).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
