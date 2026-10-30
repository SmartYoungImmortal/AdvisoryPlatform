"use client";

import { Check, FileBadge, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useDashboardCounts } from "@/components/cms/dashboard-data";
import { useCmsFeedback } from "@/components/cms/feedback";
import { usePageTab } from "@/components/cms/hooks";
import { CmsPage, CmsPageTabs } from "@/components/cms/layout";
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
  approveSkillProof,
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
const TABS = ["identity", "skills"] as const;

/** Waiting items first, then newest — a review queue reads top-down. */
function queueOrder<T>(
  rows: readonly T[],
  waiting: (row: T) => boolean,
  at: (row: T) => string | null,
): readonly T[] {
  return [...rows].sort((a, b) => {
    const rank = Number(waiting(b)) - Number(waiting(a));
    return rank !== 0 ? rank : (at(b) ?? "").localeCompare(at(a) ?? "");
  });
}

/**
 * Verifying advisors: one desk, two tabs. Identity checks
 * (`GET /api/v1/admin/identity-verifications`) and skill documents
 * (`GET /api/v1/admin/skill-proofs`) used to be two sidebar entries; to the
 * person doing them they are one job — is this advisor who they say, and can
 * they do what they say — so they are the two tabs of one page, `?tab=skills`
 * for the second. Each tab counts what is still waiting in it.
 *
 * An empty queue is the state of the database, not a failure: nothing can put
 * a row in the identity queue until advisors can submit a document, and the
 * table says so in its empty state.
 */
export function VerificationScreen() {
  const t = useTranslations("cms.verification");
  const tab = usePageTab(TABS);
  const counts = useDashboardCounts();

  return (
    <CmsPage
      tabs={
        <CmsPageTabs
          current={tab}
          label={t("title")}
          tabs={[
            { key: "identity", label: t("tab.identity"), href: BASE, count: counts.identity },
            { key: "skills", label: t("tab.skills"), href: `${BASE}?tab=skills`, count: counts.proofs },
          ]}
        />
      }
      title={t("title")}
    >
      {tab === "identity" ? <IdentityQueue /> : <ProofQueue />}
    </CmsPage>
  );
}

