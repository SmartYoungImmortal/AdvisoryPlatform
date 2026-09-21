"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { CmsApiStatus, useApiStatusOptions } from "@/components/cms/status";
import { useAccountName, useAuditHeaders } from "@/components/cms/people";
import {
  auditColumns,
  CmsFilterMenu,
  CmsTable,
  createdColumn,
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
 * The verification desk, from `GET /api/v1/admin/identity-verifications` and
 * `GET /api/v1/admin/skill-proofs`.
 *
 * ## Both queues are empty, and that is the database, not a failure
 *
 * `advisor_identity` and `skill_proof_documents` have no rows, and nothing can put
 * one in the identity queue yet: there is no advisor-facing submission endpoint, so
 * no advisor can send an identity document at all. The empty state is therefore the
 * honest state — an empty list here is not an error, and the table says "ยังไม่มี
 * รายการ" rather than pretending something went wrong.
 *
 * The two queues are two collections, so they are two pages — `/admin/verification`
 * and `/admin/skill-proofs`, each its own sidebar entry — the way Nexus gives
 * Blogs and Blog Categories one entry apiece rather than tabs on one screen.
 */
export function VerificationScreen() {
  const t = useTranslations("cms.verification");
  const fetcher = useCallback(
    (signal: AbortSignal) => listIdentityVerifications({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const identity = useResource<Paginated<IdentityVerification>>(
    `${IDENTITY_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const requests = useMemo(() => identity.data?.items ?? [], [identity.data]);

  return (
    <CmsPage title={t("title")}>
      {identity.loading ? (
        <CmsTableSkeleton columns={3} />
      ) : identity.error ? (
        <CmsApiError error={identity.error} onRetry={identity.reload} />
      ) : (
        <IdentityTable requests={requests} />
      )}
    </CmsPage>
  );
}

/** Skill proofs — the second verification queue, on its own page. */
export function SkillProofsScreen() {
  const t = useTranslations("cms.verification");
  const fetcher = useCallback(
    (signal: AbortSignal) => listSkillProofs({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const proofs = useResource<Paginated<SkillProof>>(
    `${PROOFS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => proofs.data?.items ?? [], [proofs.data]);

  return (
    <CmsPage title={t("tab.skills")}>
      {proofs.loading ? (
        <CmsTableSkeleton columns={5} />
      ) : proofs.error ? (
        <CmsApiError error={proofs.error} onRetry={proofs.reload} />
      ) : (
        <ProofTable proofs={items} />
      )}
    </CmsPage>
  );
}

/**
 * Identity requests.
 *
 * A row is keyed by `advisorId` — `advisor_identity` has no surrogate key — so the
 * review link carries the advisor id, not a request id. `fullName`, birth date,
 * national id, credential and field are not on `IdentityVerificationResponseDto`,
 * so the credential column is gone: the applicant is named by display name and
 * email, which is what the route returns.
 */
function IdentityTable({ requests }: { readonly requests: readonly IdentityVerification[] }) {
  const t = useTranslations("cms.verification");
  const tUsers = useTranslations("cms.users");
  const tTable = useTranslations("cms.table");
  const audit = useAuditHeaders();
  const accountName = useAccountName();
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const statusOptions = useApiStatusOptions("identity", [
    "SUBMITTED",
    "VERIFIED",
    "REJECTED",
  ]);
  const rows = useMemo(
    () =>
      queueOrder(
        requests,
        (r) => r.verificationStatus === "SUBMITTED",
        (r) => r.submittedAt,
      ),
    [requests],
  );

  // `useCmsList` keys rows by `id`; this queue's key is the advisor's id.
  const keyed = useMemo(() => rows.map((r) => ({ ...r, id: r.advisorId })), [rows]);
  const list = useCmsList(keyed, {
    prefix: "i_",
    searchText: (r) => `${r.displayName} ${r.email}`,
    sortValue: (r, id) => {
      if (id === "createdAt") return timeValue(r.submittedAt);
      if (id === "status") return r.verificationStatus;
      return r.displayName;
    },
    filters: [
      { key: "status", test: (r, values) => values.includes(r.verificationStatus) },
    ],
  });

  type Row = (typeof keyed)[number];

  /**
   * Approving takes no body, so several go at once; a rejection needs its reason.
   * Only rows still waiting are approved — a ruled one would answer 409.
   */
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

  // A submission's "created" is when it was sent — the row has no other date.
  const columns: ReadonlyArray<CmsColumn<Row>> = [
    createdColumn(tTable("createdAt"), (r) => r.submittedAt),
    statusColumn(t("col.status"), (r) => (
      <CmsApiStatus group="identity" value={r.verificationStatus} />
    )),
    {
      id: "applicant",
      header: t("col.applicant"),
      sortable: true,
      render: (r) => accountName(r.advisorId) ?? r.displayName,
    },
    { id: "email", header: tUsers("col.email"), className: "font-latin", render: (r) => r.email },
    // The applicant sends it; the admin who ruled is the last to touch it.
    ...auditColumns<Row>(
      audit,
      (r) => accountName(r.advisorId) ?? r.displayName,
      (r) => accountName(r.verifiedByAdminId),
    ),
  ];

  return (
    <CmsTable
      bulkActions={(ids) => {
        const open = waiting(ids);
        // Nothing selected is still waiting: no action to offer.
        return open.length === 0 ? null : (
          <CmsButton color="success" icon={Check} onClick={() => approve(open)}>
            {t("approveSelected", { count: open.length })}
          </CmsButton>
        );
      }}
      columns={columns}
      filters={
        <CmsFilterMenu
          label={t("allStatuses")}
          onChange={(values) => list.setFilter("status", values)}
          options={statusOptions}
          values={list.filterValues.status ?? []}
        />
      }
      list={list}
      onRowClick={(r) => router.push(`/admin/verification/review?id=${r.advisorId}`)}
      searchPlaceholder={t("searchIdentity")}
    />
  );
}

/**
 * Skill proofs. A row opens `/admin/skill-proofs/review`, where the document is
 * shown and a rejection carries its reason — no inline buttons, no prompt.
 * Approving several at once stays a bulk action: it takes no body.
 */
function ProofTable({ proofs }: { readonly proofs: readonly SkillProof[] }) {
  const t = useTranslations("cms.verification");
  const tTable = useTranslations("cms.table");
  const audit = useAuditHeaders();
  const accountName = useAccountName();
  const router = useRouter();
  const { confirm } = useCmsFeedback();
  const rule = useRuling();
  const statusOptions = useApiStatusOptions("proof", ["PENDING", "APPROVED", "REJECTED"]);
  const rows = useMemo(
    () => queueOrder(proofs, (p) => p.reviewStatus === "PENDING", (p) => p.createdAt),
    [proofs],
  );

  const list = useCmsList(rows, {
    prefix: "s_",
    searchText: (p) =>
      `${p.skillName} ${p.originalFileName} ${p.advisorDisplayName}`,
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
    createdColumn(tTable("createdAt"), (p) => p.createdAt),
    statusColumn(t("col.status"), (p) => (
      <CmsApiStatus group="proof" value={p.reviewStatus} />
    )),
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (p) => accountName(p.advisorId) ?? p.advisorDisplayName,
    },
    { id: "skill", header: t("col.skill"), sortable: true, render: (p) => p.skillName },
    {
      id: "file",
      header: t("col.file"),
      className: "font-latin",
      render: (p) => <span className="block max-w-64 truncate">{p.originalFileName}</span>,
    },
    ...auditColumns<SkillProof>(
      audit,
      (p) => accountName(p.advisorId) ?? p.advisorDisplayName,
      (p) => accountName(p.reviewedByAdminId),
    ),
  ];

  return (
    <CmsTable
      bulkActions={(ids) => {
        const open = pendingIds(ids);
        // Nothing selected is still pending: no action to offer.
        return open.length === 0 ? null : (
          <CmsButton color="success" icon={Check} onClick={() => approve(open)}>
            {t("approveSelected", { count: open.length })}
          </CmsButton>
        );
      }}
      columns={columns}
      onRowClick={(p) => router.push(`/admin/skill-proofs/review?id=${p.id}`)}
      filters={
        <CmsFilterMenu
          label={t("allStatuses")}
          onChange={(values) => list.setFilter("status", values)}
          options={statusOptions}
          values={list.filterValues.status ?? []}
        />
      }
      list={list}
      searchPlaceholder={t("searchProof")}
    />
  );
}
