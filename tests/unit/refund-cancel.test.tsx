import { act, cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider, type Messages } from "next-intl";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";

// invoice-screens reaches GSAP's ScrollTrigger, which asks matchMedia as its module loads.
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

const actions = vi.hoisted(() => ({ cancelThenRefund: vi.fn(), openRefundOnce: vi.fn() }));
vi.mock("@/components/bookings/refund-actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/bookings/refund-actions")>()),
  ...actions,
}));

import type { BookingExit } from "@/components/bookings/booking-exit";
import type { CancelRefundResult, OpenedRefund, RefundFailure } from "@/components/bookings/refund-actions";
import { ApiError } from "@/lib/api/client";
import { CancelRefundMode, ClaimMode } from "@/components/bookings/refund-cancel";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

const START = "2026-11-11T03:30:00.000Z";
const END = "2026-11-11T04:30:00.000Z";

const booking: ApiBooking = {
  id: "15638839-49d1-4553-b79c-59821ff58f2e",
  serviceId: "service-1",
  advisorId: "advisor-1",
  adviseeId: "advisee-1",
  startTime: START,
  endTime: END,
  unavailableUntil: END,
  state: "BOOKED",
  blocksAvailability: true,
  cancelledAt: null,
  cancelledByUserId: null,
  createdAt: "2026-11-04T13:00:00.000Z",
};

/** ฿800 for the service and ฿200 for the platform. */
const invoice: ApiAdviseeInvoice = {
  id: "invoice-1",
  invoiceNumber: "INV-2026-000123",
  status: "paid",
  amountSatang: 100_000,
  platformFeeSatang: 20_000,
  priceSatang: 80_000,
  refundSatang: null,
  createdAt: "2026-11-04T13:00:00.000Z",
  paidAt: "2026-11-04T13:01:00.000Z",
  service: { id: "service-1", name: "วางแผนการเงินส่วนบุคคล" },
  advisor: { id: "advisor-1", displayName: "ณัฐพงษ์ ดวงดี" },
  session: { startTime: START, endTime: END },
  booking: "confirmed",
  card: { brand: "Visa", lastDigits: "1111" },
};

const POPUP = "/bookings?bookingId=15638839-49d1-4553-b79c-59821ff58f2e";

type CancelExit = Extract<BookingExit, { kind: "cancelRefund" }>;
type ClaimExit = Extract<BookingExit, { kind: "claim" }>;

const window24h = { fullUntil: new Date("2026-11-10T03:30:00.000Z"), startsAt: new Date(START) };
const fullCancel: CancelExit = { kind: "cancelRefund", share: "full", refundSatang: 100_000, ...window24h };
const halfCancel: CancelExit = { kind: "cancelRefund", share: "half", refundSatang: 40_000, ...window24h };

const advisorCancelled: ApiBooking = {
  ...booking,
  state: "CANCELLED",
  cancelledAt: "2026-11-04T13:56:00.000Z",
  cancelledByUserId: "advisor-1",
};
const adviseeLate: ApiBooking = {
  ...booking,
  state: "CANCELLED",
  cancelledAt: "2026-11-10T22:30:00.000Z",
  cancelledByUserId: "advisee-1",
};
const claimFull: ClaimExit = { kind: "claim", share: "full", refundSatang: 100_000, by: "other" };
const claimHalf: ClaimExit = { kind: "claim", share: "half", refundSatang: 40_000, by: "advisee" };

const refund: ApiRefundCase = {
  id: "case-1",
  invoiceId: "invoice-1",
  reason: "ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000",
  status: "OPEN",
  createdAt: "2026-11-04T13:57:00.000Z",
  resolvedAt: null,
};
/** The request this press wrote. */
const fresh: OpenedRefund = { refund, alreadyOpen: false };
const opened = { kind: "opened", ...fresh } as const satisfies CancelRefundResult;

beforeEach(() => {
  actions.cancelThenRefund.mockReset();
  actions.openRefundOnce.mockReset();
});
afterEach(cleanup);

