"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAdminUserId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsApiStatus, useApiStatusOptions } from "@/components/cms/status";
import { useAuditHeaders } from "@/components/cms/people";
import {
  auditColumns,
  CmsFilterMenu,
  CmsTable,
  createdColumn,
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
import { formatStamp, timeValue } from "@/lib/mock-db/format";

const ROLES: readonly AdminAccountRole[] = ["advisee", "advisor", "admin"];

/** The `useResource` key every read of this queue shares, so a ruling can drop it. */
const ACCOUNTS_KEY = ADMIN_KEYS.accounts;

/**
 * Figma "Admin - User search", reading `GET /api/v1/admin/accounts`.
 *
 * ## One request, filtered here
 *
 * The API filters by `status`, `role` and `q` server-side, and the console's own
 * `useCmsList` filters, sorts and pages in memory. Both would work; one request
 * keeps the role and status dropdowns instant. `limit` is the API's own ceiling
 * (100), and when the account table outgrows that the page title says so rather
 * than quietly showing the first hundred as though they were all of them — at
 * which point this should move to server-side `q`/`role`/`status`.
 *
 * ## What the API does not carry, so this does not show
 *
 * No `phone` and no last-login timestamp exist on `AdminAccountResponseDto`, so
 * the two columns that showed them are gone rather than showing an em dash
 * forever. `role` is better-auth's coarse role: in the seeded database every
 * advisor's row still reads `advisee`, and whether someone is really an advisor is
 * `hasAdvisorProfile` on the detail route — so filtering to advisors can come up
 * empty while advisors exist.
 */
export function UsersScreen() {
  const t = useTranslations("cms.users");
  // `cms.users` has no header for the updated column; the record screen's own
  // "แก้ไขล่าสุด" is the same words for the same field.
  const tEdit = useTranslations("cms.userEdit");
  const tTable = useTranslations("cms.table");
  const audit = useAuditHeaders();
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

  // Nexus filters a list from the toolbar, not from tabs above it: the role is a
  // dropdown beside the status one.
  const roleOptions = useMemo(
    () => ROLES.map((value) => ({ value, label: t(`tab.${value}`) })),
    [t],
  );

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

  // Nexus's column order: date created, status, then the record's own fields
  // as plain single-line text — no avatars, no second line.
  const columns: ReadonlyArray<CmsColumn<AdminAccount>> = [
    createdColumn(tTable("createdAt"), (a) => a.createdAt),
    statusColumn(t("col.status"), (a) => (
      <CmsApiStatus group="accountStatus" value={a.status} />
    )),
    {
      // Nexus's image column, centred with a hairline ring — round, because it
      // is a person, and 32px so a row stays the height of its text.
      id: "image",
      header: t("col.image"),
      align: "center",
      render: (a) => (
        <span className="flex justify-center">
          <CmsAvatar
            account={{ name: a.displayName, imageUrl: a.image }}
            className="ring-1 ring-border"
            size="md"
          />
        </span>
      ),
    },
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      render: (a) => a.fullName || a.displayName,
    },
    { id: "email", header: t("col.email"), className: "font-latin", render: (a) => a.email },
    {
      id: "role",
      header: t("col.role"),
      render: (a) => roleOptions.find((o) => o.value === a.role)?.label ?? a.role ?? "-",
    },
    {
      id: "updatedAt",
      header: tEdit("updated"),
      sortable: true,
      className: "font-latin",
      render: (a) => formatStamp(a.updatedAt),
    },
    // An account signs itself up; nothing records who last changed it.
    ...auditColumns<AdminAccount>(audit, (a) => a.fullName || a.displayName, () => null),
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
          <>
            <CmsFilterMenu
              label={t("allStatuses")}
              onChange={(values) => list.setFilter("status", values)}
              options={statusOptions}
              values={list.filterValues.status ?? []}
            />
            <CmsFilterMenu
              className="w-44"
              label={t("allRoles")}
              onChange={(values) => list.setFilter("role", values)}
              options={roleOptions}
              values={list.filterValues.role ?? []}
            />
          </>
        }
        list={list}
        onRowClick={(a) => router.push(`/admin/users/edit?id=${a.id}`)}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
