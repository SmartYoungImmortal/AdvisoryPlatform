import { z } from "zod";

import { Id, IsoDateTime, Money } from "./common";

/**
 * Drives the tone of a row in `components/payment/invoice-screens.tsx`
 * (`tone: "paid" | "failed" | "refunded"`) and picks which of the three invoice
 * detail layouts renders.
 */
export const PaymentStatus = z.enum([
  "processing",
  "paid",
  "failed",
  "refunded",
  /** Bank approved but the platform hasn't reconciled it — `/checkout/unconfirmed`. */
  "unconfirmed",
]);

/** A saved card. Only ever the last 4 — the PAN never reaches this API. */
export const PaymentMethod = z.object({
  id: Id,
  brand: z.enum(["visa", "mastercard", "jcb", "amex", "unknown"]),
  last4: z.string().length(4),
  expiryMonth: z.int().min(1).max(12),
  expiryYear: z.int(),
  isDefault: z.boolean(),
});

export const InvoiceLine = z.object({
  label: z.string(),
  amount: Money,
  /** Discounts and refunds render in a different colour with a leading minus. */
  negative: z.boolean().default(false),
});

/** `/transactions/detail` and its failed/refunded variants. */
export const Invoice = z.object({
  id: Id,
  /** Human reference, e.g. "INV-2026-0731-0042". */
  number: z.string(),
  bookingId: Id.nullable(),
  status: PaymentStatus,
  /** Ordered: subtotal, fees, discounts. The UI renders these verbatim. */
  lines: z.array(InvoiceLine),
  total: Money,
  issuedAt: IsoDateTime,
  paidAt: IsoDateTime.nullable(),
  /** Populated when `status` is "failed" — e.g. "บัตรถูกปฏิเสธ". */
  failureReason: z.string().nullable(),
  refundedAmount: Money.nullable(),
});

/** A row in the `/transactions` list — deliberately lighter than `Invoice`. */
export const Transaction = z.object({
  id: Id,
  invoiceId: Id,
  /** e.g. "ปรึกษาโปรเจกต์จบ". */
  title: z.string(),
  /** e.g. "Sarah Jenskins · 60 นาที". */
  subtitle: z.string(),
  amount: Money,
  status: PaymentStatus,
  occurredAt: IsoDateTime,
});

/**
 * Card details are collected on `/checkout/card`. The card number is NOT in
 * this schema on purpose: it must go straight from the browser to the payment
 * processor, and only the resulting token reaches us. If a future change makes
 * a PAN flow through here, that is a PCI problem, not a schema detail.
 */
export const PayInput = z.object({
  bookingId: Id,
  /** Token from the payment processor's client SDK, or a saved method's id. */
  paymentToken: z.string().min(1),
  saveCard: z.boolean().default(false),
});

export const PayResult = z.object({
  invoice: Invoice,
  /** Terminal state the UI routes on — mirrors the five `/checkout/*` screens. */
  outcome: z.enum(["success", "processing", "failed", "unconfirmed", "slot-taken"]),
});

export type PaymentStatus = z.infer<typeof PaymentStatus>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type InvoiceLine = z.infer<typeof InvoiceLine>;
export type Invoice = z.infer<typeof Invoice>;
export type Transaction = z.infer<typeof Transaction>;
export type PayInput = z.infer<typeof PayInput>;
export type PayResult = z.infer<typeof PayResult>;
