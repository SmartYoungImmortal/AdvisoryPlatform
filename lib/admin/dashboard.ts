/**
 * Dashboard aggregates — derivable numbers (pending queues, fee revenue) that
 * nothing in the docs aggregates; the console is their first surface.
 */
export const dashboardStats = {
  pendingVerifications: 5,
  openRefunds: 3,
  openReports: 4,
  payoutsDueSatang: 684000,
} as const;

/** Monthly 5% platform fee vs GMV, satang, last 6 months. */
export const revenueSeries: ReadonlyArray<{
  readonly month: string;
  readonly feeSatang: number;
  readonly gmvSatang: number;
}> = [
  { month: "มี.ค.", feeSatang: 24000, gmvSatang: 480000 },
  { month: "เม.ย.", feeSatang: 36000, gmvSatang: 720000 },
  { month: "พ.ค.", feeSatang: 30000, gmvSatang: 600000 },
  { month: "มิ.ย.", feeSatang: 51000, gmvSatang: 1020000 },
  { month: "ก.ค.", feeSatang: 63000, gmvSatang: 1260000 },
  { month: "ส.ค.", feeSatang: 45000, gmvSatang: 900000 },
] as const;
