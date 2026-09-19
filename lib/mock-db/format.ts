/**
 * How the console prints fixture values: Thai dates on the Buddhist calendar in
 * Bangkok time (Nexus pins its CMS to UTC+7 too), and whole baht from satang.
 */
const DATE = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

const DATE_TIME = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

const BAHT = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export function formatDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null): string {
  return iso ? DATE_TIME.format(new Date(iso)) : "—";
}

export function formatBaht(satang: number): string {
  return BAHT.format(Math.round(satang / 100));
}

/** Sortable number for a timestamp column. */
export function timeValue(iso: string | null): number {
  return iso ? Date.parse(iso) : 0;
}