function inLocale(locale: "th" | "en", ui: ReactNode) {
  const errors: Error[] = [];
  const messages = locale === "th" ? th : (en as unknown as Messages);
  const view = render(
    <NextIntlClientProvider
      formats={formats}
      locale={locale}
      messages={messages}
      onError={(error) => errors.push(error)}
      timeZone="Asia/Bangkok"
    >
      {ui}
    </NextIntlClientProvider>,
  );
  return { ...view, errors };
}

/**
 * The page's part, as small as it gets: it keeps the notice, and a read
 * again brings the booking back as a new answer, still booked.
 */
function CancelOnPage({
  exit,
  stillOffered,
  onReread,
  onOpened,
  onCancelledOnly,
}: {
  readonly exit: CancelExit;
  readonly stillOffered: () => boolean;
  readonly onReread: () => void;
  readonly onOpened: (opened: OpenedRefund, at: number) => void;
  readonly onCancelledOnly: (at: number, failure: RefundFailure) => void;
}) {
  const [shown, setShown] = useState(booking);
  const [notice, setNotice] = useState<string>();
  const [answer, setAnswer] = useState<(() => void) | null>(null);
  return (
    <>
      <CancelRefundMode
        booking={shown}
        exit={exit}
        invoice={invoice}
        notice={notice}
        onCancelledOnly={onCancelledOnly}
        onNotice={setNotice}
        onOpened={onOpened}
        reread={() => {
          onReread();
          setAnswer(() => () => setShown({ ...booking }));
        }}
        stillOffered={stillOffered}
      />
      {answer ? (
        <button onClick={answer} type="button">
          answer the read
        </button>
      ) : null}
    </>
  );
}

function renderCancel(exit: CancelExit = fullCancel, locale: "th" | "en" = "th", offered = true) {
  const onOpened = vi.fn();
  const onCancelledOnly = vi.fn();
  const onReread = vi.fn();
  const stillOffered = vi.fn(() => offered);
  const view = inLocale(
    locale,
    <CancelOnPage exit={exit} onCancelledOnly={onCancelledOnly} onOpened={onOpened} onReread={onReread} stillOffered={stillOffered} />,
  );
  return { ...view, onOpened, onCancelledOnly, onReread, stillOffered };
}

function renderClaim({
  of = advisorCancelled,
  exit = claimFull,
  bill = invoice,
  notice,
  failed,
  locale = "th",
}: {
  readonly of?: ApiBooking;
  readonly exit?: ClaimExit;
  readonly bill?: ApiAdviseeInvoice;
  readonly notice?: string;
  readonly failed?: RefundFailure;
  readonly locale?: "th" | "en";
} = {}) {
  const onOpened = vi.fn();
  const view = inLocale(
    locale,
    <ClaimMode booking={of} exit={exit} failed={failed} invoice={bill} notice={notice} onOpened={onOpened} />,
  );
  return { ...view, onOpened };
}

function pending<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** The innermost element reading `text`, however its figures are split into spans. */
function line(text: string) {
  return screen.getByText(
    (_, node) => node?.textContent === text && [...node.children].every((child) => child.textContent !== text),
  );
}

function rowsUnder(heading: string) {
  const section = screen.getByRole("heading", { level: 2, name: heading }).closest("section")!;
  return within(section).getAllByRole("listitem");
}

/** Each term and what it says, in reading order, as a screen reader pairs them. */
function readBox(): Record<string, string> {
  const box = screen.getByText("รวมได้คืน").closest("dl")!;
  const terms = within(box).getAllByRole("term");
  const definitions = within(box).getAllByRole("definition");
  return Object.fromEntries(terms.map((term, i) => [term.textContent, definitions[i].textContent]));
}

/** Two presses in one task, before React can render the disabled button. */
async function pressTwice(button: HTMLElement) {
  await act(async () => {
    button.click();
    button.click();
  });
}

