/**
 * The advisee's payment history and its receipts, in the one shape the screens
 * draw (`Transaction`, `Receipt`), from either of two sources.
 *
 * The API (`listMyInvoices`), whenever the build has one: `invoiceTransaction`
 * and `invoiceReceipt` map its records.
 *
 * The samples, for a build without an API and for the three receipt pages the
 * `/screens` index links to: the Figma frames' own records, the same people,
 * amounts, references and days, kept as dates and numbers rather than finished
 * Thai strings so the screens can format them in the reader's language.
 * `sampleHistory` and `sampleReceipt` map them.
 *
 * Money is satang, as the API counts it, and divided only where it is
 * formatted. Every sample instant carries Bangkok's offset, the zone the app
 * formats in (`LocaleProvider`), so a reader elsewhere sees the same days. A
 * row that only has a day sits at noon, well clear of either midnight.
 */

import type { ApiAdviseeInvoice, ApiInvoiceStatus } from "@/lib/api/types";

export type TransactionStatus = ApiInvoiceStatus;

/** The outcomes the samples cover, a receipt page each. A pending invoice only comes from the API. */
export type SampleStatus = Exclude<TransactionStatus, "pending">;

/** One receipt: what was bought, what it cost, and how it was paid. */
export interface Receipt {
  readonly status: TransactionStatus;
  /** The service, already in the reader's language. */
  readonly service: string;
  readonly advisor: string;
  /**
   * When the outcome happened: paid, declined, refunded, or the invoice raised
   * while it waits. Null when the record does not say.
   */
  readonly at: string | null;
  /** The session's day, and its hours when the booking holds them. Null without a session. */
  readonly session: { readonly date: string; readonly from?: string; readonly to?: string } | null;
  /** What became of the booking, when it is not simply going ahead. */
  readonly booking?: "unconfirmed" | "cancelled";
  /** Satang. */
  readonly price: number;
  /** Satang. */
  readonly fee: number;
  /** Satang returned to the card. */
  readonly refund?: number;
  /** Null when there is no card to name, so none is made up. */
  readonly card: { readonly brand: string; readonly last4: string } | null;
  readonly invoiceNo: string;
  /** The decline is known to be the issuer's. The API sends no reason, so a live failure states none. */
  readonly issuerDeclined?: boolean;
}

/** One row of the history, with the receipt it opens. */
export interface Transaction {
  readonly id: string;
  readonly status: TransactionStatus;
  /** The service, already in the reader's language. */
  readonly service: string;
  readonly advisor: string;
  /** The day the row is listed under. */
  readonly date: string;
  /** Satang. */
  readonly amount: number;
  /** The receipt's own page, for a new tab or a copied address. */
  readonly href: string;
  /** What a plain click opens over the list. */
  readonly receipt: Receipt;
}

/* ------------------------------------------------------------------ the API */

/** An invoice's receipt page: the static export has the one route, so the id rides as a query. */
export function invoiceHref(id: string): string {
  return `/transactions/detail?id=${encodeURIComponent(id)}`;
}

/**
 * When the receipt says the outcome happened. The API keeps `createdAt` and
 * `paidAt` only, and `paidAt` is when the latest charge finished, success or
 * failure. So a decline is dated by it (by the attempt, should it be missing),
 * a pending invoice by when it was raised, and a refund is left undated rather
 * than given the payment's day.
 */
function outcomeAt(invoice: ApiAdviseeInvoice): string | null {
  switch (invoice.status) {
    case "paid":
      return invoice.paidAt;
    case "failed":
      return invoice.paidAt ?? invoice.createdAt;
    case "pending":
      return invoice.createdAt;
    case "refunded":
      return null;
  }
}

export function invoiceReceipt(invoice: ApiAdviseeInvoice): Receipt {
  const { session, booking, card } = invoice;
  return {
    status: invoice.status,
    service: invoice.service.name,
    advisor: invoice.advisor.displayName,
    at: outcomeAt(invoice),
    // A cancelled booking holds no hours any more, so only its day is said.
    session: session
      ? booking === "cancelled"
        ? { date: session.startTime }
        : { date: session.startTime, from: session.startTime, to: session.endTime }
      : null,
    // A confirmed booking is simply going ahead: no booking fact.
    booking: booking === "unconfirmed" || booking === "cancelled" ? booking : undefined,
    price: invoice.priceSatang,
    fee: invoice.platformFeeSatang,
    refund: invoice.refundSatang ?? undefined,
    card: card ? { brand: card.brand, last4: card.lastDigits } : null,
    invoiceNo: invoice.invoiceNumber,
  };
}

