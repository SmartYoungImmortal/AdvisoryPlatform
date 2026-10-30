"use client";

import { Ban, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAdminUserId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsStatus, useStatusLabel, useStatusOptions } from "@/components/cms/status";
import {
  CmsChips,
  CmsFilterMenu,
  CmsTable,
  countBy,
  dateColumn,
  statusColumn,
  type CmsColumn,
} from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  listAdminAccounts,
  suspendAccount,
  type AdminAccount,
  type AdminAccountRole,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { timeValue } from "@/lib/mock-db/format";

const ROLES: readonly AdminAccountRole[] = ["advisee", "advisor", "admin"];
const STATUSES = ["ACTIVE", "SUSPENDED"] as const;

/** The `useResource` key every read of this list shares, so a ruling can drop it. */
const ACCOUNTS_KEY = ADMIN_KEYS.accounts;

/**
 * Every account, from `GET /api/v1/admin/accounts`.
 *
 * ## One request, filtered here
 *
 * The API filters by `status`, `role` and `q` server-side, and the console's own
 * `useCmsList` filters, sorts and pages in memory. Both would work; one request
 * keeps the capsules and the role filter instant. `limit` is the API's own
 * ceiling (100), and when the account table outgrows that the page says so
 * under its title rather than quietly showing the first hundred as though they
 * were all of them — at which point this should move to server-side
 * `q`/`role`/`status`.
 *
 * ## What the API does not carry, so this does not show
 *
 * No `phone` and no last-login timestamp exist on `AdminAccountResponseDto`.
 * `role` is better-auth's coarse role: in the seeded database every advisor's
 * row still reads `advisee`, and whether someone is really an advisor is
 * `hasAdvisorProfile` on the detail route — so filtering to advisors can come up
 * empty while advisors exist.
 */
export function UsersScreen() {
  const t = useTranslations("cms.users");
  const tTable = useTranslations("cms.table");
  const { prompt } = useCmsFeedback();
  const rule = useRuling();
  const selfId = useAdminUserId();
  const statusLabel = useStatusLabel();
  const roleOptions = useStatusOptions("role", ROLES);

  const fetcher = useCallback(
    (signal: AbortSignal) => listAdminAccounts({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const accounts = useResource<Paginated<AdminAccount>>(
    `${ACCOUNTS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => accounts.data?.items ?? [], [accounts.data]);
  const count = useMemo(() => countBy(items, (a) => a.status), [items]);

  const list = useCmsList(items, {
    searchText: (a) => `${a.displayName} ${a.fullName} ${a.email}`,
    sortValue: (a, id) => {
      if (id === "name") return a.fullName || a.displayName;
      if (id === "status") return a.status;
      if (id === "updatedAt") return timeValue(a.updatedAt);
      return timeValue(a.createdAt);
    },
    filters: [
      { key: "role", test: (a, values) => values.includes(a.role ?? "") },
      { key: "status", test: (a, values) => values.includes(a.status) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<AdminAccount>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      primary: true,
      render: (a) => (
        <span className="inline-flex items-center gap-3">
          <CmsAvatar account={{ name: a.displayName, imageUrl: a.image }} size="sm" />
          {a.fullName || a.displayName}
        </span>
      ),
    },
    {
      id: "email",
      header: t("col.email"),
      className: "font-latin text-muted-foreground",
      render: (a) => a.email,
    },
    {
      id: "role",
      header: t("col.role"),
      render: (a) => (a.role ? statusLabel("role", a.role) : "-"),
    },
    statusColumn(t("col.status"), (a) => <CmsStatus group="account" value={a.status} />),
    dateColumn("createdAt", t("col.createdAt"), (a) => a.createdAt),
    dateColumn("updatedAt", tTable("updatedAt"), (a) => a.updatedAt),
  ];

  const total = accounts.data?.total ?? items.length;
  const truncated = total > items.length;

  return (
    <CmsPage
      description={
        truncated ? tTable("truncated", { shown: items.length, total }) : undefined
      }
      title={t("title")}
    >
      {accounts.loading ? (
        <CmsTableSkeleton columns={columns.length} />
      ) : accounts.error ? (
        <CmsApiError error={accounts.error} onRetry={accounts.reload} />
      ) : (
        <CmsTable
          bulkActions={(ids) => {
            // The API refuses suspending your own account with a 400 of its own;
            // leaving it out of the selection is kinder than letting the batch
            // stop halfway through on it.
            const targets = ids.filter(
              (id) => id !== selfId && items.find((a) => a.id === id)?.status === "ACTIVE",
            );
            if (targets.length === 0) return null;
            return (
              <CmsButton
                icon={Ban}
                onClick={async () => {
                  const reason = await prompt({
                    type: "danger",
                    title: t("suspendTitle", { count: targets.length }),
                    description: t("suspendBody"),
                    inputLabel: t("reason"),
                    placeholder: t("reasonPlaceholder"),
                    confirmLabel: t("suspendConfirm"),
                  });
                  if (reason === null) return;
                  await rule({
                    keyPrefix: ACCOUNTS_KEY,
                    onDone: list.clearSelection,
                    run: targets.map((id) => () => suspendAccount(id, reason)),
                    success: t("suspendDone", { count: targets.length }),
                  });
                }}
                size="sm"
                variant="danger-soft"
              >
                {t("suspendSelected", { count: targets.length })}
              </CmsButton>
            );
          }}
          chips={
            <CmsChips
              label={t("col.status")}
              onChange={(value) => list.setFilter("status", value ? [value] : [])}
              options={[
                { value: "", label: tTable("all"), count: count("") },
                ...STATUSES.map((value) => ({
                  value,
                  label: statusLabel("account", value),
                  count: count(value),
                })),
              ]}
              value={list.filterValues.status?.[0] ?? ""}
            />
          }
          columns={columns}
          empty={{ icon: Users, title: t("empty") }}
          filters={
            <CmsFilterMenu
              label={t("allRoles")}
              onChange={(values) => list.setFilter("role", values)}
              options={roleOptions}
              values={list.filterValues.role ?? []}
            />
          }
          list={list}
          rowHref={(a) => `/admin/users/edit?id=${a.id}`}
          searchPlaceholder={t("search")}
        />
      )}
    </CmsPage>
  );
}
