import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, type Messages } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./support/scroll-trigger";
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
vi.mock("@/components/bookings/refund-actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/bookings/refund-actions")>()),
  ...actions,
}));
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
function page(locale: "th" | "en") {
  return (
    <NextIntlClientProvider
      formats={formats}
      locale={locale}
      messages={(locale === "th" ? th : en) as Messages}
      onError={(error) => problems.push(error.message)}
      timeZone="Asia/Bangkok"
    >
      <BookingRefundScreen />
    </NextIntlClientProvider>
  );
}
function show(locale: "th" | "en") {
  return render(page(locale));
}
/** A read again answers: the booking comes back as a new object, as the API's next reply would. */
function rereadAnswers(view: ReturnType<typeof show>, booking: ApiBooking) {
  api.answers.set(`bookings/${id}`, { data: booking });
  view.rerender(page("th"));
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

/**
 * The way back is the column's own link (the phone's top bar, the desktop's link above the card), never a pill too;
 * in cancel mode the desktop's link gives way to the page's own "keep the booking", which goes to the same place.
 */
function onlyTheTopBack(locale: "th" | "en") {
  const labels = [words[locale].actions.back, words[locale].actions.toBookings];
  const named = (role: "button" | "link") => labels.flatMap((name) => screen.queryAllByRole(role, { name }));
  // The phone's top bar is an icon named by aria-label; a pill carries the words.
  const [topBar, rest] = [named("button").filter((node) => node.textContent === ""), named("button").filter((node) => node.textContent !== "")];
  expect(rest).toEqual([]);
  expect(topBar).toHaveLength(1);
  const keep = screen.queryAllByRole("button", { name: words[locale].actions.keep });
  expect(named("link").length + keep.length).toBe(1);
  for (const node of keep) expect(node.getAttribute("href")).toBe(`/bookings?bookingId=${id}`);
}
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
  { name: "a failed read: try again", arrange: () => answer({ error: new ApiError(500, "down") }, null), heading: (w) => w.states.loadFailed },
  { name: "a failed money read: its own title", arrange: () => answer(bookingAt(3 * DAY), { error: new ApiError(503, "down") }), heading: (w) => w.states.moneyFailed },
  { name: "booked with no receipt of its own: paid on the earlier booking", arrange: () => answer(bookingAt(3 * DAY), null), heading: (w) => w.states.paidElsewhereTitle },
];

describe.each(["th", "en"] as const)("/bookings/refund in %s", (locale) => {
  it.each(cases)("$name", ({ arrange, heading }) => {
    arrange();
    show(locale);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(heading(words[locale]));
    expect(document.body.textContent).not.toMatch(/bookingRefund\.|bookings\.[a-z]/);
    expect(problems).toEqual([]);
    expect(screen.queryByRole("navigation", { name: /breadcrumb|เส้นทาง/i })).toBeNull();
    onlyTheTopBack(locale);
  });

  it.each(states)("$name", ({ arrange, heading }) => {
    arrange();
    show(locale);
    expect(screen.getByText(heading(words[locale]))).toBeTruthy();
    expect(problems).toEqual([]);
    expect(screen.queryByRole("button", { name: /฿/ })).toBeNull();
    onlyTheTopBack(locale);
  });

  it("someone else's booking: not found, with one way to the bookings from lg, the pill, and the phone's top back", () => {
    answer({ error: new ApiError(404, "Booking not found") }, null);
    show(locale);
    expect(screen.getByText(words[locale].states.notFoundTitle)).toBeTruthy();
    const pill = screen.getAllByRole("button", { name: words[locale].actions.toBookings }).filter((node) => node.textContent !== "");
    expect(pill).toHaveLength(1);
    expect(pill[0].getAttribute("href")).toBe("/bookings");
    // The column's desktop back link would go to the same place as the pill, so it is not drawn.
    expect(screen.queryAllByRole("link", { name: words[locale].actions.toBookings })).toEqual([]);
    expect(problems).toEqual([]);
  });
});