/** A row lists under the day the invoice was raised, for what the card was asked for. */
export function invoiceTransaction(invoice: ApiAdviseeInvoice): Transaction {
  return {
    id: invoice.id,
    status: invoice.status,
    service: invoice.service.name,
    advisor: invoice.advisor.displayName,
    date: invoice.createdAt,
    amount: invoice.amountSatang,
    href: invoiceHref(invoice.id),
    receipt: invoiceReceipt(invoice),
  };
}

/* -------------------------------------------------------------- the samples */

/** The services the samples name; each is a key under `transactions.services`. */
export type ServiceKey = "session" | "thesisReview" | "portfolioReview";

/** A sample row, its service still a key and with no receipt yet. */
interface SampleTransaction extends Omit<Transaction, "status" | "service" | "href" | "receipt"> {
  readonly status: SampleStatus;
  readonly service: ServiceKey;
}

/** A sample receipt, its service still a key. */
interface SampleReceipt extends Omit<Receipt, "status" | "service"> {
  readonly status: SampleStatus;
  readonly service: ServiceKey;
}

/** The receipt a sample row opens: the static export has one page per outcome. */
const RECEIPT_HREF: Readonly<Record<SampleStatus, string>> = {
  paid: "/transactions/detail",
  failed: "/transactions/detail/failed",
  refunded: "/transactions/detail/refunded",
};

/** Newest first, as the list reads. */
const TRANSACTIONS: readonly SampleTransaction[] = [
  {
    id: "tx1",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-08-03T12:00:00+07:00",
    amount: 126_000,
  },
  {
    id: "tx2",
    status: "failed",
    service: "thesisReview",
    advisor: "กัญญา พรหมมา",
    date: "2026-08-01T12:00:00+07:00",
    amount: 84_000,
  },
  {
    id: "tx3",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-07-28T12:00:00+07:00",
    amount: 126_000,
  },
  {
    id: "tx4",
    status: "refunded",
    service: "portfolioReview",
    advisor: "James Gunn",
    date: "2026-07-19T12:00:00+07:00",
    amount: 63_000,
  },
  {
    id: "tx5",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-07-12T12:00:00+07:00",
    amount: 126_000,
  },
];

const RECEIPTS: Readonly<Record<SampleStatus, SampleReceipt>> = {
  paid: {
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    at: "2026-07-31T16:48:00+07:00",
    session: {
      date: "2026-08-03T14:00:00+07:00",
      from: "2026-08-03T14:00:00+07:00",
      to: "2026-08-03T15:00:00+07:00",
    },
    price: 120_000,
    fee: 6_000,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0731-0042",
  },
  failed: {
    status: "failed",
    service: "thesisReview",
    advisor: "กัญญา พรหมมา",
    at: "2026-08-01T09:12:00+07:00",
    session: { date: "2026-08-08T12:00:00+07:00" },
    booking: "unconfirmed",
    price: 80_000,
    fee: 4_000,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0801-0039",
    issuerDeclined: true,
  },
  refunded: {
    status: "refunded",
    service: "portfolioReview",
    advisor: "James Gunn",
    at: "2026-07-21T11:05:00+07:00",
    session: { date: "2026-07-19T12:00:00+07:00" },
    booking: "cancelled",
    price: 60_000,
    fee: 3_000,
    refund: 63_000,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0719-0031",
  },
};

/** The sample receipt for one outcome, its service named by `serviceName`. */
export function sampleReceipt(status: SampleStatus, serviceName: (key: ServiceKey) => string): Receipt {
  const sample = RECEIPTS[status];
  return { ...sample, service: serviceName(sample.service) };
}

/** The sample history. Each outcome has one sample receipt, which every row of it opens. */
export function sampleHistory(serviceName: (key: ServiceKey) => string): readonly Transaction[] {
  return TRANSACTIONS.map((row) => ({
    ...row,
    service: serviceName(row.service),
    href: RECEIPT_HREF[row.status],
    receipt: sampleReceipt(row.status, serviceName),
  }));
}

/* ------------------------------------------------------------------- months */

/**
 * The history's months, newest first, each with its rows in list order. Keyed
 * on the calendar month in `timeZone`, the zone the headings are written in:
 * an API instant is UTC, and its own first seven characters would file a
 * Bangkok morning on the 1st under the month before.
 */
export function groupByMonth(
  rows: readonly Transaction[],
  timeZone: string,
): readonly { readonly key: string; readonly date: Date; readonly rows: readonly Transaction[] }[] {
  // `en-CA` writes a year and month as `2026-08`.
  const month = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" });
  const groups: { key: string; date: Date; rows: Transaction[] }[] = [];
  for (const row of rows) {
    const date = new Date(row.date);
    const key = month.format(date);
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, date, rows: [row] });
  }
  return groups;
}
