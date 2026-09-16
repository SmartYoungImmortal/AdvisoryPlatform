"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { suspendAccounts } from "@/lib/mock-db/actions";
import { formatDate, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Account, Role } from "@/lib/mock-db/types";

type RoleTab = "all" | Role;

/** Figma "Admin - User search" as a Nexus list: role tabs, search, status filter. */
export function UsersScreen() {
  const t = useTranslations("cms.users");
  const router = useRouter();
  const actorId = useActorId();
  const { prompt, toast } = useCmsFeedback();
  const accounts = useDatabase((db) => db.accounts);
  const statusOptions = useStatusOptions("account");

  const tabs = useMemo(
    () =>
      (["all", "advisee", "advisor", "admin"] as const).map((value) => ({
        value,
        label: t(`tab.${value}`),
        count:
          value === "all"
            ? accounts.length
            : accounts.filter((a) => a.role === value).length,
      })),
    [accounts, t],
  );
  const tab = useQueryTab<RoleTab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? accounts : accounts.filter((a) => a.role === tab)),
    [accounts, tab],
  );

  const list = useCmsList(rows, {
    searchText: (a) => `${a.name} ${a.fullName} ${a.email} ${a.phone}`,
    sortValue: (a, id) => {
      if (id === "name") return a.name;
      if (id === "lastLogin") return timeValue(a.lastLoginAt);
      return timeValue(a.createdAt);
    },
    filters: [{ key: "status", test: (a, values) => values.includes(a.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<Account>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      cell: (a) => <CmsPerson account={a} detail={a.email} />,
    },
    { id: "role", header: t("col.role"), cell: (a) => <CmsStatus group="role" value={a.role} /> },
    {
      id: "phone",
      header: t("col.phone"),
      className: "font-latin",
      cell: (a) => a.phone || "—",
    },
    {
      id: "lastLogin",
      header: t("col.lastLogin"),
      sortable: true,
      cell: (a) => formatDateTime(a.lastLoginAt),
    },
    {
      id: "createdAt",
      header: t("col.createdAt"),
      sortable: true,
      cell: (a) => formatDate(a.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      className: "w-[10%]",
      cell: (a) => <CmsStatus group="account" value={a.status} />,
    },
  ];

  return (
    <CmsPage title={t("title")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => (
          <CmsButton
            color="error"
            icon={Ban}
            onClick={async () => {
              const reason = await prompt({
                type: "danger",
                title: t("suspendTitle", { count: ids.length }),
                description: t("suspendBody"),
                inputLabel: t("reason"),
                placeholder: t("reasonPlaceholder"),
                confirmLabel: t("suspendConfirm"),
              });
              if (reason === null) return;
              suspendAccounts(ids, reason, null, actorId);
              list.clearSelection();
              toast({ title: t("suspendDone", { count: ids.length }) });
            }}
          >
            {t("suspendSelected", { count: ids.length })}
          </CmsButton>
        )}
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
