"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsInput, CmsTextarea } from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsLightbox } from "@/components/cms/lightbox";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import { documentPreview } from "@/lib/assets/r2";
import { approveRefund, rejectRefunds } from "@/lib/mock-db/actions";
import { formatBaht, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { RefundRequest } from "@/lib/mock-db/types";
import { cn } from "@/lib/utils";

export function RefundReviewScreen() {
  const t = useTranslations("cms.refunds");
  const id = useRecordId();
  const refund = useDatabase((db) => db.refunds.find((r) => r.id === id));
  if (!refund) {
    return (
      <CmsPage backHref="/admin/refunds" title={t("reviewTitle")}>
        <CmsMissing backHref="/admin/refunds" />
      </CmsPage>
    );
  }
  return <Review key={refund.id} refund={refund} />;
}

/**
 * One refund case: what was paid for, what went wrong and the evidence, then the
 * decision — the whole amount or part of it, or a rejection with a reason.
 */
function Review({ refund }: { readonly refund: RefundRequest }) {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { confirm, prompt, toast } = useCmsFeedback();
  const noteId = useId();
  const amountId = useId();
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(String(Math.round(refund.paidSatang / 200)));
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>();
  const [preview, setPreview] = useState<number | null>(null);
  const pending = refund.status === "pending";
  const paidBaht = refund.paidSatang / 100;

  async function approve() {
    let satang = refund.paidSatang;
    if (mode === "partial") {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0 || value > paidBaht) {
        setAmountError(t("amountInvalid", { max: formatBaht(refund.paidSatang) }));
        return;
      }
      satang = Math.round(value * 100);
    }
    const ok = await confirm({
      type: "success",
      title: t("approveTitle", { amount: formatBaht(satang) }),
      description: t("approveBody", { name: person(refund.requesterId)?.name ?? "" }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    approveRefund(refund.id, satang, note || null, actorId);
    toast({ title: t("approved", { amount: formatBaht(satang) }) });
    router.push("/admin/refunds");
  }

  async function reject() {
    const reason = await prompt({
      type: "danger",
      title: t("rejectTitle", { count: 1 }),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      defaultValue: note,
      confirmLabel: t("reject"),
    });
    if (reason === null) return;
    rejectRefunds([refund.id], reason, actorId);
    toast({ color: "warning", title: t("rejected", { count: 1 }) });
    router.push("/admin/refunds");
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
            { label: t("requestedAt"), at: refund.requestedAt },
            ...(refund.decision
              ? [{ label: t("decidedAt"), by: person(refund.decision.by)?.name, at: refund.decision.at }]
              : []),
          ]}
        >
          {pending ? (
            <>
              <div className="flex flex-col gap-2 text-sm" role="radiogroup">
                <span className="font-medium text-foreground">{t("amountTitle")}</span>
                {(["full", "partial"] as const).map((value) => (
                  <CmsButton
                    aria-checked={mode === value}
                    className={cn(
                      "justify-between ring-1 ring-inset",
                      mode === value ? "bg-action/10 text-action ring-action" : "ring-accented",
                    )}
                    color="neutral"
                    key={value}
                    onClick={() => setMode(value)}
                    role="radio"
                    variant="ghost"
                  >
                    <span>{value === "full" ? t("full") : t("partial")}</span>
                    {value === "full" ? (
                      <span className="font-latin">{formatBaht(refund.paidSatang)}</span>
                    ) : null}
                  </CmsButton>
                ))}
              </div>
              {mode === "partial" ? (
                <CmsFormField error={amountError} htmlFor={amountId} label={t("amount")} required>
                  <CmsInput
                    id={amountId}
                    inputMode="numeric"
                    invalid={Boolean(amountError)}
                    max={paidBaht}
                    min={1}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setAmountError(undefined);
                    }}
                    trailing={<span className="text-sm text-dimmed">฿</span>}
                    type="number"
                    value={amount}
                  />
                </CmsFormField>
              ) : null}
              <CmsFormField help={t("noteHelp")} htmlFor={noteId} label={t("note")}>
                <CmsTextarea id={noteId} onChange={(event) => setNote(event.target.value)} rows={3} value={note} />
              </CmsFormField>
            </>
          ) : (
            <dl className="space-y-3">
              <CmsDataRow label={t("col.status")}>
                <CmsStatus group="refund" value={refund.status} />
              </CmsDataRow>
              {refund.refundedSatang !== null ? (
                <CmsDataRow label={t("refunded")}>
                  <span className="font-latin">{formatBaht(refund.refundedSatang)}</span>
                </CmsDataRow>
              ) : null}
              {refund.decision?.note ? (
                <CmsDataRow label={t("note")}>{refund.decision.note}</CmsDataRow>
              ) : null}
            </dl>
          )}
        </CmsSidebarOptions>
      }
      backHref="/admin/refunds"
      badge={<CmsStatus group="refund" value={refund.status} />}
      title={t("reviewHeading", { id: refund.id })}
    >
      <CmsCard title={t("caseTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.reason")}>{refund.reason}</CmsDataRow>
          <CmsDataRow label={t("detail")}>
            <span className="font-normal text-foreground">{refund.detail}</span>
          </CmsDataRow>
          <CmsDataRow label={t("booking")}>
            <span className="font-latin">{refund.bookingRef}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.service")}>{refund.serviceTitle}</CmsDataRow>
          <CmsDataRow label={t("sessionAt")}>{formatDateTime(refund.sessionAt)}</CmsDataRow>
          <CmsDataRow label={t("paid")}>
            <span className="font-latin">{formatBaht(refund.paidSatang)}</span>
          </CmsDataRow>
        </dl>
      </CmsCard>

      <CmsCard title={t("evidence", { count: refund.evidenceCount })}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: refund.evidenceCount }, (_, index) => (
            <CmsButton
              aria-label={t("openEvidence", { n: index + 1 })}
              className="block overflow-hidden rounded-md p-0 ring-1 ring-border"
              color="neutral"
              key={index}
              onClick={() => setPreview(index)}
              variant="ghost"
            >
              <Image alt="" className="aspect-square w-full object-cover" src={documentPreview} />
            </CmsButton>
          ))}
        </div>
      </CmsCard>

      <CmsCard title={t("people")}>
        <dl className="space-y-4">
          <CmsDataRow label={t("col.requester")}>
            <Link className="inline-block" href={`/admin/users/edit?id=${refund.requesterId}`}>
              <CmsPerson account={person(refund.requesterId)} detail={person(refund.requesterId)?.email} />
            </Link>
          </CmsDataRow>
          <CmsDataRow label={t("advisor")}>
            <Link className="inline-block" href={`/admin/users/edit?id=${refund.advisorId}`}>
              <CmsPerson account={person(refund.advisorId)} detail={person(refund.advisorId)?.email} />
            </Link>
          </CmsDataRow>
        </dl>
      </CmsCard>

      <CmsLightbox
        image={preview === null ? null : documentPreview}
        onClose={() => setPreview(null)}
        title={t("evidenceName", { n: (preview ?? 0) + 1 })}
      />
    </CmsPage>
  );
}
