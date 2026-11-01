"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import { CmsStatus, useStatusLabel } from "@/components/cms/status";
import {
  CmsChips,
  CmsTable,
  countBy,
  dateColumn,
  statusColumn,
  type CmsColumn,
} from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  approveIdentityVerification,
  listIdentityVerifications,
  listSkillProofs,
  type IdentityVerification,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { timeValue } from "@/lib/mock-db/format";

const IDENTITY_KEY = ADMIN_KEYS.identity;
const PROOFS_KEY = ADMIN_KEYS.skillProofs;
const BASE = "/admin/verification";

/** Where an advisor stands: anything still to check, or their identity's ruling. */
type Stage = "SUBMITTED" | "VERIFIED" | "REJECTED" | "NONE";
const STAGES: readonly Stage[] = ["SUBMITTED", "VERIFIED", "REJECTED"];

/** One advisor: their identity request and every skill document they sent. */
type AdvisorRow = IdentityVerification & {
  readonly id: string;
  readonly proofs: readonly SkillProof[];
  readonly pendingProofs: number;
  readonly stage: Stage;
};

/**
 * Verifying advisors, one row per advisor: is this person who they say, and
 * can they do what they say. The identity request
 * (`GET /api/v1/admin/identity-verifications`) and their skill documents
 * (`GET /api/v1/admin/skill-proofs`) are one job, so they are one row — the
 * identity's status and how many documents still wait — and the row opens the
 * advisor's page, where the ID card and every document are ruled on together.
 *
 * An advisor is waiting while their identity is submitted or any document is
 * pending; the capsules count that, then the verified and the rejected.
 *
 * A row is keyed by `advisorId` — `advisor_identity` has no surrogate key. A
 * document whose advisor has no identity row has no page to open, so it is not
 * listed: every advisor profile carries an identity row, `NONE` until the card
 * is sent.
 *
 * An empty queue is the state of the database, not a failure.
 */
export function VerificationScreen() {
  const t = useTranslations("cms.verification");
  return (
    <CmsPage full title={t("title")}>
      <AdvisorQueue />
    </CmsPage>
  );
}

function AdvisorQueue() {
  const t = useTranslations("cms.verification");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const identityFetcher = useCallback(
    (signal: AbortSignal) => listIdentityVerifications({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const proofsFetcher = useCallback(
    (signal: AbortSignal) => listSkillProofs({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const identity = useResource<Paginated<IdentityVerification>>(
    `${IDENTITY_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    identityFetcher,
  );
  const proofs = useResource<Paginated<SkillProof>>(`${PROOFS_KEY}?limit=${ADMIN_MAX_LIMIT}`, proofsFetcher);

  const rows = useMemo<readonly AdvisorRow[]>(() => {
    const byAdvisor = new Map<string, SkillProof[]>();
    for (const proof of proofs.data?.items ?? []) {
      byAdvisor.set(proof.advisorId, [...(byAdvisor.get(proof.advisorId) ?? []), proof]);
    }
    const advisors = (identity.data?.items ?? []).map((request) => {
      const own = byAdvisor.get(request.advisorId) ?? [];
      const pendingProofs = own.filter((p) => p.reviewStatus === "PENDING").length;
      const stage: Stage =
        request.verificationStatus === "SUBMITTED" || pendingProofs > 0 ? "SUBMITTED" : request.verificationStatus;
      return { ...request, id: request.advisorId, proofs: own, pendingProofs, stage };
    });
    // Waiting first, then the newest submission.
    return advisors.sort((a, b) => {
      const rank = Number(b.stage === "SUBMITTED") - Number(a.stage === "SUBMITTED");
      return rank !== 0 ? rank : (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "");
    });
  }, [identity.data, proofs.data]);
  const count = useMemo(() => countBy(rows, (r) => r.stage), [rows]);

  const list = useCmsList(rows, {
    searchText: (r) => `${r.displayName} ${r.email} ${r.proofs.map((p) => p.skillName).join(" ")}`,
    sortValue: (r, id) => {
      if (id === "submittedAt") return timeValue(r.submittedAt);
      if (id === "status") return r.verificationStatus;
      if (id === "proofs") return r.pendingProofs;
      return r.displayName;
    },
    filters: [{ key: "status", test: (r, values) => values.includes(r.stage) }],
  });

  /** Only identities still submitted are approved in bulk — a ruled one would answer 409. */
  const submitted = (ids: readonly string[]) =>
    ids.filter((id) => rows.find((r) => r.id === id)?.verificationStatus === "SUBMITTED");

  async function approve(advisorIds: readonly string[]) {
    if (advisorIds.length === 0) return;
    const ok = await confirm({
      type: "success",
      title: t("approveIdentityTitle", { count: advisorIds.length }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: IDENTITY_KEY,
      onDone: list.clearSelection,
      run: advisorIds.map((id) => () => approveIdentityVerification(id)),
      success: t("approvedIdentity", { count: advisorIds.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdvisorRow>> = [
    {
      id: "applicant",
      header: t("col.applicant"),
      sortable: true,
      primary: true,
      render: (r) => accountName(r.advisorId) ?? r.displayName,
      sub: (r) => <span className="font-latin">{r.email}</span>,
    },
    statusColumn(t("col.status"), (r) => <CmsStatus group="identity" value={r.verificationStatus} />),
    {
      id: "proofs",
      header: t("tab.skills"),
      sortable: true,
      render: (r) => {
        if (r.proofs.length === 0) return <span className="text-muted-foreground">-</span>;
        if (r.pendingProofs > 0) {
          return (
            <span className="font-medium text-warning">
              {t("proofsPending", { pending: r.pendingProofs, total: r.proofs.length })}
            </span>
          );
        }
        return <span className="text-muted-foreground">{t("proofsCount", { total: r.proofs.length })}</span>;
      },
    },
    dateColumn("submittedAt", t("col.submittedAt"), (r) => r.submittedAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (r) => accountName(r.verifiedByAdminId) ?? "-",
    },
  ];

  if (identity.loading || proofs.loading) return <CmsTableSkeleton columns={columns.length} />;
  const failed = identity.error ?? proofs.error;
  if (failed) {
    return (
      <CmsApiError
        error={failed}
        onRetry={() => {
          identity.reload();
          proofs.reload();
        }}
      />
    );
  }

  return (
    <CmsTable
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...STAGES.map((value) => ({ value, label: statusLabel("identity", value), count: count(value) })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: ShieldCheck, title: t("emptyIdentity"), body: t("emptyIdentityBody") }}
      leadingIcon={ShieldCheck}
      list={list}
      renderBulkActions={(ids) => {
        const open = submitted(ids);
        return open.length === 0 ? null : (
          <CmsButton icon={Check} onClick={() => approve(open)} size="sm">
            {t("approveSelected", { count: open.length })}
          </CmsButton>
        );
      }}
      rowHref={(r) => `${BASE}/review?id=${r.advisorId}`}
      searchPlaceholder={t("searchIdentity")}
    />
  );
}
