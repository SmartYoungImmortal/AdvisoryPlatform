"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAdminUserId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsApiStatus, useApiStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
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
import { formatDate, formatDateTime, timeValue } from "@/lib/mock-db/format";

type RoleTab = "all" | AdminAccountRole;

const ROLE_TABS = ["all", "advisee", "advisor", "admin"] as const;

/** The `useResource` key every read of this queue shares, so a ruling can drop it. */
const ACCOUNTS_KEY = ADMIN_KEYS.accounts;

/**
 * Figma "Admin - User search", reading `GET /api/v1/admin/accounts`.
 *
 * ## One request, filtered here
 *
 * The API filters by `status`, `role` and `q` server-side, and the console's own
 * `useCmsList` filters, sorts and pages in memory. Both would work; one request is
 * used because the tabs carry counts, and counts for four tabs are four more
 * requests the moment filtering moves to the server. `limit` is the API's own
 * ceiling (100), and when the account table outgrows that the page title says so
 * rather than quietly showing the first hundred as though they were all of them —
 * at which point this should move to server-side `q`/`role` and lose the counts.
 *
 * ## What the API does not carry, so this does not show
 *
 * No `phone` and no last-login timestamp exist on `AdminAccountResponseDto`, so
 * the two columns that showed them are gone rather than showing an em dash
 * forever. `role` is better-auth's coarse role: in the seeded database every
 * advisor's row still reads `advisee`, and whether someone is really an advisor is
 * `hasAdvisorProfile` on the detail route — so the advisor tab can be empty while
 * advisors exist.
 */
export function UsersScreen() {
  const t = useTranslations("cms.users");
  // `cms.users` has no header for the updated column; the record screen's own
  // "แก้ไขล่าสุด" is the same words for the same field.
  const tEdit = useTranslations("cms.userEdit");
  const tTable = useTranslations("cms.table");
  const router = useRouter();
  const { prompt } = useCmsFeedback();
  const rule = useRuling();
  const selfId = useAdminUserId();
  const statusOptions = useApiStatusOptions("accountStatus", ["ACTIVE", "SUSPENDED"]);

  const fetcher = useCallback(
    (signal: AbortSignal) => listAdminAccounts({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const accounts = useResource<Paginated<AdminAccount>>(
    `${ACCOUNTS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => accounts.data?.items ?? [], [accounts.data]);

  const tabs = useMemo(
    () =>
      ROLE_TABS.map((value) => ({
        value,
        label: t(`tab.${value}`),
        count:
          value === "all"
            ? items.length
            : items.filter((a) => a.role === value).length,
      })),
    [items, t],
  );
  const tab = useQueryTab<RoleTab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? items : items.filter((a) => a.role === tab)),
    [items, tab],
  );

  const list = useCmsList(rows, {
    searchText: (a) => `${a.displayName} ${a.fullName} ${a.email}`,
    sortValue: (a, id) => {
      if (id === "name") return a.displayName;
      if (id === "updatedAt") return timeValue(a.updatedAt);
      return timeValue(a.createdAt);
    },
    filters: [{ key: "status", test: (a, values) => values.includes(a.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<AdminAccount>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      render: (a) => <CmsPerson account={{ name: a.displayName }} detail={a.email} />,
    },
    {
      id: "role",
      header: t("col.role"),
      render: (a) => <CmsApiStatus group="role" value={a.role} />,
    },
    {
      id: "createdAt",
      header: t("col.createdAt"),
      sortable: true,
      render: (a) => formatDate(a.createdAt),
    },
    {
      id: "updatedAt",
      header: tEdit("updated"),
      sortable: true,
      render: (a) => formatDateTime(a.updatedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      className: "w-[10%]",
      render: (a) => <CmsApiStatus group="accountStatus" value={a.status} />,
    },
  ];

  if (accounts.loading) {
    return (
      <CmsPage title={t("title")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (accounts.error) {
    return (
      <CmsPage title={t("title")}>
        <CmsApiError error={accounts.error} onRetry={accounts.reload} />
      </CmsPage>
    );
  }

  const total = accounts.data?.total ?? items.length;
  const truncated = total > items.length;

  return (
    <CmsPage
      badge={
        truncated ? (
          <span className="ms-2 font-latin text-sm font-normal text-muted-foreground">
            {tTable("range", { start: 1, end: items.length, total })}
          </span>
        ) : null
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => {
          // The API refuses suspending your own account with a 400 of its own;
          // leaving it out of the selection is kinder than letting the batch stop
          // halfway through on it.
          const targets = ids.filter((id) => id !== selfId);
          if (targets.length === 0) return null;
          return (
            <CmsButton
              color="error"
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
                  successColor: "warning",
                });
              }}
            >
              {t("suspendSelected", { count: targets.length })}
            </CmsButton>
          );
        }}
        columns={columns}
        filters={
          <CmsFilterMenu
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
        list={list}
        onRowClick={(a) => router.push(`/admin/users/edit?id=${a.id}`)}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
