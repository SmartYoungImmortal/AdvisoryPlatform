"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, IdCard, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsEmpty, CmsSection } from "@/components/cms/card";
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
  approveIdentityVerification,
  approveSkillProof,
  documentUrl,
  getIdentityDocumentUrl,
  getIdentityVerification,
  getSkillProofDocumentUrl,
  listIdentityVerifications,
  listSkillProofs,
  rejectIdentityVerification,
  rejectSkillProof,
  type IdentityVerification,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";

/** The cache prefix both this detail view and its queue read under. */
const IDENTITY_KEY = ADMIN_KEYS.identity;
const BACK = "/admin/verification";

/**
 * One identity request, from `GET /api/v1/admin/identity-verifications/:advisorId`.
 *
 * ## The level picker is gone
 *
 * `POST .../approve` takes **no body**. There is no advisor level on the route, no
 * level column behind it and no other route that sets one, so approving verifies
 * the identity and nothing else. Restoring a level needs it on the approve DTO.
 *
 * ## The document
 *
 * The response no longer carries the storage key: the card is asked for from
 * `…/document-url`, which signs it for a few minutes (`CmsStoredDocument`).
 * When that fails — the object store down, nothing on file — the part says so
 * with the API's sentence rather than drawing a stock picture that is not this
 * applicant's. A key that does arrive and is a demo specimen under
 * `public/demo-docs/` is opened as it is (`documentUrl`).
 *
 * Also absent from the DTO, so absent here: full name, birth date, national id,
 * credential and field. The applicant is a display name and an email.
 */
