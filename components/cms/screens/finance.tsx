"use client";

import { BadgeCheck } from "lucide-react";
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
import { markPayoutFailed, markPayoutsPaid } from "@/lib/mock-db/actions";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Payout, PayoutStatus, Transaction } from "@/lib/mock-db/types";

type PayoutTab = PayoutStatus | "all";

/**
 * Payouts are manual in this phase (ER.README): an admin transfers the money,
 * then marks the batch paid — or failed, with the bank's reason, which the
 * advisor sees on their payout detail.
 */
export function PayoutsScreen() {
  const t = useTranslations("cms.payouts");
  const actorId = useActorId();
  const person = useAccountLookup();
  const { confirm, prompt, toast } = useCmsFeedback();
  const payouts = useDatabase((db) => db.payouts);

  const tabs = (["pending", "failed", "paid", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
    count: value === "pending" || value === "failed"
      ? payouts.filter((p) => p.status === value).length
      : undefined,
    alert: true,
  }));
  const tab = useQueryTab<PayoutTab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? payouts : payouts.filter((p) => p.status === tab)),
    [payouts, tab],
  );
  const due = rows.filter((p) => p.status !== "paid").reduce((sum, p) => sum + p.amountSatang, 0);

  const list = useCmsList(rows, {
    searchText: (p) => `${p.id} ${p.bank} ${person(p.advisorId)?.name ?? ""}`,
    sortValue: (p, id) => (id === "amount" ? p.amountSatang : timeValue(p.requestedAt)),
  });

  async function pay(ids: readonly string[]) {
    const total = payouts.filter((p) => ids.includes(p.id)).reduce((sum, p) => sum + p.amountSatang, 0);
    const ok = await confirm({
      type: "success",
      title: t("payTitle", { count: ids.length }),
      description: t("payBody", { amount: formatBaht(total) }),
      confirmLabel: t("markPaid"),
    });
    if (!ok) return;
    markPayoutsPaid(ids, actorId);
    list.clearSelection();
    toast({ title: t("paid", { count: ids.length }) });
  }

  async function fail(payout: Payout) {
    const reason = await prompt({
      type: "danger",
      title: t("failTitle", { id: payout.id }),
      inputLabel: t("failReason"),
      placeholder: t("failPlaceholder"),
      confirmLabel: t("markFailed"),
    });
    if (reason === null) return;
    markPayoutFailed(payout.id, reason, actorId);
    toast({ color: "warning", title: t("failed", { id: payout.id }) });
  }

  const columns: ReadonlyArray<CmsColumn<Payout>> = [
    {
      id: "id",
      header: t("col.id"),
      cell: (p) => <span className="font-latin font-medium text-highlighted">{p.id}</span>,
    },
    {
      id: "advisor",
      header: t("col.advisor"),
      cell: (p) => <CmsPerson account={person(p.advisorId)} detail={`${p.bank} ···${p.accountLast4}`} />,
    },
    { id: "amount", header: t("col.amount"), sortable: true, className: "font-latin", cell: (p) => formatBaht(p.amountSatang) },
    { id: "invoices", header: t("col.invoices"), className: "font-latin", cell: (p) => p.invoiceCount },
    { id: "requestedAt", header: t("col.requestedAt"), sortable: true, cell: (p) => formatDateTime(p.requestedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (p) => (
        <span className="flex flex-col items-center gap-1">
          <CmsStatus group="payout" value={p.status} />
          {p.failureReason ? (
            <span className="max-w-48 truncate text-xs text-destructive">{p.failureReason}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "end",
      interactive: true,
      cell: (p) =>
        p.status === "paid" ? (
          <span className="text-xs">{formatDateTime(p.paidAt)}</span>
        ) : (
          <span className="inline-flex gap-1">
            <CmsButton color="success" onClick={() => pay([p.id])} size="sm" variant="soft">
              {t("markPaid")}
            </CmsButton>
            {p.status === "pending" ? (
              <CmsButton color="error" onClick={() => fail(p)} size="sm" variant="soft">
                {t("markFailed")}
              </CmsButton>
            ) : null}
          </span>
        ),
    },
  ];

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
          const payable = ids.filter((id) => payouts.find((p) => p.id === id)?.status !== "paid");
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

/** Every payment the platform took — read-only, for reconciliation. */
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
      cell: (tx) => (
        <span className="flex flex-col">
          <span className="font-latin font-medium text-highlighted">{tx.id}</span>
          <span className="font-latin text-xs">{tx.bookingRef}</span>
        </span>
      ),
    },
    {
      id: "payer",
      header: t("col.payer"),
      cell: (tx) => <CmsPerson account={person(tx.payerId)} />,
    },
    {
      id: "service",
      header: t("col.service"),
      cell: (tx) => (
        <span className="flex max-w-56 flex-col">
          <span className="truncate text-highlighted">{tx.serviceTitle}</span>
          <span className="truncate text-xs">{person(tx.advisorId)?.name ?? "—"}</span>
        </span>
      ),
    },
    { id: "amount", header: t("col.amount"), sortable: true, className: "font-latin", cell: (tx) => formatBaht(tx.amountSatang) },
    { id: "fee", header: t("col.fee"), className: "font-latin", cell: (tx) => formatBaht(tx.feeSatang) },
    { id: "method", header: t("col.method"), cell: (tx) => t(`method.${tx.method}`) },
    { id: "createdAt", header: t("col.createdAt"), sortable: true, cell: (tx) => formatDateTime(tx.createdAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      cell: (tx) => <CmsStatus group="transaction" value={tx.status} />,
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
