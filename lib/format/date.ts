/**
 * Thai date formatting, matched byte-for-byte to the Figma designs.
 *
 * Two things here are easy to get wrong and invisible until someone reads the
 * screen carefully:
 *
 * 1. **Years are Buddhist era.** The designs say `จ. 3 ส.ค. 2569`, and 2569 BE
 *    is 2026 CE. Only the invoice *number* (`INV-2026-0731-0042`) is Gregorian.
 *    Rendering 2026 where the design says 2569 is a real regression.
 * 2. **Everything renders in Asia/Bangkok.** The API sends ISO 8601 UTC, so
 *    `2026-08-03T07:00:00Z` must display as `14:00`, not `07:00`.
 *
 * `Intl` is used only to resolve the Bangkok wall-clock parts; the Thai words
 * and the layout are ours, because locale data varies by engine and version and
 * we need these strings stable. Pinned by `scripts/verify-formatters.ts`.
 */

/** Index 0 = January. */
const MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
] as const;

/** Index 0 = Sunday, matching `Date.prototype.getDay()`. */
const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * `hourCycle: "h23"` rather than `hour12: false` — the latter yields "24:00"
 * for midnight on some engines, which would print `24:00` on an invoice.
 */
const BANGKOK = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

interface Parts {
  /** Gregorian. Add 543 for the displayed year. */
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
  weekday: number;
}

function bangkokParts(iso: string): Parts {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not a date: ${iso}`);
  }

  const found: Record<string, string> = {};
  for (const part of BANGKOK.formatToParts(date)) {
    if (part.type !== "literal") found[part.type] = part.value;
  }

  return {
    year: Number(found.year),
    month: Number(found.month),
    day: Number(found.day),
    hour: found.hour,
    minute: found.minute,
    weekday: WEEKDAY_INDEX[found.weekday] ?? 0,
  };
}

/** Gregorian → Buddhist era. 2026 → 2569. */
export function buddhistYear(gregorian: number): number {
  return gregorian + 543;
}

/** `28 ก.ค.` — review cards, transaction rows. */
export function formatDayMonth(iso: string): string {
  const p = bangkokParts(iso);
  return `${p.day} ${MONTHS[p.month - 1]}`;
}

/** `25 ก.ค. 2569` — payout history. */
export function formatDayMonthYear(iso: string): string {
  const p = bangkokParts(iso);
  return `${p.day} ${MONTHS[p.month - 1]} ${buddhistYear(p.year)}`;
}

/** `จ. 3 ส.ค. 2569` — the booking date on an invoice. */
export function formatWeekdayDayMonthYear(iso: string): string {
  const p = bangkokParts(iso);
  return `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]} ${buddhistYear(p.year)}`;
}

/** `จ. 3 ส.ค. 14:00` — the booked slot. */
export function formatWeekdayDayMonthTime(iso: string): string {
  const p = bangkokParts(iso);
  return `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]} ${p.hour}:${p.minute}`;
}

/** `31 ก.ค. 2569, 16:48` — invoice timestamps. */
export function formatDayMonthYearTime(iso: string): string {
  const p = bangkokParts(iso);
  return `${p.day} ${MONTHS[p.month - 1]} ${buddhistYear(p.year)}, ${p.hour}:${p.minute}`;
}

/** `14:00` on its own. */
export function formatTime(iso: string): string {
  const p = bangkokParts(iso);
  return `${p.hour}:${p.minute}`;
}

/**
 * `10 นาที` / `2 ชม.` / `เมื่อวาน` — the right-hand meta on chat and screening
 * rows. Coarse on purpose: the designs never show anything more precise.
 */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const minutes = Math.floor((now.getTime() - then) / 60000);

  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาที`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;
  if (hours < 48) return "เมื่อวาน";

  return formatDayMonth(iso);
}
