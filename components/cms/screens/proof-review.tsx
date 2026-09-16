"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { CmsDecisionFields, useCmsDecision } from "@/components/cms/decision";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsLightbox } from "@/components/cms/lightbox";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import { documentPreview } from "@/lib/assets/r2";
import { decideSkillProofs } from "@/lib/mock-db/actions";
import { formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { SkillProof } from "@/lib/mock-db/types";

const BACK = "/admin/verification?tab=skills";

/** One skill document — the Nexus `[id]` page a proof row opens. */
export function ProofReviewScreen() {
  const t = useTranslations("cms.verification");
  const id = useRecordId();
  const proof = useDatabase((db) => db.skillProofs.find((p) => p.id === id));

  if (!proof) {
    return (
      <CmsPage backHref={BACK} title={t("proofTitle")}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }
  return <Review key={proof.id} proof={proof} />;
}

function Review({ proof }: { readonly proof: SkillProof }) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const advisor = person(proof.accountId);
  const decision = useCmsDecision<"approved" | "rejected">({
    needsReason: (outcome) => outcome === "rejected",
    outcomeRequired: t("outcomeRequired"),
    reasonRequired: t("reasonRequired"),
  });
  const [preview, setPreview] = useState(false);
  const pending = proof.status === "pending";

  function save() {
    const picked = decision.validate();
    if (!picked) return;
    const rejected = picked.outcome === "rejected";
    decideSkillProofs([proof.id], picked.outcome, rejected ? picked.reason : null, actorId);
    toast(
      rejected
        ? { color: "warning", title: t("rejectedProof", { count: 1 }) }
        : { title: t("approvedProof", { count: 1 }) },
    );
    router.push(BACK);
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
            { label: t("submittedAt"), by: advisor?.name, at: proof.submittedAt },
            ...(proof.decision
              ? [{ label: t("decidedAt"), by: person(proof.decision.by)?.name, at: proof.decision.at }]
              : []),
          ]}
        >
          {pending ? (
            <CmsDecisionFields
              decision={decision}
              items={[
                { value: "approved", label: t("approve"), icon: Check },
                { value: "rejected", label: t("reject"), icon: X },
              ]}
              label={t("outcome")}
              placeholder={t("outcomePlaceholder")}
              reasonLabel={t("reason")}
              reasonPlaceholder={t("rejectPlaceholder")}
            />
          ) : (
            <dl className="space-y-3">
              <CmsDataRow label={t("col.status")}>
                <CmsStatus group="proof" value={proof.status} />
              </CmsDataRow>
              {proof.decision?.note ? (
                <CmsDataRow label={t("decisionNote")}>{proof.decision.note}</CmsDataRow>
              ) : null}
            </dl>
          )}
        </CmsSidebarOptions>
      }
      backHref={BACK}
      badge={<CmsStatus group="proof" value={proof.status} />}
      title={proof.skill}
    >
      <CmsCard title={t("document")}>
        <CmsButton
          aria-label={t("openDocument")}
          className="block w-full overflow-hidden rounded-md p-0 ring-1 ring-border"
          color="neutral"
          onClick={() => setPreview(true)}
          variant="ghost"
        >
          <Image
            alt={proof.documentName}
            className="h-auto max-h-96 w-full object-cover object-top"
            src={documentPreview}
          />
        </CmsButton>
        <p className="mt-3 font-latin text-sm text-muted-foreground">{proof.documentName}</p>
      </CmsCard>

      <CmsCard title={t("details")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("col.skill")}>{proof.skill}</CmsDataRow>
          <CmsDataRow label={t("col.advisor")}>
            {advisor ? (
              <Link className="text-action hover:text-action/75" href={`/admin/users/edit?id=${advisor.id}`}>
                {advisor.name} · <span className="font-latin">{advisor.email}</span>
              </Link>
            ) : (
              "—"
            )}
          </CmsDataRow>
          <CmsDataRow label={t("col.submittedAt")}>{formatDateTime(proof.submittedAt)}</CmsDataRow>
        </dl>
      </CmsCard>

      <CmsLightbox
        image={preview ? documentPreview : null}
        onClose={() => setPreview(false)}
        title={proof.documentName}
      />
    </CmsPage>
  );
}
