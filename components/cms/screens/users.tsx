"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatDate, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Account, Role } from "@/lib/mock-db/types";

type RoleTab = "all" | Role;

/**
 * Figma "Admin - User search" as a Nexus list: role tabs, search, status
 * filter. Suspending an account happens on its edit page.
 */
export function UsersScreen() {
  const t = useTranslations("cms.users");
  const router = useRouter();
  const accounts = useDatabase((db) => db.accounts);
  const statusOptions = useStatusOptions("account");

  const tabs = (["all", "advisee", "advisor", "admin"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
  }));
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
    { id: "name", header: t("col.name"), sortable: true, render: (a) => a.name },
    { id: "email", header: t("col.email"), className: "font-latin", render: (a) => a.email },
    { id: "role", header: t("col.role"), render: (a) => <CmsStatus group="role" value={a.role} /> },
    { id: "phone", header: t("col.phone"), className: "font-latin", render: (a) => a.phone || "—" },
    { id: "lastLogin", header: t("col.lastLogin"), sortable: true, render: (a) => formatDateTime(a.lastLoginAt) },
    { id: "createdAt", header: t("col.createdAt"), sortable: true, render: (a) => formatDate(a.createdAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (a) => <CmsStatus group="account" value={a.status} />,
    },
  ];

  return (
    <CmsPage title={t("title")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        filters={
          <CmsFilterMenu
            className="w-36"
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
        list={list}
        onRowClick={(a) => router.push(`/admin/users/edit?id=${a.id}`)}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
