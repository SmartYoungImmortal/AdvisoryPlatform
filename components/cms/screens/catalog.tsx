"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormDialog } from "@/components/cms/form-dialog";
import { CmsFormField, CmsSelect, CmsTextField } from "@/components/cms/fields";
import { useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusLabels } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  categoryUsage,
  deleteCategories,
  deleteSkills,
  saveCategory,
  saveSkill,
  slugify,
} from "@/lib/mock-db/actions";
import { formatDate, timeValue } from "@/lib/mock-db/format";
import { getDatabase, useDatabase } from "@/lib/mock-db/store";
import type { Category, PublishStatus, Skill } from "@/lib/mock-db/types";

type Tab = "categories" | "skills";

/**
 * "จัดการระบบ" — the taxonomy advisors file their services and skills under.
 * Small records, so they edit in a dialog rather than on a page of their own.
 */
export function CatalogScreen() {
  const t = useTranslations("cms.catalog");
  const categories = useDatabase((db) => db.categories);
  const skills = useDatabase((db) => db.skills);
  const [editingCategory, setEditingCategory] = useState<Category | "new" | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | "new" | null>(null);

  const tabs = [
    { value: "categories" as const, label: t("tab.categories"), count: categories.length },
    { value: "skills" as const, label: t("tab.skills"), count: skills.length },
  ];
  const tab = useQueryTab<Tab>(tabs);

  return (
    <CmsPage
      actions={
        <CmsButton
          className="h-9 px-4"
          color="action"
          icon={Plus}
          onClick={() => (tab === "categories" ? setEditingCategory("new") : setEditingSkill("new"))}
        >
          {tab === "categories" ? t("newCategory") : t("newSkill")}
        </CmsButton>
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      {tab === "categories" ? (
        <CategoryTable categories={categories} onEdit={setEditingCategory} />
      ) : (
        <SkillTable categories={categories} onEdit={setEditingSkill} skills={skills} />
      )}
      {editingCategory ? (
        <CategoryDialog category={editingCategory} onClose={() => setEditingCategory(null)} />
      ) : null}
      {editingSkill ? (
        <SkillDialog categories={categories} onClose={() => setEditingSkill(null)} skill={editingSkill} />
      ) : null}
    </CmsPage>
  );
}

function CategoryTable({
  categories,
  onEdit,
}: {
  readonly categories: readonly Category[];
  readonly onEdit: (category: Category) => void;
}) {
  const t = useTranslations("cms.catalog");
  const actorId = useActorId();
  const { confirm, toast } = useCmsFeedback();
  const services = useDatabase((db) => db.services);
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) counts.set(s.categoryId, (counts.get(s.categoryId) ?? 0) + 1);
    return counts;
  }, [services]);

  const list = useCmsList(categories, {
    prefix: "c_",
    searchText: (c) => `${c.name} ${c.slug}`,
    sortValue: (c, id) => {
      if (id === "services") return usage.get(c.id) ?? 0;
      if (id === "updatedAt") return timeValue(c.updatedAt);
      return c.name;
    },
  });

  async function remove(ids: readonly string[]) {
    const db = getDatabase();
    const used = ids.filter((id) => categoryUsage(db, id) > 0);
    const ok = await confirm({
      type: "danger",
      title: t("deleteTitle", { count: ids.length }),
      description:
        used.length > 0
          ? t("deleteGuard", {
              names: used.map((id) => db.categories.find((c) => c.id === id)?.name ?? id).join(", "),
            })
          : t("deleteBody"),
      confirmLabel: t("delete"),
    });
    if (!ok) return;
    const blocked = deleteCategories(ids, actorId);
    list.clearSelection();
    const removed = ids.length - blocked.length;
    if (removed > 0) toast({ title: t("deleted", { count: removed }) });
    if (blocked.length > 0) {
      toast({ color: "warning", title: t("blocked", { count: blocked.length }), description: t("blockedBody") });
    }
  }

  const columns: ReadonlyArray<CmsColumn<Category>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      cell: (c) => <span className="font-medium text-highlighted">{c.name}</span>,
    },
    { id: "slug", header: t("col.slug"), className: "font-latin", cell: (c) => c.slug },
    {
      id: "services",
      header: t("col.services"),
      sortable: true,
      className: "font-latin",
      cell: (c) => usage.get(c.id) ?? 0,
    },
    { id: "updatedAt", header: t("col.updatedAt"), sortable: true, cell: (c) => formatDate(c.updatedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (c) => <CmsStatus group="publish" value={c.status} />,
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
  categories,
  onEdit,
}: {
  readonly skills: readonly Skill[];
  readonly categories: readonly Category[];
  readonly onEdit: (skill: Skill) => void;
}) {
  const t = useTranslations("cms.catalog");
  const actorId = useActorId();
  const { confirm, toast } = useCmsFeedback();
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const list = useCmsList(skills, {
    prefix: "k_",
    searchText: (s) => `${s.name} ${categoryName.get(s.categoryId) ?? ""}`,
    sortValue: (s, id) => (id === "updatedAt" ? timeValue(s.updatedAt) : s.name),
    filters: [{ key: "category", test: (s, values) => values.includes(s.categoryId) }],
  });

  const columns: ReadonlyArray<CmsColumn<Skill>> = [
    {
      id: "name",
      header: t("col.name"),
      sortable: true,
      cell: (s) => <span className="font-medium text-highlighted">{s.name}</span>,
    },
    { id: "category", header: t("col.category"), cell: (s) => categoryName.get(s.categoryId) ?? "—" },
    { id: "updatedAt", header: t("col.updatedAt"), sortable: true, cell: (s) => formatDate(s.updatedAt) },
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
            deleteSkills(ids, actorId);
            list.clearSelection();
            toast({ title: t("deleted", { count: ids.length }) });
          }}
        >
          {t("deleteSelected", { count: ids.length })}
        </CmsButton>
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
      onRowClick={onEdit}
      searchPlaceholder={t("searchSkills")}
    />
  );
}