describe("a failure says what helps next", () => {
  const signIn = `/login?next=${encodeURIComponent(`/bookings/refund?bookingId=${id}`)}`;

  it.each([
    ["the booking", () => answer({ error: new ApiError(401, "unauthenticated") }, null)],
    ["its money", () => answer(bookingAt(3 * DAY), { error: new ApiError(401, "unauthenticated") })],
  ])("asks to sign in again when the session lapsed reading %s, with no retry", (_, arrange) => {
    arrange();
    show("th");
    expect(screen.getByText(th.bookingRefund.states.signInTitle)).toBeTruthy();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.signIn }).getAttribute("href")).toBe(signIn);
    expect(screen.queryByRole("button", { name: th.bookingRefund.actions.retry })).toBeNull();
  });

  it("offers to try again only where it can help", () => {
    answer({ error: new ApiError(500, "down") }, null);
    show("th");
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.retry })).toBeTruthy();
    cleanup();

    answer({ error: new ApiError(400, "bad request") }, null);
    show("th");
    expect(screen.getByText(th.bookingRefund.states.loadFailed)).toBeTruthy();
    expect(screen.getByText(th.bookingRefund.states.loadRefusedBody)).toBeTruthy();
    expect(screen.queryByRole("button", { name: th.bookingRefund.actions.retry })).toBeNull();
    const support = screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport });
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toMatch(new RegExp(`^mailto:[^?]+\\?subject=สอบถามการจอง ${id}$`));
  });

  it.each([
    [400, th.bookingRefund.states.moneyRefusedBody],
    [403, th.bookingRefund.states.moneyForbiddenBody],
  ])("sends a refused (%i) money read to support, not to a retry that would be refused again", (status, body) => {
    answer(bookingAt(3 * DAY), { error: new ApiError(status, "Refused") });
    show("th");
    expect(screen.getByText(th.bookingRefund.states.moneyFailed)).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
    expect(screen.queryByRole("button", { name: th.bookingRefund.actions.retry })).toBeNull();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport }).getAttribute("href")).toMatch(/^mailto:/);
  });

  it("names the refund requests as the read that failed, and a 403 as this account's, when only they are refused", () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    api.answers.set("refunds/me", { error: new ApiError(403, "Forbidden") });
    show("th");
    expect(screen.getByText(th.bookingRefund.states.requestsFailed)).toBeTruthy();
    expect(screen.getByText(th.bookingRefund.states.requestsForbiddenBody)).toBeTruthy();
    expect(screen.queryByText(th.bookingRefund.states.moneyFailed)).toBeNull();
    expect(screen.queryAllByRole("button").filter((node) => /฿|ยกเลิก/.test(node.textContent ?? ""))).toEqual([]);
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport }).getAttribute("href")).toMatch(/^mailto:/);
  });

  it("says nothing has changed when the money of a cancelled booking will not load", () => {
    const b = cancelledBy("advisee", 3 * DAY, DAY);
    answer(b, { error: new ApiError(500, "down") });
    show("th");
    expect(screen.getByText(th.bookingRefund.states.moneyFailedBody)).toBeTruthy();
    expect(document.body.textContent).not.toContain("การจองยังอยู่เหมือนเดิม");
  });

  it("names a failed money read as the money, not the booking, and reads the money again on retry", async () => {
    answer(bookingAt(3 * DAY), { error: new ApiError(503, "down") });
    show("th");
    expect(screen.getByText(th.bookingRefund.states.moneyFailed)).toBeTruthy();
    expect(screen.queryByText(th.bookingRefund.states.loadFailed)).toBeNull();
    // The booking's own read again on a cached mount is not the retry's.
    api.reloads.length = 0;
    await act(async () => screen.getByRole("button", { name: th.bookingRefund.actions.retry }).click());
    expect(api.reloads).toContain(`payment/invoices/for-booking/${id}`);
    expect(api.reloads).not.toContain(`bookings/${id}`);
  });

  it("sends a booking paid on the earlier one to support, naming it in the subject, with no cancel and no price", () => {
    answer(bookingAt(3 * DAY), null);
    api.answers.set("services/service", { data: { id: "service", name: "วางแผนภาษี", priceSatang: 100_000 } });
    show("th");
    expect(screen.getByText(th.bookingRefund.states.paidElsewhereBody)).toBeTruthy();
    const support = screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport });
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toMatch(
      new RegExp(`^mailto:[^?]+\\?subject=สอบถามการจอง วางแผนภาษี วันที่ \\S+\\s7\\sพ\\.ย\\.\\s2569 · ${id}$`),
    );
    expect(document.body.textContent).not.toMatch(/฿|ยกเลิกการจอง/);
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

