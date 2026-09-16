"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CircleX, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { CmsDecisionFields, useCmsDecision } from "@/components/cms/decision";
import { useCmsFeedback } from "@/components/cms/feedback";
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
  const advisor = person(payout.advisorId);
  const decision = useCmsDecision<"paid" | "failed">({
    needsReason: (outcome) => outcome === "failed",
    outcomeRequired: t("outcomeRequired"),
    reasonRequired: t("reasonRequired"),
  });
  const open = payout.status !== "paid";

  function save() {
    const picked = decision.validate();
    if (!picked) return;
    if (picked.outcome === "failed") {
      markPayoutFailed(payout.id, picked.reason, actorId);
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
            <CmsDecisionFields
              decision={decision}
              help={t("outcomeHelp")}
              items={[
                { value: "paid", label: t("markPaid"), icon: BadgeCheck },
                // A failed transfer can only be retried, not failed again.
                ...(payout.status === "pending"
                  ? [{ value: "failed" as const, label: t("markFailed"), icon: CircleX }]
                  : []),
              ]}
              label={t("outcome")}
              placeholder={t("outcomePlaceholder")}
              reasonLabel={t("failReason")}
              reasonPlaceholder={t("failPlaceholder")}
            />
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
