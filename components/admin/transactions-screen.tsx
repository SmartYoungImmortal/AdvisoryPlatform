import { useFormatter, useTranslations } from "next-intl";

import { AdminTable, type AdminColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearchBar } from "@/components/admin/search-toolbar";
import { AdminContent } from "@/components/admin/shell";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  TableCardFooter,
  TableCardToolbar,
} from "@/components/admin/table-card";
import { satangToBaht } from "@/lib/admin/money";
import {
  adminTransactions,
  type AdminTransaction,
} from "@/lib/admin/transactions";

/**
 * Transactions/escrow ledger — no Figma node exists for this screen; it is
 * implied by the SERVICE_INVOICES escrow lifecycle
 * (PENDING→HELD_IN_ESCROW→RELEASED|REFUNDED|FAILED) needing an admin surface.
 * Read-only table: invoice id (createdAt beneath), payer, advisor, amount,
 * platform fee, status badge. No row actions — a ledger offers nothing to do.
 */
export function TransactionsScreen() {
  const t = useTranslations("admin");
  const format = useFormatter();

  const columns: ReadonlyArray<AdminColumn> = [
    { key: "invoice", label: t("transactions.colInvoice"), sortable: true },
    { key: "payer", label: t("transactions.colPayer") },
    { key: "advisor", label: t("transactions.colAdvisor") },
    { key: "amount", label: t("transactions.colAmount"), align: "end" },
    { key: "fee", label: t("transactions.colFee"), align: "end" },
    { key: "status", label: t("transactions.colStatus") },
  ];

  function renderTransactionCell(row: AdminTransaction, key: string) {
    if (key === "invoice") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-latin text-sm font-medium text-foreground">
            {row.id}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {format.dateTime(new Date(row.createdAt), "short")}
          </span>
        </div>
      );
    }
    if (key === "payer") {
      return <span className="font-latin">{row.payer}</span>;
    }
    if (key === "advisor") {
      return <span className="font-latin">{row.advisor}</span>;
    }
    if (key === "amount") {
      return (
        <span className="font-medium text-foreground tabular-nums">
          {format.number(satangToBaht(row.amountSatang), "baht")}
        </span>
      );
    }
    if (key === "fee") {
      return (
        <span className="text-muted-foreground tabular-nums">
          {format.number(satangToBaht(row.platformFeeSatang), "baht")}
        </span>
      );
    }
    if (key === "status") {
      return <StatusBadge status={row.status} />;
    }
    return null;
  }

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("transactions.description")}
        title={t("transactions.title")}
      />
      <TableCard>
        <TableCardToolbar>
          <AdminSearchBar placeholder={t("transactions.searchPlaceholder")} />
        </TableCardToolbar>
        <AdminTable
          columns={columns}
          renderCell={renderTransactionCell}
          rows={adminTransactions}
        />
        <TableCardFooter>
          <span>{t("common.rowCount", { count: adminTransactions.length })}</span>
        </TableCardFooter>
      </TableCard>
    </AdminContent>
  );
}