describe("what the page files after its own press", () => {
  const press = (name: string) => act(async () => screen.getByRole("button", { name }).click());

  it("files nothing when the advisor cancelled first, and claims the whole charge the server says is owed", async () => {
    const b = bookingAt(5 * HOUR);
    answer(b, invoiceFor(b));
    const view = show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "foundCancelled" });
    await press("ยกเลิกและรับเงินคืน ฿400");
    expect(api.reloads).toEqual(expect.arrayContaining([`bookings/${id}`, `payment/invoices/for-booking/${id}`]));

    rereadAnswers(view, cancelledBy("advisor", HOUR, 5 * HOUR));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.claim);
    expect(screen.getByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeTruthy();
    expect(screen.queryByText(/฿400/)).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(th.bookingRefund.errors.cancelledMeanwhile);
    expect(actions.openRefundOnce).not.toHaveBeenCalled();
  });

  it.each([
    ["now cancelled", () => cancelledBy("advisee", 5 * HOUR - 60_000, 5 * HOUR), th.bookingRefund.errors.cancelledMeanwhile],
    ["still on", () => bookingAt(5 * HOUR), th.bookingRefund.errors.cancelFailed],
  ])("after an unsure cancel, the line says what the check found: %s", async (_, found, line) => {
    const b = bookingAt(5 * HOUR);
    answer(b, invoiceFor(b));
    const view = show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "notCancelled", outcome: "uncertain" });
    await press("ยกเลิกและรับเงินคืน ฿400");
    expect(screen.getByRole("alert").textContent).toBe(th.bookings.cancellationUncertain);

    await press(th.bookingRefund.actions.check);
    rereadAnswers(view, found());
    expect(screen.getByRole("alert").textContent).toBe(line);
  });

  it("dates the cancel at the press, and reads the booking again for the server's own time", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    vi.mocked(Date.now).mockReturnValue(NOW + 7 * 60_000);
    actions.cancelThenRefund.mockResolvedValue({ kind: "opened", refund: { ...request("OPEN"), createdAt: new Date(NOW + 7 * 60_000).toISOString() } });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    const cancelled = screen.getByText(th.bookingRefund.progress.cancellation.cancelled).closest("li");
    expect(cancelled?.textContent).toContain("19:07");
    expect(cancelled?.textContent).not.toContain("19:00");
    expect(api.reloads).toEqual(expect.arrayContaining([`bookings/${id}`, `payment/invoices/for-booking/${id}`]));
  });

  it("reads the booking again after a cancel that stood while its request did not, and says how to go on", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "cancelledOnly", failure: "signIn" });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(api.reloads).toContain(`bookings/${id}`);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.claim);
    expect(screen.getByRole("alert").textContent).toBe(
      "ยกเลิกการจองแล้ว แต่เซสชันหมดอายุก่อนส่งเรื่องคืนเงิน เข้าสู่ระบบอีกครั้งแล้วกดรับเงินคืน ฿1,000",
    );
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.signIn })).toBeTruthy();
  });

  it("claims the half its own late cancel is owed, before the booking is read again", async () => {
    const b = bookingAt(5 * HOUR);
    answer(b, invoiceFor(b));
    show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "cancelledOnly", failure: "retry" });
    await press("ยกเลิกและรับเงินคืน ฿400");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.claim);
    expect(screen.getByRole("button", { name: "รับเงินคืน ฿400" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
  });

  it.each(["refused", "notFound"] as const)("after a cancel whose refund was %s, says the cancel stood and the refund did not go", async (failure) => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "cancelledOnly", failure });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(screen.getByRole("alert").textContent).toBe("ยกเลิกการจองแล้ว แต่ส่งเรื่องคืนเงิน ฿1,000 ไม่สำเร็จ ติดต่อฝ่ายช่วยเหลือ");
    expect(document.body.textContent).not.toContain("ระบบไม่รับ");
  });

  it("after a cancel whose refund was refused, offers support as the button, not a claim that would be refused again", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "cancelledOnly", failure: "refused" });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.claim);
    expect(screen.queryByRole("button", { name: "รับเงินคืน ฿1,000" })).toBeNull();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.mailSupport }).getAttribute("href")).toMatch(
      /^mailto:[^?]+\?subject=/,
    );
  });

  it("says a request was already open, and announces no success of its own, when another tab got there first", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    const view = show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "opened", refund: request("OPEN"), alreadyOpen: true });
    await press("ยกเลิกและรับเงินคืน ฿1,000");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(screen.getByRole("alert").textContent).toBe(th.bookingRefund.errors.alreadyOpen);
    expect(view.container.querySelector('[aria-live="polite"]')?.textContent).toBe("");
  });

  it("keeps the status it just reached when the booking's read again fails, with a line and a retry", async () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    const view = show("th");
    actions.cancelThenRefund.mockResolvedValue({ kind: "opened", refund: request("OPEN"), alreadyOpen: false });
    await press("ยกเลิกและรับเงินคืน ฿1,000");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);

    api.answers.set(`bookings/${id}`, { error: new ApiError(503, "down") });
    api.answers.set(`payment/invoices/for-booking/${id}`, { error: new ApiError(503, "down") });
    view.rerender(page("th"));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(screen.queryByText(th.bookingRefund.states.loadFailed)).toBeNull();
    expect(screen.queryByText(th.bookingRefund.states.moneyFailed)).toBeNull();
    expect(screen.getByText(th.bookingRefund.errors.rereadFailed, { exact: false })).toBeTruthy();
    api.reloads.length = 0;
    await press(th.bookingRefund.actions.retry);
    expect(api.reloads).toEqual(expect.arrayContaining([`bookings/${id}`, `payment/invoices/for-booking/${id}`]));
  });

  it("keeps what it showed when the session lapses on a read again, and offers to sign in from the line", () => {
    const b = cancelledBy("advisee", 6 * DAY, DAY);
    answer(b, invoiceFor(b), [request("OPEN")]);
    const view = show("th");
    api.answers.set(`bookings/${id}`, { error: new ApiError(401, "unauthenticated") });
    view.rerender(page("th"));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.requested);
    expect(screen.getByText(th.bookingRefund.errors.rereadSignIn, { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.signIn }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/bookings/refund?bookingId=${id}`)}`,
    );
  });
});