describe("CancelRefundMode, 24 hours or more before the start", () => {
  it("says the whole charge comes back before anything is pressed", () => {
    renderCancel();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("ยกเลิกการจอง · คืนเต็มจำนวน");
    expect(screen.getByText("฿1,000").tagName).toBe("P");
    expect(screen.getByText("ยอดที่ได้คืนถ้ายกเลิกตอนนี้")).toBeTruthy();
    expect(screen.queryByText("รวมได้คืน")).toBeNull();
  });

  it("marks the first row of the policy as now, under the 24-hour line and the start", () => {
    renderCancel();
    const rows = rowsUnder("เงื่อนไขการยกเลิก");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("ตอนนี้")).toBeTruthy();
    expect(rows[0].getAttribute("aria-current")).toBe("true");
    for (const row of rows.slice(1)) {
      expect(within(row).queryByText("ตอนนี้")).toBeNull();
      expect(row.getAttribute("aria-current")).toBeNull();
    }
    expect(rows[0].textContent).toContain("ถึง");
    // The deadline is held together with no-break spaces, which read as the spaces they show.
    expect(rows[0].textContent?.replaceAll(" ", " ")).toContain("10 พ.ย. 2569 · 10:30");
    expect(rows[0].textContent).toContain("คืนเต็มจำนวน");
    expect(rows[1].textContent).toContain("10 พ.ย. 10:30 ถึง 11 พ.ย. 10:30");
    expect(rows[1].textContent).toContain("คืน 50% ของค่าบริการ");
    expect(rows[2].textContent).toContain("ตั้งแต่ 11 พ.ย. 10:30");
    expect(rows[2].textContent).toContain("ยกเลิกไม่ได้");
  });

  it("links §8 of the terms", () => {
    renderCancel();
    expect(screen.getByRole("link", { name: "อ่านข้อกำหนดข้อ 8" }).getAttribute("href")).toBe("/terms#cancellation");
  });

  it("says before the press that the cancel is at once and the refund waits on the team, then the confirm and a way back", () => {
    renderCancel();
    const said = line(
      "ยกเลิกมีผลทันทีและย้อนกลับไม่ได้ ส่วนเงินคืนรอทีมงานยืนยันภายใน 14 วันทำการ แล้วคืนเข้า Visa •••• 1111",
    );
    const confirm = screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" });
    expect(said.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "เก็บการจองไว้" }).getAttribute("href")).toBe(POPUP);
  });

  it("names the original payment method when the receipt has no card", () => {
    inLocale("en", (
      <CancelRefundMode
        booking={booking}
        exit={fullCancel}
        invoice={{ ...invoice, card: null }}
        onCancelledOnly={vi.fn()}
        onNotice={vi.fn()}
        onOpened={vi.fn()}
        reread={vi.fn()}
        stillOffered={() => true}
      />
    ));
    expect(
      line(
        "Cancelling takes effect at once and can't be undone. The refund waits for our team to confirm it within 14 business days, then goes back to your original payment method.",
      ),
    ).toBeTruthy();
  });
});

