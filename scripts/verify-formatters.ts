/**
 * Pins `lib/format/*` to the strings the Figma designs actually contain.
 *
 * Every expected value below was lifted verbatim out of `messages/th.json`
 * before that data moved into fixtures. Moving a price or a date from a
 * translation string to a formatted value is the single most likely way to
 * regress the pixel-accurate work, and it regresses *silently* — `฿1,200.00`
 * and `3 ส.ค. 2026` both look plausible until you compare against the design.
 *
 * Run with `pnpm verify:format`. Exits non-zero on the first mismatch.
 */
import {
  formatBaht,
  formatRatePerHour,
} from "../lib/format/money";
import {
  formatDayMonth,
  formatDayMonthYear,
  formatDayMonthYearTime,
  formatTime,
  formatWeekdayDayMonthTime,
  formatWeekdayDayMonthYear,
} from "../lib/format/date";

interface Case {
  readonly got: string;
  readonly want: string;
  /** Where the expected string came from. */
  readonly source: string;
}

const cases: Case[] = [
  // ── Money ─────────────────────────────────────────────────────────────────
  { got: formatBaht(120000), want: "฿1,200", source: "payment.sessionPrice" },
  { got: formatBaht(6000), want: "฿60", source: "payment.platformFeeValue" },
  { got: formatBaht(126000), want: "฿1,260", source: "payment.totalValue" },
  { got: formatBaht(0), want: "฿0", source: "payment.chargedValue" },
  { got: formatBaht(84000), want: "฿840", source: "payment.tx2Amount" },
  { got: formatBaht(63000), want: "฿630", source: "payment.tx4Amount" },
  { got: formatBaht(-63000), want: "−฿630", source: "payment.refundValue (U+2212, not a hyphen)" },
  { got: formatBaht(80000), want: "฿800", source: "payment.thesisPrice" },
  { got: formatBaht(4000), want: "฿40", source: "payment.thesisFee" },
  { got: formatBaht(3000), want: "฿30", source: "payment.portfolioFee" },
  { got: formatBaht(180000), want: "฿1,800", source: "advisor.payoutFailedAmount" },
  { got: formatBaht(1860000), want: "฿18,600", source: "advisor.historyTotal" },
  { got: formatBaht(600000), want: "฿6,000", source: "advisor.po1Amount" },
  { got: formatBaht(720000), want: "฿7,200", source: "advisor.po2Amount" },
  { got: formatBaht(540000), want: "฿5,400", source: "advisor.po3Amount" },
  { got: formatBaht(432000), want: "฿4,320", source: "advisor.inTransitAmount" },
  { got: formatBaht(240000), want: "฿2,400", source: "advisor.pendingAmount" },
  { got: formatBaht(378000), want: "฿3,780", source: "payment.historySummary" },
  { got: formatRatePerHour({ amountMinor: 120000 }), want: "฿1,200/ชม.", source: "matching.m1Price" },
  { got: formatRatePerHour({ amountMinor: 90000 }), want: "฿900/ชม.", source: "matching.m2Price" },
  { got: formatRatePerHour({ amountMinor: 75000 }), want: "฿750/ชม.", source: "matching.m3Price" },

  // ── Dates ─────────────────────────────────────────────────────────────────
  // Buddhist era throughout: 2569 BE is 2026 CE. Times are Asia/Bangkok, so
  // every ISO input below is UTC+7 behind the string it must produce.
  { got: formatDayMonth("2026-07-28T05:00:00.000Z"), want: "28 ก.ค.", source: "reviews.r1Date" },
  { got: formatDayMonth("2026-07-24T05:00:00.000Z"), want: "24 ก.ค.", source: "reviews.r2Date" },
  { got: formatDayMonth("2026-07-19T05:00:00.000Z"), want: "19 ก.ค.", source: "reviews.r3Date" },
  { got: formatDayMonth("2026-08-03T05:00:00.000Z"), want: "3 ส.ค.", source: "payment.tx1Sub" },
  { got: formatDayMonth("2026-07-12T05:00:00.000Z"), want: "12 ก.ค.", source: "payment.tx5Sub" },
  { got: formatDayMonthYear("2026-07-25T05:00:00.000Z"), want: "25 ก.ค. 2569", source: "advisor.po1Date" },
  { got: formatDayMonthYear("2026-06-27T05:00:00.000Z"), want: "27 มิ.ย. 2569", source: "advisor.po2Date" },
  { got: formatDayMonthYear("2026-05-30T05:00:00.000Z"), want: "30 พ.ค. 2569", source: "advisor.po3Date" },
  { got: formatWeekdayDayMonthYear("2026-08-03T05:00:00.000Z"), want: "จ. 3 ส.ค. 2569", source: "payment.dateValue" },
  { got: formatWeekdayDayMonthTime("2026-08-03T07:00:00.000Z"), want: "จ. 3 ส.ค. 14:00", source: "payment.slotValue" },
  { got: formatDayMonthYearTime("2026-07-31T09:48:00.000Z"), want: "31 ก.ค. 2569, 16:48", source: "payment.invoicePaidTime" },
  { got: formatDayMonthYearTime("2026-08-01T02:12:00.000Z"), want: "1 ส.ค. 2569, 09:12", source: "payment.invoiceFailedTime" },
  { got: formatDayMonthYearTime("2026-07-21T04:05:00.000Z"), want: "21 ก.ค. 2569, 11:05", source: "payment.invoiceRefundedTime" },
  { got: formatDayMonthYearTime("2026-07-30T02:20:00.000Z"), want: "30 ก.ค. 2569, 09:20", source: "advisor.payoutFailedWhen" },
  { got: formatTime("2026-08-03T07:00:00.000Z"), want: "14:00", source: "notifications.bookingConfirmedBody" },
  // Midnight must not render as 24:00 — the reason date.ts uses hourCycle h23.
  { got: formatTime("2026-08-02T17:00:00.000Z"), want: "00:00", source: "hourCycle h23 guard" },
];

let failed = 0;
for (const c of cases) {
  if (c.got !== c.want) {
    failed += 1;
    console.error(
      `MISMATCH ${c.source}\n  expected ${JSON.stringify(c.want)}\n  got      ${JSON.stringify(c.got)}`,
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} formatter cases failed.`);
  process.exit(1);
}

console.log(`formatters ok — ${cases.length} cases match the Figma strings`);
