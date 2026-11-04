import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, type Messages } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiAdviseeInvoice, ApiBooking, ApiRefundCase } from "@/lib/api/types";
import { formats } from "@/lib/i18n/requests";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  });
});

type Answer = { data?: unknown; error?: Error | null; loading?: boolean };
const api = vi.hoisted(() => ({ answers: new Map<string, Answer>(), reloads: [] as string[] }));
vi.mock("@/lib/api/use-resource", () => ({
  invalidate: vi.fn(),
  useLastAnswer: (resource: { data: unknown }) => resource.data,
  useResource: (key: string) => {
    const match = [...api.answers.entries()].find(([prefix]) => key.startsWith(prefix));
    const answer = match?.[1] ?? { loading: true };
    return { data: answer.data, loading: answer.loading ?? false, error: answer.error ?? null, reload: () => api.reloads.push(key) };
  },
}));
const actions = vi.hoisted(() => ({ cancelThenRefund: vi.fn(), openRefundOnce: vi.fn() }));
vi.mock("@/components/bookings/refund-actions", () => actions);
vi.mock("@/components/account/app-frame", () => ({ AppFrame: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/account/account-shell", async (original) => ({
  ...(await original<object>()),
  AccountShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("next/image", () => ({ default: () => null }));
// The router re-renders whoever reads the search params on a push; a push fires no popstate.
const nav = vi.hoisted(() => {
  const readers = new Set<() => void>();
  return {
    readers,
    push(url: string) {
      window.history.pushState(null, "", url);
      for (const reader of readers) reader();
    },
  };
});
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (onChange: () => void) => {
    nav.readers.add(onChange);
    return () => {
      nav.readers.delete(onChange);
    };
  };
  return {
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
  };
});

const { ApiError } = await import("@/lib/api/client");
const { BookingRefundScreen } = await import("@/components/bookings/booking-refund-screen");

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-04T12:00:00Z");
const id = "15638839-49d1-4553-b79c-59821ff58f2e";

function bookingAt(startsIn: number, patch: Partial<ApiBooking> = {}): ApiBooking {
  const start = NOW + startsIn;
  return {
    id, serviceId: "service", advisorId: "advisor", adviseeId: "advisee",
    startTime: new Date(start).toISOString(), endTime: new Date(start + HOUR).toISOString(),
    unavailableUntil: new Date(start + HOUR).toISOString(), state: "BOOKED", blocksAvailability: true,
    cancelledAt: null, cancelledByUserId: null, createdAt: "2026-10-25T00:00:00Z", ...patch,
  };
}
function invoiceFor(booking: ApiBooking, patch: Partial<ApiAdviseeInvoice> = {}): ApiAdviseeInvoice {
  return {
    id: "invoice", invoiceNumber: "INV-2026-001104", status: "paid", amountSatang: 100_000, platformFeeSatang: 20_000,
    priceSatang: 80_000, refundSatang: null, createdAt: "2026-10-25T00:00:00Z", paidAt: "2026-10-25T00:01:00Z",
    service: { id: "service", name: "วางแผนภาษี" }, advisor: { id: "advisor", displayName: "กัญญา" },
    session: { startTime: booking.startTime, endTime: booking.endTime }, booking: "confirmed",
    card: { brand: "Visa", lastDigits: "1111" }, ...patch,
  };
}
const request = (status: ApiRefundCase["status"]): ApiRefundCase => ({
  id: "case", invoiceId: "invoice", reason: "r", status, createdAt: "2026-11-03T10:00:00Z",
  resolvedAt: status === "OPEN" ? null : "2026-11-04T09:00:00Z",
});
const cancelledBy = (who: string, before: number, startsIn: number) =>
  bookingAt(startsIn, { state: "CANCELLED", cancelledByUserId: who, cancelledAt: new Date(NOW + startsIn - before).toISOString(), blocksAvailability: false });

function answer(booking: ApiBooking | Answer, invoice: ApiAdviseeInvoice | null | Answer, cases: readonly ApiRefundCase[] = []) {
  api.answers.clear();
  api.answers.set(`bookings/${id}`, "id" in booking ? { data: booking } : booking);
  api.answers.set(`payment/invoices/for-booking/${id}`, invoice !== null && !("id" in invoice) ? invoice : { data: invoice });
  api.answers.set("refunds/me", { data: cases });
  api.answers.set("refunds/case/evidence", { data: [] });
}

const problems: string[] = [];
function show(locale: "th" | "en") {
  return render(
    <NextIntlClientProvider
      formats={formats}
      locale={locale}
      messages={(locale === "th" ? th : en) as Messages}
      onError={(error) => problems.push(error.message)}
      timeZone="Asia/Bangkok"
    >
      <BookingRefundScreen />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  window.history.replaceState(null, "", `/bookings/refund?bookingId=${id}`);
  problems.length = 0;
  api.reloads.length = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  actions.cancelThenRefund.mockReset();
});

const words = { th: th.bookingRefund, en: en.bookingRefund };
type Case = { readonly name: string; readonly arrange: () => void; readonly heading: (w: typeof th.bookingRefund) => string };

const cases: readonly Case[] = [
  { name: "paid three days out: cancel for the whole charge", arrange: () => { const b = bookingAt(3 * DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.head.cancelFull },
  { name: "paid five hours out: cancel for half the service fee", arrange: () => { const b = bookingAt(5 * HOUR); answer(b, invoiceFor(b)); }, heading: (w) => w.head.cancelHalf },
  { name: "in progress: report a problem", arrange: () => { const b = bookingAt(-10 * 60_000, { state: "IN_PROGRESS" }); answer(b, invoiceFor(b)); }, heading: (w) => w.head.report },
  { name: "ended two days ago: report a problem", arrange: () => { const b = bookingAt(-2 * DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.head.report },
  { name: "advisor cancelled: claim the whole charge", arrange: () => { const b = cancelledBy("advisor", HOUR, DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.head.claim },
  { name: "cancelled early by the advisee with no request: claim in full", arrange: () => { const b = cancelledBy("advisee", 3 * DAY, DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.head.claim },
  { name: "cancelled late by the advisee with no request: claim half", arrange: () => { const b = cancelledBy("advisee", 3 * HOUR, DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.head.claim },
  { name: "marked completed in the room's early minutes, before its start time: report a problem", arrange: () => { const b = bookingAt(5 * 60_000, { state: "COMPLETED" }); answer(b, invoiceFor(b)); }, heading: (w) => w.head.report },
  { name: "open request on a cancellation: requested", arrange: () => { const b = cancelledBy("advisee", 6 * DAY, DAY); answer(b, invoiceFor(b), [request("OPEN")]); }, heading: (w) => w.stage.requested },
  { name: "open reported problem: reviewing", arrange: () => { const b = bookingAt(-DAY); answer(b, invoiceFor(b), [request("OPEN")]); }, heading: (w) => w.stage.reviewing },
  { name: "approved request", arrange: () => { const b = bookingAt(-DAY, { state: "COMPLETED" }); answer(b, invoiceFor(b), [request("APPROVED")]); }, heading: (w) => w.stage.approved },
  { name: "rejected request", arrange: () => { const b = bookingAt(-DAY, { state: "COMPLETED" }); answer(b, invoiceFor(b), [request("REJECTED")]); }, heading: (w) => w.stage.rejected },
  { name: "refunded invoice", arrange: () => { const b = bookingAt(-DAY, { state: "COMPLETED" }); answer(b, invoiceFor(b, { status: "refunded", refundSatang: 100_000 })); }, heading: (w) => w.stage.refunded },
];

const states: readonly Case[] = [
  { name: "unpaid: nothing to refund", arrange: () => answer(bookingAt(3 * DAY, { state: "PENDING_PAYMENT" }), null), heading: (w) => w.states.nothingTitle },
  { name: "rescheduled away: nothing to refund", arrange: () => { const b = cancelledBy("advisee", 3 * DAY, DAY); answer(b, invoiceFor(b, { session: { startTime: new Date(NOW + 9 * DAY).toISOString(), endTime: new Date(NOW + 9 * DAY + HOUR).toISOString() } })); }, heading: (w) => w.states.nothingTitle },
  { name: "past seven days after the end: closed", arrange: () => { const b = bookingAt(-8 * DAY); answer(b, invoiceFor(b)); }, heading: (w) => w.states.closedTitle },
  { name: "someone else's booking: not found", arrange: () => answer({ error: new ApiError(404, "Booking not found") }, null), heading: (w) => w.states.notFoundTitle },
  { name: "a failed read: try again", arrange: () => answer({ error: new ApiError(500, "down") }, null), heading: (w) => w.states.loadFailed },
];

describe.each(["th", "en"] as const)("/bookings/refund in %s", (locale) => {
  it.each(cases)("$name", ({ arrange, heading }) => {
    arrange();
    show(locale);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(heading(words[locale]));
    expect(document.body.textContent).not.toMatch(/bookingRefund\.|bookings\.[a-z]/);
    expect(problems).toEqual([]);
    expect(screen.queryByRole("navigation", { name: /breadcrumb|เส้นทาง/i })).toBeNull();
  });

  it.each(states)("$name", ({ arrange, heading }) => {
    arrange();
    show(locale);
    expect(screen.getByText(heading(words[locale]))).toBeTruthy();
    expect(problems).toEqual([]);
    expect(screen.queryByRole("button", { name: /฿/ })).toBeNull();
  });
});

describe("a press acts on the rule at the press, not at the page's opening", () => {
  const press = (name: string) => act(async () => screen.getByRole("button", { name }).click());

  it("sends nothing across the 24-hour line, and moves to the half refund with the new amount", async () => {
    const b = bookingAt(DAY + 2 * 60_000);
    answer(b, invoiceFor(b));
    show("th");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelFull);

    vi.mocked(Date.now).mockReturnValue(NOW + 4 * 60_000);
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(actions.cancelThenRefund).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelHalf);
    expect(screen.getByRole("alert").textContent).toBe(
      "เพิ่งเลยเวลาคืนเต็มจำนวน ตอนนี้ยกเลิกได้คืน ฿400 ยังไม่ได้ยกเลิกอะไร ตรวจสอบยอดแล้วกดอีกครั้ง",
    );
    actions.cancelThenRefund.mockResolvedValue({ kind: "notCancelled", outcome: "retry" });
    await press("ยกเลิกและรับเงินคืน ฿400");
    expect(actions.cancelThenRefund).toHaveBeenCalledWith(id, "invoice", "ยกเลิกภายใน 24 ชั่วโมงก่อนเวลาเริ่ม · คืน 50% ของค่าบริการ ฿400");
  });

  it("never cancels a session that started while the page stood open, and turns to reporting it", async () => {
    const b = bookingAt(60_000);
    answer(b, invoiceFor(b));
    show("th");
    vi.mocked(Date.now).mockReturnValue(NOW + 2 * 60_000);
    await press("ยกเลิกและรับเงินคืน ฿400");

    expect(actions.cancelThenRefund).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.report);
    expect(screen.getByRole("alert").textContent).toBe(th.bookingRefund.errors.offerStarted);
  });

  it("reads the booking and its money again after a cancel the booking's new state refused", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "notCancelled", outcome: "changed" });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(api.reloads).toEqual(expect.arrayContaining([`bookings/${id}`, `payment/invoices/for-booking/${id}`]));
    expect(screen.getByRole("alert").textContent).toBe(th.bookings.cancellationChanged);
  });
});

describe("nothing to refund says why", () => {
  it("says a rescheduled booking's payment moved with it, and only for a real reschedule", () => {
    const b = cancelledBy("advisee", 3 * DAY, DAY);
    answer(b, invoiceFor(b, { session: { startTime: new Date(NOW + 9 * DAY).toISOString(), endTime: new Date(NOW + 9 * DAY + HOUR).toISOString() } }));
    show("th");
    expect(screen.getByText(th.bookingRefund.states.nothingRescheduled)).toBeTruthy();
    cleanup();

    answer(bookingAt(3 * DAY, { state: "PENDING_PAYMENT" }), null);
    show("th");
    expect(screen.getByText(th.bookingRefund.states.nothingUnpaid)).toBeTruthy();
    expect(screen.queryByText(th.bookingRefund.states.nothingRescheduled)).toBeNull();
  });
});

describe("while the money loads", () => {
  it("shows the card's shape and offers nothing", () => {
    const b = bookingAt(3 * DAY);
    answer(b, { loading: true });
    show("th");
    expect(screen.getByRole("status").textContent).toBe(th.bookingRefund.busy.loading);
    expect(screen.queryAllByRole("button").filter((node) => /฿|ยกเลิก/.test(node.textContent ?? ""))).toEqual([]);
  });

  it("goes back to the booking's popup, never to a breadcrumb trail", () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    const backs = screen.getAllByRole("link", { name: new RegExp(th.bookingRefund.actions.back) });
    expect(backs.length).toBeGreaterThan(0);
    for (const link of backs) expect(link.getAttribute("href")).toBe(`/bookings?bookingId=${id}`);
  });
});

describe("a move to another booking on the same page (FE #108)", () => {
  it("shows the booking the new query names, not the one the page opened with", () => {
    const cancelled = cancelledBy("advisee", 6 * DAY, DAY);
    answer(cancelled, invoiceFor(cancelled), [request("OPEN")]);
    const other = "1fba6ff8-1d9a-4aff-9a19-752c89fcd30d";
    const ended = { ...bookingAt(-2 * DAY), id: other };
    api.answers.set(`bookings/${other}`, { data: ended });
    api.answers.set(`payment/invoices/for-booking/${other}`, { data: invoiceFor(ended) });
    show("th");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);

    api.answers.set("refunds/me", { data: [] });
    act(() => nav.push(`/bookings/refund?bookingId=${other}`));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.report);
    for (const link of screen.getAllByRole("link", { name: new RegExp(th.bookingRefund.actions.back) })) {
      expect(link.getAttribute("href")).toBe(`/bookings?bookingId=${other}`);
    }
  });
});
