"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, CircleX, Clock, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsLightbox } from "@/components/cms/lightbox";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import { documentPreview, thaiNationalId } from "@/lib/assets/r2";
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

const LEVELS: readonly AdvisorLevel[] = [1, 2, 3];

const PROOF_ICON = {
  pending: { icon: Clock, className: "text-warning" },
  approved: { icon: CircleCheck, className: "text-action" },
  rejected: { icon: CircleX, className: "text-destructive" },
} as const;

/**
 * Figma "Admin - Advisor verification & level" (1952:36339): the attached ID,
 * the applicant's details, their skills with proof, and the level they are
 * approved at. The frame's left-hand queue sits in the options column here, the
 * way Nexus puts secondary navigation beside an edit form.
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
  const { confirm, prompt, toast } = useCmsFeedback();
  const account = person(request.accountId);
  const allProofs = useDatabase((db) => db.skillProofs);
  const allRequests = useDatabase((db) => db.identityRequests);
  const proofs = allProofs.filter((p) => p.accountId === request.accountId);
  const queue = allRequests.filter((r) => r.status === "submitted");
  const [level, setLevel] = useState<AdvisorLevel>(
    account?.advisor?.identity === "verified" ? account.advisor.level : 1,
  );
  const [preview, setPreview] = useState<{ title: string; kind: "id" | "doc" } | null>(null);
  const pending = request.status === "submitted";

  /** After a decision, move on to the next request still waiting. */
  function advance() {
    const next = queue.find((r) => r.id !== request.id);
    router.push(next ? `/admin/verification/review?id=${next.id}` : "/admin/verification");
  }

  async function approve() {
    const ok = await confirm({
      type: "success",
      title: t("approveTitle", { name: request.fullName, level }),
      description: t("approveBody", { title: advisorLevelTitles[level] }),
      confirmLabel: t("approveAs", { level }),
    });
    if (!ok) return;
    approveIdentity(request.id, level, null, actorId);
    toast({ title: t("approved", { name: request.fullName, level }) });
    advance();
  }

  async function reject() {
    const note = await prompt({
      type: "danger",
      title: t("rejectTitle", { name: request.fullName }),
      description: t("rejectBody"),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      confirmLabel: t("reject"),
    });
    if (note === null) return;
    rejectIdentity(request.id, note, actorId);
    toast({ color: "warning", title: t("rejected", { name: request.fullName }) });
    advance();
  }

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          info={[
            { label: t("submittedAt"), at: request.submittedAt },
            ...(request.decision
              ? [
                  {
                    label: t("decidedAt"),
                    by: person(request.decision.by)?.name,
                    at: request.decision.at,
                  },
                ]
              : []),
          ]}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-highlighted">{t("queueTitle")}</span>
            <span className="font-latin text-muted-foreground">{queue.length}</span>
          </div>
          <ul className="-mx-2 flex flex-col">
            {queue.length === 0 ? (
              <li className="px-2 text-sm text-muted-foreground">{t("queueEmpty")}</li>
            ) : (
              queue.slice(0, 8).map((item) => {
                const applicant = person(item.accountId);
                return (
                  <li key={item.id}>
                    <Link
                      aria-current={item.id === request.id ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50",
                        item.id === request.id && "bg-muted text-highlighted",
                      )}
                      href={`/admin/verification/review?id=${item.id}`}
                    >
                      {applicant ? <CmsAvatar account={applicant} size="sm" /> : null}
                      <span className="truncate">{applicant?.name ?? item.fullName}</span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
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
          onClick={() => setPreview({ title: t("idCard"), kind: "id" })}
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
          {request.decision?.note ? (
            <CmsDataRow label={t("decisionNote")}>{request.decision.note}</CmsDataRow>
          ) : null}
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
            proofs.map((proof) => (
              <ProofRow
                key={proof.id}
                onOpen={() => setPreview({ title: proof.documentName, kind: "doc" })}
                proof={proof}
              />
            ))
          )}
        </ul>
      </CmsCard>

      {pending ? (
        <CmsCard description={t("levelHint")} title={t("levelTitle")}>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {LEVELS.map((value) => (
              <CmsButton
                aria-checked={level === value}
                className={cn(
                  "h-auto justify-start gap-3 rounded-lg p-4 text-start ring-1 ring-inset",
                  level === value
                    ? "bg-action/10 ring-2 ring-action hover:bg-action/10"
                    : "bg-card ring-border hover:bg-muted/50",
                )}
                color="neutral"
                key={value}
                onClick={() => setLevel(value)}
                role="radio"
                variant="ghost"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                    level === value ? "bg-action ring-action" : "ring-accented",
                  )}
                >
                  {level === value ? <span className="size-2 rounded-full bg-action-foreground" /> : null}
                </span>
                <span className="flex flex-col">
                  <span className={cn("font-medium", level === value ? "text-action" : "text-highlighted")}>
                    {t("level", { level: value })}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {advisorLevelTitles[value]}
                  </span>
                </span>
              </CmsButton>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <CmsButton className="min-w-40 justify-center" color="error" icon={X} onClick={reject} size="lg">
              {t("reject")}
            </CmsButton>
            <CmsButton className="min-w-40 justify-center" color="action" icon={Check} onClick={approve} size="lg">
              {t("approveAs", { level })}
            </CmsButton>
          </div>
        </CmsCard>
      ) : null}

      <CmsLightbox
        image={preview ? (preview.kind === "id" ? thaiNationalId : documentPreview) : null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ""}
      />
    </CmsPage>
  );
}

function ProofRow({ proof, onOpen }: { readonly proof: SkillProof; readonly onOpen: () => void }) {
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
      <CmsButton color="action" icon={FileText} onClick={onOpen} variant="link">
        {t("viewDocument")}
      </CmsButton>
    </li>
  );
}
