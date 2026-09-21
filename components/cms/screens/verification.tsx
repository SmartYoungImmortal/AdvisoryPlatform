"use client";

import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsPage } from "@/components/cms/layout";
import { CmsApiStatus, useApiStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  approveSkillProof,
  listIdentityVerifications,
  listSkillProofs,
  rejectSkillProof,
  type IdentityVerification,
  type SkillProof,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatDateTime, timeValue } from "@/lib/mock-db/format";

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
  const router = useRouter();
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
    sortValue: (r, id) => (id === "submittedAt" ? timeValue(r.submittedAt) : r.displayName),
    filters: [
      { key: "status", test: (r, values) => values.includes(r.verificationStatus) },
    ],
  });

  type Row = (typeof keyed)[number];

  const columns: ReadonlyArray<CmsColumn<Row>> = [
    {
      id: "applicant",
      header: t("col.applicant"),
      sortable: true,
      render: (r) => <CmsPerson account={{ name: r.displayName }} detail={r.email} />,
    },
    {
      id: "submittedAt",
      header: t("col.submittedAt"),
      sortable: true,
      render: (r) => formatDateTime(r.submittedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (r) => <CmsApiStatus group="identity" value={r.verificationStatus} />,
    },
  ];

  return (
    <CmsTable
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
      selectable={false}
    />
  );
}

/**
 * Skill proofs.
 *
 * `objectKey` is a SeaweedFS key with no admin route that presigns it, so the
 * document is named and not opened — there is no URL to open it with. Approving
 * takes no body; rejecting takes a reason, capped at 4000 characters by the API.
 */
function ProofTable({ proofs }: { readonly proofs: readonly SkillProof[] }) {
  const t = useTranslations("cms.verification");
  const { confirm, prompt } = useCmsFeedback();
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
    sortValue: (p, id) => (id === "submittedAt" ? timeValue(p.createdAt) : p.skillName),
    filters: [{ key: "status", test: (p, values) => values.includes(p.reviewStatus) }],
  });

  async function approve(ids: readonly string[]) {
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

  async function reject(ids: readonly string[]) {
    const note = await prompt({
      type: "danger",
      title: t("rejectProofTitle", { count: ids.length }),
      inputLabel: t("reason"),
      placeholder: t("rejectPlaceholder"),
      confirmLabel: t("reject"),
    });
    if (note === null) return;
    await rule({
      keyPrefix: PROOFS_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => rejectSkillProof(id, note)),
      success: t("rejectedProof", { count: ids.length }),
      successColor: "warning",
    });
  }

  const columns: ReadonlyArray<CmsColumn<SkillProof>> = [
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (p) => <CmsPerson account={{ name: p.advisorDisplayName }} />,
    },
    {
      id: "skill",
      header: t("col.skill"),
      sortable: true,
      render: (p) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-highlighted">{p.skillName}</span>
          <span className="flex items-center gap-1 font-latin text-xs">
            <FileText aria-hidden className="size-3.5" />
            {p.originalFileName}
          </span>
        </span>
      ),
    },
    {
      id: "submittedAt",
      header: t("col.submittedAt"),
      sortable: true,
      render: (p) => formatDateTime(p.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (p) => <CmsApiStatus group="proof" value={p.reviewStatus} />,
    },
    {
      id: "actions",
      header: "",
      align: "end",
      interactive: true,
      render: (p) =>
        p.reviewStatus === "PENDING" ? (
          <span className="inline-flex gap-1">
            <CmsButton
              aria-label={t("approve")}
              color="success"
              icon={Check}
              onClick={() => approve([p.id])}
              variant="soft"
            />
            <CmsButton
              aria-label={t("reject")}
              color="error"
              icon={X}
              onClick={() => reject([p.id])}
              variant="soft"
            />
          </span>
        ) : (
          <span className="text-xs">{p.rejectionReason ?? ""}</span>
        ),
    },
  ];

  return (
    <CmsTable
      bulkActions={(ids) => (
        <>
          <CmsButton color="success" icon={Check} onClick={() => approve(ids)}>
            {t("approveSelected", { count: ids.length })}
          </CmsButton>
          <CmsButton color="error" icon={X} onClick={() => reject(ids)}>
            {t("rejectSelected", { count: ids.length })}
          </CmsButton>
        </>
      )}
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
      searchPlaceholder={t("searchProof")}
    />
  );
}
