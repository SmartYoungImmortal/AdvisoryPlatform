/**
 * The advisee's payment history and its three receipts, as the sample screens
 * draw them.
 *
 * Fixture data, not the API: no advisee-facing route returns an invoice yet
 * (see `openRefundCase` in `lib/api/resources.ts`). These are the Figma frames'
 * own records, the same people, amounts, references and days, kept as dates and
 * numbers rather than finished Thai strings so the screens can format them in
 * the reader's language.
 *
 * Every instant carries Bangkok's offset, the zone the app formats in
 * (`LocaleProvider`), so a reader elsewhere sees the same days. A row that only
 * has a day sits at noon, well clear of either midnight.
 */

export type TransactionStatus = "paid" | "refunded" | "failed";

/** The services the records name; each is a key under `transactions.services`. */
export type ServiceKey = "session" | "thesisReview" | "portfolioReview";

/** One row of the history. */
export interface Transaction {
  readonly id: string;
  readonly status: TransactionStatus;
  readonly service: ServiceKey;
  readonly advisor: string;
  /** The day the row is listed under. */
  readonly date: string;
  /** Baht. */
  readonly amount: number;
}

/** The receipt a row opens: the static export has one page per outcome. */
export const RECEIPT_HREF: Readonly<Record<TransactionStatus, string>> = {
  paid: "/transactions/detail",
  failed: "/transactions/detail/failed",
  refunded: "/transactions/detail/refunded",
};

/** Newest first, as the list reads. */
export const TRANSACTIONS: readonly Transaction[] = [
  {
    id: "tx1",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-08-03T12:00:00+07:00",
    amount: 1260,
  },
  {
    id: "tx2",
    status: "failed",
    service: "thesisReview",
    advisor: "กัญญา พรหมมา",
    date: "2026-08-01T12:00:00+07:00",
    amount: 840,
  },
  {
    id: "tx3",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-07-28T12:00:00+07:00",
    amount: 1260,
  },
  {
    id: "tx4",
    status: "refunded",
    service: "portfolioReview",
    advisor: "James Gunn",
    date: "2026-07-19T12:00:00+07:00",
    amount: 630,
  },
  {
    id: "tx5",
    status: "paid",
    service: "session",
    advisor: "Sarah Jenskins",
    date: "2026-07-12T12:00:00+07:00",
    amount: 1260,
  },
];

/** One receipt: what was bought, what it cost, and how it was paid. */
export interface Receipt {
  readonly status: TransactionStatus;
  readonly service: ServiceKey;
  readonly advisor: string;
  /** When the outcome happened: paid, declined or refunded. */
  readonly at: string;
  /** The session's day, and its hours when the booking holds them. */
  readonly session: { readonly date: string; readonly from?: string; readonly to?: string };
  /** What became of the booking, when it is not simply going ahead. */
  readonly booking?: "unconfirmed" | "cancelled";
  /** Baht. */
  readonly price: number;
  /** Baht. */
  readonly fee: number;
  /** Baht returned to the card. */
  readonly refund?: number;
  readonly card: { readonly brand: string; readonly last4: string };
  readonly invoiceNo: string;
  readonly chargeId: string;
}

export const RECEIPTS: Readonly<Record<TransactionStatus, Receipt>> = {
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
    price: 1200,
    fee: 60,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0731-0042",
    chargeId: "chrg_test_62a9f1",
  },
  failed: {
    status: "failed",
    service: "thesisReview",
    advisor: "กัญญา พรหมมา",
    at: "2026-08-01T09:12:00+07:00",
    session: { date: "2026-08-08T12:00:00+07:00" },
    booking: "unconfirmed",
    price: 800,
    fee: 40,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0801-0039",
    chargeId: "chrg_test_71b3e0",
  },
  refunded: {
    status: "refunded",
    service: "portfolioReview",
    advisor: "James Gunn",
    at: "2026-07-21T11:05:00+07:00",
    session: { date: "2026-07-19T12:00:00+07:00" },
    booking: "cancelled",
    price: 600,
    fee: 30,
    refund: 630,
    card: { brand: "Visa", last4: "4242" },
    invoiceNo: "INV-2026-0719-0031",
    chargeId: "chrg_test_4d8c22",
  },
};

/**
 * The history's months, newest first, each with its rows in list order. Keyed
 * on the record's own calendar month (its first seven characters), so the
 * grouping never depends on the zone the browser is in.
 */
export function groupByMonth(
  rows: readonly Transaction[],
): readonly { readonly key: string; readonly date: Date; readonly rows: readonly Transaction[] }[] {
  const groups: { key: string; date: Date; rows: Transaction[] }[] = [];
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, date: new Date(row.date), rows: [row] });
  }
  return groups;
}
