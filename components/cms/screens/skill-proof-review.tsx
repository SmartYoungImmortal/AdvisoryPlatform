"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsSection } from "@/components/cms/card";
import { CmsDocument, CmsStoredDocument } from "@/components/cms/document";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { RulingDecision } from "@/components/cms/ruling";
import {
  CmsDataList,
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  approveSkillProof,
  documentUrl,
  getSkillProofDocumentUrl,
  listSkillProofs,
  rejectSkillProof,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

const PROOFS_KEY = ADMIN_KEYS.skillProofs;
const BACK = "/admin/verification?tab=skills";

/**
 * One skill document, on the verification desk's second tab: the document and
 * its facts in the page, the timeline and the ruling in the column beside it.
 *
 * The row is found in the list the table read (same key, no second request).
 * The document comes from `…/document-url`, signed for a few minutes, and is
 * shown as a PDF in the browser's viewer or an image as itself; when it cannot
 * be had, the part says why in the API's words.
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
  const frame = { backHref: BACK, backLabel: t("tab.skills"), title: t("proofTitle") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (proofs.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (proofs.error || !proof) {
    return (
      <CmsPage {...frame}>
        {proofs.error ? (
          <CmsApiError error={proofs.error} onRetry={proofs.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <ProofRecord key={proof.id} proof={proof} />;
}

function ProofRecord({ proof }: { readonly proof: SkillProof }) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const pending = proof.reviewStatus === "PENDING";
  const advisor = accountName(proof.advisorId) ?? proof.advisorDisplayName;
  const url = documentUrl(proof.objectKey);

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveProofTitle", { count: 1 }),
      description: t("approveProofBody", { skill: proof.skillName, name: advisor }),
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

  async function reject(note: string) {
    const result = await rule({
      keyPrefix: PROOFS_KEY,
      run: [() => rejectSkillProof(proof.id, note)],
      success: t("rejectedProof", { count: 1 }),
    });
    if (result.ok) router.push(BACK);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          info={[
            { label: t("submittedAt"), by: advisor, at: proof.createdAt },
            ...(proof.reviewedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(proof.reviewedByAdminId),
                    at: proof.reviewedAt,
                  },
                ]
              : []),
          ]}
        >
          {pending ? (
            <RulingDecision
              approveLabel={t("approve")}
              onApprove={approve}
              onReject={reject}
              reasonHelp={t("reasonHelp")}
              reasonLabel={t("reason")}
              reasonPlaceholder={t("rejectPlaceholder")}
              reasonRequired={t("reasonRequired")}
              rejectLabel={t("reject")}
            />
          ) : undefined}
        </CmsSidebarOptions>
      }
      backHref={BACK}
      backLabel={t("tab.skills")}
      badge={<CmsStatus group="proof" value={proof.reviewStatus} />}
      title={proof.skillName}
    >
      <CmsSection title={t("details")}>
        <CmsDataList>
          <CmsDataRow label={t("col.advisor")}>
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href={`/admin/users/edit?id=${proof.advisorId}`}
            >
              {advisor}
            </Link>
          </CmsDataRow>
          <CmsDataRow label={t("col.skill")}>{proof.skillName}</CmsDataRow>
          <CmsDataRow label={t("col.file")}>
            <span className="inline-flex items-center gap-2 font-latin">
              <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              {proof.originalFileName}
            </span>
          </CmsDataRow>
          {proof.rejectionReason ? (
            <CmsDataRow label={t("reason")}>{proof.rejectionReason}</CmsDataRow>
          ) : null}
        </CmsDataList>
      </CmsSection>

      <CmsSection title={t("document")}>
        {url ? (
          <CmsDocument name={proof.originalFileName} url={url} />
        ) : (
          // The key stays with the API, which signs the file for a few minutes.
          <CmsStoredDocument
            emptyTitle={t("noDocument")}
            icon={FileText}
            name={proof.originalFileName}
            read={(signal) => getSkillProofDocumentUrl(proof.id, signal)}
            requestKey={`${PROOFS_KEY}/${proof.id}/document-url`}
          />
        )}
      </CmsSection>
    </CmsPage>
  );
}
