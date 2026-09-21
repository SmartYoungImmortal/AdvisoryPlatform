"use client";

import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  listAdminAccounts,
  listAdminServices,
  listIdentityVerifications,
  listOffPlatformFlags,
  listPayouts,
  listRefundCases,
  listReports,
  listSkillProofs,
  type AdminPayout,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

/**
 * The console dashboard's counters, read from the API.
 *
 * ## Why a one-row request per counter
 *
 * Every paginated body carries `total`, so asking for a single row answers "how
 * many are waiting" without pulling the queue. Six requests rather than one is the
 * cost of there being no aggregate endpoint; each is a count, none returns a list,
 * and the cache means a second screen asking the same question does not ask twice.
 *
 * ## The two figures that are not here
 *
 * **Revenue by month** has no endpoint. `service_invoices` exists but the payment
 * module exposes only `POST /payment/checkout`, so nothing can read invoices at all
 * — there is no route to sum.
 *
 * **The audit log has no table.** `auth.config.ts` defines an `auditLog` permission
 * and `src/database/schema` has nothing for it to govern. The dashboard's activity
 * feed therefore cannot be backed; it stays on the fixture, and the screen says so.
 *
 * Those two are API work. Everything below is a real number.
 */

/** A count, or `undefined` while it loads or if the read failed. */
export type Count = number | undefined;

/**
 * No `useCallback` around `read`. `useResource` keeps the fetcher in a ref that its
 * effect does not depend on — `key` is the identity — so a closure rebuilt on every
 * render costs nothing and does not refetch. Memoising it here would only satisfy a
 * lint rule that wants an inline function anyway.
 */
function useCount(
  key: string,
  read: (signal: AbortSignal) => Promise<Paginated<unknown>>,
): Count {
  return useResource<Paginated<unknown>>(key, read).data?.total;
}

export interface DashboardCounts {
  /** Identity submissions plus skill proofs — one queue to the reader. */
  readonly verification: Count;
  readonly identity: Count;
  readonly proofs: Count;
  readonly refunds: Count;
  readonly reports: Count;
  readonly flags: Count;
  readonly users: Count;
  readonly services: Count;
  /** Satang still owed to advisors: every payout not yet PAID. */
  readonly payoutsDue: Count;
}

/**
 * `limit: 1` throughout: these are counters, and the queues they count are each a
 * screen of their own.
 *
 * The verification figure adds two queues because the console presents them as one
 * — an advisor waiting on an identity check and one waiting on a skill proof are
 * both "waiting to be reviewed". It is `undefined` until both have answered, so a
 * half-loaded sum is never shown as a total.
 */
export function useDashboardCounts(): DashboardCounts {
  const identity = useCount(
    "admin/identity-verifications?status=SUBMITTED&limit=1",
    (signal) => listIdentityVerifications({ status: "SUBMITTED", limit: 1 }, signal),
  );
  const proofs = useCount(
    "admin/skill-proofs?reviewStatus=PENDING&limit=1",
    (signal) => listSkillProofs({ reviewStatus: "PENDING", limit: 1 }, signal),
  );
  const refunds = useCount("admin/refunds?status=OPEN&limit=1", (signal) =>
    listRefundCases({ status: "OPEN", limit: 1 }, signal),
  );
  const reports = useCount("admin/reports?status=OPEN&limit=1", (signal) =>
    listReports({ status: "OPEN", limit: 1 }, signal),
  );
  const flags = useCount(
    "admin/off-platform-flags?status=PENDING_REVIEW&limit=1",
    (signal) =>
      listOffPlatformFlags({ status: "PENDING_REVIEW", limit: 1 }, signal),
  );
  const users = useCount("admin/accounts?limit=1", (signal) =>
    listAdminAccounts({ limit: 1 }, signal),
  );
  const services = useCount("admin/services?limit=1", (signal) =>
    listAdminServices({ limit: 1 }, signal),
  );
  // A sum needs the amounts, so this one reads the page the payouts screen
  // reads (same key, shared cache) rather than a count.
  const payouts = useResource<Paginated<AdminPayout>>(
    `${ADMIN_KEYS.payouts}?limit=${ADMIN_MAX_LIMIT}`,
    (signal) => listPayouts({ limit: ADMIN_MAX_LIMIT }, signal),
  ).data;
  const payoutsDue = payouts?.items
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amountSatang, 0);

  return {
    verification:
      identity === undefined || proofs === undefined ? undefined : identity + proofs,
    identity,
    proofs,
    refunds,
    reports,
    flags,
    users,
    services,
    payoutsDue,
  };
}
