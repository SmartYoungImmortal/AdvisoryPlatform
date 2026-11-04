import type { Page, Route } from "./coverage";

/**
 * The API a booking's refund flow talks to, held in the test: one booking,
 * its invoice and its refund requests, changed by the same calls the API
 * takes. Every mutating call is recorded so a test can say what was sent and
 * what was not (a report never cancels; a cancel goes first).
 */

export const NOW = Date.parse("2026-11-04T12:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const ids = {
  booking: "7d1c2a4e-3b5f-4c6d-8e9f-0a1b2c3d4e5f",
  service: "8e2d3b5f-4c6a-4d7e-9f0a-1b2c3d4e5f60",
  advisor: "9f3e4c6a-5d7b-4e8f-8a1b-2c3d4e5f6071",
  advisee: "0a4f5d7b-6e8c-4f9a-9b2c-3d4e5f607182",
  invoice: "1b5a6e8c-7f9d-4a0b-8c3d-4e5f60718293",
  refund: "2c6b7f9d-8a0e-4b1c-9d4e-5f6071829304",
} as const;

/** A service name of two lines on a phone's card, as most are. */
export const names = { service: "ปัญหาลูกจ้างและกฎหมายแรงงาน", advisor: "กัญญา พรหมมา" } as const;

type BookingState = "PENDING_PAYMENT" | "BOOKED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type InvoiceStatus = "paid" | "refunded" | "failed" | "pending";
type CaseStatus = "OPEN" | "APPROVED" | "REJECTED";

export type RefundScenario = {
  /** Start of the session, as an offset from NOW in ms. */
  readonly startsIn: number;
  readonly minutes?: number;
  readonly state?: BookingState;
  /** Who cancelled, for a CANCELLED booking, and how long before the start. */
  readonly cancelled?: { readonly by: "advisee" | "advisor"; readonly before: number };
  /** null: the booking has no receipt (a 404). */
  readonly invoice?: {
    readonly status?: InvoiceStatus;
    readonly priceSatang?: number;
    readonly feeSatang?: number;
    readonly refundSatang?: number | null;
    /** The invoice now pays for another time: the booking was rescheduled away. */
    readonly movedBy?: number;
    readonly card?: boolean;
  } | null;
  readonly cases?: readonly { readonly status: CaseStatus; readonly createdAgo: number }[];
  /** How the API answers a cancel and a new request. `taken`: the advisor cancelled first, so the cancel meets a 409. */
  readonly cancelAnswer?: "ok" | "fail" | "taken";
  /**
   * `taken`: another tab opened a request first, so this one meets the API's 409 for an open request.
   * `lost`: the first request commits but its answer never arrives, and the read back after it fails once,
   * so the next press meets the 409 of this press's own request.
   */
  readonly openAnswer?: "ok" | "fail" | "taken" | "lost";
  /** Status the booking read answers with, for not-found and error states. */
  readonly bookingStatus?: 200 | 404 | 500;
};

function envelope(data: unknown) {
  return { statusCode: 200, message: "OK", data };
}

async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(status === 200 ? envelope(data) : { statusCode: status, message: String(data) }),
  });
}

const iso = (ms: number) => new Date(ms).toISOString();

export type RefundApi = {
  /** Mutating calls in order, e.g. "POST /bookings/…/cancel", "POST /refunds". */
  readonly calls: string[];
  /** The reasons sent with POST /refunds. */
  readonly reasons: string[];
  readonly booking: () => { readonly state: BookingState };
};

