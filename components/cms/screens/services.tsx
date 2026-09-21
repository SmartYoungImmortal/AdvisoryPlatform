"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton } from "@/components/cms/api";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  listAdminServices,
  listCategories,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatDate, timeValue } from "@/lib/mock-db/format";

type Tab = "all" | "published" | "hidden";

const SERVICES_KEY = ADMIN_KEYS.services;

/**
 * The marketplace catalogue, from `GET /api/v1/admin/services`.
 *
 * Every service, published or not — the route deliberately does not filter, which
 * is the point of an admin listing.
 *
 * ## Read-only, because the controller has one route
 *
 * `AdminServicesController` is a single `GET`. There is no publish, no hide and no
 * edit, so the bulk actions and the row link into `/admin/services/edit` are gone:
 * a row that opens an editor which cannot save, or a Hide button which cannot
 * hide, is worse than a table that states plainly what it is. Hiding a listing
 * needs `PATCH /api/v1/admin/services/:serviceId` (or a `publish`/`hide` pair) on
 * the API.
 *
 * ## The two columns that are not here
 *
 * `AdvisorServiceResponseDto` has no rating and no booking count — nothing on the
 * API does, for a service — and it names the advisor only by `advisorId`. There is
 * no admin route that resolves an advisor id to a person, so the row shows the
 * listing and its category and does not guess at the rest. `isPublished` is a
 * boolean here, not a status enum, and maps onto the console's published/hidden
 * badge exactly.
 *
 * The category name comes from `GET /service-categories`, fetched once and joined
 * by id, the way `components/home/browse-list` joins advisors: one request for the
 * page instead of one per row.
 */
export function ServicesScreen() {
  const t = useTranslations("cms.services");

  const servicesFetcher = useCallback(
    (signal: AbortSignal) => listAdminServices({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const categoriesFetcher = useCallback(
    (signal: AbortSignal) => listCategories({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const services = useResource<Paginated<AdminService>>(
    `${SERVICES_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    servicesFetcher,
  );
  const categories = useResource<Paginated<TaxonomyRecord>>(
    `${ADMIN_KEYS.categories}?limit=${ADMIN_MAX_LIMIT}`,
    categoriesFetcher,
  );

  const items = useMemo(() => services.data?.items ?? [], [services.data]);
  const categoryItems = useMemo(
    () => categories.data?.items ?? [],
    [categories.data],
  );
  const categoryName = useMemo(
    () => new Map(categoryItems.map((c) => [c.id, c.name])),
    [categoryItems],
  );

  const tabs = (["all", "published", "hidden"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
    count:
      value === "all"
        ? items.length
        : items.filter((s) => s.isPublished === (value === "published")).length,
  }));
  const tab = useQueryTab<Tab>(tabs);
  const rows = useMemo(
    () =>
      tab === "all"
        ? items
        : items.filter((s) => s.isPublished === (tab === "published")),
    [items, tab],
  );

  const list = useCmsList(rows, {
    searchText: (s) => `${s.name} ${categoryName.get(s.categoryId) ?? ""}`,
    sortValue: (s, id) => {
      if (id === "price") return s.priceSatang;
      if (id === "title") return s.name;
      return timeValue(s.modifiedAt);
    },
    filters: [{ key: "category", test: (s, values) => values.includes(s.categoryId) }],
  });

  const columns: ReadonlyArray<CmsColumn<AdminService>> = [
    {
      id: "title",
      header: t("col.title"),
      sortable: true,
      render: (s) => (
        <span className="flex max-w-96 min-w-0 flex-col">
          <span className="truncate font-medium text-highlighted">{s.name}</span>
          {s.description ? <span className="truncate text-xs">{s.description}</span> : null}
        </span>
      ),
    },
    {
      id: "category",
      header: t("col.category"),
      render: (s) => categoryName.get(s.categoryId) ?? "-",
    },
    {
      id: "price",
      header: t("col.price"),
      sortable: true,
      className: "font-latin",
      render: (s) =>
        `${formatBaht(s.priceSatang)} / ${t("minutes", { count: s.durationMinutes })}`,
    },
    {
      id: "updatedAt",
      header: t("col.updatedAt"),
      sortable: true,
      render: (s) => formatDate(s.modifiedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (s) => (
        <CmsStatus group="publish" value={s.isPublished ? "published" : "hidden"} />
      ),
    },
  ];

  if (services.loading) {
    return (
      <CmsPage title={t("title")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (services.error) {
    return (
      <CmsPage title={t("title")}>
        <CmsApiError error={services.error} onRetry={services.reload} />
      </CmsPage>
    );
  }

  return (
    <CmsPage title={t("title")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        filters={
          <CmsFilterMenu
            label={t("allCategories")}
            onChange={(values) => list.setFilter("category", values)}
            options={categoryItems.map((c) => ({ value: c.id, label: c.name }))}
            values={list.filterValues.category ?? []}
          />
        }
        list={list}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
