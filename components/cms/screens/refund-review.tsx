"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsInput, CmsSelect, CmsTextarea } from "@/components/cms/fields";
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

type Outcome = "full" | "partial" | "rejected";

/**
 * One refund case: what was paid for, what went wrong and the evidence, then
 * the decision in the options column — the whole amount, part of it, or a
 * rejection — saved with one button. Problems show under their fields.
 */
function Review({ refund }: { readonly refund: RefundRequest }) {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const outcomeId = useId();
  const noteId = useId();
  const amountId = useId();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState(String(Math.round(refund.paidSatang / 200)));
  const [note, setNote] = useState("");
  const [outcomeError, setOutcomeError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();
  const [noteError, setNoteError] = useState<string | undefined>();
  const [preview, setPreview] = useState<number | null>(null);
  const pending = refund.status === "pending";
  const paidBaht = refund.paidSatang / 100;

  function save() {
    if (!outcome) {
      setOutcomeError(t("outcomeRequired"));
      return;
    }
    if (outcome === "rejected") {
      if (!note.trim()) {
        setNoteError(t("reasonRequired"));
        return;
      }
      rejectRefunds([refund.id], note.trim(), actorId);
      toast({ color: "warning", title: t("rejected", { count: 1 }) });
      router.push("/admin/refunds");
      return;
    }
    let satang = refund.paidSatang;
    if (outcome === "partial") {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0 || value > paidBaht) {
        setAmountError(t("amountInvalid", { max: formatBaht(refund.paidSatang) }));
        return;
      }
      satang = Math.round(value * 100);
    }
    approveRefund(refund.id, satang, note.trim() || null, actorId);
    toast({ title: t("approved", { amount: formatBaht(satang) }) });
    router.push("/admin/refunds");
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            pending ? (
              <CmsButton block color="action" icon={Save} onClick={save} size="lg">
                {t("save")}
              </CmsButton>
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
              <CmsFormField error={outcomeError} htmlFor={outcomeId} label={t("outcome")} required>
                <CmsSelect
                  id={outcomeId}
                  invalid={Boolean(outcomeError)}
                  items={[
                    { value: "full", label: t("fullAmount", { amount: formatBaht(refund.paidSatang) }), icon: Check },
                    { value: "partial", label: t("partial"), icon: Check },
                    { value: "rejected", label: t("reject"), icon: X },
                  ]}
                  onValueChange={(value) => {
                    setOutcome(value);
                    setOutcomeError(undefined);
                    setNoteError(undefined);
                  }}
                  placeholder={t("outcomePlaceholder")}
                  value={outcome}
                />
              </CmsFormField>
              {outcome === "partial" ? (
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
              <CmsFormField
                error={noteError}
                help={outcome === "rejected" ? t("reasonHelp") : t("noteHelp")}
                htmlFor={noteId}
                label={outcome === "rejected" ? t("reason") : t("note")}
                required={outcome === "rejected"}
              >
                <CmsTextarea
                  id={noteId}
                  invalid={Boolean(noteError)}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setNoteError(undefined);
                  }}
                  rows={3}
                  value={note}
                />
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
