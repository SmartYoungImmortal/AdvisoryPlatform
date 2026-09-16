"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Clock, FileText, Save, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { CmsDecisionFields, useCmsDecision } from "@/components/cms/decision";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsLinkButton } from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsLightbox } from "@/components/cms/lightbox";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import { thaiNationalId } from "@/lib/assets/r2";
import { approveIdentity, rejectIdentity } from "@/lib/mock-db/actions";
import { formatDate, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import {
  advisorLevelTitles,
  type AdvisorLevel,
  type IdentityRequest,
  type SkillProof,
} from "@/lib/mock-db/types";
import { cn } from "@/lib/utils";

type Outcome = "level-1" | "level-2" | "level-3" | "rejected";

const LEVELS: readonly AdvisorLevel[] = [1, 2, 3];

const PROOF_ICON = {
  pending: { icon: Clock, className: "text-warning" },
  approved: { icon: CircleCheck, className: "text-action" },
  rejected: { icon: CircleX, className: "text-destructive" },
} as const;

/**
 * Figma "Admin - Advisor verification & level" (1952:36339) on Nexus's edit
 * page: the attached ID, the applicant's details and their skills on the left;
 * the outcome — approve at a level, or reject with a reason — in the options
 * column, saved with one button.
 */
export function VerificationReviewScreen() {
  const t = useTranslations("cms.verification");
  const id = useRecordId();
  const request = useDatabase((db) => db.identityRequests.find((r) => r.id === id));

  if (!request) {
    return (
      <CmsPage backHref="/admin/verification" title={t("reviewTitle")}>
        <CmsMissing backHref="/admin/verification" />
      </CmsPage>
    );
  }
  return <Review key={request.id} request={request} />;
}

function Review({ request }: { readonly request: IdentityRequest }) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { toast } = useCmsFeedback();
  const account = person(request.accountId);
  const allProofs = useDatabase((db) => db.skillProofs);
  const allRequests = useDatabase((db) => db.identityRequests);
  const proofs = allProofs.filter((p) => p.accountId === request.accountId);
  const decision = useCmsDecision<Outcome>({
    needsReason: (outcome) => outcome === "rejected",
    outcomeRequired: t("outcomeRequired"),
    reasonRequired: t("reasonRequired"),
  });
  const [preview, setPreview] = useState(false);
  const pending = request.status === "submitted";

  /** After a decision, move on to the next request still waiting. */
  function advance() {
    const next = allRequests.find((r) => r.status === "submitted" && r.id !== request.id);
    router.push(next ? `/admin/verification/review?id=${next.id}` : "/admin/verification");
  }

  function save() {
    const picked = decision.validate();
    if (!picked) return;
    if (picked.outcome === "rejected") {
      rejectIdentity(request.id, picked.reason, actorId);
      toast({ color: "warning", title: t("rejected", { name: request.fullName }) });
      advance();
      return;
    }
    const level = Number(picked.outcome.slice("level-".length)) as AdvisorLevel;
    approveIdentity(request.id, level, null, actorId);
    toast({ title: t("approved", { name: request.fullName, level }) });
    advance();
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
            { label: t("submittedAt"), at: request.submittedAt },
            ...(request.decision
              ? [{ label: t("decidedAt"), by: person(request.decision.by)?.name, at: request.decision.at }]
              : []),
          ]}
        >
          {pending ? (
            <CmsDecisionFields
              decision={decision}
              help={t("levelHint")}
              items={[
                ...LEVELS.map((level) => ({
                  value: `level-${level}` as const,
                  label: t("approveLevel", { level, title: advisorLevelTitles[level] }),
                  icon: ShieldCheck,
                })),
                { value: "rejected" as const, label: t("reject"), icon: X },
              ]}
              label={t("outcome")}
              placeholder={t("outcomePlaceholder")}
              reasonHelp={t("rejectBody")}
              reasonLabel={t("reason")}
              reasonPlaceholder={t("rejectPlaceholder")}
            />
          ) : (
            <dl className="space-y-3">
              <CmsDataRow label={t("col.status")}>
                <CmsStatus group="identity" value={request.status} />
              </CmsDataRow>
              {account?.advisor?.identity === "verified" ? (
                <CmsDataRow label={t("levelTitle")}>
                  {t("approveLevel", {
                    level: account.advisor.level,
                    title: advisorLevelTitles[account.advisor.level],
                  })}
                </CmsDataRow>
              ) : null}
              {request.decision?.note ? (
                <CmsDataRow label={t("decisionNote")}>{request.decision.note}</CmsDataRow>
              ) : null}
            </dl>
          )}
        </CmsSidebarOptions>
      }
      backHref="/admin/verification"
      badge={<CmsStatus group="identity" value={request.status} />}
      title={t("reviewTitle")}
    >
      <CmsCard title={t("documents")}>
        <CmsButton
          aria-label={t("openDocument")}
          className="block w-full overflow-hidden rounded-md p-0 ring-1 ring-border"
          color="neutral"
          onClick={() => setPreview(true)}
          variant="ghost"
        >
          <Image
            alt={t("idCard")}
            className="h-auto max-h-64 w-full object-cover object-top"
            src={thaiNationalId}
          />
        </CmsButton>
      </CmsCard>

      <CmsCard title={t("details")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("account")}>
            {account ? (
              <Link className="text-action hover:text-action/75" href={`/admin/users/edit?id=${account.id}`}>
                {account.name} · <span className="font-latin">{account.email}</span>
              </Link>
            ) : (
              "—"
            )}
          </CmsDataRow>
          <CmsDataRow label={t("fullName")}>{request.fullName}</CmsDataRow>
          <CmsDataRow label={t("birthDate")}>
            <span className="font-latin">{formatDate(`${request.birthDate}T00:00:00+07:00`)}</span>
          </CmsDataRow>
          <CmsDataRow label={t("nationalId")}>
            <span className="font-latin">
              {request.nationalIdLast4 ? `•••••••••${request.nationalIdLast4}` : t("fromDocument")}
            </span>
          </CmsDataRow>
          <CmsDataRow label={t("credential")}>{request.credential}</CmsDataRow>
          <CmsDataRow label={t("field")}>{request.field}</CmsDataRow>
        </dl>
      </CmsCard>

      <CmsCard
        actions={<span className="text-sm text-muted-foreground">{t("skillCount", { count: proofs.length })}</span>}
        bodyClassName="p-0 sm:p-0"
        title={t("skills")}
      >
        <ul className="divide-y divide-border">
          {proofs.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noSkills")}</li>
          ) : (
            proofs.map((proof) => <ProofRow key={proof.id} proof={proof} />)
          )}
        </ul>
      </CmsCard>

      <CmsLightbox
        image={preview ? thaiNationalId : null}
        onClose={() => setPreview(false)}
        title={t("idCard")}
      />
    </CmsPage>
  );
}

function ProofRow({ proof }: { readonly proof: SkillProof }) {
  const t = useTranslations("cms.verification");
  const { icon: Icon, className } = PROOF_ICON[proof.status];
  return (
    <li className="flex items-center gap-4 p-4 sm:px-6">
      <Icon aria-hidden className={cn("size-5 shrink-0", className)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-highlighted">{proof.skill}</span>
        <span className="truncate font-latin text-xs text-muted-foreground">
          {proof.documentName} · {formatDateTime(proof.submittedAt)}
        </span>
      </div>
      <CmsStatus group="proof" value={proof.status} />
      <CmsLinkButton
        color="action"
        href={`/admin/verification/proof?id=${proof.id}`}
        icon={FileText}
        variant="link"
      >
        {t("viewDocument")}
      </CmsLinkButton>
    </li>
  );
}
