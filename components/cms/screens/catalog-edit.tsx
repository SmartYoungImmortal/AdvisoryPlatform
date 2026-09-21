"use client";

import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsTextarea, CmsTextField } from "@/components/cms/fields";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  createCategory,
  createSkill,
  deleteCategory,
  deleteSkill,
  listAdminSkills,
  listCategories,
  updateCategory,
  updateSkill,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

export type TaxonomyKind = "categories" | "skills";

/** Everything that differs between the two collections, in one place. */
const KIND = {
  categories: {
    base: "/admin/manage",
    key: ADMIN_KEYS.categories,
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory,
  },
  skills: {
    base: "/admin/skills",
    key: ADMIN_KEYS.skills,
    list: listAdminSkills,
    create: createSkill,
    update: updateSkill,
    remove: deleteSkill,
  },
} as const;

/**
 * Nexus's `[id].vue` for a one-field collection (its `blog-keywords/[id].vue`):
 * a page, never a dialog. `?id=new` creates, any other id edits.
 *
 * The record is found in the list the table already read — there is no
 * `GET /service-categories/:id` worth a second request, and the list is cached
 * under the same key, so arriving from the table costs nothing.
 */
export function TaxonomyEditScreen({ kind }: { readonly kind: TaxonomyKind }) {
  const t = useTranslations("cms.catalog");
  const id = useRecordId();
  const spec = KIND[kind];
  const isNew = id === "new";
  const title = isNew
    ? t(kind === "categories" ? "newCategory" : "newSkill")
    : t(kind === "categories" ? "editCategory" : "editSkill");

  const fetcher = useCallback(
    (signal: AbortSignal) => spec.list({ limit: ADMIN_MAX_LIMIT }, signal),
    [spec],
  );
  const records = useResource<Paginated<TaxonomyRecord>>(
    `${spec.key}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const record = records.data?.items.find((r) => r.id === id);

  if (id === "") {
    return (
      <CmsPage backHref={spec.base} title={title}>
        <CmsMissing backHref={spec.base} />
      </CmsPage>
    );
  }

  if (!isNew && records.loading) {
    return (
      <CmsPage backHref={spec.base} title={title}>
        <CmsCardSkeleton rows={2} />
      </CmsPage>
    );
  }

  if (!isNew && (records.error || !record)) {
    return (
      <CmsPage backHref={spec.base} title={title}>
        {records.error ? (
          <CmsApiError error={records.error} onRetry={records.reload} />
        ) : (
          <CmsMissing backHref={spec.base} />
        )}
      </CmsPage>
    );
  }

  return (
    <TaxonomyForm key={record?.id ?? "new"} kind={kind} record={record ?? null} title={title} />
  );
}

function TaxonomyForm({
  kind,
  record,
  title,
}: {
  readonly kind: TaxonomyKind;
  readonly record: TaxonomyRecord | null;
  readonly title: string;
}) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const descriptionId = useId();
  const spec = KIND[kind];
  const [name, setName] = useState(record?.name ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("nameRequired"));
      return;
    }
    const input = { name: trimmed, description: description.trim() || undefined };
    setBusy(true);
    const result = await rule({
      keyPrefix: spec.key,
      run: [record ? () => spec.update(record.id, input) : () => spec.create(input)],
      success: record
        ? t(kind === "categories" ? "updatedCategory" : "updatedSkill")
        : t(kind === "categories" ? "createdCategory" : "createdSkill"),
    });
    setBusy(false);
    if (result.ok) router.push(spec.base);
  }

  async function remove() {
    if (!record) return;
    const ok = await confirm({
      type: "danger",
      title: t(kind === "categories" ? "deleteTitle" : "deleteSkillTitle", { count: 1 }),
      description: t(kind === "categories" ? "deleteBody" : "deleteSkillBody"),
      confirmLabel: t("delete"),
    });
    if (!ok) return;
    setBusy(true);
    const result = await rule({
      keyPrefix: spec.key,
      run: [() => spec.remove(record.id)],
      success: t("deleted", { count: 1 }),
    });
    setBusy(false);
    if (result.ok) router.push(spec.base);
  }

  return (
    <CmsPage backHref={spec.base} title={title}>
      {/* Nexus's page body: its own p-4, then a 4-column grid — the form card
          takes three, the options panel one. */}
      <section className="p-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-3">
            <CmsCard>
              <div className="flex flex-col gap-4">
                <CmsTextField
                  disabled={busy}
                  error={nameError}
                  label={t("col.name")}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError(undefined);
                  }}
                  required
                  value={name}
                />
                <CmsFormField htmlFor={descriptionId} label={t("description")}>
                  <CmsTextarea
                    disabled={busy}
                    id={descriptionId}
                    onChange={(event) => setDescription(event.target.value)}
                    value={description}
                  />
                </CmsFormField>
              </div>
            </CmsCard>
          </div>

          <CmsSidebarOptions
            actions={
              <>
                <CmsButton
                  block
                  color="action"
                  disabled={busy}
                  icon={Save}
                  loading={busy}
                  onClick={save}
                  size="lg"
                >
                  {record ? t("save") : t("create")}
                </CmsButton>
                {record ? (
                  <CmsButton
                    block
                    color="error"
                    disabled={busy}
                    icon={Trash2}
                    onClick={remove}
                    size="lg"
                  >
                    {t("delete")}
                  </CmsButton>
                ) : null}
              </>
            }
            info={
              record
                ? [
                    { label: t("createdAt"), at: record.createdAt },
                    { label: t("updatedAt"), at: record.modifiedAt },
                  ]
                : undefined
            }
          />
        </div>
      </section>
    </CmsPage>
  );
}
