"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormDialog } from "@/components/cms/form-dialog";
import { CmsTextField } from "@/components/cms/fields";
import { CmsPage } from "@/components/cms/layout";
import { CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  createCategory,
  createSkill,
  deleteCategory,
  deleteSkill,
  listAdminServices,
  listAdminSkills,
  listCategories,
  updateCategory,
  updateSkill,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatDate, timeValue } from "@/lib/mock-db/format";

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
 * `description` is shown under the name because the API carries it, but is not
 * editable here — a field needs a label, and `cms.catalog` has none for it. `PATCH`
 * is partial, so saving a name leaves any existing description alone rather than
 * clearing it. The report names the copy key that would let this edit it.
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
  const [editingCategory, setEditingCategory] = useState<TaxonomyRecord | "new" | null>(
    null,
  );
  const [editingSkill, setEditingSkill] = useState<TaxonomyRecord | "new" | null>(null);

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
          onClick={() =>
            tab === "categories" ? setEditingCategory("new") : setEditingSkill("new")
          }
        >
          {tab === "categories" ? t("newCategory") : t("newSkill")}
        </CmsButton>
      }
      title={t(`tab.${tab}`)}
    >
      {active.loading ? (
        <CmsTableSkeleton columns={tab === "categories" ? 4 : 2} />
      ) : active.error ? (
        <CmsApiError error={active.error} onRetry={active.reload} />
      ) : tab === "categories" ? (
        <CategoryTable
          categories={categoryItems}
          onEdit={setEditingCategory}
          usage={usage}
        />
      ) : (
        <SkillTable onEdit={setEditingSkill} skills={skillItems} />
      )}
      {editingCategory ? (
        <TaxonomyDialog
          keyPrefix={CATEGORIES_KEY}
          onClose={() => setEditingCategory(null)}
          onCreate={(input) => createCategory(input)}
          onUpdate={(id, input) => updateCategory(id, input)}
          record={editingCategory}
          successCreated={t("createdCategory")}
          successUpdated={t("updatedCategory")}
          title={editingCategory === "new" ? t("newCategory") : t("editCategory")}
        />
      ) : null}
      {editingSkill ? (
        <TaxonomyDialog
          keyPrefix={SKILLS_KEY}
          onClose={() => setEditingSkill(null)}
          onCreate={(input) => createSkill(input)}
          onUpdate={(id, input) => updateSkill(id, input)}
          record={editingSkill}
          successCreated={t("createdSkill")}
          successUpdated={t("updatedSkill")}
          title={editingSkill === "new" ? t("newSkill") : t("editSkill")}
        />
      ) : null}
    </CmsPage>
  );
}

function NameCell({ record }: { readonly record: TaxonomyRecord }) {
  return (
    <span className="flex max-w-96 min-w-0 flex-col">
      <span className="truncate font-medium text-highlighted">{record.name}</span>
      {record.description ? (
        <span className="truncate text-xs">{record.description}</span>
      ) : null}
    </span>
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
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      render: (c) => <NameCell record={c} />,
    },
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
      render: (c) => formatDate(c.modifiedAt),
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
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const list = useCmsList(skills, {
    prefix: "k_",
    searchText: (s) => `${s.name} ${s.description ?? ""}`,
    sortValue: (s, id) => (id === "updatedAt" ? timeValue(s.modifiedAt) : s.name),
  });

  const columns: ReadonlyArray<CmsColumn<TaxonomyRecord>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      render: (s) => <NameCell record={s} />,
    },
    {
      id: "updatedAt",
      header: t("col.updatedAt"),
      sortable: true,
      render: (s) => formatDate(s.modifiedAt),
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

/**
 * One name, created or renamed.
 *
 * The same dialog for both resources because the two DTOs are identical, and
 * `name` is the only field either one accepts that the console has copy for. The
 * API caps it at 100 characters and rejects an empty one; the length is left to the
 * API so there is one rule rather than two that can drift.
 */
function TaxonomyDialog({
  record,
  title,
  keyPrefix,
  successCreated,
  successUpdated,
  onCreate,
  onUpdate,
  onClose,
}: {
  readonly record: TaxonomyRecord | "new";
  readonly title: string;
  readonly keyPrefix: string;
  readonly successCreated: string;
  readonly successUpdated: string;
  readonly onCreate: (input: { readonly name: string }) => Promise<unknown>;
  readonly onUpdate: (id: string, input: { readonly name: string }) => Promise<unknown>;
  readonly onClose: () => void;
}) {
  const t = useTranslations("cms.catalog");
  const rule = useRuling();
  const existing = record === "new" ? null : record;
  const [name, setName] = useState(existing?.name ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    const result = await rule({
      keyPrefix,
      run: [
        existing
          ? () => onUpdate(existing.id, { name: trimmed })
          : () => onCreate({ name: trimmed }),
      ],
      success: existing ? successUpdated : successCreated,
    });
    setSaving(false);
    // A refusal keeps the dialog open with what was typed still in it; the reason
    // is already in a toast.
    if (result.ok) onClose();
  }

  return (
    <CmsFormDialog
      onClose={onClose}
      onSubmit={submit}
      open
      submitLabel={existing ? t("save") : t("create")}
      submitting={saving}
      title={title}
    >
      <CmsTextField
        autoFocus
        error={error}
        label={t("col.name")}
        onChange={(event) => {
          setName(event.target.value);
          setError(undefined);
        }}
        required
        value={name}
      />
    </CmsFormDialog>
  );
}
