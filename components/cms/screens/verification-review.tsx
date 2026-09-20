"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
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
  getIdentityVerification,
  listIdentityVerifications,
  listSkillProofs,
  rejectIdentityVerification,
  type IdentityVerification,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatDateTime } from "@/lib/mock-db/format";
import { cn } from "@/lib/utils";

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
 * ## The document is named, not shown
 *
 * `documentObjectKey` is a SeaweedFS object key. No admin route presigns it, so
 * there is no URL to put in an `<img>`, and the card states the key rather than
 * rendering a stock national-id picture that is not this applicant's document. The
 * same is true of every skill proof's `objectKey`.
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
  const tStatus = useTranslations("cms.status");
  const router = useRouter();
  const { confirm, prompt } = useCmsFeedback();
  const rule = useRuling();

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
    const note = await prompt({
      type: "danger",
      title: t("rejectTitle", { name: request.displayName }),
      description: t("rejectBody"),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      confirmLabel: t("reject"),
    });
    if (note === null) return;
    const result = await rule({
      keyPrefix: IDENTITY_KEY,
      run: [() => rejectIdentityVerification(request.advisorId, note)],
      success: t("rejected", { name: request.displayName }),
      successColor: "warning",
    });
    if (result.ok) advance();
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            pending ? (
              <>
                <CmsButton block color="action" icon={Check} onClick={approve} size="lg">
                  {t("approve")}
                </CmsButton>
                <CmsButton block color="error" icon={X} onClick={reject} size="lg">
                  {t("reject")}
                </CmsButton>
              </>
            ) : null
          }
          info={[
            { label: t("submittedAt"), at: request.submittedAt },
            ...(request.verifiedAt
              ? [{ label: t("decidedAt"), at: request.verifiedAt }]
              : []),
          ]}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-highlighted">{t("queueTitle")}</span>
            <span className="font-latin text-muted-foreground">{waiting.length}</span>
          </div>
          <ul className="-mx-2 flex flex-col">
            {waiting.length === 0 ? (
              <li className="px-2 text-sm text-muted-foreground">{t("queueEmpty")}</li>
            ) : (
              waiting.slice(0, 8).map((item) => (
                <li key={item.advisorId}>
                  <Link
                    aria-current={item.advisorId === request.advisorId ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50",
                      item.advisorId === request.advisorId && "bg-muted text-highlighted",
                    )}
                    href={`/admin/verification/review?id=${item.advisorId}`}
                  >
                    <CmsAvatar account={{ name: item.displayName }} size="sm" />
                    <span className="truncate">{item.displayName}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CmsSidebarOptions>
      }
      backHref="/admin/verification"
      badge={<CmsApiStatus group="identity" value={request.verificationStatus} />}
      title={t("reviewTitle")}
    >
      <CmsCard title={t("details")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("account")}>
            <Link
              className="text-action hover:text-action/75"
              href={`/admin/users/edit?id=${request.advisorId}`}
            >
              {request.displayName} · <span className="font-latin">{request.email}</span>
            </Link>
          </CmsDataRow>
          {request.rejectionReason ? (
            <CmsDataRow label={t("decisionNote")}>{request.rejectionReason}</CmsDataRow>
          ) : null}
        </dl>
      </CmsCard>

      <CmsCard title={t("documents")}>
        {/* A storage key, not a URL. Nothing here can open it, so it is stated. */}
        {request.documentObjectKey ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText aria-hidden className="size-4 shrink-0 text-dimmed" />
            <span className="font-latin break-all">{request.documentObjectKey}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("fromDocument")}</p>
        )}
      </CmsCard>

      <CmsCard
        actions={
          <span className="text-sm text-muted-foreground">
            {t("skillCount", { count: proofItems.length })}
          </span>
        }
        bodyClassName="p-0 sm:p-0"
        title={t("skills")}
      >
        <ul className="divide-y divide-border">
          {proofItems.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noSkills")}</li>
          ) : (
            proofItems.map((proof) => (
              <li className="flex items-center gap-4 p-4 sm:px-6" key={proof.id}>
                <FileText aria-hidden className="size-5 shrink-0 text-dimmed" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-highlighted">
                    {proof.skillName}
                  </span>
                  <span className="truncate font-latin text-xs text-muted-foreground">
                    {proof.originalFileName} · {formatDateTime(proof.createdAt)}
                  </span>
                </div>
                <CmsApiStatus group="proof" value={proof.reviewStatus} />
              </li>
            ))
          )}
        </ul>
      </CmsCard>
    </CmsPage>
  );
}
