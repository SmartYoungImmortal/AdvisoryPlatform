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
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Payout, PayoutStatus, Transaction } from "@/lib/mock-db/types";

type PayoutTab = PayoutStatus | "all";

/**
 * Payouts are manual in this phase (ER.README): an admin transfers the money,
 * then records the outcome on the payout's page — paid, or failed with the
 * bank's reason, which the advisor sees on their payout detail.
 */
export function PayoutsScreen() {
  const t = useTranslations("cms.payouts");
  const router = useRouter();
  const person = useAccountLookup();
  const payouts = useDatabase((db) => db.payouts);
  const due = payouts.filter((p) => p.status !== "paid").reduce((sum, p) => sum + p.amountSatang, 0);

  const tabs = (["pending", "failed", "paid", "all"] as const).map((value) => ({
    value,
    label: t(`tab.${value}`),
  }));
  const tab = useQueryTab<PayoutTab>(tabs);
  const rows = useMemo(
    () => (tab === "all" ? payouts : payouts.filter((p) => p.status === tab)),
    [payouts, tab],
  );

  const list = useCmsList(rows, {
    searchText: (p) => `${p.id} ${p.bank} ${person(p.advisorId)?.name ?? ""}`,
    sortValue: (p, id) => (id === "amount" ? p.amountSatang : timeValue(p.requestedAt)),
  });

  const columns: ReadonlyArray<CmsColumn<Payout>> = [
    { id: "id", header: t("col.id"), className: "font-latin", render: (p) => p.id },
    { id: "advisor", header: t("col.advisor"), render: (p) => person(p.advisorId)?.name ?? "—" },
    { id: "account", header: t("col.account"), render: (p) => `${p.bank} ···${p.accountLast4}` },
    { id: "amount", header: t("col.amount"), sortable: true, className: "font-latin", render: (p) => formatBaht(p.amountSatang) },
    { id: "requestedAt", header: t("col.requestedAt"), sortable: true, render: (p) => formatDateTime(p.requestedAt) },
    {
      id: "status",
      header: t("col.status"),
      align: "center",
      render: (p) => <CmsStatus group="payout" value={p.status} />,
    },
  ];

  return (
    <CmsPage
      badge={
        <CmsBadge className="font-latin" variant="subtle">
          {t("due", { amount: formatBaht(due) })}
        </CmsBadge>
      }
      title={t("title")}
    >
      <CmsQueryTabs items={tabs} />
      <CmsTable
        columns={columns}
        list={list}
        onRowClick={(p) => router.push(`/admin/payouts/review?id=${p.id}`)}
        searchPlaceholder={t("search")}
        selectable={false}
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
  const fee = useMemo(
    () =>
      transactions
        .filter((tx) => tx.status === "paid")
        .reduce((sum, tx) => sum + tx.feeSatang, 0),
    [transactions],
  );

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
    { id: "id", header: t("col.id"), className: "font-latin", render: (tx) => tx.id },
    { id: "booking", header: t("col.booking"), className: "font-latin", render: (tx) => tx.bookingRef },
    { id: "payer", header: t("col.payer"), render: (tx) => person(tx.payerId)?.name ?? "—" },
    {
      id: "service",
      header: t("col.service"),
      render: (tx) => <span className="block max-w-56 truncate">{tx.serviceTitle}</span>,
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
    <CmsPage
      badge={
        <CmsBadge className="font-latin" variant="subtle">
          {t("feeBadge", { amount: formatBaht(fee) })}
        </CmsBadge>
      }
      title={t("title")}
    >
      <CmsTable
        columns={columns}
        extraFilters={
          <CmsFilterMenu
            className="w-44"
            label={t("allMethods")}
            onChange={(values) => list.setFilter("method", values)}
            options={[
              { value: "card", label: t("method.card") },
              { value: "promptpay", label: t("method.promptpay") },
            ]}
            values={list.filterValues.method ?? []}
          />
        }
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
        searchPlaceholder={t("search")}
        selectable={false}
      />
    </CmsPage>
  );
}
