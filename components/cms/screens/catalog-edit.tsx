"use client";

import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState, type FormEvent } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsSection } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsTextarea, CmsTextField } from "@/components/cms/fields";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
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

/** Everything that differs between the two lists, in one place. */
const KIND = {
  categories: {
    back: "/admin/manage",
    key: ADMIN_KEYS.categories,
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory,
  },
  skills: {
    back: "/admin/manage?tab=skills",
    key: ADMIN_KEYS.skills,
    list: listAdminSkills,
    create: createSkill,
    update: updateSkill,
    remove: deleteSkill,
  },
} as const;

/**
 * A category or a skill on a page of its own: `?id=new` creates, any other id
 * edits. The two fields sit on the panel with the save and the delete in the
 * column beside them.
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
  const backLabel = t(kind === "categories" ? "tab.categories" : "tab.skills");

  const fetcher = useCallback(
    (signal: AbortSignal) => spec.list({ limit: ADMIN_MAX_LIMIT }, signal),
    [spec],
  );
  const records = useResource<Paginated<TaxonomyRecord>>(
    `${spec.key}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const record = records.data?.items.find((r) => r.id === id);
  const frame = { backHref: spec.back, backLabel, title };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={spec.back} />
      </CmsPage>
    );
  }

  if (!isNew && records.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={2} />
      </CmsPage>
    );
  }

  if (!isNew && (records.error || !record)) {
    return (
      <CmsPage {...frame}>
        {records.error ? (
          <CmsApiError error={records.error} onRetry={records.reload} />
        ) : (
          <CmsMissing backHref={spec.back} />
        )}
      </CmsPage>
    );
  }

  return (
    <TaxonomyForm
      backLabel={backLabel}
      key={record?.id ?? "new"}
      kind={kind}
      record={record ?? null}
      title={title}
    />
  );
}

function TaxonomyForm({
  kind,
  record,
  title,
  backLabel,
}: {
  readonly kind: TaxonomyKind;
  readonly record: TaxonomyRecord | null;
  readonly title: string;
  readonly backLabel: string;
}) {
  const t = useTranslations("cms.catalog");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const formId = useId();
  const descriptionId = useId();
  const spec = KIND[kind];
  const [name, setName] = useState(record?.name ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    if (result.ok) router.push(spec.back);
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
    if (result.ok) router.push(spec.back);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <>
              {/* The form's own submit, so Enter in the name saves too. */}
              <CmsButton
                block
                disabled={busy}
                form={formId}
                icon={Save}
                loading={busy}
                size="lg"
                type="submit"
              >
                {record ? t("save") : t("create")}
              </CmsButton>
              {record ? (
                <CmsButton
                  block
                  disabled={busy}
                  icon={Trash2}
                  onClick={remove}
                  size="lg"
                  variant="danger-soft"
                >
                  {t("delete")}
                </CmsButton>
              ) : null}
            </>
          }
          info={
            record
              ? [
                  {
                    label: t("createdAt"),
                    by: accountName(record.createdByUserId),
                    at: record.createdAt,
                  },
                  {
                    label: t("updatedAt"),
                    by: accountName(record.updatedByUserId),
                    at: record.modifiedAt,
                  },
                ]
              : undefined
          }
        />
      }
      backHref={spec.back}
      backLabel={backLabel}
      title={title}
    >
      <CmsSection>
        <form
          className="flex max-w-2xl flex-col gap-5"
          id={formId}
          noValidate
          onSubmit={(event) => void save(event)}
        >
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
              rows={4}
              value={description}
            />
          </CmsFormField>
        </form>
      </CmsSection>
    </CmsPage>
  );
}