describe("CancelRefundMode, inside 24 hours", () => {
  it("says half the service fee comes back, and lists what the half is made of", () => {
    renderCancel(halfCancel);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("ยกเลิกการจอง · คืน 50% ของค่าบริการ");
    expect(screen.getAllByText("฿400").find((node) => node.tagName === "P")).toBeTruthy();
    expect(readBox()).toEqual({
      "ค่าบริการ · คืน 50%": "฿400",
      "ค่าบริการแพลตฟอร์ม · ไม่คืน": "฿0",
      "รวมได้คืน": "฿400",
    });
    expect(screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿400" })).toBeTruthy();
  });

  it("marks the second row of the policy as now", () => {
    renderCancel(halfCancel);
    const rows = rowsUnder("เงื่อนไขการยกเลิก");
    expect(within(rows[1]).getByText("ตอนนี้")).toBeTruthy();
    expect(within(rows[0]).queryByText("ตอนนี้")).toBeNull();
    expect(within(rows[2]).queryByText("ตอนนี้")).toBeNull();
  });
});

describe("CancelRefundMode, pressing confirm", () => {
  it("cancels once on a double press, with the rule applied as the reason", async () => {
    actions.cancelThenRefund.mockResolvedValue(opened);
    renderCancel();
    await pressTwice(screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }));
    expect(actions.cancelThenRefund).toHaveBeenCalledTimes(1);
    expect(actions.cancelThenRefund).toHaveBeenCalledWith(
      booking.id,
      invoice.id,
      "ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000",
    );
  });

  it("gives the half rule as the reason inside 24 hours", async () => {
    actions.cancelThenRefund.mockResolvedValue(opened);
    renderCancel(halfCancel);
    await pressTwice(screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿400" }));
    expect(actions.cancelThenRefund).toHaveBeenCalledWith(
      booking.id,
      invoice.id,
      "ยกเลิกภายใน 24 ชั่วโมงก่อนเวลาเริ่ม · คืน 50% ของค่าบริการ ฿400",
    );
  });

  it("is busy and closed to presses while the cancel runs", async () => {
    const run = pending<CancelRefundResult>();
    actions.cancelThenRefund.mockReturnValue(run.promise);
    renderCancel();
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    const busy = screen.getByRole("button", { name: "กำลังยกเลิก…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    await act(async () => run.resolve(opened));
  });

  it("hands the opened request to the page with the moment of the press", async () => {
    const pressedAt = Date.parse("2026-11-08T09:15:00Z");
    vi.spyOn(Date, "now").mockReturnValue(pressedAt);
    actions.cancelThenRefund.mockResolvedValue(opened);
    const { onOpened, onCancelledOnly } = renderCancel();
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(opened, pressedAt);
    expect(onCancelledOnly).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("tells the page when the cancel stood and the request did not, and why", async () => {
    const pressedAt = Date.parse("2026-11-08T09:15:00Z");
    vi.spyOn(Date, "now").mockReturnValue(pressedAt);
    actions.cancelThenRefund.mockResolvedValue({ kind: "cancelledOnly", failure: "signIn" } satisfies CancelRefundResult);
    const { onOpened, onCancelledOnly } = renderCancel();
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    expect(onCancelledOnly).toHaveBeenCalledExactlyOnceWith(pressedAt, "signIn");
    expect(onOpened).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("files nothing when the booking turns out cancelled already, and reads it again for the page to decide", async () => {
    actions.cancelThenRefund.mockResolvedValue({ kind: "foundCancelled" } satisfies CancelRefundResult);
    const { onOpened, onCancelledOnly, onReread } = renderCancel();
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    expect(screen.getByRole("alert").textContent).toBe("การจองนี้ถูกยกเลิกแล้ว ยอดคืนด้านบนคิดตามผู้ยกเลิกและเวลาที่ยกเลิก");
    expect(onReread).toHaveBeenCalledTimes(1);
    expect(onOpened).not.toHaveBeenCalled();
    expect(onCancelledOnly).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }) as HTMLButtonElement).disabled).toBe(true);
  });

  const refuse = async (outcome: Extract<CancelRefundResult, { kind: "notCancelled" }>["outcome"]) => {
    actions.cancelThenRefund.mockResolvedValue({ kind: "notCancelled", outcome } satisfies CancelRefundResult);
    const view = renderCancel();
    await act(async () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }).click());
    expect(view.onOpened).not.toHaveBeenCalled();
    expect(view.onCancelledOnly).not.toHaveBeenCalled();
    return view;
  };
  const confirmButton = () => screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" }) as HTMLButtonElement;

  it("after a cancel that simply failed, says so and lets the advisee press again", async () => {
    const { onReread } = await refuse("retry");
    expect(screen.getByRole("alert").textContent).toBe("ยกเลิกไม่สำเร็จ การจองยังอยู่เหมือนเดิม ลองอีกครั้ง");
    expect(onReread).not.toHaveBeenCalled();
    expect(confirmButton().disabled).toBe(false);
    await act(async () => confirmButton().click());
    expect(actions.cancelThenRefund).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["changed", "สถานะการจองเปลี่ยนไปและไม่สามารถยกเลิกได้แล้ว โปรดตรวจสอบสถานะล่าสุด"],
    ["unavailable", "ไม่พบการจองนี้หรือคุณไม่มีสิทธิ์เข้าถึงแล้ว"],
  ] as const)("after a %s booking, reads it again for the page to move on, and sends nothing until it has", async (outcome, words) => {
    const { onReread } = await refuse(outcome);
    expect(screen.getByRole("alert").textContent).toBe(words);
    expect(onReread).toHaveBeenCalledTimes(1);
    expect(confirmButton().disabled).toBe(true);
    await act(async () => confirmButton().click());
    expect(actions.cancelThenRefund).toHaveBeenCalledTimes(1);
  });

  it("after an answer that may hide a cancel, offers to check, and opens the cancel again only once the booking reads as still on", async () => {
    const { onReread } = await refuse("uncertain");
    expect(screen.getByRole("alert").textContent).toBe("ยังยืนยันไม่ได้ว่าการจองถูกยกเลิกหรือไม่ กรุณาตรวจสอบสถานะก่อนลองอีกครั้ง");
    expect(screen.queryByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" })).toBeNull();

    await act(async () => screen.getByRole("button", { name: "ตรวจสอบสถานะ" }).click());
    expect(onReread).toHaveBeenCalledTimes(1);
    const checking = screen.getByRole("button", { name: "กำลังตรวจสอบ…" }) as HTMLButtonElement;
    expect(checking.getAttribute("aria-busy")).toBe("true");
    expect(checking.disabled).toBe(true);

    await act(async () => screen.getByRole("button", { name: "answer the read" }).click());
    expect(confirmButton().disabled).toBe(false);
    expect(actions.cancelThenRefund).toHaveBeenCalledTimes(1);
  });

  it("after the session expired, sends nothing more and offers to sign in and come back", async () => {
    const { onReread } = await refuse("signIn");
    expect(screen.getByRole("alert").textContent).toBe("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งเพื่อตรวจสอบการจอง");
    expect(screen.queryByRole("button", { name: "ตรวจสอบสถานะ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" })).toBeNull();
    expect(onReread).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบอีกครั้ง" }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/bookings/refund?bookingId=${booking.id}`)}`,
    );
    expect(actions.cancelThenRefund).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the rule, read again at the press, no longer offers what the page shows", async () => {
    const { stillOffered } = renderCancel(fullCancel, "th", false);
    await act(async () => confirmButton().click());
    expect(stillOffered).toHaveBeenCalledTimes(1);
    expect(actions.cancelThenRefund).not.toHaveBeenCalled();
  });
});

