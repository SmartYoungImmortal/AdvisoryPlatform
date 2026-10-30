"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, IdCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
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
  documentUrl,
  getIdentityDocumentUrl,
  getIdentityVerification,
  listIdentityVerifications,
  listSkillProofs,
  rejectIdentityVerification,
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
            <CmsDataRow label={t("reason")}>{request.rejectionReason}</CmsDataRow>
          ) : null}
        </CmsDataList>
      </CmsSection>

      <CmsSection title={t("idCard")}>
        {document ? (
          <CmsDocument className="max-w-lg" name={t("idCard")} url={document} />
        ) : request.verificationStatus === "NONE" ? (
          <CmsEmpty className="rounded-2xl border border-border py-10" icon={IdCard} title={t("noDocument")} />
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

      <CmsSection title={t("skillCount", { count: proofItems.length })}>
        {proofItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
        ) : (
          <ul className="border-b border-border">
            {proofItems.map((proof) => (
              <li className="border-t border-border" key={proof.id}>
                <Link
                  className="-mx-3 flex items-center gap-3 rounded-xl px-3 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
                  href={`${BACK}/proof?id=${proof.id}`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <FileText aria-hidden className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{proof.skillName}</span>
                    <span className="truncate font-latin text-xs text-muted-foreground">
                      {proof.originalFileName}
                    </span>
                  </span>
                  <CmsStatus group="proof" value={proof.reviewStatus} />
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CmsSection>
    </CmsPage>
  );
}
