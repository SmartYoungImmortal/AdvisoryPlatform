"use client";

import { Receipt, X } from "lucide-react";
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
  listRefundCases,
  rejectRefundCase,
  type AdminRefundCase,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, timeValue } from "@/lib/mock-db/format";

const REFUNDS_KEY = ADMIN_KEYS.refunds;

/** Waiting first, then newest. */
function queueOrder(rows: readonly AdminRefundCase[]): readonly AdminRefundCase[] {
  return [...rows].sort((a, b) => {
    const rank = Number(b.status === "OPEN") - Number(a.status === "OPEN");
    return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * The refund desk, from `GET /api/v1/admin/refunds`.
 *
 * ## What a refund case carries, and what it does not
 *
 * `AdminRefundCaseResponseDto` is the invoice, the requester's display name, the
 * invoice amount in satang, the requester's own reason and the status. It does
 * **not** carry a booking reference, the service, the session time or the
 * advisor — the record page reads those from the case's `…/context`.
 *
 * Rejecting takes a reason, which the API validates and then only writes to its own
 * log — `refund_cases` has no column for it — so it never comes back on a row and
 * is not shown as though it had been stored.
 */
export function RefundsScreen() {
  const t = useTranslations("cms.refunds");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
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
  const items = useMemo(() => queueOrder(refunds.data?.items ?? []), [refunds.data]);
  const count = useMemo(() => countBy(items, (r) => r.status), [items]);

  const list = useCmsList(items, {
    searchText: (r) => `${r.reason} ${r.requesterDisplayName}`,
    sortValue: (r, id) => {
      if (id === "amount") return r.invoiceAmountSatang;
      if (id === "status") return r.status;
      return timeValue(r.createdAt);
    },
    filters: [{ key: "status", test: (r, values) => values.includes(r.status) }],
  });

  const columns: ReadonlyArray<CmsColumn<AdminRefundCase>> = [
    {
      id: "requester",
      header: t("col.requester"),
      primary: true,
      render: (r) => accountName(r.requestedByUserId) ?? r.requesterDisplayName,
    },
    {
      id: "reason",
      header: t("col.reason"),
      className: "text-muted-foreground",
      render: (r) => <span className="block max-w-80 truncate">{r.reason}</span>,
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      align: "end",
      className: "font-latin",
      render: (r) => formatBaht(r.invoiceAmountSatang),
    },
    statusColumn(t("col.status"), (r) => <CmsStatus group="refund" value={r.status} />),
    dateColumn("createdAt", t("col.requestedAt"), (r) => r.createdAt),
    {
      id: "reviewer",
      header: t("col.reviewer"),
      className: "text-muted-foreground",
      render: (r) => accountName(r.reviewedByAdminId) ?? "-",
    },
  ];

  return (
    <CmsPage title={t("title")}>
      {refunds.loading ? (
        <CmsTableSkeleton columns={columns.length} />
      ) : refunds.error ? (
        <CmsApiError error={refunds.error} onRetry={refunds.reload} />
      ) : (
        <CmsTable
          bulkActions={(ids) => {
            const open = ids.filter((id) => items.find((r) => r.id === id)?.status === "OPEN");
            if (open.length === 0) return null;
            return (
              <CmsButton
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
                  });
                }}
                size="sm"
                variant="danger-soft"
              >
                {t("rejectSelected", { count: open.length })}
              </CmsButton>
            );
          }}
          chips={
            <CmsChips
              label={t("col.status")}
              onChange={(value) => list.setFilter("status", value ? [value] : [])}
              options={[
                { value: "", label: tTable("all"), count: count("") },
                ...(["OPEN", "APPROVED", "REJECTED"] as const).map((value) => ({
                  value,
                  label: statusLabel("refund", value),
                  count: count(value),
                })),
              ]}
              value={list.filterValues.status?.[0] ?? ""}
            />
          }
          columns={columns}
          empty={{ icon: Receipt, title: t("empty"), body: t("emptyBody") }}
          list={list}
          rowHref={(r) => `/admin/refunds/review?id=${r.id}`}
          searchPlaceholder={t("search")}
        />
      )}
    </CmsPage>
  );
}
