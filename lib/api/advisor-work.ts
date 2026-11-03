import { api, ApiError, type Paginated } from "@/lib/api/client";

/**
 * The advisor's desk beyond their bookings (those are `advisor-bookings.ts`):
 * the payouts the platform has made or is making to them, the account they
 * go to, and how many screening requests wait on their answer.
 */

/** The banks a payout can go to, by the code the API takes (`PAYOUT_BANKS`). */
export const PAYOUT_BANKS = ["bbl", "kbank", "scb", "ktb", "bay", "ttb", "gsb", "baac", "uob", "cimb", "kk", "lhb"] as const;
export type PayoutBank = (typeof PAYOUT_BANKS)[number];

/**
 * `PayoutAccountResponseDto`: only the number's last digits ever come back.
 * `verified` and `active` are the payment provider's checks with the bank;
 * `lastDigits` is null when the API could not reach it.
 */
export interface ApiPayoutAccount {
  readonly bank: PayoutBank;
  readonly accountName: string;
  readonly lastDigits: string | null;
  readonly verified: boolean;
  readonly active: boolean;
  readonly createdAt: string | null;
}

export const PAYOUT_ACCOUNT_KEY = "advisors/me/payout-account";

/** `GET /advisors/me/payout-account` — null while the advisor has none (the API's 404). */
export async function getMyPayoutAccount(signal?: AbortSignal): Promise<ApiPayoutAccount | null> {
  try {
    return await api.get<ApiPayoutAccount>(PAYOUT_ACCOUNT_KEY, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** `PUT /advisors/me/payout-account` — saves a new account in place of the one before. */
export function saveMyPayoutAccount(input: {
  readonly bank: PayoutBank;
  readonly accountNumber: string;
  readonly accountName: string;
}): Promise<ApiPayoutAccount> {
  return api.put(PAYOUT_ACCOUNT_KEY, { body: input });
}

/** `DELETE /advisors/me/payout-account`. */
export function removeMyPayoutAccount(): Promise<null> {
  return api.delete(PAYOUT_ACCOUNT_KEY);
}

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
