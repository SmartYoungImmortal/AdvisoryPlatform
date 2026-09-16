"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsBadge } from "@/components/cms/badge";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { RefundRequest, RefundStatus } from "@/lib/mock-db/types";

type Tab = RefundStatus | "all";

/**
 * The refund desk — requests land here from a booking's cancel/refund flow and
 * are decided on their own page.
 */
export function RefundsScreen() {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const person = useAccountLookup();
  const refunds = useDatabase((db) => db.refunds);
  const pending = refunds.filter((r) => r.status === "pending").length;

  const tabs = (["pending", "approved", "rejected", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
  }));
  const tab = useQueryTab<Tab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? refunds : refunds.filter((r) => r.status === tab)),
    [refunds, tab],
  );

  const list = useCmsList(rows, {
    searchText: (r) =>
      `${r.id} ${r.bookingRef} ${r.serviceTitle} ${r.reason} ${person(r.requesterId)?.name ?? ""} ${person(r.advisorId)?.name ?? ""}`,
    sortValue: (r, id) => (id === "amount" ? r.paidSatang : timeValue(r.requestedAt)),
  });

  const columns: ReadonlyArray<CmsColumn<RefundRequest>> = [
    { id: "request", header: t("col.request"), className: "font-latin", render: (r) => r.bookingRef },
    { id: "requester", header: t("col.requester"), render: (r) => person(r.requesterId)?.name ?? "—" },
    {
      id: "service",
      header: t("col.service"),
      render: (r) => <span className="block max-w-56 truncate">{r.serviceTitle}</span>,
    },
    {
      id: "reason",
      header: t("col.reason"),
      render: (r) => <span className="block max-w-64 truncate">{r.reason}</span>,
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      className: "font-latin",
      render: (r) =>
        r.status === "approved" && r.refundedSatang !== null && r.refundedSatang !== r.paidSatang
          ? `${formatBaht(r.refundedSatang)} / ${formatBaht(r.paidSatang)}`
          : formatBaht(r.paidSatang),
    },
    {
      id: "requestedAt",
      header: t("col.requestedAt"),
      sortable: true,
      render: (r) => formatDateTime(r.requestedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (r) => <CmsStatus group="refund" value={r.status} />,
    },
  ];

  return (
    <CmsPage
      badge={
        <CmsBadge className="font-latin" variant="subtle">
          {t("pendingBadge", { count: pending })}
        </CmsBadge>
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        list={list}
        onRowClick={(r) => router.push(`/admin/refunds/review?id=${r.id}`)}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
