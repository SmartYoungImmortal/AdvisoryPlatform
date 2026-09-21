"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
  ADMIN_MAX_LIMIT,
  listRefundCases,
  rejectRefundCase,
  type AdminRefundCase,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";

export const REFUNDS_KEY = "admin/refunds";

/**
 * The refund desk, from `GET /api/v1/admin/refunds`.
 *
 * `refund_cases` has no rows yet, so this queue is legitimately empty — an empty
 * list here is the state of the database, not a failed read.
 *
 * ## What a refund case carries, and what it does not
 *
 * `AdminRefundCaseResponseDto` is the invoice, the requester's display name, the
 * invoice amount in satang, the requester's own reason and the status. It does
 * **not** carry a booking reference, the service, the session time or the advisor,
 * so the four columns that showed them are gone: there is nothing to put in them
 * and nothing that would fill them (a booking reference would need the invoice
 * joined through to its appointment).
 *
 * Rejecting takes a reason, which the API validates and then only writes to its own
 * log — `refund_cases` has no column for it — so it never comes back on a row and
 * is not shown as though it had been stored.
 */
export function RefundsScreen() {
  const t = useTranslations("cms.refunds");
  const router = useRouter();
  const { prompt } = useCmsFeedback();
  const rule = useRuling();

  const fetcher = useCallback(
    (signal: AbortSignal) => listRefundCases({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const refunds = useResource<Paginated<AdminRefundCase>>(
    `${REFUNDS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => refunds.data?.items ?? [], [refunds.data]);
  const statusOptions = useApiStatusOptions("refund", ["OPEN", "APPROVED", "REJECTED"]);

  const list = useCmsList(items, {
    searchText: (r) => `${r.id} ${r.reason} ${r.requesterDisplayName}`,
    sortValue: (r, id) =>
      id === "amount" ? r.invoiceAmountSatang : timeValue(r.createdAt),
    filters: [{ key: "status", test: (r, values) => values.includes(r.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<AdminRefundCase>> = [
    {
      id: "request",
      header: t("col.request"),
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-latin font-medium text-highlighted">
            {r.id.slice(0, 8)}
          </span>
          <span className="font-latin text-xs">{r.invoiceId.slice(0, 8)}</span>
        </span>
      ),
    },
    {
      id: "requester",
      header: t("col.requester"),
      render: (r) => <CmsPerson account={{ name: r.requesterDisplayName }} />,
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
      render: (r) => formatBaht(r.invoiceAmountSatang),
    },
    {
      id: "requestedAt",
      header: t("col.requestedAt"),
      sortable: true,
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (r) => <CmsApiStatus group="refund" value={r.status} />,
    },
  ];

  if (refunds.loading) {
    return (
      <CmsPage title={t("title")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (refunds.error) {
    return (
      <CmsPage title={t("title")}>
        <CmsApiError error={refunds.error} onRetry={refunds.reload} />
      </CmsPage>
    );
  }

  return (
    <CmsPage title={t("title")}>
      <CmsTable
        bulkActions={(ids) => {
          const open = ids.filter(
            (id) => items.find((r) => r.id === id)?.status === "OPEN",
          );
          if (open.length === 0) return null;
          return (
            <CmsButton
              color="error"
              icon={X}
              onClick={async () => {
                const note = await prompt({
                  type: "danger",
                  title: t("rejectTitle", { count: open.length }),
                  inputLabel: t("reason"),
                  placeholder: t("rejectPlaceholder"),
                  confirmLabel: t("reject"),
                });
                if (note === null) return;
                await rule({
                  keyPrefix: REFUNDS_KEY,
                  onDone: list.clearSelection,
                  run: open.map((id) => () => rejectRefundCase(id, note)),
                  success: t("rejected", { count: open.length }),
                  successColor: "warning",
                });
              }}
            >
              {t("rejectSelected", { count: open.length })}
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
        onRowClick={(r) => router.push(`/admin/refunds/review?id=${r.id}`)}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}
