"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsDetailSkeleton, useRuling } from "@/components/cms/api";
import { CmsSection } from "@/components/cms/card";
import { CaseEvidence } from "@/components/cms/case-evidence";
import { CmsDocumentGrid } from "@/components/cms/document";
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
  approveRefundCase,
  documentUrl,
  getRefundCase,
  getRefundContext,
  rejectRefundCase,
  type AdminRefundCaseDetail,
  type CaseContext,
} from "@/lib/api/admin";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht } from "@/lib/mock-db/format";

const REFUNDS_KEY = ADMIN_KEYS.refunds;
const BACK = "/admin/refunds";

/**
 * One refund case, from `GET /api/v1/admin/refunds/:refundCaseId`.
 *
 * ## The partial refund is gone
 *
 * `POST .../approve` takes **no body**. There is no amount on the route, so a
 * refund is the whole invoice or nothing. Restoring a partial refund needs an
 * amount on the approve DTO and a column to hold it.
 *
 * ## Evidence
 *
 * The detail route carries `evidence` as object keys, original file names and MIME
 * types. A file whose key opens (`documentUrl` — the demo seed's specimens under
 * `public/demo-docs/`) is a thumbnail that opens it in a new tab. A real upload's
 * key has no admin route that presigns it, so that tile names the file and shows
 * no picture: a stock thumbnail would claim to be this requester's evidence.
 */
export function RefundReviewScreen() {
  const t = useTranslations("cms.refunds");
  const id = useRecordId();

  const fetcher = useCallback((signal: AbortSignal) => getRefundCase(id, signal), [id]);
  const refund = useResource<AdminRefundCaseDetail>(`${REFUNDS_KEY}/${id}`, fetcher);
  const frame = { backHref: BACK, backLabel: t("title"), title: t("reviewTitle") };

  if (id === "") {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (refund.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={4} />
      </CmsPage>
    );
  }

  if (refund.error || !refund.data) {
    return (
      <CmsPage {...frame}>
        {refund.error ? (
          <CmsApiError error={refund.error} onRetry={refund.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <Review key={refund.data.id} refund={refund.data} />;
}

/**
 * The case's facts and its evidence in the page; the timeline and the ruling
 * beside them, the rejection's reason right above its button. No record id is
 * printed anywhere — a UUID means nothing to the person reading this.
 */
function Review({ refund }: { readonly refund: AdminRefundCaseDetail }) {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const accountName = useAccountName();
  // The consultation this refund claims against, and its conversation.
  const evidenceFetcher = useCallback(
    (signal: AbortSignal) => getRefundContext(refund.id, signal),
    [refund.id],
  );
  const evidence = useResource<CaseContext>(`${REFUNDS_KEY}/${refund.id}/context`, evidenceFetcher);
  const open = refund.status === "OPEN";
  const amount = formatBaht(refund.invoiceAmountSatang);
  const requester = accountName(refund.requestedByUserId) ?? refund.requesterDisplayName;

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveTitle", { amount }),
      description: t("approveBody", { name: requester }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    const result = await rule({
      keyPrefix: REFUNDS_KEY,
      run: [() => approveRefundCase(refund.id)],
      success: t("approved", { amount }),
    });
    if (result.ok) router.push(BACK);
  }

  async function reject(reason: string) {
    const result = await rule({
      keyPrefix: REFUNDS_KEY,
      run: [() => rejectRefundCase(refund.id, reason)],
      success: t("rejected", { count: 1 }),
    });
    if (result.ok) router.push(BACK);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          info={[
            { label: t("requestedAt"), by: requester, at: refund.createdAt },
            ...(refund.resolvedAt
              ? [
                  {
                    label: t("decidedAt"),
                    by: accountName(refund.reviewedByAdminId),
                    at: refund.resolvedAt,
                  },
                ]
              : []),
          ]}
        >
          {open ? (
            <RulingDecision
              approveLabel={t("approve")}
              onApprove={approve}
              onReject={reject}
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
      badge={<CmsStatus group="refund" value={refund.status} />}
      description={t("reviewLine", { amount, name: requester })}
      title={t("reviewTitle")}
    >
      <CmsSection title={t("caseTitle")}>
        <CmsDataList>
          <CmsDataRow label={t("col.requester")}>
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href={`/admin/users/edit?id=${refund.requestedByUserId}`}
            >
              {requester}
            </Link>
          </CmsDataRow>
          {/* The whole invoice: the approve route takes no amount. */}
          <CmsDataRow label={t("col.amount")}>
            <span className="font-latin">{amount}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.reason")}>{refund.reason}</CmsDataRow>
        </CmsDataList>
      </CmsSection>

      <CmsSection title={t("evidence", { count: refund.evidence.length })}>
        {refund.evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvidence")}</p>
        ) : (
          <CmsDocumentGrid
            files={refund.evidence.map((file) => ({
              key: file.objectKey,
              url: documentUrl(file.objectKey),
              name: file.originalFileName,
              mimeType: file.mimeType,
            }))}
          />
        )}
      </CmsSection>

      <CaseEvidence context={evidence.data} loading={evidence.loading} />
    </CmsPage>
  );
}