describe("ClaimMode", () => {
  it("claims the whole charge from an advisor's cancellation with one press", async () => {
    actions.openRefundOnce.mockResolvedValue(fresh);
    const { onOpened } = renderClaim();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("การจองนี้ยกเลิกแล้ว");
    expect(screen.getByText("฿1,000").tagName).toBe("P");
    expect(line("ที่ปรึกษาหรือทีมงานเป็นผู้ยกเลิก คุณจึงได้คืนเต็มจำนวน")).toBeTruthy();
    expect(screen.queryByText("รวมได้คืน")).toBeNull();
    expect(screen.queryByRole("button", { name: "กลับไปที่การจอง" })).toBeNull();

    await pressTwice(screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }));
    expect(actions.openRefundOnce).toHaveBeenCalledTimes(1);
    expect(actions.openRefundOnce).toHaveBeenCalledWith(invoice.id, "ที่ปรึกษาหรือทีมงานยกเลิก · คืนเต็มจำนวน ฿1,000");
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(fresh);
  });

  it("previews what happens: cancelled at its time, the team confirms, then the refund, with no word that money moves yet", () => {
    renderClaim();
    const rows = rowsUnder("ความคืบหน้า");
    expect(document.body.textContent).not.toContain("กำลังคืน");
    expect(rows.map((row) => row.textContent)).toEqual([
      "ยกเลิกการจองแล้ว4 พ.ย. 2569 · 20:56",
      "ทีมงานยืนยันการคืนเงินภายใน 14 วันทำการ",
      "คืนเงิน ฿1,000 เข้า Visa •••• 1111เมื่อทีมงานยืนยัน",
    ]);
    expect(rows[0].closest("ol")).toBeTruthy();
  });

  it("claims half the service fee from the advisee's own late cancellation", async () => {
    actions.openRefundOnce.mockResolvedValue(fresh);
    renderClaim({ of: adviseeLate, exit: claimHalf, bill: { ...invoice, card: null } });
    // "เวลา" and "เริ่ม" are held by a word joiner, so the start time never breaks across lines.
    expect(
      line("คุณยกเลิกเมื่อ 11 พ.ย. 2569 · 05:30 ภายใน 24 ชั่วโมงก่อนเวลา⁠เริ่ม จึงได้คืน 50% ของค่าบริการ"),
    ).toBeTruthy();
    expect(readBox()).toEqual({
      "ค่าบริการ · คืน 50%": "฿400",
      "ค่าบริการแพลตฟอร์ม · ไม่คืน": "฿0",
      "รวมได้คืน": "฿400",
    });
    expect(rowsUnder("ความคืบหน้า")[2].textContent).toContain("คืนเงิน ฿400 เข้าช่องทางที่ชำระ");

    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿400" }).click());
    expect(actions.openRefundOnce).toHaveBeenCalledWith(
      invoice.id,
      "ยกเลิกภายใน 24 ชั่วโมงก่อนเวลาเริ่ม · คืน 50% ของค่าบริการ ฿400",
    );
  });

  it("says the advisee's own early cancellation refunds the whole charge", () => {
    renderClaim({
      of: { ...adviseeLate, cancelledAt: "2026-11-04T13:56:00.000Z" },
      exit: { ...claimFull, by: "advisee" },
    });
    expect(line("คุณยกเลิกเมื่อ 4 พ.ย. 2569 · 20:56 ก่อนเวลา⁠เริ่ม 24 ชั่วโมงขึ้นไป จึงได้คืนเต็มจำนวน")).toBeTruthy();
  });

  it("shows the page's notice as an alert", () => {
    const notice = "ยกเลิกการจองแล้ว แต่ยังส่งเรื่องคืนเงินไม่สำเร็จ กดรับเงินคืน ฿1,000 อีกครั้ง";
    renderClaim({ notice });
    expect(screen.getByRole("alert").textContent).toBe(notice);
  });

  it("is busy while the request opens", async () => {
    const run = pending<OpenedRefund>();
    actions.openRefundOnce.mockReturnValue(run.promise);
    renderClaim();
    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    const busy = screen.getByRole("button", { name: "กำลังส่งเรื่องคืนเงิน…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    await act(async () => run.resolve(fresh));
  });

  it("says the request did not go through and lets the advisee press again", async () => {
    actions.openRefundOnce.mockRejectedValue(new Error("offline"));
    const { onOpened } = renderClaim();
    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    expect(screen.getByRole("alert").textContent).toBe("ส่งเรื่องคืนเงินไม่สำเร็จ ลองอีกครั้ง");
    expect(onOpened).not.toHaveBeenCalled();

    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    expect(actions.openRefundOnce).toHaveBeenCalledTimes(2);
  });

  it("after the session expired, says nothing was sent and offers to sign in instead of pressing again", async () => {
    actions.openRefundOnce.mockRejectedValue(new ApiError(401, "unauthenticated"));
    renderClaim();
    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    expect(screen.getByRole("alert").textContent).toBe("เซสชันหมดอายุ ยังไม่ได้ส่งอะไร เข้าสู่ระบบอีกครั้งแล้วกลับมาที่หน้านี้");
    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบอีกครั้ง" }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/bookings/refund?bookingId=${booking.id}`)}`,
    );
  });

  it.each([
    [404, "ไม่พบใบเสร็จที่ขอคืนเงินได้ของการจองนี้ ติดต่อฝ่ายช่วยเหลือ"],
    [400, "ระบบไม่รับคำขอนี้ ติดต่อฝ่ายช่วยเหลือ"],
  ])("after a %i, sends the advisee to support rather than to press again", async (status, words) => {
    actions.openRefundOnce.mockRejectedValue(new ApiError(status, "refused"));
    renderClaim();
    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    expect(screen.getByRole("alert").textContent).toBe(words);
    // The button is the way on now, with the receipt in the subject; a second press would fail the same way.
    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    const support = screen.getByRole("button", { name: "ติดต่อฝ่ายช่วยเหลือ" });
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toMatch(/^mailto:[^?]+\?subject=สอบถามรายการ INV-2026-000123$/);
    expect(screen.queryByRole("link", { name: "ติดต่อฝ่ายช่วยเหลือ" })).toBeNull();
  });

  it.each([
    ["refused", "ติดต่อฝ่ายช่วยเหลือ"],
    ["notFound", "ติดต่อฝ่ายช่วยเหลือ"],
    ["signIn", "เข้าสู่ระบบอีกครั้ง"],
  ] as const)("arriving from this page's cancel whose refund was %s, offers what helps, not the claim", (failed, way) => {
    renderClaim({ failed, notice: "ยกเลิกการจองแล้ว แต่ระบบไม่รับเรื่องคืนเงิน ฿1,000 ติดต่อฝ่ายช่วยเหลือ" });
    expect(screen.getByRole("alert").textContent).toBe("ยกเลิกการจองแล้ว แต่ระบบไม่รับเรื่องคืนเงิน ฿1,000 ติดต่อฝ่ายช่วยเหลือ");
    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    expect(screen.getByRole("button", { name: way })).toBeTruthy();
  });

  it("arriving from a cancel whose refund call simply failed, keeps the claim to press again", () => {
    renderClaim({ failed: "retry" });
    expect(screen.getByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeTruthy();
  });

  it("hands up a request opened elsewhere first, flagged, for the page to say so", async () => {
    const elsewhere: OpenedRefund = { refund, alreadyOpen: true };
    actions.openRefundOnce.mockResolvedValue(elsewhere);
    const { onOpened } = renderClaim();
    await act(async () => screen.getByRole("button", { name: "รับเงินคืน ฿1,000" }).click());
    expect(onOpened).toHaveBeenCalledExactlyOnceWith(elsewhere);
  });
});

describe("both modes", () => {
  it("ask for nothing: no text field, no choice, no file", () => {
    for (const view of [renderCancel(), renderCancel(halfCancel), renderClaim(), renderClaim({ exit: claimHalf, of: adviseeLate })]) {
      expect(within(view.container).queryAllByRole("textbox")).toEqual([]);
      expect(within(view.container).queryAllByRole("radio")).toEqual([]);
      expect(view.container.querySelector("input, textarea, select")).toBeNull();
      view.unmount();
    }
  });

  it("render in English with no key missing", () => {
    const cancel = renderCancel(halfCancel, "en");
    expect(cancel.errors).toEqual([]);
    expect(screen.getByRole("button", { name: "Cancel and get ฿400 back" })).toBeTruthy();
    cancel.unmount();

    const claim = renderClaim({ exit: claimHalf, of: adviseeLate, locale: "en" });
    expect(claim.errors).toEqual([]);
    expect(screen.getByRole("button", { name: "Get ฿400 back" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b(bookingRefund|bookings|transactions|landing)\.\w/);
  });
});
