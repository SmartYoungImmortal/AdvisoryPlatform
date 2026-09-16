"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { setServicesStatus } from "@/lib/mock-db/actions";
import { formatBaht, formatDate, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { MarketService, PublishStatus } from "@/lib/mock-db/types";

type Tab = "all" | PublishStatus;

/** Marketplace catalogue — every service advisors list, and whether it shows. */
export function ServicesScreen() {
  const t = useTranslations("cms.services");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { confirm, prompt, toast } = useCmsFeedback();
  const services = useDatabase((db) => db.services);
  const categories = useDatabase((db) => db.categories);
  const categoryName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const tabs = (["all", "published", "hidden"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
    count: value === "all" ? services.length : services.filter((s) => s.status === value).length,
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

  async function hide(ids: readonly string[]) {
    const reason = await prompt({
      type: "warning",
      title: t("hideTitle", { count: ids.length }),
      description: t("hideBody"),
      inputLabel: t("reason"),
      placeholder: t("reasonPlaceholder"),
      confirmLabel: t("hide"),
    });
    if (reason === null) return;
    setServicesStatus(ids, "hidden", reason, actorId);
    list.clearSelection();
    toast({ color: "warning", title: t("hidden", { count: ids.length }) });
  }

  async function publish(ids: readonly string[]) {
    const ok = await confirm({
      type: "success",
      title: t("publishTitle", { count: ids.length }),
      confirmLabel: t("publish"),
    });
    if (!ok) return;
    setServicesStatus(ids, "published", null, actorId);
    list.clearSelection();
    toast({ title: t("published", { count: ids.length }) });
  }

  const columns: ReadonlyArray<CmsColumn<MarketService>> = [
    {
      id: "title",
      header: t("col.title"),
      sortable: true,
      render: (s) => {
        const advisor = person(s.advisorId);
        return (
          <span className="flex min-w-0 items-center gap-3">
            {advisor ? <CmsAvatar account={advisor} /> : null}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-highlighted">{s.title}</span>
              <span className="truncate text-xs">{advisor?.name ?? "—"}</span>
            </span>
          </span>
        );
      },
    },
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
        bulkActions={(ids) => (
          <>
            <CmsButton color="neutral" icon={Eye} onClick={() => publish(ids)} variant="outline">
              {t("publishSelected", { count: ids.length })}
            </CmsButton>
            <CmsButton color="error" icon={EyeOff} onClick={() => hide(ids)}>
              {t("hideSelected", { count: ids.length })}
            </CmsButton>
          </>
        )}
        columns={columns}
        filters={
          <CmsFilterMenu
            label={t("allCategories")}
            onChange={(values) => list.setFilter("category", values)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            values={list.filterValues.category ?? []}
          />
        }
        list={list}
        onRowClick={(s) => router.push(`/admin/services/edit?id=${s.id}`)}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
