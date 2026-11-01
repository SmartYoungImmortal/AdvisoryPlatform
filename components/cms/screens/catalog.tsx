"use client";

import { Plus, Sparkles, Tags, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsLinkButton } from "@/components/cms/fields";
import { usePageTab } from "@/components/cms/hooks";
import { CmsPage, CmsPageTabs } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { CmsTable, dateColumn, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  deleteCategory,
  deleteSkill,
  listAdminServices,
  listAdminSkills,
  listCategories,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { timeValue } from "@/lib/mock-db/format";

const CATEGORIES_KEY = ADMIN_KEYS.categories;
const SKILLS_KEY = ADMIN_KEYS.skills;
const BASE = "/admin/manage";
const TABS = ["categories", "skills"] as const;

/** Where a record of either list is created and edited. */
export function taxonomyEditHref(kind: (typeof TABS)[number], id: string): string {
  return `${BASE}/${kind === "categories" ? "edit" : "skill"}?id=${id}`;
}

/**
 * The taxonomy, against `/service-categories` and `/skills`: one desk, two tabs
 * (`?tab=skills` for the second). They were two sidebar entries; both are a
 * list of names with a line of description, edited the same way, so they are
 * the two tabs of one page now.
 *
 * Both resources have `GET`, `POST`, `PATCH` and `DELETE`, and the console uses
 * all four. A category has `name` and `description` and **no slug** and **no
 * published status**; a skill has `name` and `description` and **no category**,
 * so there is nothing else to show or filter by.
 *
 * Creating and editing happen on a page of their own (`catalog-edit.tsx`),
 * never a dialog.
 *
 * ## The service count is real
 *
 * "บริการ" counts rows of `GET /admin/services` by `categoryId`, so it is the
 * live number of listings filed under a category. It is also what the delete
 * confirmation warns on: the API does not guarantee a refusal, and a category
 * with listings behind it should not be deleted by accident.
 */
export function CatalogScreen() {
  const t = useTranslations("cms.catalog");
  const tab = usePageTab(TABS);

  const categoriesFetcher = useCallback(
    (signal: AbortSignal) => listCategories({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const skillsFetcher = useCallback(
    (signal: AbortSignal) => listAdminSkills({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const servicesFetcher = useCallback(
    (signal: AbortSignal) => listAdminServices({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );

  const categories = useResource<Paginated<TaxonomyRecord>>(
    `${CATEGORIES_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    categoriesFetcher,
  );
  const skills = useResource<Paginated<TaxonomyRecord>>(
    `${SKILLS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    skillsFetcher,
  );
  const services = useResource<Paginated<AdminService>>(
    // The same key the services list reads under, so the two share one request.
    `${ADMIN_KEYS.services}?limit=${ADMIN_MAX_LIMIT}`,
    servicesFetcher,
  );

  const categoryItems = useMemo(() => categories.data?.items ?? [], [categories.data]);
  const skillItems = useMemo(() => skills.data?.items ?? [], [skills.data]);
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of services.data?.items ?? []) {
      counts.set(service.categoryId, (counts.get(service.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [services.data]);

  const active = tab === "categories" ? categories : skills;

  return (
    <CmsPage
      actions={
        <CmsLinkButton href={taxonomyEditHref(tab, "new")} icon={Plus}>
          {tab === "categories" ? t("newCategory") : t("newSkill")}
        </CmsLinkButton>
      }
      tabs={
        <CmsPageTabs
          current={tab}
          label={t("title")}
          tabs={[
            {
              key: "categories",
              label: t("tab.categories"),
              href: BASE,
              count: categories.data?.total,
            },
            {
              key: "skills",
              label: t("tab.skills"),
              href: `${BASE}?tab=skills`,
              count: skills.data?.total,
            },
          ]}
        />
      }
      title={t("title")}
    >
      {active.loading ? (
        <CmsTableSkeleton columns={tab === "categories" ? 5 : 4} />
      ) : active.error ? (
        <CmsApiError error={active.error} onRetry={active.reload} />
      ) : tab === "categories" ? (
        <CategoryTable categories={categoryItems} usage={usage} />
      ) : (
        <SkillTable skills={skillItems} />
      )}
    </CmsPage>
  );
}

/** The record's description, held to one line in the table. */
function descriptionColumn(header: string): CmsColumn<TaxonomyRecord> {
  return {
    id: "description",
    header,
    className: "text-muted-foreground",
    render: (r) => <span className="block max-w-96 truncate">{r.description || "-"}</span>,
  };
}

function CategoryTable({
  categories,
  usage,
}: {
  readonly categories: readonly TaxonomyRecord[];
  readonly usage: ReadonlyMap<string, number>;
}) {
  const t = useTranslations("cms.catalog");
  const accountName = useAccountName();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const list = useCmsList(categories, {
    prefix: "c_",
    searchText: (c) => `${c.name} ${c.description ?? ""}`,
    sortValue: (c, id) => {
      if (id === "services") return usage.get(c.id) ?? 0;
      if (id === "updatedAt") return timeValue(c.modifiedAt);
      return c.name;
    },
  });

  async function remove(ids: readonly string[]) {
    const used = ids.filter((id) => (usage.get(id) ?? 0) > 0);
    const ok = await confirm({
      type: "danger",
      title: t("deleteTitle", { count: ids.length }),
      description:
        used.length > 0
          ? t("deleteGuard", {
              names: used
                .map((id) => categories.find((c) => c.id === id)?.name ?? id)
                .join(", "),
            })
          : t("deleteBody"),
      confirmLabel: t("delete"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: CATEGORIES_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => deleteCategory(id)),
      success: t("deleted", { count: ids.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<TaxonomyRecord>> = [
    { id: "name", header: t("col.name"), sortable: true, primary: true, render: (c) => c.name },
    descriptionColumn(t("description")),
    {
      id: "services",
      header: t("col.services"),
      sortable: true,
      align: "end",
      className: "font-latin",
      render: (c) => usage.get(c.id) ?? 0,
    },
    dateColumn("updatedAt", t("col.updatedAt"), (c) => c.modifiedAt),
    {
      id: "updatedBy",
      header: t("col.updatedBy"),
      className: "text-muted-foreground",
      render: (c) => accountName(c.updatedByUserId) ?? "-",
    },
  ];

  return (
    <CmsTable
      renderBulkActions={(ids) => (
        <CmsButton icon={Trash2} onClick={() => remove(ids)} size="sm" variant="danger-soft">
          {t("deleteSelected", { count: ids.length })}
        </CmsButton>
      )}
      columns={columns}
      empty={{ icon: Tags, title: t("emptyCategories") }}
      list={list}
      rowHref={(c) => taxonomyEditHref("categories", c.id)}
      searchPlaceholder={t("searchCategories")}
    />
  );
}

function SkillTable({ skills }: { readonly skills: readonly TaxonomyRecord[] }) {
  const t = useTranslations("cms.catalog");
  const accountName = useAccountName();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const list = useCmsList(skills, {
    prefix: "k_",
    searchText: (s) => `${s.name} ${s.description ?? ""}`,
    sortValue: (s, id) => (id === "updatedAt" ? timeValue(s.modifiedAt) : s.name),
  });

  const columns: ReadonlyArray<CmsColumn<TaxonomyRecord>> = [
    { id: "name", header: t("col.name"), sortable: true, primary: true, render: (s) => s.name },
    descriptionColumn(t("description")),
    dateColumn("updatedAt", t("col.updatedAt"), (s) => s.modifiedAt),
    {
      id: "updatedBy",
      header: t("col.updatedBy"),
      className: "text-muted-foreground",
      render: (s) => accountName(s.updatedByUserId) ?? "-",
    },
  ];

  return (
    <CmsTable
      renderBulkActions={(ids) => (
        <CmsButton
          icon={Trash2}
          onClick={async () => {
            const ok = await confirm({
              type: "danger",
              title: t("deleteSkillTitle", { count: ids.length }),
              description: t("deleteSkillBody"),
              confirmLabel: t("delete"),
            });
            if (!ok) return;
            await rule({
              keyPrefix: SKILLS_KEY,
              onDone: list.clearSelection,
              run: ids.map((id) => () => deleteSkill(id)),
              success: t("deleted", { count: ids.length }),
            });
          }}
          size="sm"
          variant="danger-soft"
        >
          {t("deleteSelected", { count: ids.length })}
        </CmsButton>
      )}
      columns={columns}
      empty={{ icon: Sparkles, title: t("emptySkills") }}
      list={list}
      rowHref={(s) => taxonomyEditHref("skills", s.id)}
      searchPlaceholder={t("searchSkills")}
    />
  );
}
