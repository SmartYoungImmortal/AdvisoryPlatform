/**
 * Baht formatting, matched byte-for-byte to the Figma designs.
 *
 * `Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" })` is NOT
 * usable here — it produces `฿1,200.00`, and with some locale/engine
 * combinations `THB 1,200`. The designs say `฿1,200`. Two decimals that were
 * never drawn is a visible regression on every price on the site, so this is
 * hand-rolled and pinned by `scripts/verify-formatters.ts`.
 *
 * Input is always minor units (satang) as an integer — see `lib/api/schema/common.ts`.
 */

/** U+0E3F THAI CURRENCY SYMBOL BAHT. */
const BAHT = "฿";

/**
 * U+2212 MINUS SIGN — what the designs actually use in `−฿630`. An ASCII
 * hyphen (U+002D) is narrower and renders visibly differently.
 */
const MINUS = "−";

/**
 * `120000` → `฿1,200`. Satang are dropped when zero, which is every amount in
 * the current designs; a non-zero remainder renders as `฿1,200.50` rather than
 * being silently truncated.
 */
export function formatBaht(amountMinor: number): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(Math.trunc(amountMinor));
  const baht = Math.floor(abs / 100);
  const satang = abs % 100;

  const whole = baht.toLocaleString("en-US");
  const body = satang === 0 ? whole : `${whole}.${String(satang).padStart(2, "0")}`;

  return `${negative ? MINUS : ""}${BAHT}${body}`;
}

/** `formatMoney({ amountMinor: 120000, currency: "THB" })` → `฿1,200`. */
export function formatMoney(money: { amountMinor: number }): string {
  return formatBaht(money.amountMinor);
}

/** `฿1,200/ชม.` — the rate on a match card. */
export function formatRatePerHour(money: { amountMinor: number }): string {
  return `${formatMoney(money)}/ชม.`;
}
