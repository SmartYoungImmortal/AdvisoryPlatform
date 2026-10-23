"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { CmsApiError, CmsTableSkeleton, useRuling } from "@/components/cms/api";
import { CmsButton } from "@/components/cms/button";
import { CmsTotalCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import {
  CmsApiStatus,
  CmsStatus,
  useApiStatusOptions,
  useStatusOptions,
} from "@/components/cms/status";
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
  ADMIN_MAX_LIMIT,
  listPayouts,
  markPayoutFailed,
  markPayoutPaid,
  type AdminPayout,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatStamp, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Transaction } from "@/lib/mock-db/types";

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
  const tTable = useTranslations("cms.table");
  const audit = useAuditHeaders();
  const accountName = useAccountName();
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
  const statusOptions = useApiStatusOptions("payout", ["PENDING", "FAILED", "PAID"]);
  const due = items
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amountSatang, 0);

  const list = useCmsList(items, {
    searchText: (p) => `${p.id} ${p.advisorDisplayName} ${p.providerTransferId ?? ""}`,
    sortValue: (p, id) => {
      if (id === "amount") return p.amountSatang;
      if (id === "status") return p.status;
      return timeValue(p.createdAt);
    },
    filters: [{ key: "status", test: (p, values) => values.includes(p.status) }],
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
    const name = payout.advisorDisplayName;
    // A confirmation, not a prompt: the route takes no body, so a typed reason
    // would be collected and thrown away.
    const ok = await confirm({
      type: "danger",
      title: t("failTitle", { name }),
      confirmLabel: t("markFailed"),
    });
    if (!ok) return;
    await rule({
      keyPrefix: PAYOUTS_KEY,
      run: [() => markPayoutFailed(payout.id)],
      success: t("failed", { name }),
      successColor: "warning",
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdminPayout>> = [
    createdColumn(tTable("createdAt"), (p) => p.createdAt),
    statusColumn(t("col.status"), (p) => <CmsApiStatus group="payout" value={p.status} />),
    {
      id: "advisor",
      header: t("col.advisor"),
      render: (p) => accountName(p.advisorId) ?? p.advisorDisplayName,
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      className: "font-latin",
      render: (p) => formatBaht(p.amountSatang),
    },
    // A payout run creates the row; the payout carries no reviewer.
    ...auditColumns<AdminPayout>(audit, () => audit.system, () => null),
    {
      id: "actions",
      header: "",
      align: "end",
      interactive: true,
      render: (p) =>
        p.status === "PAID" ? (
          <span className="font-latin text-xs">{formatStamp(p.paidAt)}</span>
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
        filters={
          <CmsFilterMenu
            label={t("allStatuses")}
            onChange={(values) => list.setFilter("status", values)}
            options={statusOptions}
            values={list.filterValues.status ?? []}
          />
        }
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
  const tTable = useTranslations("cms.table");
  const audit = useAuditHeaders();
  const person = useAccountLookup();
  const transactions = useDatabase((db) => db.transactions);
  const statusOptions = useStatusOptions("transaction");

  // One total, the way phonerefun's finance pages carry one: what was paid.
  const paidTotal = useMemo(
    () =>
      transactions
        .filter((tx) => tx.status === "paid")
        .reduce((sum, tx) => sum + tx.amountSatang, 0),
    [transactions],
  );

  const list = useCmsList(transactions, {
    searchText: (tx) =>
      `${tx.bookingRef} ${tx.serviceTitle} ${person(tx.payerId)?.name ?? ""} ${person(tx.advisorId)?.name ?? ""}`,
    sortValue: (tx, id) => {
      if (id === "amount") return tx.amountSatang;
      if (id === "status") return tx.status;
      return timeValue(tx.createdAt);
    },
    filters: [
      { key: "status", test: (tx, values) => values.includes(tx.status) },
      { key: "method", test: (tx, values) => values.includes(tx.method) },
    ],
  });

  const columns: ReadonlyArray<CmsColumn<Transaction>> = [
    createdColumn(tTable("createdAt"), (tx) => tx.createdAt),
    statusColumn(t("col.status"), (tx) => <CmsStatus group="transaction" value={tx.status} />),
    { id: "booking", header: t("col.booking"), className: "font-latin", render: (tx) => tx.bookingRef },
    { id: "payer", header: t("col.payer"), render: (tx) => person(tx.payerId)?.name ?? "-" },
    {
      id: "service",
      header: t("col.service"),
      render: (tx) => <span className="block max-w-64 truncate">{tx.serviceTitle}</span>,
    },
    { id: "amount", header: t("col.amount"), sortable: true, className: "font-latin", render: (tx) => formatBaht(tx.amountSatang) },
    { id: "fee", header: t("col.fee"), className: "font-latin", render: (tx) => formatBaht(tx.feeSatang) },
    { id: "method", header: t("col.method"), render: (tx) => t(`method.${tx.method}`) },
    ...auditColumns<Transaction>(
      audit,
      (tx) => person(tx.payerId)?.name,
      () => audit.system,
    ),
  ];

  return (
    <CmsPage title={t("title")}>
      <CmsTotalCard label={t("gmv")} value={formatBaht(paidTotal)} />
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
