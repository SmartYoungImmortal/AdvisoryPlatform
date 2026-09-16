"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsSelect, CmsTextField } from "@/components/cms/fields";
import { useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import type { CatalogKind } from "@/components/cms/screens/catalog";
import { CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { useStatusLabels } from "@/components/cms/status";
import {
  categoryUsage,
  deleteCategories,
  deleteSkills,
  saveCategory,
  saveSkill,
  slugify,
} from "@/lib/mock-db/actions";
import { getDatabase, useDatabase } from "@/lib/mock-db/store";
import type { Category, PublishStatus, Skill } from "@/lib/mock-db/types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function listHref(kind: CatalogKind): string {
  return kind === "category" ? "/admin/manage" : "/admin/manage?tab=skills";
}

/**
 * The `[id]` page for the console's taxonomy: `?kind=` picks category or skill,
 * `?id=` the record, and no id means a new one.
 */
export function CatalogEditScreen() {
  const t = useTranslations("cms.catalog");
  const kind: CatalogKind = useSearchParams().get("kind") === "skill" ? "skill" : "category";
  const id = useRecordId();
  const category = useDatabase((db) => db.categories.find((c) => c.id === id));
  const skill = useDatabase((db) => db.skills.find((s) => s.id === id));

  if (kind === "category") {
    if (id && !category) {
      return (
        <CmsPage backHref={listHref(kind)} title={t("editCategory")}>
          <CmsMissing backHref={listHref(kind)} />
        </CmsPage>
      );
    }
    return <CategoryEditor category={category ?? null} key={category?.updatedAt ?? "new"} />;
  }
  if (id && !skill) {
    return (
      <CmsPage backHref={listHref(kind)} title={t("editSkill")}>
        <CmsMissing backHref={listHref(kind)} />
      </CmsPage>
    );
  }
  return <SkillEditor key={skill?.updatedAt ?? "new"} skill={skill ?? null} />;
}

function CategoryEditor({ category }: { readonly category: Category | null }) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  const labels = useStatusLabels();
  const actorId = useActorId();
  const { toast } = useCmsFeedback();
  const statusId = useId();
  const slugs = useDatabase((db) => db.categories);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(category !== null);
  const [status, setStatus] = useState<PublishStatus>(category?.status ?? "published");
  const [errors, setErrors] = useState<{ name?: string; slug?: string; remove?: string }>({});

  function save() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t("nameRequired");
    if (!SLUG.test(slug)) next.slug = t("slugInvalid");
    else if (slugs.some((c) => c.slug === slug && c.id !== category?.id)) next.slug = t("slugTaken");
    setErrors(next);
    if (next.name || next.slug) return;
    saveCategory({ id: category?.id, name: name.trim(), slug, status }, actorId);
    toast({ title: category ? t("updatedCategory") : t("createdCategory") });
    router.push(listHref("category"));
  }

  function remove() {
    if (!category) return;
    // Nexus's strict guard, shown in place: a category services still use stays.
    if (categoryUsage(getDatabase(), category.id) > 0) {
      setErrors({ ...errors, remove: t("blockedBody") });
      return;
    }
    deleteCategories([category.id], actorId);
    toast({ title: t("deleted", { count: 1 }) });
    router.push(listHref("category"));
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <>
              <CmsButton block color="action" icon={Save} onClick={save} size="lg">
                {category ? t("save") : t("create")}
              </CmsButton>
              {category ? (
                <CmsButton block color="error" icon={Trash2} onClick={remove} size="lg">
                  {t("delete")}
                </CmsButton>
              ) : null}
              {errors.remove ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.remove}
                </p>
              ) : null}
            </>
          }
          info={
            category
              ? [
                  { label: t("created"), at: category.createdAt },
                  { label: t("col.updatedAt"), at: category.updatedAt },
                ]
              : undefined
          }
        >
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
        </CmsSidebarOptions>
      }
      backHref={listHref("category")}
      title={category ? category.name : t("newCategory")}
    >
      <CmsCard>
        <div className="grid gap-4">
          <CmsTextField
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
        </div>
      </CmsCard>
    </CmsPage>
  );
}

function SkillEditor({ skill }: { readonly skill: Skill | null }) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  const actorId = useActorId();
  const { toast } = useCmsFeedback();
  const categoryId = useId();
  const categories = useDatabase((db) => db.categories);
  const [name, setName] = useState(skill?.name ?? "");
  const [category, setCategory] = useState(skill?.categoryId ?? categories[0]?.id ?? "");
  const [error, setError] = useState<string | undefined>();

  function save() {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    saveSkill({ id: skill?.id, name: name.trim(), categoryId: category }, actorId);
    toast({ title: skill ? t("updatedSkill") : t("createdSkill") });
    router.push(listHref("skill"));
  }

  function remove() {
    if (!skill) return;
    deleteSkills([skill.id], actorId);
    toast({ title: t("deleted", { count: 1 }) });
    router.push(listHref("skill"));
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <>
              <CmsButton block color="action" icon={Save} onClick={save} size="lg">
                {skill ? t("save") : t("create")}
              </CmsButton>
              {skill ? (
                <CmsButton block color="error" icon={Trash2} onClick={remove} size="lg">
                  {t("delete")}
                </CmsButton>
              ) : null}
            </>
          }
          info={
            skill
              ? [
                  { label: t("created"), at: skill.createdAt },
                  { label: t("col.updatedAt"), at: skill.updatedAt },
                ]
              : undefined
          }
        />
      }
      backHref={listHref("skill")}
      title={skill ? skill.name : t("newSkill")}
    >
      <CmsCard>
        <div className="grid gap-4">
          <CmsTextField
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
        </div>
      </CmsCard>
    </CmsPage>
  );
}
