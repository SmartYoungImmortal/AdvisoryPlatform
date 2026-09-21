"use client";

import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
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
import { REFUNDS_KEY } from "@/components/cms/screens/refunds";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsApiStatus } from "@/components/cms/status";
import { CaseEvidence } from "@/components/cms/case-evidence";
import {
  approveRefundCase,
  getRefundCase,
  getRefundContext,
  rejectRefundCase,
  type AdminRefundCaseDetail,
  type CaseContext,
} from "@/lib/api/admin";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht } from "@/lib/mock-db/format";

/**
 * One refund case, from `GET /api/v1/admin/refunds/:refundCaseId`.
 *
 * ## The partial refund is gone
 *
 * `POST .../approve` takes **no body**. There is no amount on the route, so a
 * refund is the whole invoice or nothing: the full/partial choice and the baht
 * field it revealed cannot be sent anywhere. Restoring them needs an amount on the
 * approve DTO and a column to hold it.
 *
 * ## Evidence is named, not shown
 *
 * The detail route carries `evidence` as object keys, original file names and MIME
 * types. There is no admin route that presigns a key, so there is no URL to put in
 * an `<img>` and the lightbox is gone with it — the files are listed by name. A
 * grid of the same stock document thumbnail, four times, claimed to be this
 * requester's evidence, which it never was.
 */
export function RefundReviewScreen() {
  const t = useTranslations("cms.refunds");
  const id = useRecordId();

  const fetcher = useCallback((signal: AbortSignal) => getRefundCase(id, signal), [id]);
  const refund = useResource<AdminRefundCaseDetail>(`${REFUNDS_KEY}/${id}`, fetcher);

  if (id === "") {
    return (
      <CmsPage backHref="/admin/refunds" title={t("reviewTitle")}>
        <CmsMissing backHref="/admin/refunds" />
      </CmsPage>
    );
  }

  if (refund.loading) {
    return (
      <CmsPage backHref="/admin/refunds" title={t("reviewTitle")}>
        <CmsCardSkeleton rows={4} />
      </CmsPage>
    );
  }

  if (refund.error || !refund.data) {
    return (
      <CmsPage backHref="/admin/refunds" title={t("reviewTitle")}>
        {refund.error ? (
          <CmsApiError error={refund.error} onRetry={refund.reload} />
        ) : (
          <CmsMissing backHref="/admin/refunds" />
        )}
      </CmsPage>
    );
  }

  return <Review key={refund.data.id} refund={refund.data} />;
}

/**
 * Nexus's edit-page shape: one form card on the left, `CmsSidebarOptions` on the
 * right. No record id is printed anywhere — a UUID means nothing to the person
 * reading this — and the rejection reason is a field on the card, not a prompt.
 */
function Review({ refund }: { readonly refund: AdminRefundCaseDetail }) {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  const reasonId = useId();
  // The consultation this refund claims against, and its conversation.
  const evidenceFetcher = useCallback(
    (signal: AbortSignal) => getRefundContext(refund.id, signal),
    [refund.id],
  );
  const evidence = useResource<CaseContext>(`${REFUNDS_KEY}/${refund.id}/context`, evidenceFetcher);
  const open = refund.status === "OPEN";
  const amount = formatBaht(refund.invoiceAmountSatang);
  const [rejection, setRejection] = useState("");
  const [rejectionError, setRejectionError] = useState<string | undefined>();

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveTitle", { amount }),
      description: t("approveBody", { name: refund.requesterDisplayName }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: REFUNDS_KEY,
      run: [() => approveRefundCase(refund.id)],
      success: t("approved", { amount }),
    });
    if (result.ok) router.push("/admin/refunds");
  }

  async function reject() {
    const reason = rejection.trim();
    if (!reason) {
      setRejectionError(t("reasonRequired"));
      return;
    }
    const result = await rule({
      keyPrefix: REFUNDS_KEY,
      run: [() => rejectRefundCase(refund.id, reason)],
      success: t("rejected", { count: 1 }),
      successColor: "warning",
    });
    if (result.ok) router.push("/admin/refunds");
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            open ? (
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
            {
              label: t("requestedAt"),
              by: accountName(refund.requestedByUserId) ?? refund.requesterDisplayName,
              at: refund.createdAt,
            },
            ...(refund.resolvedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(refund.reviewedByAdminId) ?? undefined,
                    at: refund.resolvedAt,
                  },
                ]
              : []),
          ]}
        >
          <CmsFormField label={t("col.status")}>
            <div>
              <CmsApiStatus group="refund" value={refund.status} />
            </div>
          </CmsFormField>
        </CmsSidebarOptions>
      }
      backHref="/admin/refunds"
      title={t("reviewTitle")}
    >
      <CmsCard>
        <dl className="space-y-4">
          <CmsDataRow label={t("col.requester")}>
            {accountName(refund.requestedByUserId) ?? refund.requesterDisplayName}
          </CmsDataRow>
          {/* The whole invoice: the approve route takes no amount. */}
          <CmsDataRow label={t("col.amount")}>
            <span className="font-latin">{amount}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.reason")}>
            <span className="font-normal text-foreground">{refund.reason}</span>
          </CmsDataRow>
          <CmsDataRow label={t("evidence", { count: refund.evidence.length })}>
            {refund.evidence.length === 0 ? (
              <span className="font-normal text-muted-foreground">-</span>
            ) : (
              <ul className="space-y-1">
                {refund.evidence.map((file) => (
                  <li className="flex items-center gap-2" key={file.objectKey}>
                    <FileText aria-hidden className="size-4 shrink-0 text-dimmed" />
                    <span className="truncate font-latin font-normal">
                      {file.originalFileName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CmsDataRow>
        </dl>
        <CaseEvidence context={evidence.data} loading={evidence.loading} />
        {open ? (
          <div className="mt-6 border-t border-border pt-6">
            <CmsFormField
              error={rejectionError}
              htmlFor={reasonId}
              label={t("reason")}
            >
              <CmsTextarea
                id={reasonId}
                invalid={Boolean(rejectionError)}
                onChange={(event) => {
                  setRejection(event.target.value);
                  setRejectionError(undefined);
                }}
                placeholder={t("rejectPlaceholder")}
                value={rejection}
              />
            </CmsFormField>
          </div>
        ) : null}
      </CmsCard>
    </CmsPage>
  );
}
