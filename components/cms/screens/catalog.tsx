"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { CmsTable, createdColumn, type CmsColumn } from "@/components/cms/table";
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
import { formatStamp, timeValue } from "@/lib/mock-db/format";

type Tab = "categories" | "skills";

const CATEGORIES_KEY = ADMIN_KEYS.categories;
const SKILLS_KEY = ADMIN_KEYS.skills;

/**
 * "จัดการระบบ" — the taxonomy, against `/service-categories` and `/skills`.
 *
 * Two collections, two pages: `/admin/manage` for categories and `/admin/skills`
 * for skills, each its own sidebar entry, as Nexus lists one collection per page.
 *
 * The one part of the admin surface that is genuinely complete: both resources have
 * `GET`, `POST`, `PATCH` and `DELETE`, and the console uses all four.
 *
 * ## Three fields that used to be here and are not on the API
 *
 * A category has `name` and `description` and **no slug** and **no published
 * status**; a skill has `name` and `description` and **no category**. The dialogs
 * edited all three against `lib/mock-db`, and there is nowhere to send them: the
 * slug field, the Published/Hidden select and the skill's category select are gone,
 * along with the category column and category filter on the skills table. A slug
 * would need a column on `service_categories`; a skill's category would need a
 * foreign key on `skills`.
 *
 * Creating and editing happen on `…/edit?id=`, in `catalog-edit.tsx` — a page with
 * the name and description fields, the way Nexus edits a record — never a dialog.
 *
 * ## The service count is real
 *
 * "จำนวนบริการ" counts rows of `GET /admin/services` by `categoryId`, so it is the
 * live number of listings filed under a category rather than a fixture's. It is
 * also what the delete confirmation warns on: the API does not guarantee a refusal,
 * and a category with listings behind it should not be deleted by accident.
 */
export function CatalogScreen({ kind: tab = "categories" }: { readonly kind?: Tab }) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  // Creating and editing are pages, as they are in Nexus — never a dialog.
  const editHref = (id: string) =>
    `${tab === "categories" ? "/admin/manage" : "/admin/skills"}/edit?id=${id}`;

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
    // The same key the services queue reads under, so the two share one request.
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
        <CmsButton
          className="h-9 px-4"
          color="action"
          onClick={() => router.push(editHref("new"))}
        >
          {tab === "categories" ? t("newCategory") : t("newSkill")}
        </CmsButton>
      }
      title={t(`tab.${tab}`)}
    >
      {active.loading ? (
        <CmsTableSkeleton columns={tab === "categories" ? 4 : 3} />
      ) : active.error ? (
        <CmsApiError error={active.error} onRetry={active.reload} />
      ) : tab === "categories" ? (
        <CategoryTable
          categories={categoryItems}
          onEdit={(c) => router.push(editHref(c.id))}
          usage={usage}
        />
      ) : (
        <SkillTable onEdit={(s) => router.push(editHref(s.id))} skills={skillItems} />
      )}
    </CmsPage>
  );
}

function CategoryTable({
  categories,
  usage,
  onEdit,
}: {
  readonly categories: readonly TaxonomyRecord[];
  readonly usage: ReadonlyMap<string, number>;
  readonly onEdit: (category: TaxonomyRecord) => void;
}) {
  const t = useTranslations("cms.catalog");
  const tTable = useTranslations("cms.table");
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const list = useCmsList(categories, {
    prefix: "c_",
    searchText: (c) => `${c.name} ${c.description ?? ""}`,
    sortValue: (c, id) => {
      if (id === "services") return usage.get(c.id) ?? 0;
      if (id === "updatedAt") return timeValue(c.modifiedAt);
      if (id === "createdAt") return timeValue(c.createdAt);
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
    createdColumn(tTable("createdAt"), (c) => c.createdAt),
    { id: "name", header: t("col.name"), sortable: true, render: (c) => c.name },
    {
      id: "services",
      header: t("col.services"),
      sortable: true,
      className: "font-latin",
      render: (c) => usage.get(c.id) ?? 0,
    },
    {
      id: "updatedAt",
      header: t("col.updatedAt"),
      sortable: true,
      className: "font-latin",
      render: (c) => formatStamp(c.modifiedAt),
    },
  ];

  return (
    <CmsTable
      bulkActions={(ids) => (
        <CmsButton color="error" icon={Trash2} onClick={() => remove(ids)}>
          {t("deleteSelected", { count: ids.length })}
        </CmsButton>
      )}
      columns={columns}
      list={list}
      onRowClick={onEdit}
      searchPlaceholder={t("searchCategories")}
    />
  );
}

function SkillTable({
  skills,
  onEdit,
}: {
  readonly skills: readonly TaxonomyRecord[];
  readonly onEdit: (skill: TaxonomyRecord) => void;
}) {
  const t = useTranslations("cms.catalog");
  const tTable = useTranslations("cms.table");
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const list = useCmsList(skills, {
    prefix: "k_",
    searchText: (s) => `${s.name} ${s.description ?? ""}`,
    sortValue: (s, id) => {
      if (id === "updatedAt") return timeValue(s.modifiedAt);
      if (id === "createdAt") return timeValue(s.createdAt);
      return s.name;
    },
  });

  const columns: ReadonlyArray<CmsColumn<TaxonomyRecord>> = [
    createdColumn(tTable("createdAt"), (s) => s.createdAt),
    { id: "name", header: t("col.name"), sortable: true, render: (s) => s.name },
    {
      id: "updatedAt",
      header: t("col.updatedAt"),
      sortable: true,
      className: "font-latin",
      render: (s) => formatStamp(s.modifiedAt),
    },
  ];

  return (
    <CmsTable
      bulkActions={(ids) => (
        <CmsButton
          color="error"
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
        >
          {t("deleteSelected", { count: ids.length })}
        </CmsButton>
      )}
      columns={columns}
      list={list}
      onRowClick={onEdit}
      searchPlaceholder={t("searchSkills")}
    />
  );
}

