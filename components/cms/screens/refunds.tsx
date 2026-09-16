"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup, useActorId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsStatus } from "@/components/cms/status";
import { CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import { rejectRefunds } from "@/lib/mock-db/actions";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { RefundRequest, RefundStatus } from "@/lib/mock-db/types";

type Tab = RefundStatus | "all";

/** The refund desk — requests land here from a booking's cancel/refund flow. */
export function RefundsScreen() {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const actorId = useActorId();
  const person = useAccountLookup();
  const { prompt, toast } = useCmsFeedback();
  const refunds = useDatabase((db) => db.refunds);

  const tabs = (["pending", "approved", "rejected", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
    count:
      value === "pending" ? refunds.filter((r) => r.status === "pending").length : undefined,
    alert: true,
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
    {
      id: "request",
      header: t("col.request"),
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-latin font-medium text-highlighted">{r.id}</span>
          <span className="font-latin text-xs">{r.bookingRef}</span>
        </span>
      ),
    },
    {
      id: "requester",
      header: t("col.requester"),
      cell: (r) => <CmsPerson account={person(r.requesterId)} detail={person(r.requesterId)?.email} />,
    },
    {
      id: "service",
      header: t("col.service"),
      cell: (r) => (
        <span className="flex max-w-56 flex-col">
          <span className="truncate text-highlighted">{r.serviceTitle}</span>
          <span className="truncate text-xs">{person(r.advisorId)?.name ?? "—"}</span>
        </span>
      ),
    },
    {
      id: "reason",
      header: t("col.reason"),
      cell: (r) => <span className="block max-w-64 truncate">{r.reason}</span>,
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      className: "font-latin",
      cell: (r) =>
        r.status === "approved" && r.refundedSatang !== null && r.refundedSatang !== r.paidSatang
          ? `${formatBaht(r.refundedSatang)} / ${formatBaht(r.paidSatang)}`
          : formatBaht(r.paidSatang),
    },
    {
      id: "requestedAt",
      header: t("col.requestedAt"),
      sortable: true,
      cell: (r) => formatDateTime(r.requestedAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (r) => <CmsStatus group="refund" value={r.status} />,
    },
  ];

  return (
    <CmsPage title={t("title")}>
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => {
          const pendingIds = ids.filter((id) => refunds.find((r) => r.id === id)?.status === "pending");
          return pendingIds.length > 0 ? (
            <CmsButton
              color="error"
              icon={X}
              onClick={async () => {
                const note = await prompt({
                  type: "danger",
                  title: t("rejectTitle", { count: pendingIds.length }),
                  inputLabel: t("reason"),
                  placeholder: t("rejectPlaceholder"),
                  confirmLabel: t("reject"),
                });
                if (note === null) return;
                rejectRefunds(pendingIds, note, actorId);
                list.clearSelection();
                toast({ color: "warning", title: t("rejected", { count: pendingIds.length }) });
              }}
            >
              {t("rejectSelected", { count: pendingIds.length })}
            </CmsButton>
          ) : null;
        }}
        columns={columns}
        list={list}
        onRowClick={(r) => router.push(`/admin/refunds/review?id=${r.id}`)}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
