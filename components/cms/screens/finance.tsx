"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsQueryTabs, useQueryTab } from "@/components/cms/query-tabs";
import { CmsApiStatus, CmsStatus, useStatusOptions } from "@/components/cms/status";
import { CmsFilterMenu, CmsTable, type CmsColumn } from "@/components/cms/table";
import { useCmsList } from "@/components/cms/use-cms-list";
import {
  ADMIN_MAX_LIMIT,
  listPayouts,
  markPayoutFailed,
  markPayoutPaid,
  type AdminPayout,
  type AdminPayoutStatus,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Transaction } from "@/lib/mock-db/types";

type PayoutTab = "pending" | "failed" | "paid" | "all";

const TAB_STATUS: Record<Exclude<PayoutTab, "all">, AdminPayoutStatus> = {
  pending: "PENDING",
  failed: "FAILED",
  paid: "PAID",
};

const PAYOUTS_KEY = "admin/payouts";

/**
 * Payouts, from `GET /api/v1/admin/payouts`.
 *
 * `payouts` has no rows yet, so this queue is legitimately empty.
 *
 * Payouts are manual in this phase (ER.README): an admin transfers the money, then
 * marks the row paid — or failed.
 *
 * ## Three things that are not on the API
 *
 * `AdminPayoutResponseDto` names the advisor and carries the amounts. It has **no
 * bank name and no account number**, so the second line under the advisor is gone,
 * and **no invoice count** on the list row (the detail route has the invoices, one
 * request per payout, which a table will not do).
 *
 * `POST .../mark-failed` takes **no body at all** — `payouts` has no failure-reason
 * column — so the bank's reason cannot be recorded and is not asked for. It used to
 * be, and the answer went nowhere.
 *
 * `POST .../mark-paid` takes an optional `providerTransferId`. It is not asked for
 * either, for a smaller reason: `cms.payouts` has no label for it. See the report.
 */