describe("nothing to refund says why", () => {
  const support = () => screen.queryByRole("button", { name: th.bookingRefund.actions.mailSupport });

  it("says a booking moved to a new time without claiming its payment moved, and offers support", () => {
    const b = cancelledBy("advisee", 3 * DAY, DAY);
    answer(b, invoiceFor(b, { session: { startTime: new Date(NOW + 9 * DAY).toISOString(), endTime: new Date(NOW + 9 * DAY + HOUR).toISOString() } }));
    show("th");
    expect(screen.getByText(th.bookingRefund.states.nothingRescheduled)).toBeTruthy();
    expect(document.body.textContent).not.toContain("ย้ายไปอยู่กับนัดใหม่");
    expect(support()?.getAttribute("href")).toMatch(/^mailto:/);
  });

  it.each([
    ["no receipt", null],
    ["a failed receipt", "failed"],
  ] as const)("says a cancelled booking with %s found no payment, never that it was unpaid, and offers support", (_, receipt) => {
    const b = cancelledBy("advisee", 3 * DAY, DAY);
    answer(b, receipt === null ? null : invoiceFor(b, { status: receipt }));
    show("th");
    expect(screen.getByText(th.bookingRefund.states.nothingNoReceipt)).toBeTruthy();
    expect(screen.queryByText(th.bookingRefund.states.nothingUnpaid)).toBeNull();
    expect(support()?.getAttribute("href")).toMatch(/^mailto:/);
  });

  it("says a held slot was not paid, with nothing to contact anyone about", () => {
    answer(bookingAt(3 * DAY, { state: "PENDING_PAYMENT" }), null);
    show("th");
    expect(screen.getByText(th.bookingRefund.states.nothingUnpaid)).toBeTruthy();
    expect(screen.queryByText(th.bookingRefund.states.nothingRescheduled)).toBeNull();
    expect(support()).toBeNull();
  });

  it("opens a held slot whose receipt already reads paid on its cancel with the refund, not on nothing to refund", () => {
    const b = bookingAt(3 * DAY, { state: "PENDING_PAYMENT" });
    answer(b, invoiceFor(b));
    show("th");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelFull);
  });

  it("waits on a held slot's money with the card's shape, then opens it on the mode its paid receipt calls for", () => {
    const b = bookingAt(3 * DAY, { state: "PENDING_PAYMENT" });
    answer(b, { loading: true });
    const view = show("th");
    expect(screen.getByRole("status").textContent).toBe(th.bookingRefund.busy.loading);
    expect(screen.queryByText(th.bookingRefund.states.nothingTitle)).toBeNull();
    expect(screen.queryAllByRole("button").filter((node) => /฿|ยกเลิก/.test(node.textContent ?? ""))).toEqual([]);

    api.answers.set(`payment/invoices/for-booking/${id}`, { data: invoiceFor(b) });
    view.rerender(page("th"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.cancelFull);
    expect(screen.getByRole("button", { name: "ยกเลิกและรับเงินคืน ฿1,000" })).toBeTruthy();
  });

  it("sends a confirmed booking whose receipt reads failed to support, saying the receipt shown is not the one paid", () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b, { status: "failed" }));
    show("th");
    expect(screen.getByText(th.bookingRefund.states.paidUnshownTitle)).toBeTruthy();
    expect(screen.getByText(th.bookingRefund.states.paidUnshownBody)).toBeTruthy();
    expect(screen.queryAllByRole("button").filter((node) => /฿|ยกเลิก/.test(node.textContent ?? ""))).toEqual([]);
    expect(support()?.getAttribute("href")).toMatch(/^mailto:/);
    // An email stops no clock: the full refund's line is said beside the way to support.
    expect(document.body.textContent?.replaceAll(" ", " ")).toMatch(/ยกเลิกถึง \S+ 6 พ\.ย\. 2569 · 19:00 ได้คืนเต็มจำนวน เวลานี้ไม่หยุดระหว่างรออีเมลตอบ/);
  });

  it("says, beside support for an ended booking's refused money, until when a problem can still be reported", () => {
    answer(bookingAt(-2 * DAY), { error: new ApiError(403, "Forbidden") });
    show("th");
    expect(document.body.textContent?.replaceAll(" ", " ")).toMatch(/แจ้งปัญหาได้ถึง \S+ 9 พ\.ย\. 2569 · 20:00 เวลานี้ไม่หยุดระหว่างรออีเมลตอบ/);
  });
});

