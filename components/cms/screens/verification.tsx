"use client";

import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { decideSkillProofs } from "@/lib/mock-db/actions";
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
 * what level) and skill proofs (documents backing a listed skill).
 */
export function VerificationScreen() {
  const t = useTranslations("cms.verification");
  const requests = useDatabase((db) => db.identityRequests);
  const proofs = useDatabase((db) => db.skillProofs);

  const tabs = [
    {
      value: "identity" as const,
      label: t("tab.identity"),
      count: requests.filter((r) => r.status === "submitted").length,
      alert: true,
    },
    {
      value: "skills" as const,
      label: t("tab.skills"),
      count: proofs.filter((p) => p.status === "pending").length,
      alert: true,
    },
  ];
  const kind = useQueryTab<Kind>(tabs);

  return (
    <CmsPage title={t("title")}>
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
      cell: (r) => <CmsPerson account={person(r.accountId)} detail={r.fullName} />,
    },
    {
      id: "credential",
      header: t("col.credential"),
      cell: (r) => (
        <span className="flex flex-col">
          <span className="text-highlighted">{r.credential}</span>
          <span className="text-xs">{r.field}</span>
        </span>
      ),
    },
    {
      id: "submittedAt",
      header: t("col.submittedAt"),
      sortable: true,
      cell: (r) => formatDateTime(r.submittedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (r) => <CmsStatus group="identity" value={r.status} />,
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
      onRowClick={(r) => router.push(`/admin/verification/review?id=${r.id}`)}
      searchPlaceholder={t("searchIdentity")}
      selectable={false}
    />
  );
}

function ProofTable({ proofs }: { readonly proofs: readonly SkillProof[] }) {
  const t = useTranslations("cms.verification");
  const actorId = useActorId();
  const person = useAccountLookup();
  const { confirm, prompt, toast } = useCmsFeedback();
  const statusOptions = useStatusOptions("proof");
  const rows = useMemo(() => queueOrder(proofs, "pending", (p) => p.submittedAt), [proofs]);

  const list = useCmsList(rows, {
    prefix: "s_",
    searchText: (p) => `${p.skill} ${p.documentName} ${person(p.accountId)?.name ?? ""}`,
    sortValue: (p, id) => (id === "submittedAt" ? timeValue(p.submittedAt) : p.skill),
    filters: [{ key: "status", test: (p, values) => values.includes(p.status) }],
  });

  async function approve(ids: readonly string[]) {
    const ok = await confirm({
      type: "success",
      title: t("approveProofTitle", { count: ids.length }),
      confirmLabel: t("approve"),
    });
    if (!ok) return;
    decideSkillProofs(ids, "approved", null, actorId);
    list.clearSelection();
    toast({ title: t("approvedProof", { count: ids.length }) });
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
    decideSkillProofs(ids, "rejected", note, actorId);
    list.clearSelection();
    toast({ color: "warning", title: t("rejectedProof", { count: ids.length }) });
  }

  const columns: ReadonlyArray<CmsColumn<SkillProof>> = [
    {
      id: "advisor",
      header: t("col.advisor"),
      cell: (p) => <CmsPerson account={person(p.accountId)} detail={person(p.accountId)?.email} />,
    },
    {
      id: "skill",
      header: t("col.skill"),
      sortable: true,
      cell: (p) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-highlighted">{p.skill}</span>
          <span className="flex items-center gap-1 font-latin text-xs">
            <FileText aria-hidden className="size-3.5" />
            {p.documentName}
          </span>
        </span>
      ),
    },
    {
      id: "submittedAt",
      header: t("col.submittedAt"),
      sortable: true,
      cell: (p) => formatDateTime(p.submittedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (p) => <CmsStatus group="proof" value={p.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "end",
      interactive: true,
      cell: (p) =>
        p.status === "pending" ? (
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
          <span className="text-xs">{p.decision?.note ?? ""}</span>
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
