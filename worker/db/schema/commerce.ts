import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { advisorProfile, service, timeslot } from "./advisor";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);

/**
 * A booked consultation.
 *
 * Price and duration are COPIED from the service at booking time rather than
 * joined. An advisor raising their rate must not silently rewrite what someone
 * already paid, and an invoice from three months ago has to keep showing the
 * amount that was actually charged.
 */
export const booking = pgTable(
  "booking",
  {
    id: id(),
    serviceId: text("service_id").references(() => service.id, { onDelete: "set null" }),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "restrict" }),
    adviseeId: text("advisee_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    timeslotId: text("timeslot_id").references(() => timeslot.id, { onDelete: "set null" }),
    /** pending-payment | confirmed | in-progress | completed | cancelled | no-show */
    status: text("status").notNull().default("pending-payment"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    /** Snapshot of service.priceMinor at booking time. Satang. */
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull().default("THB"),
    durationMinutes: integer("duration_minutes").notNull(),
    /** The free 15-minute trial skips checkout entirely. */
    isTrial: boolean("is_trial").default(false).notNull(),
    /** Jitsi room name. Generated at confirmation, unguessable. */
    jitsiRoom: text("jitsi_room"),
    /** Actual call boundaries, for time-based billing and no-show handling. */
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("booking_advisee_idx").on(t.adviseeId, t.startAt),
    index("booking_advisor_idx").on(t.advisorId, t.startAt),
    index("booking_status_idx").on(t.status, t.startAt),
    // One booking per slot, enforced by the database rather than by a check.
    uniqueIndex("booking_timeslot_uidx").on(t.timeslotId),
  ],
);

/** A saved card. Only the OMISE token and the last 4 — never a PAN. */
export const paymentMethod = pgTable(
  "payment_method",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** OMISE customer/card id. The only handle we keep. */
    omiseCardId: text("omise_card_id").notNull(),
    brand: text("brand").notNull().default("unknown"),
    last4: text("last4").notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payment_method_user_idx").on(t.userId)],
);

/**
 * One charge attempt. A booking can have several — a declined card followed by
 * a successful retry is two rows, which is what makes the failed-payment screen
 * and the transaction history both truthful.
 */
export const payment = pgTable(
  "payment",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    payerId: text("payer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** card | promptpay */
    method: text("method").notNull(),
    omiseChargeId: text("omise_charge_id"),
    amountMinor: integer("amount_minor").notNull(),
    /** Platform commission, already included in `amountMinor`. */
    platformFeeMinor: integer("platform_fee_minor").notNull().default(0),
    currency: text("currency").notNull().default("THB"),
    /** processing | paid | failed | refunded | unconfirmed */
    status: text("status").notNull().default("processing"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    /**
     * Client-supplied idempotency key. A retry with the same key must not
     * charge twice — the unique index below is what actually guarantees it.
     */
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("payment_booking_idx").on(t.bookingId),
    index("payment_payer_idx").on(t.payerId, t.createdAt),
    uniqueIndex("payment_idempotency_uidx").on(t.idempotencyKey),
    uniqueIndex("payment_omise_charge_uidx").on(t.omiseChargeId),
  ],
);

/**
 * Escrow: the platform holds the money between payment and session end.
 *
 * Separate from `payment` because the two have genuinely different lifecycles —
 * money can be captured but not yet releasable, and a dispute freezes release
 * without touching the original charge.
 */
export const escrow = pgTable(
  "escrow",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => booking.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    /** Advisor's share after commission. */
    advisorShareMinor: integer("advisor_share_minor").notNull(),
    /** held | released | refunded | disputed */
    state: text("state").notNull().default("held"),
    heldAt: timestamp("held_at", { withTimezone: true }).defaultNow().notNull(),
    /** Earliest the advisor may be paid out. Set to session end + grace. */
    releasableAt: timestamp("releasable_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundedAmountMinor: integer("refunded_amount_minor"),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("escrow_booking_uidx").on(t.bookingId),
    // The release sweep: everything held and past its release time.
    index("escrow_release_idx").on(t.state, t.releasableAt),
  ],
);

export const invoice = pgTable(
  "invoice",
  {
    id: id(),
    bookingId: text("booking_id").references(() => booking.id, { onDelete: "set null" }),
    /** Human reference, e.g. INV-2026-0731-0042. Gregorian, unlike the UI. */
    number: text("number").notNull().unique(),
    payerId: text("payer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** processing | paid | failed | refunded | unconfirmed */
    status: text("status").notNull(),
    totalMinor: integer("total_minor").notNull(),
    currency: text("currency").notNull().default("THB"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    refundedAmountMinor: integer("refunded_amount_minor"),
  },
  (t) => [index("invoice_payer_idx").on(t.payerId, t.issuedAt)],
);

export const invoiceLine = pgTable(
  "invoice_line",
  {
    id: id(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    /** Discounts and refunds render with a leading U+2212 and a muted colour. */
    negative: boolean("negative").default(false).notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [index("invoice_line_invoice_idx").on(t.invoiceId, t.position)],
);

export const payoutAccount = pgTable("payout_account", {
  advisorId: text("advisor_id")
    .primaryKey()
    .references(() => advisorProfile.userId, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  /** Last 4 only. The full number lives at the payment provider, not here. */
  accountLast4: text("account_last4").notNull(),
  accountName: text("account_name").notNull(),
  /** Provider-side recipient id, if the provider holds the full details. */
  omiseRecipientId: text("omise_recipient_id"),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const payout = pgTable(
  "payout",
  {
    id: id(),
    advisorId: text("advisor_id")
      .notNull()
      .references(() => advisorProfile.userId, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("THB"),
    /** scheduled | processing | paid | failed */
    status: text("status").notNull().default("scheduled"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    omiseTransferId: text("omise_transfer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payout_advisor_idx").on(t.advisorId, t.scheduledFor)],
);
