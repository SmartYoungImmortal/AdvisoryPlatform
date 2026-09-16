"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsBadge } from "@/components/cms/badge";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { IdentityRequest, SkillProof } from "@/lib/mock-db/types";

type Kind = "identity" | "skills";

/** Waiting items first, then newest — a review queue reads top-down. */
function queueOrder<T extends { readonly status: string }>(
  rows: readonly T[],
  waiting: string,
  at: (row: T) => string,
): readonly T[] {
  return [...rows].sort((a, b) => {
    const rank = Number(b.status === waiting) - Number(a.status === waiting);
    return rank !== 0 ? rank : at(b).localeCompare(at(a));
  });
}

/**
 * The verification desk: identity requests (who may become an advisor, and at
 * what level) and skill proofs (documents backing a listed skill). Each row
 * opens its own page, where the decision is made.
 */
export function VerificationScreen() {
  const t = useTranslations("cms.verification");
  const requests = useDatabase((db) => db.identityRequests);
  const proofs = useDatabase((db) => db.skillProofs);
  const waiting =
    requests.filter((r) => r.status === "submitted").length +
    proofs.filter((p) => p.status === "pending").length;

  const tabs = [
    { value: "identity" as const, label: t("tab.identity") },
    { value: "skills" as const, label: t("tab.skills") },
  ];
  const kind = useQueryTab<Kind>(tabs);

  return (
    <CmsPage
      badge={
        <CmsBadge className="font-latin" variant="subtle">
          {t("waitingBadge", { count: waiting })}
        </CmsBadge>
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      {kind === "identity" ? <IdentityTable requests={requests} /> : <ProofTable proofs={proofs} />}
    </CmsPage>
  );
}

function IdentityTable({ requests }: { readonly requests: readonly IdentityRequest[] }) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const person = useAccountLookup();
  const statusOptions = useStatusOptions("identity").filter((o) => o.value !== "none");
  const rows = useMemo(() => queueOrder(requests, "submitted", (r) => r.submittedAt), [requests]);

  const list = useCmsList(rows, {
    prefix: "i_",
    searchText: (r) => `${r.fullName} ${person(r.accountId)?.email ?? ""} ${r.credential} ${r.field}`,
    sortValue: (r, id) => (id === "submittedAt" ? timeValue(r.submittedAt) : r.fullName),
    filters: [{ key: "status", test: (r, values) => values.includes(r.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<IdentityRequest>> = [
    {
      id: "applicant",
      header: t("col.applicant"),
      sortable: true,
      render: (r) => person(r.accountId)?.name ?? r.fullName,
    },
    { id: "credential", header: t("col.credential"), render: (r) => r.credential },
    { id: "field", header: t("col.field"), render: (r) => r.field },
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
      render: (r) => <CmsStatus group="identity" value={r.status} />,
    },
  ];

  return (
    <CmsTable
      columns={columns}
      filters={
        <CmsFilterMenu
          className="w-36"
          label={t("allStatuses")}
          onChange={(values) => list.setFilter("status", values)}
          options={statusOptions}
          values={list.filterValues.status ?? []}
        />
      }
      list={list}
      onRowClick={(r) => router.push(`/admin/verification/review?id=${r.id}`)}
      searchPlaceholder={t("searchIdentity")}
      selectable={false}
    />
  );
}

function ProofTable({ proofs }: { readonly proofs: readonly SkillProof[] }) {
  const t = useTranslations("cms.verification");
  const router = useRouter();
  const person = useAccountLookup();
  const statusOptions = useStatusOptions("proof");
  const rows = useMemo(() => queueOrder(proofs, "pending", (p) => p.submittedAt), [proofs]);

  const list = useCmsList(rows, {
    prefix: "s_",
    searchText: (p) => `${p.skill} ${p.documentName} ${person(p.accountId)?.name ?? ""}`,
    sortValue: (p, id) => (id === "submittedAt" ? timeValue(p.submittedAt) : p.skill),
    filters: [{ key: "status", test: (p, values) => values.includes(p.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<SkillProof>> = [
    { id: "skill", header: t("col.skill"), sortable: true, render: (p) => p.skill },
    { id: "advisor", header: t("col.advisor"), render: (p) => person(p.accountId)?.name ?? "—" },
    {
      id: "document",
      header: t("col.document"),
      className: "font-latin",
      render: (p) => <span className="block max-w-56 truncate">{p.documentName}</span>,
    },
    {
      id: "submittedAt",
      header: t("col.submittedAt"),
      sortable: true,
      render: (p) => formatDateTime(p.submittedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (p) => <CmsStatus group="proof" value={p.status} />,
    },
  ];

  return (
    <CmsTable
      columns={columns}
      filters={
        <CmsFilterMenu
          className="w-36"
          label={t("allStatuses")}
          onChange={(values) => list.setFilter("status", values)}
          options={statusOptions}
          values={list.filterValues.status ?? []}
        />
      }
      list={list}
      onRowClick={(p) => router.push(`/admin/verification/proof?id=${p.id}`)}
      searchPlaceholder={t("searchProof")}
      selectable={false}
    />
  );
}
