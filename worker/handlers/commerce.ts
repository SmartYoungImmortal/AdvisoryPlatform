import { and, asc, desc, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";

import type { HandlerContext, Handlers } from "@/lib/api/contract";
import { apiError } from "@/lib/api/errors";
import type {
  Booking,
  BookingStatus,
  Invoice,
  Money,
  PaymentMethod,
  PaymentStatus,
  PayResult,
} from "@/lib/api/schema";

import type { WorkerContext } from "../context";
import { schema, type Db } from "../db";

/**
 * # Bookings, payment, invoices
 *
 * The two failure modes this file exists to prevent are **double-booking** and
 * **double-charging**, and neither is solved by careful reading — both are
 * solved by letting the database arbitrate:
 *
 * - A slot is claimed with `UPDATE … WHERE status = 'open'` and the claim is
 *   believed only if it affected a row. A `SELECT` followed by an `UPDATE` is
 *   the exact race `/checkout/slot-taken` was drawn for.
 * - A charge is keyed on `payment.idempotency_key`, which carries a unique
 *   index. A retry loses the insert and replays the original result instead of
 *   taking the money twice.
 *
 * Ordering that matters, in one place: **claim the hour, then charge the card.**
 * The reverse means refunding someone because the slot went while the bank was
 * thinking, and a refund is a support ticket where a slot-taken screen is not.
 */

// ── Narrowing the context ────────────────────────────────────────────────────

/**
 * `Handlers` types `ctx` as the contract's `HandlerContext` — the subset the
 * mock backend can also provide — so an object whose handlers *declare*
 * `WorkerContext` is not assignable to it and `worker/handlers/index.ts` would
 * stop compiling. The Worker only ever dispatches with a real `WorkerContext`,
 * so narrow once here rather than weakening the contract.
 */
function workerCtx(ctx: HandlerContext): WorkerContext {
  return ctx as WorkerContext;
}

// ── Money and time constants ─────────────────────────────────────────────────

/** Platform commission in basis points. 5% of the booking price. */
const PLATFORM_FEE_BP = 500;

/**
 * How long the advisee keeps an hour to themselves while in checkout. Long
 * enough to type a card in, short enough that an abandoned checkout does not
 * take an advisor's evening off the market.
 */
const HOLD_MS = 15 * 60 * 1000;

/**
 * Escrow grace. The advisor cannot be paid until a day after the session ends,
 * which is the window the advisee has to dispute.
 */
const ESCROW_GRACE_MS = 24 * 60 * 60 * 1000;

/** The free taster is 15 minutes even when the advisor published a longer slot. */
const TRIAL_MINUTES = 15;

/** The call opens shortly before the hour and closes shortly after it. */
const JOIN_OPENS_BEFORE_MS = 10 * 60 * 1000;
const JOIN_CLOSES_AFTER_MS = 15 * 60 * 1000;

/** Rooms are unguessable, so the URL itself is the access control. */
const JITSI_BASE = "https://meet.jit.si";

/**
 * Written to `payment.failure_code` when the hour was lost rather than the card
 * declined. Without it a replayed `payments.pay` would show `/checkout/failed`
 * where the first call showed `/checkout/slot-taken` — same money, wrong screen.
 */
const SLOT_TAKEN_FAILURE = "slot_taken";

/** Postgres unique-violation. A lost race, not a bug — see `booking_timeslot_uidx`. */
const UNIQUE_VIOLATION = "23505";

// ── Small mappers ────────────────────────────────────────────────────────────

function money(amountMinor: number): Money {
  return { amountMinor, currency: "THB" };
}

/**
 * The commission is rounded once, here, and the advisor's share is whatever is
 * left. Rounding both sides independently is how a satang goes missing.
 */
function platformFeeMinor(amountMinor: number): number {
  return Math.round((amountMinor * PLATFORM_FEE_BP) / 10_000);
}

/**
 * The `booking.status` column carries two states the contract has no word for.
 * `in-progress` is a confirmed booking that happens to be live right now, so it
 * reads as confirmed. `no-show` reads as cancelled rather than completed —
 * nothing was delivered, and mapping it to completed would make it reviewable.
 */
function toBookingStatus(value: string): BookingStatus {
  switch (value) {
    case "pending-payment":
    case "confirmed":
    case "completed":
    case "cancelled":
      return value;
    case "in-progress":
      return "confirmed";
    case "no-show":
      return "cancelled";
    default:
      return "pending-payment";
  }
}

function toPaymentStatus(value: string): PaymentStatus {
  switch (value) {
    case "processing":
    case "paid":
    case "failed":
    case "refunded":
    case "unconfirmed":
      return value;
    default:
      // An unrecognised state is money in flight, not money settled. Never
      // guess "paid".
      return "processing";
  }
}

function toCardBrand(value: string): PaymentMethod["brand"] {
  switch (value) {
    case "visa":
    case "mastercard":
    case "jcb":
    case "amex":
      return value;
    default:
      return "unknown";
  }
}

/**
 * Live only inside the window around the session. Handing out a permanent room
 * URL would let either side rejoin — or a forwarded link let a stranger join —
 * long after the hour that was paid for.
 */
function joinUrlFor(row: {
  status: string;
  jitsiRoom: string | null;
  startAt: Date;
  endAt: Date;
}): string | null {
  if (!row.jitsiRoom) return null;
  if (row.status !== "confirmed" && row.status !== "in-progress") return null;

  const now = Date.now();
  if (now < row.startAt.getTime() - JOIN_OPENS_BEFORE_MS) return null;
  if (now > row.endAt.getTime() + JOIN_CLOSES_AFTER_MS) return null;

  return `${JITSI_BASE}/${row.jitsiRoom}`;
}

/** Unguessable room name — the URL is the only thing gating the call. */
function newRoom(): string {
  return `apx-${crypto.randomUUID().replace(/-/g, "")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * `INV-YYYY-MMDD-XXXXXXXX`, where the suffix is derived from the idempotency
 * key. Deterministic on purpose: a replayed `payments.pay` recomputes the same
 * number from the original payment's timestamp and finds the original invoice
 * without needing a payment→invoice foreign key the schema does not have.
 */
async function invoiceNumber(idempotencyKey: string, issuedAt: Date): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(idempotencyKey),
  );
  const suffix = Array.from(new Uint8Array(digest).slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const year = issuedAt.getUTCFullYear();
  const month = String(issuedAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(issuedAt.getUTCDate()).padStart(2, "0");
  return `INV-${year}-${month}${day}-${suffix}`;
}

// ── Batching ─────────────────────────────────────────────────────────────────

/**
 * neon-http has no interactive transactions; `db.batch` sends the statements as
 * one transaction, which is what keeps "payment written, booking still pending"
 * from ever being a state that exists. Its parameter is typed as a non-empty
 * tuple while handlers build their statement lists conditionally, so funnel
 * every batch through here.
 */
type BatchTuple = Parameters<Db["batch"]>[0];
type Statement = BatchTuple[number];

async function runBatch(db: Db, statements: Statement[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as unknown as BatchTuple);
}

// ── Invoice reads ────────────────────────────────────────────────────────────

/**
 * One invoice plus its lines. Two round trips rather than a join: the ownership
 * predicate belongs in the invoice's WHERE, and the lines must not be fetched
 * for a row the caller turns out not to own.
 */
async function readInvoice(db: Db, where: SQL | undefined): Promise<Invoice | null> {
  const [row] = await db
    .select({
      id: schema.invoice.id,
      number: schema.invoice.number,
      bookingId: schema.invoice.bookingId,
      status: schema.invoice.status,
      totalMinor: schema.invoice.totalMinor,
      issuedAt: schema.invoice.issuedAt,
      paidAt: schema.invoice.paidAt,
      failureReason: schema.invoice.failureReason,
      refundedAmountMinor: schema.invoice.refundedAmountMinor,
    })
    .from(schema.invoice)
    .where(where)
    .limit(1);

  if (!row) return null;

  const lines = await db
    .select({
      label: schema.invoiceLine.label,
      amountMinor: schema.invoiceLine.amountMinor,
      negative: schema.invoiceLine.negative,
    })
    .from(schema.invoiceLine)
    .where(eq(schema.invoiceLine.invoiceId, row.id))
    // The UI renders the lines verbatim in this order — subtotal, fees,
    // discounts — so `position` is data, not decoration.
    .orderBy(asc(schema.invoiceLine.position));

  return {
    id: row.id,
    number: row.number,
    bookingId: row.bookingId,
    status: toPaymentStatus(row.status),
    lines: lines.map((line) => ({
      label: line.label,
      amount: money(line.amountMinor),
      negative: line.negative,
    })),
    total: money(row.totalMinor),
    issuedAt: row.issuedAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    refundedAmount:
      row.refundedAmountMinor === null ? null : money(row.refundedAmountMinor),
  };
}

// ── Cursor pagination ────────────────────────────────────────────────────────

/**
 * `(issuedAt, id)` rather than an offset: an offset skips or repeats rows when
 * a new invoice is written between pages, and a transaction list is exactly the
 * thing that grows while you are scrolling it. The id breaks ties so the order
 * is total.
 */
interface InvoiceCursor {
  readonly issuedAt: string;
  readonly id: string;
}

function encodeCursor(cursor: InvoiceCursor): string {
  return btoa(`${cursor.issuedAt}|${cursor.id}`);
}

function decodeCursor(raw: string): InvoiceCursor {
  try {
    const [issuedAt, ...rest] = atob(raw).split("|");
    const id = rest.join("|");
    if (!issuedAt || !id || Number.isNaN(Date.parse(issuedAt))) {
      throw new Error("malformed cursor");
    }
    return { issuedAt, id };
  } catch {
    throw apiError("VALIDATION_FAILED", "Cursor was not issued by this endpoint", {
      cursor: "invalid cursor",
    });
  }
}

// ── The payment provider ─────────────────────────────────────────────────────

export interface ChargeInput {
  readonly amountMinor: number;
  readonly currency: "THB";
  /**
   * Token from the processor's client SDK, or a saved method's id. Never a PAN:
   * card numbers go browser → processor and only the token comes back to us.
   */
  readonly token: string;
  readonly bookingId: string;
  /** Handed to the processor so a retry is idempotent on their side too. */
  readonly idempotencyKey: string;
}

/** Card metadata the processor returns, and the only part we may store. */
export interface ChargedCard {
  readonly cardId: string;
  readonly brand: string;
  readonly last4: string;
  readonly expiryMonth: number;
  readonly expiryYear: number;
}

export type ChargeResult =
  | { readonly status: "succeeded"; readonly chargeId: string; readonly card: ChargedCard | null }
  /** Bank has it but has not settled — `/checkout/processing` and `/checkout/unconfirmed`. */
  | { readonly status: "processing" | "unconfirmed"; readonly chargeId: string }
  | {
      readonly status: "failed";
      readonly chargeId: string | null;
      readonly failureCode: string;
      /** Shown verbatim on the invoice, so Thai — e.g. "บัตรถูกปฏิเสธ". */
      readonly failureMessage: string;
    };

/**
 * ⚠️ **STUB — no live payment provider yet.**
 *
 * Always succeeds, so the whole flow (payment → escrow → invoice → confirmed
 * booking → notifications) is exercisable end to end today. Everything around
 * it is real: swapping this function's body is the only change the real
 * provider needs, which is why the provider lives behind an interface instead
 * of being inlined into the handler.
 *
 * TODO(omise): POST https://api.omise.co/charges with `amount` (satang),
 * `currency: "thb"`, `card: token`, `capture: true` and the idempotency key as
 * the `Idempotency-Key` header. Map Omise's `status`/`failure_code`
 * (`successful` → succeeded, `pending` → processing, `failed` → failed) onto
 * `ChargeResult`, and return `card` from the charge's `card` object so
 * `saveCard` can store it. 3-D Secure lands as `processing` plus an
 * `authorize_uri`, which needs a webhook to settle — see the processing branch
 * in `payments.pay`.
 */
export async function chargeCard(input: ChargeInput): Promise<ChargeResult> {
  return {
    status: "succeeded",
    // Prefixed with the key so a stub charge is traceable in logs, and suffixed
    // with a uuid so it can never collide on `payment_omise_charge_uidx`.
    chargeId: `stub_chrg_${input.idempotencyKey.slice(0, 16)}_${crypto.randomUUID()}`,
    // The stub has no real card metadata, and inventing a brand and last4 would
    // put a card the user never entered on their saved-methods list.
    card: null,
  };
}

/** `PayResult.outcome` recovered from a stored payment row, for replays. */
function outcomeOf(status: string, failureCode: string | null): PayResult["outcome"] {
  if (failureCode === SLOT_TAKEN_FAILURE) return "slot-taken";
  switch (status) {
    case "paid":
      return "success";
    case "processing":
      return "processing";
    case "unconfirmed":
      return "unconfirmed";
    default:
      return "failed";
  }
}

// ── Service resolution ───────────────────────────────────────────────────────

interface ResolvedService {
  readonly id: string;
  readonly title: string;
  readonly priceMinor: number;
  readonly durationMinutes: number;
}

/**
 * Which service is being bought.
 *
 * A slot may pin one (`timeslot.service_id`); when it does not, the choice must
 * be deterministic, because it decides what the advisee is charged. Closest
 * duration to the slot first, then cheapest — anything time-dependent ("the
 * newest service") would make the price move when the advisor edits an
 * unrelated listing.
 */
async function resolveService(
  db: Db,
  advisorId: string,
  pinnedServiceId: string | null,
  slotMinutes: number,
): Promise<ResolvedService | null> {
  const columns = {
    id: schema.service.id,
    title: schema.service.title,
    priceMinor: schema.service.priceMinor,
    durationMinutes: schema.service.durationMinutes,
  };

  if (pinnedServiceId) {
    // The advisorId predicate stops a slot that references another advisor's
    // service (data drift, or a hand-edited row) from pricing this booking.
    const [row] = await db
      .select(columns)
      .from(schema.service)
      .where(
        and(
          eq(schema.service.id, pinnedServiceId),
          eq(schema.service.advisorId, advisorId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  const [row] = await db
    .select(columns)
    .from(schema.service)
    .where(
      and(
        eq(schema.service.advisorId, advisorId),
        eq(schema.service.status, "published"),
      ),
    )
    .orderBy(
      asc(sql`abs(${schema.service.durationMinutes} - ${slotMinutes})`),
      asc(schema.service.priceMinor),
    )
    .limit(1);
  return row ?? null;
}

// ── Booking reads ────────────────────────────────────────────────────────────

const bookingColumns = {
  id: schema.booking.id,
  advisorId: schema.booking.advisorId,
  adviseeId: schema.booking.adviseeId,
  status: schema.booking.status,
  startAt: schema.booking.startAt,
  endAt: schema.booking.endAt,
  priceMinor: schema.booking.priceMinor,
  durationMinutes: schema.booking.durationMinutes,
  isTrial: schema.booking.isTrial,
  jitsiRoom: schema.booking.jitsiRoom,
  advisorName: schema.user.name,
};

function toBooking(row: {
  id: string;
  advisorId: string;
  advisorName: string;
  adviseeId: string;
  status: string;
  startAt: Date;
  endAt: Date;
  priceMinor: number;
  durationMinutes: number;
  isTrial: boolean;
  jitsiRoom: string | null;
}): Booking {
  return {
    id: row.id,
    advisorId: row.advisorId,
    advisorName: row.advisorName,
    adviseeId: row.adviseeId,
    status: toBookingStatus(row.status),
    startAt: row.startAt.toISOString(),
    durationMinutes: row.durationMinutes,
    price: money(row.priceMinor),
    isTrial: row.isTrial,
    joinUrl: joinUrlFor(row),
  };
}

/**
 * A plain array with no cursor in the contract, so the only defence against a
 * heavy account is a ceiling. Far more than any real advisee has, and far less
 * than a response that times out.
 */
const BOOKING_LIST_CAP = 200;

// ── Handlers ─────────────────────────────────────────────────────────────────

export const commerceHandlers = {
  "bookings.create": async (input, ctx) => {
    const me = ctx.requireUser();
    const { db } = workerCtx(ctx);
    const now = new Date();

    // Claim the slot FIRST, and work from the row the claim returned. Reading
    // the slot and then updating it leaves a window in which two advisees both
    // saw it open — the UPDATE's WHERE is the only thing that can settle that,
    // so nothing is read before it.
    const [slot] = await db
      .update(schema.timeslot)
      .set({
        // A trial skips checkout entirely, so its slot is booked outright. A
        // paid booking only gets a hold; `payments.pay` turns that into a
        // booking once the money is real.
        status: input.isTrial ? "booked" : "held",
        heldBy: me.id,
        heldUntil: input.isTrial ? null : new Date(now.getTime() + HOLD_MS),
      })
      .where(
        and(
          eq(schema.timeslot.id, input.slotId),
          eq(schema.timeslot.status, "open"),
          gt(schema.timeslot.startAt, now),
          // Re-entering checkout on your own hold has to work; walking into
          // someone else's live hold must not. Note this only reclaims slots
          // still marked 'open' — an abandoned checkout leaves the row 'held'
          // until something sweeps `held_until` back to 'open', which is a
          // scheduled job, not a request-path concern.
          or(
            isNull(schema.timeslot.heldBy),
            eq(schema.timeslot.heldBy, me.id),
            lte(schema.timeslot.heldUntil, now),
          ),
        ),
      )
      .returning({
        id: schema.timeslot.id,
        advisorId: schema.timeslot.advisorId,
        serviceId: schema.timeslot.serviceId,
        startAt: schema.timeslot.startAt,
        endAt: schema.timeslot.endAt,
      });

    if (!slot) {
      // Zero rows means the claim lost — but "lost to whom" decides the screen,
      // and this lookup only ever runs on the failure path, so it costs the
      // happy path nothing.
      const [existing] = await db
        .select({
          startAt: schema.timeslot.startAt,
          status: schema.timeslot.status,
        })
        .from(schema.timeslot)
        .where(eq(schema.timeslot.id, input.slotId))
        .limit(1);

      if (!existing) throw apiError("NOT_FOUND", "No such slot");
      if (existing.startAt <= now) {
        throw apiError("NOT_ELIGIBLE", "That slot has already started");
      }
      throw apiError("SLOT_TAKEN", "That slot is no longer available");
    }

    const slotMinutes = Math.max(
      1,
      Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60_000),
    );

    // Independent reads, both keyed by an advisor we already hold the slot for.
    const [advisor, service] = await Promise.all([
      db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, slot.advisorId))
        .limit(1),
      input.isTrial
        ? Promise.resolve(null)
        : resolveService(db, slot.advisorId, slot.serviceId, slotMinutes),
    ]);

    if (!input.isTrial && !service) {
      // The hold expires on its own, so the advisee can try again once the
      // advisor publishes something bookable.
      throw apiError("NOT_ELIGIBLE", "This advisor has no bookable service for that slot");
    }

    // Price and duration are COPIED, never joined at read time: an advisor
    // raising their rate tomorrow must not rewrite what this booking cost.
    const priceMinor = service?.priceMinor ?? 0;
    const durationMinutes = service
      ? service.durationMinutes
      : Math.min(TRIAL_MINUTES, slotMinutes);

    // The reserved window still governs the calendar, so a paid booking ends
    // when the slot ends even if the service's nominal duration differs. A
    // trial ends after its 15 minutes; the rest of the hour stays consumed
    // because the whole slot is marked booked.
    const endAt = input.isTrial
      ? new Date(slot.startAt.getTime() + durationMinutes * 60_000)
      : slot.endAt;

    const bookingId = crypto.randomUUID();
    const jitsiRoom = input.isTrial ? newRoom() : null;
    // A trial is free, so there is nothing to pay and nothing to hold in
    // escrow: it is confirmed the moment the slot is claimed.
    const status = input.isTrial ? "confirmed" : "pending-payment";

    // TODO(abuse): nothing here limits an advisee to one free trial per
    // advisor. The rule belongs in the contract before it belongs in code —
    // adding it silently would make `bookings.create` reject a case the mock
    // backend still accepts.
    const statements: Statement[] = [
      db.insert(schema.booking).values({
        id: bookingId,
        serviceId: service?.id ?? null,
        advisorId: slot.advisorId,
        adviseeId: me.id,
        timeslotId: slot.id,
        status,
        startAt: slot.startAt,
        endAt,
        priceMinor,
        currency: "THB",
        durationMinutes,
        isTrial: input.isTrial,
        jitsiRoom,
      }),
    ];

    const advisorName = advisor[0]?.name ?? "";

    if (input.isTrial) {
      // A trial never passes through checkout, so this is the only moment
      // either side would hear about it. `href` is null because the bookings
      // screen has no route yet (see lib/navigation).
      statements.push(
        db.insert(schema.notification).values([
          {
            userId: me.id,
            kind: "booking",
            title: "จองทดลองปรึกษาสำเร็จ",
            body: `นัดทดลองปรึกษากับ${advisorName} ได้รับการยืนยันแล้ว`,
            href: null,
          },
          {
            userId: slot.advisorId,
            kind: "booking",
            title: "มีนัดทดลองปรึกษาใหม่",
            body: `${me.name} จองทดลองปรึกษากับคุณ`,
            href: null,
          },
        ]),
      );
    }

    try {
      await runBatch(db, statements);
    } catch (error) {
      // `booking_timeslot_uidx`: another booking already owns this slot, which
      // the claim above could not see if that booking left the slot in a state
      // our WHERE accepted. Same user-visible situation as losing the claim.
      if (isUniqueViolation(error)) {
        throw apiError("SLOT_TAKEN", "That slot is no longer available");
      }
      throw error;
    }

    return toBooking({
      id: bookingId,
      advisorId: slot.advisorId,
      advisorName,
      adviseeId: me.id,
      status,
      startAt: slot.startAt,
      endAt,
      priceMinor,
      durationMinutes,
      isTrial: input.isTrial,
      jitsiRoom,
    });
  },

  "bookings.list": async (_input, ctx) => {
    const me = ctx.requireUser();
    const { db } = workerCtx(ctx);

    // One endpoint serves both sides: an advisor sees the same rows from the
    // other end rather than needing a parallel advisor-only endpoint.
    const rows = await db
      .select(bookingColumns)
      .from(schema.booking)
      .innerJoin(schema.user, eq(schema.user.id, schema.booking.advisorId))
      .where(
        or(eq(schema.booking.adviseeId, me.id), eq(schema.booking.advisorId, me.id)),
      )
      .orderBy(desc(schema.booking.startAt))
      .limit(BOOKING_LIST_CAP);

    return rows.map(toBooking);
  },

  "payments.methods": async (_input, ctx) => {
    const me = ctx.requireUser();
    const { db } = workerCtx(ctx);

    const rows = await db
      .select({
        id: schema.paymentMethod.id,
        brand: schema.paymentMethod.brand,
        last4: schema.paymentMethod.last4,
        expiryMonth: schema.paymentMethod.expiryMonth,
        expiryYear: schema.paymentMethod.expiryYear,
        isDefault: schema.paymentMethod.isDefault,
      })
      .from(schema.paymentMethod)
      // Ownership is the whole query — there is no way to ask for someone
      // else's cards.
      .where(eq(schema.paymentMethod.userId, me.id))
      .orderBy(
        desc(schema.paymentMethod.isDefault),
        desc(schema.paymentMethod.createdAt),
      );

    return rows.map((row) => ({
      id: row.id,
      brand: toCardBrand(row.brand),
      // The column is text; the contract promises exactly four characters.
      last4: row.last4.slice(-4).padStart(4, "0"),
      expiryMonth: row.expiryMonth,
      expiryYear: row.expiryYear,
      isDefault: row.isDefault,
    }));
  },

  "payments.pay": async (input, ctx) => {
    const me = ctx.requireUser();
    const { db, waitUntil } = workerCtx(ctx);
    const now = new Date();

    // ── Replay ──────────────────────────────────────────────────────────────
    // `paymentToken` is the idempotency key. A double tap, a retry on a flaky
    // mobile connection or a restored tab must return the ORIGINAL result. The
    // unique index on payment.idempotency_key is what makes charging twice
    // impossible; this lookup is what makes the retry show the same screen.
    //
    // Scoped to the booking because the token is not always single-use: the
    // contract lets it be "a saved method's id", and paying for a second
    // booking with the same saved card would otherwise replay the first
    // booking's invoice instead of charging anything.
    const idempotencyKey = `${input.bookingId}:${input.paymentToken}`;

    const [prior] = await db
      .select({
        bookingId: schema.payment.bookingId,
        payerId: schema.payment.payerId,
        status: schema.payment.status,
        failureCode: schema.payment.failureCode,
        createdAt: schema.payment.createdAt,
      })
      .from(schema.payment)
      .where(eq(schema.payment.idempotencyKey, idempotencyKey))
      .limit(1);

    if (prior) {
      // The index is global, so a token that is not this caller's is either a
      // collision or an attempt to read someone else's payment.
      if (prior.payerId !== me.id) {
        throw apiError("FORBIDDEN", "That payment token belongs to another account");
      }

      // The invoice number is derived from the key and the original payment's
      // own timestamp, which is what links the two rows without a column for it.
      const replayed = await readInvoice(
        db,
        and(
          eq(schema.invoice.number, await invoiceNumber(idempotencyKey, prior.createdAt)),
          eq(schema.invoice.payerId, me.id),
        ),
      );
      if (!replayed) {
        // payment and invoice are written in one batch, so this is a torn
        // write rather than an ordinary miss.
        throw apiError("CONFLICT", "Payment exists without its invoice");
      }
      return { invoice: replayed, outcome: outcomeOf(prior.status, prior.failureCode) };
    }

    // ── The booking ─────────────────────────────────────────────────────────
    const [booking] = await db
      .select({
        id: schema.booking.id,
        advisorId: schema.booking.advisorId,
        timeslotId: schema.booking.timeslotId,
        status: schema.booking.status,
        endAt: schema.booking.endAt,
        priceMinor: schema.booking.priceMinor,
        isTrial: schema.booking.isTrial,
        advisorName: schema.user.name,
        serviceTitle: schema.service.title,
      })
      .from(schema.booking)
      .innerJoin(schema.user, eq(schema.user.id, schema.booking.advisorId))
      // Left, not inner: the service may have been deleted since booking, and
      // the price on the booking row is the truth anyway.
      .leftJoin(schema.service, eq(schema.service.id, schema.booking.serviceId))
      .where(
        // Ownership is in the WHERE. Another advisee's booking must read as
        // absent, not as forbidden — 403 confirms the id exists.
        and(eq(schema.booking.id, input.bookingId), eq(schema.booking.adviseeId, me.id)),
      )
      .limit(1);

    if (!booking) throw apiError("NOT_FOUND", "No such booking");
    if (booking.isTrial) throw apiError("NOT_ELIGIBLE", "Trial sessions are free");
    if (booking.status !== "pending-payment") {
      throw apiError("CONFLICT", `Booking is already ${booking.status}`);
    }

    // ── Claim the booking before spending money ─────────────────────────────
    // The status check above is a read, and a read cannot exclude a concurrent
    // writer. Two taps on Pay arrive with two different payment tokens, so the
    // idempotency key does not collide, both SELECTs see `pending-payment`, and
    // both reach chargeCard — the advisee is charged twice for one hour.
    //
    // Moving the booking to `processing` with a conditional UPDATE makes the
    // database the arbiter: exactly one request can observe a row count of 1.
    // The loser has moved nothing and can safely report the state it lost to.
    const claimedBooking = await db
      .update(schema.booking)
      .set({ status: "processing" })
      .where(
        and(
          eq(schema.booking.id, booking.id),
          eq(schema.booking.adviseeId, me.id),
          eq(schema.booking.status, "pending-payment"),
        ),
      )
      .returning({ id: schema.booking.id });

    if (claimedBooking.length === 0) {
      throw apiError("CONFLICT", "This booking is already being paid for");
    }

    // ── Take the hour before taking the money ───────────────────────────────
    // Charging first and then finding the slot gone means issuing a refund;
    // this way the worst case is a slot-taken screen with nothing moved.
    let slotHeld = true;
    if (booking.timeslotId) {
      const claimed = await db
        .update(schema.timeslot)
        .set({ status: "booked", heldBy: me.id, heldUntil: null })
        .where(
          and(
            eq(schema.timeslot.id, booking.timeslotId),
            or(
              // Hold expired but nobody else took it.
              and(eq(schema.timeslot.status, "open"), isNull(schema.timeslot.heldBy)),
              // Our own hold, or our own earlier attempt that already booked it
              // (a retry after `processing`).
              and(eq(schema.timeslot.status, "open"), eq(schema.timeslot.heldBy, me.id)),
              and(eq(schema.timeslot.status, "held"), eq(schema.timeslot.heldBy, me.id)),
              and(eq(schema.timeslot.status, "booked"), eq(schema.timeslot.heldBy, me.id)),
            ),
          ),
        )
        .returning({ id: schema.timeslot.id });
      slotHeld = claimed.length > 0;
    }

    const amountMinor = booking.priceMinor;
    const feeMinor = platformFeeMinor(amountMinor);
    const invoiceId = crypto.randomUUID();
    const number = await invoiceNumber(idempotencyKey, now);
    const lineLabel = booking.serviceTitle ?? `ปรึกษากับ${booking.advisorName}`;

    /**
     * One line, at the full price. The 5% commission comes out of the
     * advisor's share — the advisee is never billed for it — so putting it on
     * the invoice would leave the lines not summing to `total`, which is the
     * one thing the invoice screens cannot render.
     */
    const invoiceLines = [{ label: lineLabel, amountMinor, negative: false, position: 0 }];

    const invoiceOut = (
      status: PaymentStatus,
      paidAt: Date | null,
      failureReason: string | null,
    ): Invoice => ({
      id: invoiceId,
      number,
      bookingId: booking.id,
      status,
      lines: invoiceLines.map((line) => ({
        label: line.label,
        amount: money(line.amountMinor),
        negative: line.negative,
      })),
      total: money(amountMinor),
      issuedAt: now.toISOString(),
      paidAt: paidAt?.toISOString() ?? null,
      failureReason,
      refundedAmount: null,
    });

    const insertLines = () =>
      db
        .insert(schema.invoiceLine)
        .values(invoiceLines.map((line) => ({ ...line, invoiceId })));

    // ── Lost the hour ───────────────────────────────────────────────────────
    if (!slotHeld) {
      const failureReason = "ช่วงเวลานี้ถูกจองไปแล้ว";
      await runBatch(db, [
        // Recorded as a payment even though no card was touched, so that a
        // retry on the same token replays to `/checkout/slot-taken` instead of
        // running the whole flow again.
        db.insert(schema.payment).values({
          bookingId: booking.id,
          payerId: me.id,
          method: "card",
          amountMinor,
          platformFeeMinor: feeMinor,
          currency: "THB",
          status: "failed",
          failureCode: SLOT_TAKEN_FAILURE,
          failureMessage: "Timeslot was claimed by another advisee",
          idempotencyKey,
          // Explicit, because the invoice number is derived from this instant
          // and a database-side default could land on the other side of a UTC
          // midnight from `now`.
          createdAt: now,
        }),
        db.insert(schema.invoice).values({
          id: invoiceId,
          bookingId: booking.id,
          number,
          payerId: me.id,
          status: "failed",
          totalMinor: amountMinor,
          currency: "THB",
          issuedAt: now,
          failureReason,
        }),
        insertLines(),
        // The booking can never happen now; leaving it pending would keep a
        // dead row in the advisee's list forever.
        db
          .update(schema.booking)
          .set({ status: "cancelled", cancelledAt: now })
          .where(
            and(eq(schema.booking.id, booking.id), eq(schema.booking.adviseeId, me.id)),
          ),
      ]);

      return { invoice: invoiceOut("failed", null, failureReason), outcome: "slot-taken" };
    }

    // ── Charge ──────────────────────────────────────────────────────────────
    const charge = await chargeCard({
      amountMinor,
      currency: "THB",
      token: input.paymentToken,
      bookingId: booking.id,
      idempotencyKey,
    });

    if (charge.status === "succeeded") {
      const jitsiRoom = newRoom();
      await runBatch(db, [
        db.insert(schema.payment).values({
          bookingId: booking.id,
          payerId: me.id,
          method: "card",
          omiseChargeId: charge.chargeId,
          amountMinor,
          platformFeeMinor: feeMinor,
          currency: "THB",
          status: "paid",
          idempotencyKey,
          createdAt: now,
          paidAt: now,
        }),
        db.insert(schema.escrow).values({
          bookingId: booking.id,
          amountMinor,
          // Rounded once, on the fee; the advisor gets the remainder so the two
          // always add back up to what was charged.
          advisorShareMinor: amountMinor - feeMinor,
          state: "held",
          heldAt: now,
          // The advisee has a day after the session to dispute before the
          // money becomes the advisor's to withdraw.
          releasableAt: new Date(booking.endAt.getTime() + ESCROW_GRACE_MS),
        }),
        db.insert(schema.invoice).values({
          id: invoiceId,
          bookingId: booking.id,
          number,
          payerId: me.id,
          status: "paid",
          totalMinor: amountMinor,
          currency: "THB",
          issuedAt: now,
          paidAt: now,
        }),
        insertLines(),
        db
          .update(schema.booking)
          // The room is generated at confirmation, not at creation: an
          // unpaid booking must not carry a joinable URL.
          .set({ status: "confirmed", jitsiRoom })
          .where(
            and(eq(schema.booking.id, booking.id), eq(schema.booking.adviseeId, me.id)),
          ),
        db.insert(schema.notification).values([
          {
            userId: me.id,
            kind: "payment",
            title: "ชำระเงินสำเร็จ",
            body: `การจองกับ${booking.advisorName} ได้รับการยืนยันแล้ว`,
            href: `/transactions/detail?id=${invoiceId}`,
          },
          {
            userId: booking.advisorId,
            kind: "booking",
            title: "มีการจองใหม่",
            body: `${me.name} จองเวลาปรึกษากับคุณแล้ว`,
            href: "/earnings",
          },
        ]),
      ]);

      // A saved card is convenience, not part of the purchase: it must never
      // delay the response or fail a payment that already went through.
      if (input.saveCard && charge.card) {
        const card = charge.card;
        waitUntil(
          db
            .insert(schema.paymentMethod)
            .values({
              userId: me.id,
              omiseCardId: card.cardId,
              brand: card.brand,
              last4: card.last4,
              expiryMonth: card.expiryMonth,
              expiryYear: card.expiryYear,
            })
            .then(() => undefined),
        );
      }

      return { invoice: invoiceOut("paid", now, null), outcome: "success" };
    }

    if (charge.status === "failed") {
      await runBatch(db, [
        db.insert(schema.payment).values({
          bookingId: booking.id,
          payerId: me.id,
          method: "card",
          omiseChargeId: charge.chargeId,
          amountMinor,
          platformFeeMinor: feeMinor,
          currency: "THB",
          status: "failed",
          failureCode: charge.failureCode,
          failureMessage: charge.failureMessage,
          idempotencyKey,
          createdAt: now,
        }),
        db.insert(schema.invoice).values({
          id: invoiceId,
          bookingId: booking.id,
          number,
          payerId: me.id,
          status: "failed",
          totalMinor: amountMinor,
          currency: "THB",
          issuedAt: now,
          failureReason: charge.failureMessage,
        }),
        insertLines(),
        // Release the claim taken before the charge. Without this the booking
        // stays `processing` forever and every retry — including the one the
        // failed-payment screen invites — answers CONFLICT, so a declined card
        // would permanently strand the booking.
        db
          .update(schema.booking)
          .set({ status: "pending-payment" })
          .where(
            and(
              eq(schema.booking.id, booking.id),
              eq(schema.booking.adviseeId, me.id),
              eq(schema.booking.status, "processing"),
            ),
          ),
        // Hand the hour back as a hold rather than releasing it: the advisee is
        // about to retry with another card, and they should not lose the slot
        // to whoever refreshes the advisor's page first. A fresh card produces
        // a fresh token, so the retry is a new payment, not a replay.
        ...(booking.timeslotId
          ? [
              db
                .update(schema.timeslot)
                .set({ status: "held", heldUntil: new Date(now.getTime() + HOLD_MS) })
                .where(
                  and(
                    eq(schema.timeslot.id, booking.timeslotId),
                    eq(schema.timeslot.heldBy, me.id),
                  ),
                ),
            ]
          : []),
      ]);

      return {
        invoice: invoiceOut("failed", null, charge.failureMessage),
        outcome: "failed",
      };
    }

    // ── Bank has it, nobody has settled it ──────────────────────────────────
    // The slot stays booked and the booking stays pending-payment. Releasing
    // the hour now would sell it twice if the charge lands a minute later.
    // TODO(omise): a webhook has to settle these — move the booking to
    // confirmed and open the escrow, or fail it and release the slot.
    await runBatch(db, [
      db.insert(schema.payment).values({
        bookingId: booking.id,
        payerId: me.id,
        method: "card",
        omiseChargeId: charge.chargeId,
        amountMinor,
        platformFeeMinor: feeMinor,
        currency: "THB",
        status: charge.status,
        idempotencyKey,
        createdAt: now,
      }),
      db.insert(schema.invoice).values({
        id: invoiceId,
        bookingId: booking.id,
        number,
        payerId: me.id,
        status: charge.status,
        totalMinor: amountMinor,
        currency: "THB",
        issuedAt: now,
      }),
      insertLines(),
    ]);

    return {
      invoice: invoiceOut(charge.status, null, null),
      outcome: charge.status === "processing" ? "processing" : "unconfirmed",
    };
  },

  "transactions.list": async (input, ctx) => {
    const me = ctx.requireUser();
    const { db } = workerCtx(ctx);
    const cursor = input.cursor ? decodeCursor(input.cursor) : null;

    // Title and subtitle come from the booking and the advisor, so they are
    // joined in — one query for the page, never a lookup per row.
    const rows = await db
      .select({
        id: schema.invoice.id,
        status: schema.invoice.status,
        totalMinor: schema.invoice.totalMinor,
        issuedAt: schema.invoice.issuedAt,
        serviceTitle: schema.service.title,
        durationMinutes: schema.booking.durationMinutes,
        advisorName: schema.user.name,
      })
      .from(schema.invoice)
      .leftJoin(schema.booking, eq(schema.booking.id, schema.invoice.bookingId))
      .leftJoin(schema.user, eq(schema.user.id, schema.booking.advisorId))
      .leftJoin(schema.service, eq(schema.service.id, schema.booking.serviceId))
      .where(
        and(
          // Advisors do not pay for anything; their side of the money is
          // earnings and payouts, not transactions.
          eq(schema.invoice.payerId, me.id),
          cursor
            ? sql`(${schema.invoice.issuedAt}, ${schema.invoice.id}) < (${cursor.issuedAt}::timestamptz, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(schema.invoice.issuedAt), desc(schema.invoice.id))
      // One extra row is how we know whether there is another page, without a
      // second count query.
      .limit(input.limit + 1);

    const page = rows.slice(0, input.limit);
    const last = page.at(-1);

    return {
      items: page.map((row) => ({
        id: row.id,
        invoiceId: row.id,
        title: row.serviceTitle ?? "การให้คำปรึกษา",
        subtitle: [row.advisorName, row.durationMinutes && `${row.durationMinutes} นาที`]
          .filter(Boolean)
          .join(" · "),
        amount: money(row.totalMinor),
        status: toPaymentStatus(row.status),
        // `issuedAt`, not `paidAt` — the list is ordered by it, and a row whose
        // displayed date disagrees with its position reads as a bug.
        occurredAt: row.issuedAt.toISOString(),
      })),
      nextCursor:
        rows.length > input.limit && last
          ? encodeCursor({ issuedAt: last.issuedAt.toISOString(), id: last.id })
          : null,
    };
  },

  "invoices.get": async (input, ctx) => {
    const me = ctx.requireUser();
    const { db } = workerCtx(ctx);

    const invoice = await readInvoice(
      db,
      // Ownership in the WHERE, so someone else's invoice is indistinguishable
      // from one that does not exist.
      and(eq(schema.invoice.id, input.invoiceId), eq(schema.invoice.payerId, me.id)),
    );
    if (!invoice) throw apiError("NOT_FOUND", "No such invoice");
    return invoice;
  },
} satisfies Pick<
  Handlers,
  | "bookings.create"
  | "bookings.list"
  | "payments.methods"
  | "payments.pay"
  | "transactions.list"
  | "invoices.get"
>;
