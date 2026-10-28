"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsCard } from "@/components/cms/card";
import { CmsDocument } from "@/components/cms/document";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField } from "@/components/cms/fields";
import { RejectReasonField, RulingActions } from "@/components/cms/ruling";
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
  getSkillProofDocumentUrl,
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
 * The queue supplies the record; its document is read through the permission-
 * checked document-url route and refreshed before the signed URL expires.
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
  const fetchDocument = useCallback((signal: AbortSignal) => getSkillProofDocumentUrl(proof.id, signal), [proof.id]);
  const document = useResource(`admin/skill-proofs/${proof.id}/document-url:${reasonId}`, fetchDocument);
  const reloadDocument = document.reload;
  useEffect(() => {
    if (!document.data) return;
    const timer = window.setTimeout(reloadDocument, Math.max(1, document.data.expiresInSeconds - 30) * 1000);
    return () => window.clearTimeout(timer);
  }, [document.data, reloadDocument]);

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

              {document.error ? (
                <CmsApiError error={document.error} onRetry={document.reload} />
              ) : document.loading ? (
                <CmsCardSkeleton rows={1} />
              ) : document.data ? (
                <div className="mt-6 border-t border-border pt-6">
                  <CmsDocument name={proof.originalFileName} url={document.data.url} />
                </div>
              ) : null}

              {pending ? (
                <RejectReasonField
                  error={reasonError}
                  id={reasonId}
                  onChange={(value) => {
                    setReason(value);
                    setReasonError(undefined);
                  }}
                  value={reason}
                />
              ) : null}
            </CmsCard>
          </div>

          <CmsSidebarOptions
            actions={pending ? <RulingActions onApprove={approve} onReject={reject} /> : null}
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
