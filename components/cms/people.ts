"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  listAdminAccounts,
  type AdminAccount,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

/**
 * Account id → full name, for every column that names a person.
 *
 * The queue DTOs carry only `displayName` ("ศราวุธ ก."), and the console
 * names people in full. The account rows have `fullName`, so the lookup reads
 * the same `admin/accounts?limit=100` the users table reads, under the same key
 * — a screen that names people costs no request of its own once that list is
 * cached. `null` while it loads or when the id is unknown; callers fall back to
 * the display name the row carries.
 */
export function useAccountName(): (id: string | null | undefined) => string | null {
  const fetcher = useCallback(
    (signal: AbortSignal) => listAdminAccounts({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const accounts = useResource<Paginated<AdminAccount>>(
    `${ADMIN_KEYS.accounts}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const names = useMemo(
    () =>
      new Map(
        (accounts.data?.items ?? []).map((a) => [a.id, a.fullName || a.displayName]),
      ),
    [accounts.data],
  );
  return useCallback((id) => (id ? (names.get(id) ?? null) : null), [names]);
}

/** The two audit headers plus the scanner's name, from `cms.table`. */
export function useAuditHeaders() {
  const t = useTranslations("cms.table");
  return { createdBy: t("createdBy"), updatedBy: t("updatedBy"), system: t("system") };
}