function IdentityQueue() {
  const fetcher = useCallback(
    (signal: AbortSignal) => listIdentityVerifications({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const identity = useResource<Paginated<IdentityVerification>>(
    `${IDENTITY_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const requests = useMemo(() => identity.data?.items ?? [], [identity.data]);

  if (identity.loading) return <CmsTableSkeleton columns={5} />;
  if (identity.error) return <CmsApiError error={identity.error} onRetry={identity.reload} />;
  return <IdentityTable requests={requests} />;
}

function ProofQueue() {
  const fetcher = useCallback(
    (signal: AbortSignal) => listSkillProofs({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const proofs = useResource<Paginated<SkillProof>>(
    `${PROOFS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => proofs.data?.items ?? [], [proofs.data]);

  if (proofs.loading) return <CmsTableSkeleton columns={6} />;
  if (proofs.error) return <CmsApiError error={proofs.error} onRetry={proofs.reload} />;
  return <ProofTable proofs={items} />;
}

/**
 * Identity requests.
 *
 * A row is keyed by `advisorId` — `advisor_identity` has no surrogate key — so the
 * review link carries the advisor id, not a request id. `fullName`, birth date,
 * national id, credential and field are not on `IdentityVerificationResponseDto`,
 * so the applicant is named by display name and email, which is what the route
 * returns.
 */
function IdentityTable({ requests }: { readonly requests: readonly IdentityVerification[] }) {
  const t = useTranslations("cms.verification");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const rows = useMemo(
    () =>
      queueOrder(
        requests,
        (r) => r.verificationStatus === "SUBMITTED",
        (r) => r.submittedAt,
      ),
    [requests],
  );
  const count = useMemo(() => countBy(requests, (r) => r.verificationStatus), [requests]);

  // `useCmsList` keys rows by `id`; this queue's key is the advisor's id.
  const keyed = useMemo(() => rows.map((r) => ({ ...r, id: r.advisorId })), [rows]);
  const list = useCmsList(keyed, {
    prefix: "i_",
    searchText: (r) => `${r.displayName} ${r.email}`,
    sortValue: (r, id) => {
      if (id === "submittedAt") return timeValue(r.submittedAt);
      if (id === "status") return r.verificationStatus;
      return r.displayName;
    },
    filters: [
      { key: "status", test: (r, values) => values.includes(r.verificationStatus) },
    ],
  });

  type Row = (typeof keyed)[number];

  /** Only rows still waiting are approved — a ruled one would answer 409. */
  const waiting = (ids: readonly string[]) =>
    ids.filter((id) => keyed.find((r) => r.id === id)?.verificationStatus === "SUBMITTED");

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

  const columns: ReadonlyArray<CmsColumn<Row>> = [
    {
      id: "applicant",
      header: t("col.applicant"),
      sortable: true,
      primary: true,
      render: (r) => accountName(r.advisorId) ?? r.displayName,
    },
    {
      id: "email",
      header: t("col.email"),
      className: "font-latin text-muted-foreground",
      render: (r) => r.email,
    },
    statusColumn(t("col.status"), (r) => (
      <CmsStatus group="identity" value={r.verificationStatus} />
    )),
    dateColumn("submittedAt", t("col.submittedAt"), (r) => r.submittedAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (r) => accountName(r.verifiedByAdminId) ?? "-",
    },
  ];

  return (
    <CmsTable
      bulkActions={(ids) => {
        const open = waiting(ids);
        return open.length === 0 ? null : (
          <CmsButton icon={Check} onClick={() => approve(open)} size="sm">
            {t("approveSelected", { count: open.length })}
          </CmsButton>
        );
      }}
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...(["SUBMITTED", "VERIFIED", "REJECTED"] as const).map((value) => ({
              value,
              label: statusLabel("identity", value),
              count: count(value),
            })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: ShieldCheck, title: t("emptyIdentity"), body: t("emptyIdentityBody") }}
      list={list}
      rowHref={(r) => `${BASE}/review?id=${r.advisorId}`}
      searchPlaceholder={t("searchIdentity")}
    />
  );
}

/**
 * Skill documents. A row opens `/admin/verification/proof`, where the document
 * is shown and a rejection carries its reason. Approving several at once stays
 * a bulk action: it takes no body.
 */
function ProofTable({ proofs }: { readonly proofs: readonly SkillProof[] }) {
  const t = useTranslations("cms.verification");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const rows = useMemo(
    () => queueOrder(proofs, (p) => p.reviewStatus === "PENDING", (p) => p.createdAt),
    [proofs],
  );
  const count = useMemo(() => countBy(proofs, (p) => p.reviewStatus), [proofs]);

  const list = useCmsList(rows, {
    prefix: "s_",
    searchText: (p) => `${p.skillName} ${p.originalFileName} ${p.advisorDisplayName}`,
    sortValue: (p, id) => {
      if (id === "createdAt") return timeValue(p.createdAt);
      if (id === "status") return p.reviewStatus;
      return p.skillName;
    },
    filters: [{ key: "status", test: (p, values) => values.includes(p.reviewStatus) }],
  });

  /** Only proofs still pending are approved — a ruled one would answer 409. */
  const pendingIds = (ids: readonly string[]) =>
    ids.filter((id) => rows.find((p) => p.id === id)?.reviewStatus === "PENDING");

  async function approve(ids: readonly string[]) {
    if (ids.length === 0) return;
    const ok = await confirm({
      type: "success",
      title: t("approveProofTitle", { count: ids.length }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: PROOFS_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => approveSkillProof(id)),
      success: t("approvedProof", { count: ids.length }),
    });
  }

  const columns: ReadonlyArray<CmsColumn<SkillProof>> = [
    { id: "skill", header: t("col.skill"), sortable: true, primary: true, render: (p) => p.skillName },
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (p) => accountName(p.advisorId) ?? p.advisorDisplayName,
    },
    {
      id: "file",
      header: t("col.file"),
      className: "font-latin text-muted-foreground",
      render: (p) => <span className="block max-w-56 truncate">{p.originalFileName}</span>,
    },
    statusColumn(t("col.status"), (p) => <CmsStatus group="proof" value={p.reviewStatus} />),
    dateColumn("createdAt", t("col.submittedAt"), (p) => p.createdAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (p) => accountName(p.reviewedByAdminId) ?? "-",
    },
  ];

  return (
    <CmsTable
      bulkActions={(ids) => {
        const open = pendingIds(ids);
        return open.length === 0 ? null : (
          <CmsButton icon={Check} onClick={() => approve(open)} size="sm">
            {t("approveSelected", { count: open.length })}
          </CmsButton>
        );
      }}
      chips={
        <CmsChips
          label={t("col.status")}
          onChange={(value) => list.setFilter("status", value ? [value] : [])}
          options={[
            { value: "", label: tTable("all"), count: count("") },
            ...(["PENDING", "APPROVED", "REJECTED"] as const).map((value) => ({
              value,
              label: statusLabel("proof", value),
              count: count(value),
            })),
          ]}
          value={list.filterValues.status?.[0] ?? ""}
        />
      }
      columns={columns}
      empty={{ icon: FileBadge, title: t("emptyProofs"), body: t("emptyProofsBody") }}
      list={list}
      rowHref={(p) => `${BASE}/proof?id=${p.id}`}
      searchPlaceholder={t("searchProof")}
    />
  );
}