export function VerificationReviewScreen() {
  const t = useTranslations("cms.verification");
  const id = useRecordId();

  const fetcher = useCallback(
    (signal: AbortSignal) => getIdentityVerification(id, signal),
    [id],
  );
  const request = useResource<IdentityVerification>(`${IDENTITY_KEY}/${id}`, fetcher);
  const frame = { backHref: BACK, backLabel: t("title"), title: t("reviewTitle") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (request.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={3} />
      </CmsPage>
    );
  }

  if (request.error || !request.data) {
    return (
      <CmsPage {...frame}>
        {request.error ? (
          <CmsApiError error={request.error} onRetry={request.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <Review key={request.data.advisorId} request={request.data} />;
}

function Review({ request }: { readonly request: IdentityVerification }) {
  const t = useTranslations("cms.verification");
  const tStatus = useTranslations("cms.status");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const name = accountName(request.advisorId) ?? request.displayName;
  const document = documentUrl(request.documentObjectKey);

  const queueFetcher = useCallback(
    (signal: AbortSignal) =>
      listIdentityVerifications({ status: "SUBMITTED", limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const proofsFetcher = useCallback(
    (signal: AbortSignal) =>
      listSkillProofs({ advisorId: request.advisorId, limit: ADMIN_MAX_LIMIT }, signal),
    [request.advisorId],
  );
  const queue = useResource<Paginated<IdentityVerification>>(
    `${IDENTITY_KEY}?status=SUBMITTED&limit=${ADMIN_MAX_LIMIT}`,
    queueFetcher,
  );
  const proofs = useResource<Paginated<SkillProof>>(
    `${ADMIN_KEYS.skillProofs}?advisorId=${request.advisorId}&limit=${ADMIN_MAX_LIMIT}`,
    proofsFetcher,
  );

  const waiting = useMemo(() => queue.data?.items ?? [], [queue.data]);
  const proofItems = useMemo(() => proofs.data?.items ?? [], [proofs.data]);
  const pending = request.verificationStatus === "SUBMITTED";

  /** After a decision, move on to the next request still waiting. */
  function advance() {
    const next = waiting.find((r) => r.advisorId !== request.advisorId);
    router.push(next ? `${BACK}/review?id=${next.advisorId}` : BACK);
  }

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveIdentityTitle", { count: 1 }),
      description: t("approveIdentityBody", { name }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: IDENTITY_KEY,
      run: [() => approveIdentityVerification(request.advisorId)],
      success: tStatus("identity.VERIFIED"),
    });
    if (result.ok) advance();
  }

  async function reject(note: string) {
    const result = await rule({
      keyPrefix: IDENTITY_KEY,
      run: [() => rejectIdentityVerification(request.advisorId, note)],
      success: t("rejected", { name }),
    });
    if (result.ok) advance();
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          info={[
            { label: t("submittedAt"), by: name, at: request.submittedAt },
            ...(request.verifiedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(request.verifiedByAdminId),
                    at: request.verifiedAt,
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
      backLabel={t("title")}
      badge={<CmsStatus group="identity" value={request.verificationStatus} />}
      title={name}
    >
      <CmsSection title={t("details")}>
        <CmsDataList>
          <CmsDataRow label={t("col.applicant")}>
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href={`/admin/users/edit?id=${request.advisorId}`}
            >
              {name}
            </Link>
          </CmsDataRow>
          <CmsDataRow label={t("col.email")}>
            <span className="font-latin">{request.email}</span>
          </CmsDataRow>
          {request.rejectionReason ? (
            <CmsDataRow label={t("reason")} wide>
              {request.rejectionReason}
            </CmsDataRow>
          ) : null}
        </CmsDataList>
      </CmsSection>

      <CmsSection title={t("idCard")}>
        {document ? (
          <CmsDocument className="max-w-lg" name={t("idCard")} url={document} />
        ) : request.verificationStatus === "NONE" ? (
          <CmsEmpty className="rounded-lg border border-border py-10" icon={IdCard} title={t("noDocument")} />
        ) : (
          // The key stays with the API, which signs the card for a few minutes.
          <CmsStoredDocument
            className="max-w-lg"
            emptyTitle={t("noDocument")}
            icon={IdCard}
            name={t("idCard")}
            read={(signal) => getIdentityDocumentUrl(request.advisorId, signal)}
            requestKey={`${IDENTITY_KEY}/${request.advisorId}/document-url`}
          />
        )}
      </CmsSection>

      {proofItems.length === 0 ? (
        <CmsSection title={t("skillCount", { count: 0 })}>
          <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
        </CmsSection>
      ) : (
        proofItems.map((proof) => <ProofCard advisor={name} key={proof.id} proof={proof} />)
      )}
    </CmsPage>
  );
}

/**
 * One skill document on the advisor's page, ruled on where it is read: the
 * skill and its status heading the card, the document under them, and while
 * it waits the two rulings at its foot. Not approving asks for the reason in
 * a dialog, which the advisor sees.
 */
function ProofCard({ proof, advisor }: { readonly proof: SkillProof; readonly advisor: string }) {
  const t = useTranslations("cms.verification");
  const { confirm, prompt } = useCmsFeedback();
  const rule = useRuling();
  const url = documentUrl(proof.objectKey);

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveProofTitle", { count: 1 }),
      description: t("approveProofBody", { skill: proof.skillName, name: advisor }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: ADMIN_KEYS.skillProofs,
      run: [() => approveSkillProof(proof.id)],
      success: t("approvedProof", { count: 1 }),
    });
  }

  async function reject() {
    const reason = await prompt({
      type: "danger",
      title: t("rejectProofTitle", { skill: proof.skillName }),
      description: t("reasonHelp"),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      confirmLabel: t("reject"),
    });
    if (reason === null) return;
    await rule({
      keyPrefix: ADMIN_KEYS.skillProofs,
      run: [() => rejectSkillProof(proof.id, reason)],
      success: t("rejectedProof", { count: 1 }),
    });
  }

  return (
    <CmsSection
      actions={<CmsStatus group="proof" value={proof.reviewStatus} />}
      description={
        <span className="inline-flex items-center gap-1.5 font-latin">
          <FileText aria-hidden className="size-3.5 shrink-0" />
          {proof.originalFileName}
        </span>
      }
      title={proof.skillName}
    >
      {url ? (
        <CmsDocument className="max-w-lg" name={proof.originalFileName} url={url} />
      ) : (
        // The key stays with the API, which signs the file for a few minutes.
        <CmsStoredDocument
          className="max-w-lg"
          emptyTitle={t("noDocument")}
          icon={FileText}
          name={proof.originalFileName}
          read={(signal) => getSkillProofDocumentUrl(proof.id, signal)}
          requestKey={`${ADMIN_KEYS.skillProofs}/${proof.id}/document-url`}
        />
      )}
      {proof.rejectionReason ? (
        <p className="mt-4 text-sm text-destructive">
          {t("reason")}: {proof.rejectionReason}
        </p>
      ) : null}
      {proof.reviewStatus === "PENDING" ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <CmsButton icon={Check} onClick={approve}>
            {t("approve")}
          </CmsButton>
          <CmsButton icon={X} onClick={reject} variant="danger-soft">
            {t("reject")}
          </CmsButton>
        </div>
      ) : null}
    </CmsSection>
  );
}
