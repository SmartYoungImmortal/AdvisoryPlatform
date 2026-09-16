"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatBaht, formatDate, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { MarketService, PublishStatus } from "@/lib/mock-db/types";

type Tab = "all" | PublishStatus;

/**
 * Marketplace catalogue — every service advisors list, and whether it shows.
 * Hiding one, with the reason its advisor sees, happens on its edit page.
 */
export function ServicesScreen() {
  const t = useTranslations("cms.services");
  const router = useRouter();
  const person = useAccountLookup();
  const services = useDatabase((db) => db.services);
  const categories = useDatabase((db) => db.categories);
  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const tabs = (["all", "published", "hidden"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
  }));
  const tab = useQueryTab<Tab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? services : services.filter((s) => s.status === tab)),
    [services, tab],
  );

  const list = useCmsList(rows, {
    searchText: (s) =>
      `${s.title} ${person(s.advisorId)?.name ?? ""} ${categoryName.get(s.categoryId) ?? ""}`,
    sortValue: (s, id) => {
      if (id === "price") return s.priceSatang;
      if (id === "bookings") return s.bookings;
      if (id === "rating") return s.rating;
      if (id === "title") return s.title;
      return timeValue(s.updatedAt);
    },
    filters: [{ key: "category", test: (s, values) => values.includes(s.categoryId) }],
  });

  const columns: ReadonlyArray<CmsColumn<MarketService>> = [
    {
      id: "title",
      header: t("col.title"),
      sortable: true,
      render: (s) => <span className="block max-w-72 truncate">{s.title}</span>,
    },
    { id: "advisor", header: t("col.advisor"), render: (s) => person(s.advisorId)?.name ?? "—" },
    { id: "category", header: t("col.category"), render: (s) => categoryName.get(s.categoryId) ?? "—" },
    {
      id: "price",
      header: t("col.price"),
      sortable: true,
      className: "font-latin",
      render: (s) => `${formatBaht(s.priceSatang)} / ${t("minutes", { count: s.minutes })}`,
    },
    { id: "bookings", header: t("col.bookings"), sortable: true, className: "font-latin", render: (s) => s.bookings },
    { id: "rating", header: t("col.rating"), sortable: true, className: "font-latin", render: (s) => s.rating.toFixed(1) },
    { id: "updatedAt", header: t("col.updatedAt"), sortable: true, render: (s) => formatDate(s.updatedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (s) => <CmsStatus group="publish" value={s.status} />,
    },
  ];

  return (
    <CmsPage title={t("title")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        extraFilters={
          <CmsFilterMenu
            className="w-56"
            label={t("allCategories")}
            onChange={(values) => list.setFilter("category", values)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            values={list.filterValues.category ?? []}
          />
        }
        list={list}
        onRowClick={(s) => router.push(`/admin/services/edit?id=${s.id}`)}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
