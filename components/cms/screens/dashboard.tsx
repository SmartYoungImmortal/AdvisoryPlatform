"use client";

import Link from "next/link";
import {
  Banknote,
  Flag,
  Radar,
  Receipt,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsCard } from "@/components/cms/card";
import { CmsLinkButton } from "@/components/cms/fields";
import { useAccountLookup } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsStatus } from "@/components/cms/status";
import { formatBaht, formatDateTime } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Database } from "@/lib/mock-db/types";

const MONTHS = 6;

/** Platform fee and GMV per month over the last six, from paid transactions. */
function revenueByMonth(db: Database) {
  const now = new Date();
  const buckets = Array.from({ length: MONTHS }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(date),
      fee: 0,
      gmv: 0,
    };
  });
  for (const tx of db.transactions) {
    if (tx.status !== "paid") continue;
    const date = new Date(tx.createdAt);
    const bucket = buckets.find((b) => b.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) continue;
    bucket.fee += tx.feeSatang;
    bucket.gmv += tx.amountSatang;
  }
  return buckets;
}

/**
 * The console's landing desk: what is waiting, what the platform earned, and
 * the latest cases. Every number is a live count over the mock database, so a
 * decision made on another desk moves it.
 */
export function DashboardScreen() {
  const t = useTranslations("cms.dashboard");
  const db = useDatabase((d) => d);
  const person = useAccountLookup();

  const stats = useMemo(
    () => ({
      verifications:
        db.identityRequests.filter((r) => r.status === "submitted").length +
        db.skillProofs.filter((p) => p.status === "pending").length,
      refunds: db.refunds.filter((r) => r.status === "pending").length,
      reports: db.reports.filter((r) => r.status === "open").length,
      flags: db.offPlatformFlags.filter((f) => f.status === "open").length,
      payoutsDue: db.payouts
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + p.amountSatang, 0),
      users: db.accounts.length,
    }),
    [db],
  );
  const revenue = useMemo(() => revenueByMonth(db), [db]);
  const peak = Math.max(1, ...revenue.map((m) => m.fee));
  const totalFee = revenue.reduce((sum, m) => sum + m.fee, 0);

  const pendingIdentity = db.identityRequests.filter((r) => r.status === "submitted").slice(0, 5);
  const openCases = [
    ...db.reports
      .filter((r) => r.status === "open")
      .map((r) => ({ id: r.id, kind: "report" as const, at: r.createdAt, accountId: r.reportedId, text: r.detail })),
    ...db.offPlatformFlags
      .filter((f) => f.status === "open")
      .map((f) => ({ id: f.id, kind: "flag" as const, at: f.detectedAt, accountId: f.senderId, text: f.message })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <CmsPage title={t("title")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat href="/admin/verification" icon={ShieldCheck} label={t("verifications")} value={stats.verifications} />
        <Stat href="/admin/refunds" icon={Receipt} label={t("refunds")} value={stats.refunds} />
        <Stat href="/admin/reports" icon={Flag} label={t("reports")} value={stats.reports} />
        <Stat href="/admin/off-platform" icon={Radar} label={t("flags")} value={stats.flags} />
        <Stat href="/admin/payouts" icon={Banknote} label={t("payoutsDue")} value={formatBaht(stats.payoutsDue)} />
        <Stat href="/admin/users" icon={Users} label={t("users")} value={stats.users} />
      </div>

      <CmsCard
        actions={
          <div className="text-end">
            <p className="text-xs text-muted-foreground">{t("feeTotal", { months: MONTHS })}</p>
            <p className="font-latin text-xl font-semibold text-highlighted">{formatBaht(totalFee)}</p>
          </div>
        }
        description={t("revenueHint")}
        title={t("revenueTitle")}
      >
        <div className="flex h-56 items-end gap-3 sm:gap-6" role="list">
          {revenue.map((month) => (
            <div
              aria-label={`${month.label} ${formatBaht(month.fee)}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              key={month.key}
              role="listitem"
            >
              <span className="font-latin text-xs font-medium text-highlighted">
                {formatBaht(month.fee)}
              </span>
              <span
                className="w-full max-w-14 rounded-t-md bg-action"
                style={{ height: `${Math.max(2, (month.fee / peak) * 100)}%` }}
              />
              <span className="text-xs text-muted-foreground">{month.label}</span>
            </div>
          ))}
        </div>
      </CmsCard>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <CmsCard
          actions={
            <CmsLinkButton color="action" href="/admin/verification" size="sm" variant="link">
              {t("seeAll")}
            </CmsLinkButton>
          }
          bodyClassName="p-0 sm:p-0"
          title={t("latestVerifications")}
        >
          <ul className="divide-y divide-border">
            {pendingIdentity.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("nothingWaiting")}</li>
            ) : (
              pendingIdentity.map((request) => (
                <li key={request.id}>
                  <Link
                    className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50 sm:px-6"
                    href={`/admin/verification/review?id=${request.id}`}
                  >
                    <CmsPerson
                      account={person(request.accountId)}
                      detail={`${request.credential} · ${formatDateTime(request.submittedAt)}`}
                    />
                    <CmsStatus group="identity" value={request.status} />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CmsCard>

        <CmsCard
          actions={
            <CmsLinkButton color="action" href="/admin/reports" size="sm" variant="link">
              {t("seeAll")}
            </CmsLinkButton>
          }
          bodyClassName="p-0 sm:p-0"
          title={t("latestCases")}
        >
          <ul className="divide-y divide-border">
            {openCases.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("nothingWaiting")}</li>
            ) : (
              openCases.map((item) => (
                <li key={item.id}>
                  <Link
                    className="flex flex-col gap-1 p-4 transition-colors hover:bg-muted/50 sm:px-6"
                    href={
                      item.kind === "report"
                        ? `/admin/reports/review?id=${item.id}`
                        : `/admin/off-platform/review?id=${item.id}`
                    }
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-highlighted">
                        {item.kind === "report" ? t("caseReport") : t("caseFlag")} ·{" "}
                        {person(item.accountId)?.name ?? "—"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(item.at)}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{item.text}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CmsCard>
      </div>

      <CmsCard bodyClassName="p-0 sm:p-0" title={t("activity")}>
        <ul className="divide-y divide-border">
          {db.audit.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground sm:px-6">{t("noActivity")}</li>
          ) : (
            db.audit.slice(0, 8).map((entry) => (
              <li className="flex items-center justify-between gap-3 p-4 text-sm sm:px-6" key={entry.id}>
                <span className="min-w-0 truncate">
                  <span className="font-medium text-highlighted">{person(entry.actorId)?.name ?? entry.actorId}</span>{" "}
                  <span className="font-latin text-muted-foreground">{entry.action}</span>{" "}
                  <span className="font-latin text-muted-foreground">{entry.targetId}</span>
                  {entry.summary ? <span className="text-muted-foreground"> — {entry.summary}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
              </li>
            ))
          )}
        </ul>
      </CmsCard>
    </CmsPage>
  );
}

function Stat({
  href,
  icon: Icon,
  label,
  value,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number | string;
}) {
  return (
    <Link
      className="flex items-center gap-4 rounded-lg bg-card p-4 ring-1 ring-border transition-colors hover:bg-muted/50"
      href={href}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon aria-hidden className="size-5 text-highlighted" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-muted-foreground">{label}</span>
        <span className="font-latin text-2xl font-semibold text-highlighted">{value}</span>
      </span>
    </Link>
  );
}
