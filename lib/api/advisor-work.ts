import { api, type Paginated } from "@/lib/api/client";

/**
 * The advisor's desk beyond their bookings (those are `advisor-bookings.ts`):
 * the payouts the platform has made or is making to them, and how many
 * screening requests wait on their answer.
 */

/** `PayoutResponseDto`. Every amount is integer satang; the net is gross less the transfer fee. */
export interface ApiPayout {
  readonly id: string;
  readonly amountSatang: number;
  readonly transferFeeSatang: number;
  readonly netAmountSatang: number;
  readonly providerTransferId: string | null;
  readonly status: "PENDING" | "PAID" | "FAILED";
  readonly createdAt: string;
  readonly paidAt: string | null;
}

/** `GET /advisors/me/payouts` — newest first, one page of up to 100. */
export function listMyPayouts(signal?: AbortSignal): Promise<Paginated<ApiPayout>> {
  return api.get("advisors/me/payouts", { query: { page: 1, limit: 100 }, signal });
}

/**
 * `GET /advisors/me/screening-requests?status=PENDING` read for its `total`
 * only: the desk shows how many wait, and the requests page lists them.
 */
export async function countPendingScreeningRequests(signal?: AbortSignal): Promise<number> {
  const page = await api.get<Paginated<unknown>>("advisors/me/screening-requests", {
    query: { status: "PENDING", page: 1, limit: 1 },
    signal,
  });
  return page.total;
}
