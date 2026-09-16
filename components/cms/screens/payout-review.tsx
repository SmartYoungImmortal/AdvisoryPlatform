"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleX, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsFormField, CmsReasonField, CmsSelect } from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import { markPayoutFailed, markPayoutsPaid } from "@/lib/mock-db/actions";
import { formatBaht, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Payout } from "@/lib/mock-db/types";

const BACK = "/admin/payouts";

/** One payout — the Nexus `[id]` page a payout row opens. */
export function PayoutReviewScreen() {
  const t = useTranslations("cms.payouts");
  const id = useRecordId();
  const payout = useDatabase((db) => db.payouts.find((p) => p.id === id));

  if (!payout) {
    return (
      <CmsPage backHref={BACK} title={t("reviewTitle")}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }
  return <Review key={`${payout.id}:${payout.status}`} payout={payout} />;
}

function Review({ payout }: { readonly payout: Payout }) {
  const t = useTranslations("cms.payouts");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const outcomeId = useId();
  const advisor = person(payout.advisorId);
  const [outcome, setOutcome] = useState<"paid" | "failed" | null>(null);
  const [reason, setReason] = useState("");
  const [outcomeError, setOutcomeError] = useState<string | undefined>();
  const [reasonError, setReasonError] = useState<string | undefined>();
  const open = payout.status !== "paid";

  function save() {
    if (!outcome) {
      setOutcomeError(t("outcomeRequired"));
      return;
    }
    if (outcome === "failed") {
      if (!reason.trim()) {
        setReasonError(t("reasonRequired"));
        return;
      }
      markPayoutFailed(payout.id, reason.trim(), actorId);
      toast({ color: "warning", title: t("failed", { id: payout.id }) });
    } else {
      markPayoutsPaid([payout.id], actorId);
      toast({ title: t("paid", { count: 1 }) });
    }
    router.push(BACK);
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            open ? (
              <CmsButton block color="action" icon={Save} onClick={save} size="lg">
                {t("save")}
              </CmsButton>
            ) : null
          }
          info={[
            { label: t("col.requestedAt"), by: advisor?.name, at: payout.requestedAt },
            ...(payout.paidAt ? [{ label: t("paidAt"), at: payout.paidAt }] : []),
          ]}
        >
          {open ? (
            <>
              <CmsFormField
                error={outcomeError}
                help={t("outcomeHelp")}
                htmlFor={outcomeId}
                label={t("outcome")}
                required
              >
                <CmsSelect
                  id={outcomeId}
                  invalid={Boolean(outcomeError)}
                  items={[
                    { value: "paid", label: t("markPaid"), icon: BadgeCheck },
                    ...(payout.status === "pending"
                      ? [{ value: "failed" as const, label: t("markFailed"), icon: CircleX }]
                      : []),
                  ]}
                  onValueChange={(value) => {
                    setOutcome(value);
                    setOutcomeError(undefined);
                    setReasonError(undefined);
                  }}
                  placeholder={t("outcomePlaceholder")}
                  value={outcome}
                />
              </CmsFormField>
              {outcome === "failed" ? (
                <CmsReasonField
                  error={reasonError}
                  label={t("failReason")}
                  onChange={(value) => {
                    setReason(value);
                    setReasonError(undefined);
                  }}
                  placeholder={t("failPlaceholder")}
                  value={reason}
                />
              ) : null}
            </>
          ) : (
            <dl className="space-y-3">
              <CmsDataRow label={t("col.status")}>
                <CmsStatus group="payout" value={payout.status} />
              </CmsDataRow>
            </dl>
          )}
        </CmsSidebarOptions>
      }
      backHref={BACK}
      badge={<CmsStatus group="payout" value={payout.status} />}
      title={t("reviewHeading", { id: payout.id })}
    >
      <CmsCard title={t("detailTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.advisor")}>
            {advisor ? (
              <Link className="text-action hover:text-action/75" href={`/admin/users/edit?id=${advisor.id}`}>
                {advisor.name} · <span className="font-latin">{advisor.email}</span>
              </Link>
            ) : (
              "—"
            )}
          </CmsDataRow>
          <CmsDataRow label={t("col.account")}>
            {payout.bank} <span className="font-latin">···{payout.accountLast4}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.amount")}>
            <span className="font-latin">{formatBaht(payout.amountSatang)}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.invoices")}>
            <span className="font-latin">{payout.invoiceCount}</span>
          </CmsDataRow>
          <CmsDataRow label={t("col.requestedAt")}>{formatDateTime(payout.requestedAt)}</CmsDataRow>
          {payout.failureReason ? (
            <CmsDataRow label={t("failReason")}>
              <span className="text-destructive">{payout.failureReason}</span>
            </CmsDataRow>
          ) : null}
        </dl>
      </CmsCard>
    </CmsPage>
  );
}
