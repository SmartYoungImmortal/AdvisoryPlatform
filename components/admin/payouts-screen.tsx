import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { AdminTable, type AdminColumn } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminContent } from "@/components/admin/shell";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  TableCardFooter,
  TableCardToolbar,
} from "@/components/admin/table-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { satangToBaht } from "@/lib/admin/money";
import { payouts, type Payout } from "@/lib/admin/payouts";

/** "John Minecraft" → "JM"; single-word names keep one letter. */
function initials(displayName: string): string {
  return displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function AdvisorCell({ payout }: { readonly payout: Payout }) {
  const t = useTranslations("admin");

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback className="font-latin text-xs font-medium">
          {initials(payout.advisor)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="font-latin text-sm font-medium text-foreground">
          {payout.advisor}
        </span>
        <span className="text-xs font-normal text-muted-foreground">
          {t("payouts.transferRef")}{" "}
          <span className="font-latin">{payout.id}</span>
        </span>
      </div>
    </div>
  );
}

/** Account line; a FAILED payout surfaces its bank-side failure reason here. */
function AccountCell({ payout }: { readonly payout: Payout }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-sm font-normal text-foreground">
        {payout.bankAccount}
      </span>
      {payout.failureReason ? (
        <span className="text-xs font-normal text-destructive">
          {payout.failureReason}
        </span>
      ) : null}
    </div>
  );
}

function PayoutRowActions({ payout }: { readonly payout: Payout }) {
  const t = useTranslations("admin");

  // FAILED and PAID rows carry no affordance — the only admin action in
  // Project 1 is recording a manual transfer for a PENDING payout.
  if (payout.status !== "PENDING") {
    return null;
  }
  return (
    <Button render={<Link href="/admin/payouts/paid" />}
          nativeButton={false} size="sm">
      {t("payouts.markPaid")}
    </Button>
  );
}

function PayoutCells({
  payout,
  columnKey,
}: {
  readonly payout: Payout;
  readonly columnKey: string;
}) {
  const format = useFormatter();

  if (columnKey === "advisor") {
    return <AdvisorCell payout={payout} />;
  }
  if (columnKey === "account") {
    return <AccountCell payout={payout} />;
  }
  if (columnKey === "amount") {
    return (
      <span className="text-sm font-medium tabular-nums text-foreground">
        {format.number(satangToBaht(payout.amountSatang), "baht")}
      </span>
    );
  }
  if (columnKey === "status") {
    return <StatusBadge status={payout.status} />;
  }
  return null;
}

/**
 * Payout manager — no Figma node: implied by ER.README (transfer execution is
 * manual in Project 1) and the advisor app's failed payout PO-2026-0730-0007,
 * whose "ติดต่อผู้ดูแล" CTA has no destination without this screen. Table
 * archetype after "Users" (1042:15078): advisor + transfer-ref column, payout
 * bank account (with inline failure reason), baht amount, status badge, and a
 * mark-paid action on PENDING rows only. `paid` shows the success note bar;
 * `failed` adds the destructive banner (sibling-route pattern). Composed as a
 * TableCard: banners sit above the card, the toolbar carries the pending-count
 * summary (this screen has no search), the footer carries the row count.
 */
export function PayoutsScreen({
  state = "default",
}: {
  readonly state?: "default" | "paid" | "failed";
}) {
  const t = useTranslations("admin");

  const columns: ReadonlyArray<AdminColumn> = [
    { key: "advisor", label: t("payouts.colAdvisor"), sortable: true },
    { key: "account", label: t("payouts.colAccount") },
    { key: "amount", label: t("payouts.colAmount"), align: "end" },
    { key: "status", label: t("payouts.colStatus") },
  ];

  const pendingCount = payouts.filter(
    (payout) => payout.status === "PENDING",
  ).length;

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("payouts.description")}
        title={t("payouts.title")}
      />
      {state === "paid" ? (
        <div className="flex w-full items-center gap-2 rounded-lg bg-success-surface px-4 py-3 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" />
          {t("payouts.paidNote")}
        </div>
      ) : null}
      {state === "failed" ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{t("payouts.failedBanner")}</AlertTitle>
        </Alert>
      ) : null}
      <TableCard>
        <TableCardToolbar>
          <span className="text-sm font-medium text-foreground">
            {t("status.pending")}{" "}
            {t("common.rowCount", { count: pendingCount })}
          </span>
        </TableCardToolbar>
        <AdminTable
          columns={columns}
          renderActions={(payout) => <PayoutRowActions payout={payout} />}
          renderCell={(payout, key) => (
            <PayoutCells columnKey={key} payout={payout} />
          )}
          rows={payouts}
        />
        <TableCardFooter>
          <span>{t("common.rowCount", { count: payouts.length })}</span>
        </TableCardFooter>
      </TableCard>
    </AdminContent>
  );
}