describe("while the money loads", () => {
  it("shows the card's shape and offers nothing", () => {
    const b = bookingAt(3 * DAY);
    answer(b, { loading: true });
    show("th");
    expect(screen.getByRole("status").textContent).toBe(th.bookingRefund.busy.loading);
    expect(screen.queryAllByRole("button").filter((node) => /฿|ยกเลิก/.test(node.textContent ?? ""))).toEqual([]);
    // The bones hold placeholder glyphs for their line heights; a screen reader hears only the status.
    const bones = screen.queryAllByText(/กกก/);
    expect(bones.length).toBeGreaterThan(0);
    for (const bone of bones) expect(bone.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });

  const cells = () => [...document.querySelectorAll<HTMLElement>("[data-cell]")].map((cell) => cell.dataset.cell);

  it.each([
    { name: "a session that has ended, which opens on its report form", booking: () => bookingAt(-2 * DAY), shape: ["head", "foot"] },
    { name: "a session under way, which opens on its report form", booking: () => bookingAt(-10 * 60_000, { state: "IN_PROGRESS" }), shape: ["head", "foot"] },
    { name: "a recorded no-show, which opens on its report form", booking: () => bookingAt(-DAY, { state: "NO_SHOW" }), shape: ["head", "foot"] },
    { name: "a booking three days out, which opens on its cancel", booking: () => bookingAt(3 * DAY), shape: ["head", "sections"] },
  ])("draws the cells of $name while its money loads, and keeps them when it lands", ({ booking, shape }) => {
    const b = booking();
    answer(b, { loading: true });
    const view = show("th");
    expect(screen.getByRole("status").textContent).toBe(th.bookingRefund.busy.loading);
    const loading = cells();
    expect(loading).toEqual(shape);

    answer(b, invoiceFor(b));
    view.rerender(page("th"));
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(cells()).toEqual(loading);
  });

  it("goes back to the booking's popup, never to a breadcrumb trail", () => {
    const b = bookingAt(-2 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    const backs = screen.getAllByRole("link", { name: new RegExp(th.bookingRefund.actions.back) });
    expect(backs.length).toBeGreaterThan(0);
    for (const link of backs) expect(link.getAttribute("href")).toBe(`/bookings?bookingId=${id}`);
  });

  it("in cancel mode leaves the way back to its own keep-the-booking pill, with no second link above the card", () => {
    const b = bookingAt(3 * DAY);
    answer(b, invoiceFor(b));
    show("th");
    expect(screen.queryAllByRole("link", { name: new RegExp(th.bookingRefund.actions.back) })).toEqual([]);
    expect(screen.getByRole("button", { name: th.bookingRefund.actions.keep }).getAttribute("href")).toBe(`/bookings?bookingId=${id}`);
  });
});

describe("an advisee's cancel after the session began", () => {
  // Called off 20 minutes after its end, as dev's old refund form did before sending the request.
  const late = () => {
    const start = NOW - 2 * DAY;
    return bookingAt(-2 * DAY, {
      state: "CANCELLED",
      cancelledByUserId: "advisee",
      cancelledAt: new Date(start + HOUR + 20 * 60_000).toISOString(),
      blocksAvailability: false,
    });
  };

  it("opens on reporting the problem for the whole charge, never on a late cancel's half", () => {
    const b = late();
    answer(b, invoiceFor(b));
    show("th");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.head.report);
    expect(document.body.textContent).toContain("฿1,000");
    expect(document.body.textContent).not.toContain("ภายใน 24 ชั่วโมงก่อน");
    expect(document.body.textContent).not.toContain("฿400");
  });

  it("reads its open request as a report under review, not as a cancellation the team confirms", () => {
    const b = late();
    answer(b, invoiceFor(b), [request("OPEN")]);
    show("th");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(th.bookingRefund.stage.reviewing);
    expect(document.body.textContent).toContain("฿1,000");
    expect(document.body.textContent).not.toContain(th.bookingRefund.stage.requested);
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
