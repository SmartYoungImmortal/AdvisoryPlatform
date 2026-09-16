"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsLinkButton } from "@/components/cms/fields";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatDate, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Category, Skill } from "@/lib/mock-db/types";

type Tab = "categories" | "skills";

export type CatalogKind = "category" | "skill";

/** Where a catalogue record is edited — `id` left out opens the create form. */
export function catalogEditHref(kind: CatalogKind, id?: string): string {
  return id ? `/admin/manage/edit?kind=${kind}&id=${id}` : `/admin/manage/edit?kind=${kind}`;
}

/**
 * "จัดการระบบ" — the taxonomy advisors file their services and skills under.
 * As in Nexus, "Create new" sits in the header and every record opens its own
 * edit page.
 */
export function CatalogScreen() {
  const t = useTranslations("cms.catalog");
  const categories = useDatabase((db) => db.categories);
  const skills = useDatabase((db) => db.skills);

  const tabs = [
    { value: "categories" as const, label: t("tab.categories") },
    { value: "skills" as const, label: t("tab.skills") },
  ];
  const tab = useQueryTab<Tab>(tabs);

  return (
    <CmsPage
      actions={
        <CmsLinkButton
          className="h-9 px-4"
          color="action"
          href={catalogEditHref(tab === "categories" ? "category" : "skill")}
        >
          {tab === "categories" ? t("newCategory") : t("newSkill")}
        </CmsLinkButton>
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      {tab === "categories" ? (
        <CategoryTable categories={categories} />
      ) : (
        <SkillTable categories={categories} skills={skills} />
      )}
    </CmsPage>
  );
}

function CategoryTable({ categories }: { readonly categories: readonly Category[] }) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
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

  const columns: ReadonlyArray<CmsColumn<Category>> = [
    { id: "name", header: t("col.name"), sortable: true, render: (c) => c.name },
    { id: "slug", header: t("col.slug"), className: "font-latin", render: (c) => c.slug },
    {
      id: "services",
      header: t("col.services"),
      sortable: true,
      className: "font-latin",
      render: (c) => usage.get(c.id) ?? 0,
    },
    { id: "updatedAt", header: t("col.updatedAt"), sortable: true, render: (c) => formatDate(c.updatedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (c) => <CmsStatus group="publish" value={c.status} />,
    },
  ];

  return (
    <CmsTable
      columns={columns}
      list={list}
      onRowClick={(c) => router.push(catalogEditHref("category", c.id))}
      searchPlaceholder={t("searchCategories")}
      selectable={false}
    />
  );
}

function SkillTable({
  skills,
  categories,
}: {
  readonly skills: readonly Skill[];
  readonly categories: readonly Category[];
}) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const list = useCmsList(skills, {
    prefix: "k_",
    searchText: (s) => `${s.name} ${categoryName.get(s.categoryId) ?? ""}`,
    sortValue: (s, id) => (id === "updatedAt" ? timeValue(s.updatedAt) : s.name),
    filters: [{ key: "category", test: (s, values) => values.includes(s.categoryId) }],
  });

  const columns: ReadonlyArray<CmsColumn<Skill>> = [
    { id: "name", header: t("col.name"), sortable: true, render: (s) => s.name },
    { id: "category", header: t("col.category"), render: (s) => categoryName.get(s.categoryId) ?? "—" },
    { id: "updatedAt", header: t("col.updatedAt"), sortable: true, render: (s) => formatDate(s.updatedAt) },
  ];

  return (
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
      onRowClick={(s) => router.push(catalogEditHref("skill", s.id))}
      searchPlaceholder={t("searchSkills")}
      selectable={false}
    />
  );
}