function CategoryDialog({
  category,
  onClose,
}: {
  readonly category: Category | "new";
  readonly onClose: () => void;
}) {
  const t = useTranslations("cms.catalog");
  const labels = useStatusLabels();
  const actorId = useActorId();
  const { toast } = useCmsFeedback();
  const statusId = useId();
  const existing = category === "new" ? null : category;
  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(existing !== null);
  const [status, setStatus] = useState<PublishStatus>(existing?.status ?? "published");
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
  const slugs = useDatabase((db) => db.categories);

  function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t("nameRequired");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) next.slug = t("slugInvalid");
    else if (slugs.some((c) => c.slug === slug && c.id !== existing?.id)) next.slug = t("slugTaken");
    setErrors(next);
    if (next.name || next.slug) return;
    saveCategory({ id: existing?.id, name: name.trim(), slug, status }, actorId);
    toast({ title: existing ? t("updatedCategory") : t("createdCategory") });
    onClose();
  }

  return (
    <CmsFormDialog
      onClose={onClose}
      onSubmit={submit}
      open
      submitLabel={existing ? t("save") : t("create")}
      title={existing ? t("editCategory") : t("newCategory")}
    >
      <CmsTextField
        autoFocus
        error={errors.name}
        label={t("col.name")}
        onChange={(event) => {
          setName(event.target.value);
          // Nexus's slug field follows the name until it is edited by hand.
          if (!slugTouched) setSlug(slugify(event.target.value));
        }}
        required
        value={name}
      />
      <CmsTextField
        className="font-latin"
        error={errors.slug}
        help={t("slugHelp")}
        label={t("col.slug")}
        onChange={(event) => {
          setSlugTouched(true);
          setSlug(event.target.value.toLowerCase());
        }}
        required
        value={slug}
      />
      <CmsFormField htmlFor={statusId} label={t("col.status")}>
        <CmsSelect
          id={statusId}
          items={[
            { value: "published", label: labels.publish.published },
            { value: "hidden", label: labels.publish.hidden },
          ]}
          onValueChange={setStatus}
          value={status}
        />
      </CmsFormField>
    </CmsFormDialog>
  );
}

function SkillDialog({
  skill,
  categories,
  onClose,
}: {
  readonly skill: Skill | "new";
  readonly categories: readonly Category[];
  readonly onClose: () => void;
}) {
  const t = useTranslations("cms.catalog");
  const actorId = useActorId();
  const { toast } = useCmsFeedback();
  const categoryId = useId();
  const existing = skill === "new" ? null : skill;
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.categoryId ?? categories[0]?.id ?? "");
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    saveSkill({ id: existing?.id, name: name.trim(), categoryId: category }, actorId);
    toast({ title: existing ? t("updatedSkill") : t("createdSkill") });
    onClose();
  }

  return (
    <CmsFormDialog
      onClose={onClose}
      onSubmit={submit}
      open
      submitLabel={existing ? t("save") : t("create")}
      title={existing ? t("editSkill") : t("newSkill")}
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
      <CmsFormField htmlFor={categoryId} label={t("col.category")} required>
        <CmsSelect
          id={categoryId}
          items={categories.map((c) => ({ value: c.id, label: c.name }))}
          onValueChange={setCategory}
          value={category}
        />
      </CmsFormField>
    </CmsFormDialog>
  );
}
