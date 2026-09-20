"use client";

import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsCardSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { REFUNDS_KEY } from "@/components/cms/screens/refunds";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsApiStatus } from "@/components/cms/status";
import {
  approveRefundCase,
  getRefundCase,
  rejectRefundCase,
  type AdminRefundCaseDetail,
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

function Review({ refund }: { readonly refund: AdminRefundCaseDetail }) {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const { confirm, prompt } = useCmsFeedback();
  const rule = useRuling();
  const open = refund.status === "OPEN";
  const amount = formatBaht(refund.invoiceAmountSatang);

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
    const reason = await prompt({
      type: "danger",
      title: t("rejectTitle", { count: 1 }),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      confirmLabel: t("reject"),
    });
    if (reason === null) return;
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
            { label: t("requestedAt"), at: refund.createdAt },
            ...(refund.resolvedAt
              ? [{ label: t("decidedAt"), at: refund.resolvedAt }]
              : []),
          ]}
        >
          <dl className="space-y-3">
            <CmsDataRow label={t("col.status")}>
              <CmsApiStatus group="refund" value={refund.status} />
            </CmsDataRow>
            <CmsDataRow label={t("col.amount")}>
              {/* The whole invoice: the approve route takes no amount. */}
              <span className="font-latin">{amount}</span>
            </CmsDataRow>
          </dl>
        </CmsSidebarOptions>
      }
      backHref="/admin/refunds"
      badge={<CmsApiStatus group="refund" value={refund.status} />}
      title={t("reviewHeading", { id: refund.id.slice(0, 8) })}
    >
      <CmsCard title={t("caseTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.reason")}>
            <span className="font-normal text-foreground">{refund.reason}</span>
          </CmsDataRow>
          <CmsDataRow label={t("booking")}>
            <span className="font-latin break-all">{refund.invoiceId}</span>
          </CmsDataRow>
          <CmsDataRow label={t("paid")}>
            <span className="font-latin">{amount}</span>
          </CmsDataRow>
        </dl>
      </CmsCard>

      <CmsCard
        bodyClassName="p-0 sm:p-0"
        title={t("evidence", { count: refund.evidence.length })}
      >
        <ul className="divide-y divide-border">
          {refund.evidence.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">
              {t("evidence", { count: 0 })}
            </li>
          ) : (
            refund.evidence.map((file) => (
              <li
                className="flex items-center gap-3 p-4 text-sm sm:px-6"
                key={file.objectKey}
              >
                <FileText aria-hidden className="size-5 shrink-0 text-dimmed" />
                <span className="min-w-0 flex-1 truncate font-latin text-highlighted">
                  {file.originalFileName}
                </span>
                <span className="shrink-0 font-latin text-xs text-muted-foreground">
                  {file.mimeType}
                </span>
              </li>
            ))
          )}
        </ul>
      </CmsCard>

      <CmsCard title={t("people")}>
        <dl className="space-y-4">
          <CmsDataRow label={t("col.requester")}>
            <CmsPerson account={{ name: refund.requesterDisplayName }} />
          </CmsDataRow>
        </dl>
      </CmsCard>
    </CmsPage>
  );
}