/** Fix the page's clock at NOW and answer the API from the scenario. */
export async function mockRefundApi(page: Page, scenario: RefundScenario): Promise<RefundApi> {
  await page.clock.setFixedTime(NOW);
  const start = NOW + scenario.startsIn;
  const end = start + (scenario.minutes ?? 60) * 60_000;
  let state: BookingState = scenario.state ?? (scenario.cancelled ? "CANCELLED" : "BOOKED");
  let cancelledAt: string | null = scenario.cancelled ? iso(start - scenario.cancelled.before) : null;
  let cancelledBy: string | null = scenario.cancelled
    ? scenario.cancelled.by === "advisee" ? ids.advisee : ids.advisor
    : null;
  const price = scenario.invoice?.priceSatang ?? 80_000;
  const fee = scenario.invoice?.feeSatang ?? 20_000;
  const cases = (scenario.cases ?? []).map((item, index) => ({
    id: index === 0 ? ids.refund : `${ids.refund.slice(0, -2)}${String(index).padStart(2, "0")}`,
    invoiceId: ids.invoice,
    reason: "ยกเลิกก่อนเวลาเริ่ม 24 ชั่วโมงขึ้นไป · คืนเต็มจำนวน ฿1,000",
    status: item.status,
    createdAt: iso(NOW - item.createdAgo),
    resolvedAt: item.status === "OPEN" ? null : iso(NOW - item.createdAgo + HOUR),
  }));
  const calls: string[] = [];
  const reasons: string[] = [];
  let readBackFails = false;

  const booking = () => ({
    id: ids.booking,
    serviceId: ids.service,
    advisorId: ids.advisor,
    adviseeId: ids.advisee,
    startTime: iso(start),
    endTime: iso(end),
    unavailableUntil: iso(end),
    state,
    blocksAvailability: state !== "CANCELLED",
    cancelledAt,
    cancelledByUserId: cancelledBy,
    createdAt: iso(NOW - 10 * DAY),
  });
  const invoice = () =>
    scenario.invoice === null
      ? null
      : {
          id: ids.invoice,
          invoiceNumber: "INV-2026-001104",
          status: scenario.invoice?.status ?? "paid",
          amountSatang: price + fee,
          platformFeeSatang: fee,
          priceSatang: price,
          refundSatang: scenario.invoice?.refundSatang ?? null,
          createdAt: iso(NOW - 10 * DAY),
          paidAt: iso(NOW - 10 * DAY + 60_000),
          service: { id: ids.service, name: names.service },
          advisor: { id: ids.advisor, displayName: names.advisor },
          session: {
            startTime: iso(start + (scenario.invoice?.movedBy ?? 0)),
            endTime: iso(end + (scenario.invoice?.movedBy ?? 0)),
          },
          booking: state === "CANCELLED" ? "cancelled" : "confirmed",
          card: scenario.invoice?.card === false ? null : { brand: "Visa", lastDigits: "1111" },
        };
  const service = {
    id: ids.service, advisorId: ids.advisor, categoryId: "category", name: names.service, description: "",
    priceSatang: price, durationMinutes: scenario.minutes ?? 60, screeningRequired: false, trialEnabled: false,
    trialDurationMinutes: null,
  };
  const advisor = {
    id: ids.advisor, displayName: names.advisor, headline: "", bio: null, avatarKey: null, skills: [], publishedServiceCount: 1,
  };
  const page1 = (items: unknown[]) => ({ items, total: items.length, page: 1, limit: 100, totalPages: 1 });

  await page.route("http://localhost:3200/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const path = pathname.replace("/api/v1/", "");
    const method = request.method();

    if (path === "users/me") {
      return json(route, {
        id: ids.advisee, displayName: "ผู้รับคำปรึกษาทดสอบ", email: "refund@example.test", emailVerified: true,
        fullName: "ผู้รับคำปรึกษาทดสอบ", avatarKey: null, timezone: "Asia/Bangkok", roles: ["ADVISEE"],
        createdAt: iso(NOW - 30 * DAY), updatedAt: iso(NOW - 30 * DAY),
      });
    }
    if (path === "notifications/unread-count") return json(route, { count: 0 });
    if (path === "bookings/me") return json(route, { ...page1([booking()]), limit: 50 });
    if (path === `bookings/${ids.booking}` && method === "GET") {
      const status = scenario.bookingStatus ?? 200;
      return status === 200 ? json(route, booking()) : json(route, status === 404 ? "Booking not found" : "Server error", status);
    }
    if (path === `bookings/${ids.booking}/cancel` && method === "POST") {
      calls.push(`POST /bookings/${ids.booking}/cancel`);
      if (scenario.cancelAnswer === "fail") return json(route, "Service unavailable", 503);
      if (scenario.cancelAnswer === "taken") {
        state = "CANCELLED";
        cancelledAt = iso(NOW - 60_000);
        cancelledBy = ids.advisor;
        return json(route, "Cannot move this booking to CANCELLED", 409);
      }
      state = "CANCELLED";
      cancelledAt = iso(NOW);
      cancelledBy = ids.advisee;
      return json(route, booking());
    }
    if (path === "services") return json(route, page1([service]));
    if (path === `services/${ids.service}`) return json(route, service);
    if (path === "advisors") return json(route, page1([advisor]));
    if (path === `advisors/${ids.advisor}`) return json(route, advisor);
    if (path === `payment/invoices/for-booking/${ids.booking}`) {
      const current = invoice();
      return current ? json(route, current) : json(route, "Invoice not found", 404);
    }
    if (path === "refunds/me" && method === "GET") {
      if (readBackFails) {
        readBackFails = false;
        return json(route, "Service unavailable", 503);
      }
      return json(route, page1(searchParams.get("invoiceId") === ids.invoice ? cases : []));
    }
    if (path === "refunds" && method === "POST") {
      const body = request.postDataJSON() as { reason: string };
      calls.push("POST /refunds");
      reasons.push(body.reason);
      if (scenario.openAnswer === "fail") return json(route, "Service unavailable", 503);
      if (scenario.openAnswer === "lost") {
        if (cases.some((item) => item.status === "OPEN")) return json(route, "A refund case is already open for this invoice", 409);
        cases.unshift({ id: ids.refund, invoiceId: ids.invoice, reason: body.reason, status: "OPEN", createdAt: iso(NOW), resolvedAt: null });
        readBackFails = true;
        return route.abort("failed");
      }
      if (scenario.openAnswer === "taken") {
        cases.unshift({ id: ids.refund, invoiceId: ids.invoice, reason: "ที่ปรึกษาไม่มา หรือยกเลิกกะทันหัน", status: "OPEN", createdAt: iso(NOW - 60_000), resolvedAt: null });
        return json(route, "A refund case is already open for this invoice", 409);
      }
      const opened = { id: ids.refund, invoiceId: ids.invoice, reason: body.reason, status: "OPEN" as const, createdAt: iso(NOW), resolvedAt: null };
      cases.unshift(opened);
      return json(route, opened);
    }
    if (path.startsWith("refunds/") && path.endsWith("/evidence")) {
      if (method === "POST") calls.push(`POST /${path}`);
      return json(route, method === "POST" ? { objectKey: "evidence/1", originalFileName: "slip.png", mimeType: "image/png", createdAt: iso(NOW) } : []);
    }
    return json(route, {});
  });

  return { calls, reasons, booking: () => ({ state }) };
}

export const before = { hours: (n: number) => n * HOUR, days: (n: number) => n * DAY };
