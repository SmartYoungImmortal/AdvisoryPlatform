"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton } from "@/components/cms/api";
import { CmsPage } from "@/components/cms/layout";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import {
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
  listAdminServices,
  listCategories,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatStamp, timeValue } from "@/lib/mock-db/format";

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
  const tTable = useTranslations("cms.table");

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

  const statusOptions = useStatusOptions("publish");

  const list = useCmsList(items, {
    searchText: (s) => `${s.name} ${categoryName.get(s.categoryId) ?? ""}`,
    sortValue: (s, id) => {
      if (id === "price") return s.priceSatang;
      if (id === "title") return s.name;
      if (id === "status") return s.isPublished ? 1 : 0;
      if (id === "createdAt") return timeValue(s.createdAt);
      return timeValue(s.modifiedAt);
    },
    filters: [
      {
        key: "status",
        test: (s, values) => values.includes(s.isPublished ? "published" : "hidden"),
      },
      { key: "category", test: (s, values) => values.includes(s.categoryId) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<AdminService>> = [
    createdColumn(tTable("createdAt"), (s) => s.createdAt),
    statusColumn(t("col.status"), (s) => (
      <CmsStatus group="publish" value={s.isPublished ? "published" : "hidden"} />
    )),
    {
      id: "title",
      header: t("col.title"),
      sortable: true,
      render: (s) => <span className="block max-w-80 truncate">{s.name}</span>,
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
      className: "font-latin",
      render: (s) => formatStamp(s.modifiedAt),
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
      <CmsTable
        columns={columns}
        filters={
          <>
            <CmsFilterMenu
              label={t("allStatuses")}
              onChange={(values) => list.setFilter("status", values)}
              options={statusOptions}
              values={list.filterValues.status ?? []}
            />
            {/* Nexus's blog list gives its category filter `w-56`. */}
            <CmsFilterMenu
              className="w-56"
              label={t("allCategories")}
              onChange={(values) => list.setFilter("category", values)}
              options={categoryItems.map((c) => ({ value: c.id, label: c.name }))}
              values={list.filterValues.category ?? []}
            />
          </>
        }
        list={list}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
