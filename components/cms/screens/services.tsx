"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton } from "@/components/cms/api";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { CmsStatus, useStatusLabel } from "@/components/cms/status";
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
  listAdminServices,
  listCategories,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, timeValue } from "@/lib/mock-db/format";

const SERVICES_KEY = ADMIN_KEYS.services;

/** A service's `isPublished`, in the console's two words for it. */
function publishState(service: AdminService): "published" | "hidden" {
  return service.isPublished ? "published" : "hidden";
}

/**
 * The marketplace catalogue, from `GET /api/v1/admin/services`.
 *
 * Every service, published or not — the route deliberately does not filter, which
 * is the point of an admin listing.
 *
 * ## Read-only, because the controller has one route
 *
 * `AdminServicesController` is a single `GET`. There is no publish, no hide and no
 * edit, so there are no bulk actions and a row opens a read-only record. Hiding a
 * listing needs `PATCH /api/v1/admin/services/:serviceId` (or a `publish`/`hide`
 * pair) on the API.
 *
 * `AdvisorServiceResponseDto` has no rating and no booking count, and names the
 * advisor only by `advisorId`, which the accounts list the console already reads
 * resolves to a name. The category name comes from `GET /service-categories`,
 * fetched once and joined by id: one request for the page instead of one per row.
 */
export function ServicesScreen() {
  const t = useTranslations("cms.services");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();

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
  const categoryItems = useMemo(() => categories.data?.items ?? [], [categories.data]);
  const categoryName = useMemo(
    () => new Map(categoryItems.map((c) => [c.id, c.name])),
    [categoryItems],
  );
  const count = useMemo(() => countBy(items, publishState), [items]);

  const list = useCmsList(items, {
    searchText: (s) =>
      `${s.name} ${categoryName.get(s.categoryId) ?? ""} ${accountName(s.advisorId) ?? ""}`,
    sortValue: (s, id) => {
      if (id === "price") return s.priceSatang;
      if (id === "title") return s.name;
      if (id === "status") return s.isPublished ? 1 : 0;
      return timeValue(s.modifiedAt);
    },
    filters: [
      { key: "status", test: (s, values) => values.includes(publishState(s)) },
      { key: "category", test: (s, values) => values.includes(s.categoryId) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<AdminService>> = [
    {
      id: "title",
      header: t("col.title"),
      sortable: true,
      primary: true,
      render: (s) => <span className="inline-block max-w-80 truncate align-bottom">{s.name}</span>,
    },
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (s) => accountName(s.advisorId) ?? "-",
    },
    {
      id: "category",
      header: t("col.category"),
      className: "text-muted-foreground",
      render: (s) => categoryName.get(s.categoryId) ?? "-",
    },
    {
      id: "price",
      header: t("col.price"),
      sortable: true,
      align: "end",
      render: (s) => (
        <>
          <span className="font-latin">{formatBaht(s.priceSatang)}</span>
          <span className="text-muted-foreground"> / {t("minutes", { count: s.durationMinutes })}</span>
        </>
      ),
    },
    statusColumn(t("col.status"), (s) => <CmsStatus group="publish" value={publishState(s)} />),
    dateColumn("updatedAt", t("col.updatedAt"), (s) => s.modifiedAt),
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
        chips={
          <CmsChips
            label={t("col.status")}
            onChange={(value) => list.setFilter("status", value ? [value] : [])}
            options={[
              { value: "", label: tTable("all"), count: count("") },
              ...(["published", "hidden"] as const).map((value) => ({
                value,
                label: statusLabel("publish", value),
                count: count(value),
              })),
            ]}
            value={list.filterValues.status?.[0] ?? ""}
          />
        }
        columns={columns}
        empty={{ icon: Store, title: t("empty") }}
        filters={
          <CmsFilterMenu
            label={t("allCategories")}
            onChange={(values) => list.setFilter("category", values)}
            options={categoryItems.map((c) => ({ value: c.id, label: c.name }))}
            values={list.filterValues.category ?? []}
          />
        }
        list={list}
        rowHref={(s) => `/admin/services/edit?id=${s.id}`}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
