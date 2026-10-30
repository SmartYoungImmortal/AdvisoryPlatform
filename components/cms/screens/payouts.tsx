"use client";

import { BadgeCheck, Banknote } from "lucide-react";
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
  listPayouts,
  markPayoutFailed,
  markPayoutPaid,
  type AdminPayout,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht, formatDateTime, timeValue } from "@/lib/mock-db/format";

const PAYOUTS_KEY = ADMIN_KEYS.payouts;

/** Owed first (failed before pending, since a failed transfer is overdue), then newest. */
function queueOrder(rows: readonly AdminPayout[]): readonly AdminPayout[] {
  const rank = { FAILED: 2, PENDING: 1, PAID: 0 } as const;
  return [...rows].sort((a, b) => {
    const order = rank[b.status] - rank[a.status];
    return order !== 0 ? order : b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Payouts, from `GET /api/v1/admin/payouts`.
 *
 * Payouts are manual in this phase (ER.README): an admin transfers the money, then
 * marks the row paid — or failed — from the row's own buttons, or several paid at
 * once from the selection.
 *
 * `AdminPayoutResponseDto` names the advisor and carries the amounts. It has **no
 * bank name and no account number** and **no invoice count** on the list row, so
 * none are shown. `POST .../mark-failed` takes **no body** — `payouts` has no
 * failure-reason column — so the bank's reason is not asked for; it would go
 * nowhere.
 */
export function PayoutsScreen() {
  const t = useTranslations("cms.payouts");
  const tTable = useTranslations("cms.table");
  const accountName = useAccountName();
  const statusLabel = useStatusLabel();
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
  const items = useMemo(() => queueOrder(payouts.data?.items ?? []), [payouts.data]);
  const count = useMemo(() => countBy(items, (p) => p.status), [items]);
  const due = items
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amountSatang, 0);

  const list = useCmsList(items, {
    searchText: (p) => `${p.advisorDisplayName} ${p.providerTransferId ?? ""}`,
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
    const name = accountName(payout.advisorId) ?? payout.advisorDisplayName;
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
    });
  }

  const columns: ReadonlyArray<CmsColumn<AdminPayout>> = [
    {
      id: "advisor",
      header: t("col.advisor"),
      primary: true,
      render: (p) => accountName(p.advisorId) ?? p.advisorDisplayName,
    },
    {
      id: "amount",
      header: t("col.amount"),
      sortable: true,
      align: "end",
      className: "font-latin",
      render: (p) => formatBaht(p.amountSatang),
    },
    statusColumn(t("col.status"), (p) => <CmsStatus group="payout" value={p.status} />),
    dateColumn("createdAt", t("col.requestedAt"), (p) => p.createdAt),
    {
      id: "actions",
      header: t("col.actions"),
      align: "end",
      interactive: true,
      render: (p) =>
        p.status === "PAID" ? (
          <span className="text-muted-foreground">
            {t("paidOn", { date: formatDateTime(p.paidAt) })}
          </span>
        ) : (
          <span className="inline-flex gap-1.5">
            <CmsButton onClick={() => pay([p.id])} size="xs" variant="primary">
              {t("markPaid")}
            </CmsButton>
            {p.status === "PENDING" ? (
              <CmsButton onClick={() => fail(p)} size="xs" variant="danger-soft">
                {t("markFailed")}
              </CmsButton>
            ) : null}
          </span>
        ),
    },
  ];

  return (
    <CmsPage
      description={due > 0 ? t("due", { amount: formatBaht(due) }) : undefined}
      title={t("title")}
    >
      {payouts.loading ? (
        <CmsTableSkeleton columns={columns.length} />
      ) : payouts.error ? (
        <CmsApiError error={payouts.error} onRetry={payouts.reload} />
      ) : (
        <CmsTable
          bulkActions={(ids) => {
            const payable = ids.filter((id) => items.find((p) => p.id === id)?.status !== "PAID");
            return payable.length > 0 ? (
              <CmsButton icon={BadgeCheck} onClick={() => pay(payable)} size="sm">
                {t("markPaidSelected", { count: payable.length })}
              </CmsButton>
            ) : null;
          }}
          chips={
            <CmsChips
              label={t("col.status")}
              onChange={(value) => list.setFilter("status", value ? [value] : [])}
              options={[
                { value: "", label: tTable("all"), count: count("") },
                ...(["PENDING", "FAILED", "PAID"] as const).map((value) => ({
                  value,
                  label: statusLabel("payout", value),
                  count: count(value),
                })),
              ]}
              value={list.filterValues.status?.[0] ?? ""}
            />
          }
          columns={columns}
          empty={{ icon: Banknote, title: t("empty"), body: t("emptyBody") }}
          list={list}
          searchPlaceholder={t("search")}
        />
      )}
    </CmsPage>
  );
}
