import { getRequestLocale } from "@/lib/api/client";

/**
 * How the console prints fixture values: dates in the reader's language (Thai
 * on the Buddhist calendar, English on the Gregorian) in Bangkok time (Nexus
 * pins its CMS to UTC+7 too), and whole baht from satang.
 */
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
};

/** One formatter per language and shape, made the first time it is asked for. */
const made = new Map<string, Intl.DateTimeFormat>();

function inLocale(shape: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = getRequestLocale() === "en" ? "en-GB" : "th-TH";
  const key = `${shape}:${tag}`;
  let formatter = made.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, options);
    made.set(key, formatter);
  }
  return formatter;
}

const BAHT = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

/** Parts for `formatStamp`; en-GB gives zero-padded day/month and a 24h clock. */
const STAMP = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

export function formatDate(iso: string | null): string {
  return iso ? inLocale("date", DATE_OPTIONS).format(new Date(iso)) : "-";
}

export function formatDateTime(iso: string | null): string {
  return iso ? inLocale("dateTime", DATE_TIME_OPTIONS).format(new Date(iso)) : "-";
}

/** The clock alone, `14:38`, Bangkok time: a list's date column prints it under the day. */
export function formatTime(iso: string | null): string {
  return iso ? inLocale("time", TIME_OPTIONS).format(new Date(iso)) : "";
}

/**
 * Nexus's `cmsFormatDateTime`: `18/08/26 | 08:24`, Bangkok time — what every
 * list's "Date Created" column prints.
 */
export function formatStamp(iso: string | null): string {
  if (!iso) return "-";
  const part = Object.fromEntries(
    STAMP.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${part.day}/${part.month}/${part.year} | ${part.hour}:${part.minute}`;
}

export function formatBaht(satang: number): string {
  return BAHT.format(Math.round(satang / 100));
}

/** Sortable number for a timestamp column. */
export function timeValue(iso: string | null): number {
  return iso ? Date.parse(iso) : 0;
}
