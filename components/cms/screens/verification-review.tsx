"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useMemo, useState } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { CmsDocument } from "@/components/cms/document";
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
  approveIdentityVerification,
  documentUrl,
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

/**
 * One identity request, from `GET /api/v1/admin/identity-verifications/:advisorId`.
 *
 * ## The level picker is gone
 *
 * `POST .../approve` takes **no body**. There is no advisor level on the route, no
 * level column behind it and no other route that sets one, so the three-way level
 * choice from Figma 1952:36339 cannot be honoured: approving verifies the identity
 * and nothing else. Restoring it needs the level on the approve DTO.
 *
 * ## The document
 *
 * `documentObjectKey` is a SeaweedFS object key for a real upload, and no admin
 * route presigns it, so that card says no document can be shown rather than
 * drawing a stock picture that is not this applicant's. The demo seed's keys are
 * specimen cards under `public/demo-docs/`, which `documentUrl` opens.
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

  if (id === "") {
    return (
      <CmsPage backHref="/admin/verification" title={t("reviewTitle")}>
        <CmsMissing backHref="/admin/verification" />
      </CmsPage>
    );
  }

  if (request.loading) {
    return (
      <CmsPage backHref="/admin/verification" title={t("reviewTitle")}>
        <CmsCardSkeleton rows={4} />
      </CmsPage>
    );
  }

  if (request.error || !request.data) {
    return (
      <CmsPage backHref="/admin/verification" title={t("reviewTitle")}>
        {request.error ? (
          <CmsApiError error={request.error} onRetry={request.reload} />
        ) : (
          <CmsMissing backHref="/admin/verification" />
        )}
      </CmsPage>
    );
  }

  return <Review key={request.data.advisorId} request={request.data} />;
}

function Review({ request }: { readonly request: IdentityVerification }) {
  const t = useTranslations("cms.verification");
  const tUsers = useTranslations("cms.users");
  const tStatus = useTranslations("cms.status");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
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
    `admin/skill-proofs?advisorId=${request.advisorId}&limit=${ADMIN_MAX_LIMIT}`,
    proofsFetcher,
  );

  const waiting = useMemo(() => queue.data?.items ?? [], [queue.data]);
  const proofItems = useMemo(() => proofs.data?.items ?? [], [proofs.data]);
  const pending = request.verificationStatus === "SUBMITTED";

  /** After a decision, move on to the next request still waiting. */
  function advance() {
    const next = waiting.find((r) => r.advisorId !== request.advisorId);
    router.push(
      next
        ? `/admin/verification/review?id=${next.advisorId}`
        : "/admin/verification",
    );
  }

  async function approve() {
    // `cms.verification.approveTitle` and `approveBody` both name an advisor
    // level, which this route cannot set, so neither is usable here. The plain
    // verb and the resulting status are the honest copy until
    // `cms.verification.approveIdentityTitle` exists — see the report.
    const ok = await confirm({
      type: "success",
      title: t("approve"),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: IDENTITY_KEY,
      run: [() => approveIdentityVerification(request.advisorId)],
      success: tStatus("identity.verified"),
    });
    if (result.ok) advance();
  }

  async function reject() {
    const note = reason.trim();
    if (!note) {
      setReasonError(t("reasonRequired"));
      return;
    }
    const result = await rule({
      keyPrefix: IDENTITY_KEY,
      run: [() => rejectIdentityVerification(request.advisorId, note)],
      success: t("rejected", { name }),
      successColor: "warning",
    });
    if (result.ok) advance();
  }

  // Nexus's record page: one card of facts and evidence, the status, audit and
  // ruling in the options panel. The rejection reason is a field on the card.
  return (
    <CmsPage
      aside={
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
            { label: t("submittedAt"), by: name, at: request.submittedAt },
            ...(request.verifiedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(request.verifiedByAdminId) ?? undefined,
                    at: request.verifiedAt,
                  },
                ]
              : []),
          ]}
        >
          <CmsFormField label={t("col.status")}>
            <div>
              <CmsApiStatus group="identity" value={request.verificationStatus} />
            </div>
          </CmsFormField>
        </CmsSidebarOptions>
      }
      backHref="/admin/verification"
      title={t("reviewTitle")}
    >
      <CmsCard>
        <dl className="space-y-4">
          <CmsDataRow label={t("col.applicant")}>
            <Link
              className="text-action transition-colors hover:text-action/75"
              href={`/admin/users/edit?id=${request.advisorId}`}
            >
              {name}
            </Link>
          </CmsDataRow>
          <CmsDataRow label={tUsers("col.email")}>
            <span className="font-latin">{request.email}</span>
          </CmsDataRow>
          {request.rejectionReason ? (
            <CmsDataRow label={t("reason")}>
              <span className="font-normal text-foreground">{request.rejectionReason}</span>
            </CmsDataRow>
          ) : null}
        </dl>

        <section className="mt-6 border-t border-border pt-6">
          <h2 className="mb-4 text-sm font-semibold text-highlighted">{t("idCard")}</h2>
          {document ? (
            <CmsDocument className="max-w-lg" name={t("idCard")} url={document} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("noDocument")}</p>
          )}
        </section>

        <section className="mt-6 border-t border-border pt-6">
          <h2 className="mb-4 text-sm font-semibold text-highlighted">
            {t("skillCount", { count: proofItems.length })}
          </h2>
          {proofItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSkills")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md ring-1 ring-border">
              {proofItems.map((proof) => (
                <li key={proof.id}>
                  <Link
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    href={`/admin/skill-proofs/review?id=${proof.id}`}
                  >
                    <FileText aria-hidden className="size-5 shrink-0 text-dimmed" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-highlighted">
                        {proof.skillName}
                      </span>
                      <span className="truncate font-latin text-xs text-muted-foreground">
                        {proof.originalFileName}
                      </span>
                    </span>
                    <CmsApiStatus group="proof" value={proof.reviewStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

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
    </CmsPage>
  );
}
