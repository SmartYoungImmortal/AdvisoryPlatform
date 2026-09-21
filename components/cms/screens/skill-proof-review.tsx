"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsTextarea } from "@/components/cms/fields";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsApiStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  approveSkillProof,
  documentUrl,
  listSkillProofs,
  rejectSkillProof,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

const PROOFS_KEY = ADMIN_KEYS.skillProofs;
const BACK = "/admin/skill-proofs";

/**
 * One skill-proof document — Nexus's record page: the document and its facts in
 * one card, the status, audit and ruling in the options panel.
 *
 * There is no `GET /admin/skill-proofs/:id`, so the row is found in the list the
 * table read (same key, no second request). The document is drawn when its key
 * is a URL (`documentUrl`); a real upload's storage key has no admin route that
 * presigns it, so the file is named instead of shown.
 */
export function SkillProofReviewScreen() {
  const t = useTranslations("cms.verification");
  const id = useRecordId();
  const fetcher = useCallback(
    (signal: AbortSignal) => listSkillProofs({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const proofs = useResource<Paginated<SkillProof>>(
    `${PROOFS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const proof = proofs.data?.items.find((p) => p.id === id);
  const title = t("tab.skills");

  if (id === "") {
    return (
      <CmsPage backHref={BACK} title={title}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (proofs.loading) {
    return (
      <CmsPage backHref={BACK} title={title}>
        <CmsCardSkeleton rows={4} />
      </CmsPage>
    );
  }

  if (proofs.error || !proof) {
    return (
      <CmsPage backHref={BACK} title={title}>
        {proofs.error ? (
          <CmsApiError error={proofs.error} onRetry={proofs.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <ProofRecord key={proof.id} proof={proof} title={title} />;
}

function ProofRecord({
  proof,
  title,
}: {
  readonly proof: SkillProof;
  readonly title: string;
}) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const pending = proof.reviewStatus === "PENDING";
  const advisor = accountName(proof.advisorId) ?? proof.advisorDisplayName;
  const url = documentUrl(proof.objectKey);

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveProofTitle", { count: 1 }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: PROOFS_KEY,
      run: [() => approveSkillProof(proof.id)],
      success: t("approvedProof", { count: 1 }),
    });
    if (result.ok) router.push(BACK);
  }

  async function reject() {
    const note = reason.trim();
    if (!note) {
      setReasonError(t("reasonRequired"));
      return;
    }
    const result = await rule({
      keyPrefix: PROOFS_KEY,
      run: [() => rejectSkillProof(proof.id, note)],
      success: t("rejectedProof", { count: 1 }),
      successColor: "warning",
    });
    if (result.ok) router.push(BACK);
  }

  return (
    <CmsPage backHref={BACK} title={title}>
      <section className="p-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-3">
            <CmsCard>
              <dl className="space-y-4">
                <CmsDataRow label={t("col.advisor")}>
                  <Link
                    className="text-action transition-colors hover:text-action/75"
                    href={`/admin/users/edit?id=${proof.advisorId}`}
                  >
                    {advisor}
                  </Link>
                </CmsDataRow>
                <CmsDataRow label={t("col.skill")}>{proof.skillName}</CmsDataRow>
                <CmsDataRow label={t("col.file")}>
                  <span className="flex items-center gap-2 font-latin font-normal">
                    <FileText aria-hidden className="size-4 shrink-0 text-dimmed" />
                    {proof.originalFileName}
                  </span>
                </CmsDataRow>
                {proof.rejectionReason ? (
                  <CmsDataRow label={t("reason")}>
                    <span className="font-normal text-foreground">{proof.rejectionReason}</span>
                  </CmsDataRow>
                ) : null}
              </dl>

              {url ? (
                <figure className="mt-6 border-t border-border pt-6">
                  <a
                    className="block w-full max-w-md overflow-hidden rounded-md ring-1 ring-border transition-opacity hover:opacity-90"
                    href={url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a remote document URL, drawn as-is. */}
                    <img
                      alt={proof.originalFileName}
                      className="block h-auto w-full"
                      loading="lazy"
                      src={url}
                    />
                  </a>
                  <figcaption className="mt-2">
                    <a
                      className="inline-flex items-center gap-1 text-sm font-medium text-action hover:text-action/75"
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden className="size-4" />
                      {t("openFile")}
                    </a>
                  </figcaption>
                </figure>
              ) : null}

              {pending ? (
                <div className="mt-6 border-t border-border pt-6">
                  <CmsFormField error={reasonError} htmlFor={reasonId} label={t("reason")}>
                    <CmsTextarea
                      id={reasonId}
                      invalid={Boolean(reasonError)}
                      onChange={(event) => {
                        setReason(event.target.value);
                        setReasonError(undefined);
                      }}
                      placeholder={t("rejectPlaceholder")}
                      value={reason}
                    />
                  </CmsFormField>
                </div>
              ) : null}
            </CmsCard>
          </div>

          <CmsSidebarOptions
            actions={
              pending ? (
                <>
                  <CmsButton block color="success" icon={Check} onClick={approve} size="lg">
                    {t("approve")}
                  </CmsButton>
                  <CmsButton block color="error" icon={X} onClick={reject} size="lg">
                    {t("reject")}
                  </CmsButton>
                </>
              ) : null
            }
            info={[
              { label: t("submittedAt"), by: advisor, at: proof.createdAt },
              ...(proof.reviewedAt
                ? [
                    {
                      label: t("decidedAt"),
                      by: accountName(proof.reviewedByAdminId) ?? undefined,
                      at: proof.reviewedAt,
                    },
                  ]
                : []),
            ]}
          >
            <CmsFormField label={t("col.status")}>
              <div>
                <CmsApiStatus group="proof" value={proof.reviewStatus} />
              </div>
            </CmsFormField>
          </CmsSidebarOptions>
        </div>
      </section>
    </CmsPage>
  );
}