export function PayoutsScreen() {
  const t = useTranslations("cms.payouts");
  const { confirm } = useCmsFeedback();
  const rule = useRuling();

  const fetcher = useCallback(
    (signal: AbortSignal) => listPayouts({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const payouts = useResource<Paginated<AdminPayout>>(
    `${PAYOUTS_KEY}?limit=${ADMIN_MAX_LIMIT}`,
    fetcher,
  );
  const items = useMemo(() => payouts.data?.items ?? [], [payouts.data]);

  const tabs = (["pending", "failed", "paid", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
    count:
      value === "pending" || value === "failed"
        ? items.filter((p) => p.status === TAB_STATUS[value]).length
        : undefined,
    alert: true,
  }));
  const tab = useQueryTab<PayoutTab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? items : items.filter((p) => p.status === TAB_STATUS[tab])),
    [items, tab],
  );
  const due = rows
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amountSatang, 0);

  const list = useCmsList(rows, {
    searchText: (p) => `${p.id} ${p.advisorDisplayName} ${p.providerTransferId ?? ""}`,
    sortValue: (p, id) => (id === "amount" ? p.amountSatang : timeValue(p.createdAt)),
  });

  async function pay(ids: readonly string[]) {
    const total = items
      .filter((p) => ids.includes(p.id))
      .reduce((sum, p) => sum + p.amountSatang, 0);
    const ok = await confirm({
      type: "success",
      title: t("payTitle", { count: ids.length }),
      description: t("payBody", { amount: formatBaht(total) }),
      confirmLabel: t("markPaid"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: PAYOUTS_KEY,
      onDone: list.clearSelection,
      run: ids.map((id) => () => markPayoutPaid(id)),
      success: t("paid", { count: ids.length }),
    });
  }

  async function fail(payout: AdminPayout) {
    const short = payout.id.slice(0, 8);
    // A confirmation, not a prompt: the route takes no body, so a typed reason
    // would be collected and thrown away.
    const ok = await confirm({
      type: "danger",
      title: t("failTitle", { id: short }),
      confirmLabel: t("markFailed"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: PAYOUTS_KEY,
      run: [() => markPayoutFailed(payout.id)],
      success: t("failed", { id: short }),
      successColor: "warning",
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdminPayout>> = [
    {
      id: "id",
      header: t("col.id"),
      render: (p) => (
        <span className="font-latin font-medium text-highlighted">{p.id.slice(0, 8)}</span>
      ),
    },
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (p) => (
        <CmsPerson
          account={{ name: p.advisorDisplayName }}
          detail={p.providerTransferId ?? undefined}
        />
      ),
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      className: "font-latin",
      render: (p) => formatBaht(p.amountSatang),
    },
    {
      id: "requestedAt",
      header: t("col.requestedAt"),
      sortable: true,
      render: (p) => formatDateTime(p.createdAt),
    },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (p) => <CmsApiStatus group="payout" value={p.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "end",
      interactive: true,
      render: (p) =>
        p.status === "PAID" ? (
          <span className="text-xs">{formatDateTime(p.paidAt)}</span>
        ) : (
          <span className="inline-flex gap-1">
            <CmsButton color="success" onClick={() => pay([p.id])} size="sm" variant="soft">
              {t("markPaid")}
            </CmsButton>
            {p.status === "PENDING" ? (
              <CmsButton color="error" onClick={() => fail(p)} size="sm" variant="soft">
                {t("markFailed")}
              </CmsButton>
            ) : null}
          </span>
        ),
    },
  ];

  if (payouts.loading) {
    return (
      <CmsPage title={t("title")}>
        <CmsTableSkeleton columns={columns.length} />
      </CmsPage>
    );
  }

  if (payouts.error) {
    return (
      <CmsPage title={t("title")}>
        <CmsApiError error={payouts.error} onRetry={payouts.reload} />
      </CmsPage>
    );
  }

  return (
    <CmsPage
      badge={
        due > 0 ? (
          <span className="ms-2 text-sm font-normal text-muted-foreground">
            {t("due", { amount: formatBaht(due) })}
          </span>
        ) : null
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      <CmsTable
        bulkActions={(ids) => {
          const payable = ids.filter(
            (id) => items.find((p) => p.id === id)?.status !== "PAID",
          );
          return payable.length > 0 ? (
            <CmsButton color="success" icon={BadgeCheck} onClick={() => pay(payable)}>
              {t("markPaidSelected", { count: payable.length })}
            </CmsButton>
          ) : null;
        }}
        columns={columns}
        list={list}
        searchPlaceholder={t("search")}
      />
    </CmsPage>
  );
}

/**
 * Every payment the platform took — read-only, for reconciliation.
 *
 * **Still on `lib/mock-db`.** There is no transactions route on the API: nothing
 * lists invoices or payments for an admin, and the four totals on this page (GMV,
 * platform fee, refunded, failed) have no aggregate endpoint behind them either.
 * Wiring it needs `GET /api/v1/admin/invoices` or similar; until then this screen
 * is a fixture, and it is the only finance screen that is.
 */
export function TransactionsScreen() {
  const t = useTranslations("cms.transactions");
  const person = useAccountLookup();
  const transactions = useDatabase((db) => db.transactions);
  const statusOptions = useStatusOptions("transaction");

  const totals = useMemo(() => {
    const paid = transactions.filter((tx) => tx.status === "paid");
    return {
      gmv: paid.reduce((sum, tx) => sum + tx.amountSatang, 0),
      fee: paid.reduce((sum, tx) => sum + tx.feeSatang, 0),
      refunded: transactions
        .filter((tx) => tx.status === "refunded")
        .reduce((sum, tx) => sum + tx.amountSatang, 0),
      failed: transactions.filter((tx) => tx.status === "failed").length,
    };
  }, [transactions]);

  const list = useCmsList(transactions, {
    searchText: (tx) =>
      `${tx.id} ${tx.bookingRef} ${tx.serviceTitle} ${person(tx.payerId)?.name ?? ""} ${person(tx.advisorId)?.name ?? ""}`,
    sortValue: (tx, id) => (id === "amount" ? tx.amountSatang : timeValue(tx.createdAt)),
    filters: [
      { key: "status", test: (tx, values) => values.includes(tx.status) },
      { key: "method", test: (tx, values) => values.includes(tx.method) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<Transaction>> = [
    {
      id: "id",
      header: t("col.id"),
      render: (tx) => (
        <span className="flex flex-col">
          <span className="font-latin font-medium text-highlighted">{tx.id}</span>
          <span className="font-latin text-xs">{tx.bookingRef}</span>
        </span>
      ),
    },
    {
      id: "payer",
      header: t("col.payer"),
      render: (tx) => <CmsPerson account={person(tx.payerId)} />,
    },
    {
      id: "service",
      header: t("col.service"),
      render: (tx) => (
        <span className="flex max-w-56 flex-col">
          <span className="truncate text-highlighted">{tx.serviceTitle}</span>
          <span className="truncate text-xs">{person(tx.advisorId)?.name ?? "—"}</span>
        </span>
      ),
    },
    { id: "amount", header: t("col.amount"), sortable: true, className: "font-latin", render: (tx) => formatBaht(tx.amountSatang) },
    { id: "fee", header: t("col.fee"), className: "font-latin", render: (tx) => formatBaht(tx.feeSatang) },
    { id: "method", header: t("col.method"), render: (tx) => t(`method.${tx.method}`) },
    { id: "createdAt", header: t("col.createdAt"), sortable: true, render: (tx) => formatDateTime(tx.createdAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (tx) => <CmsStatus group="transaction" value={tx.status} />,
    },
  ];

  return (
    <CmsPage title={t("title")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("gmv"), value: formatBaht(totals.gmv) },
          { label: t("fee"), value: formatBaht(totals.fee) },
          { label: t("refunded"), value: formatBaht(totals.refunded) },
          { label: t("failedCount"), value: String(totals.failed) },
        ].map((stat) => (
          <div className="flex flex-col gap-1 rounded-lg bg-card p-4 ring-1 ring-border" key={stat.label}>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <span className="font-latin text-2xl font-semibold text-highlighted">{stat.value}</span>
          </div>
        ))}
      </div>
      <CmsTable
        columns={columns}
        filters={
          <>
            <CmsFilterMenu
              label={t("allStatuses")}
              onChange={(values) => list.setFilter("status", values)}
              options={statusOptions}
              values={list.filterValues.status ?? []}
            />
            <CmsFilterMenu
              label={t("allMethods")}
              onChange={(values) => list.setFilter("method", values)}
              options={[
                { value: "card", label: t("method.card") },
                { value: "promptpay", label: t("method.promptpay") },
              ]}
              values={list.filterValues.method ?? []}
            />
          </>
        }
        list={list}
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
