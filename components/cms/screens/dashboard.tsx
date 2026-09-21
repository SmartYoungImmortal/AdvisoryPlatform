"use client";

import Link from "next/link";
import {
  Banknote,
  Flag,
  Radar,
  Receipt,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";

import { useDashboardCounts } from "@/components/cms/dashboard-data";
import { CmsPage } from "@/components/cms/layout";
import { formatBaht } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import type { Database } from "@/lib/mock-db/types";

const MONTHS = 6;

/** Platform fee per month over the last six, from paid transactions. */
function revenueByMonth(db: Database) {
  const now = new Date();
  const buckets = Array.from({ length: MONTHS }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(date),
      fee: 0,
    };
  });
  for (const tx of db.transactions) {
    if (tx.status !== "paid") continue;
    const date = new Date(tx.createdAt);
    const bucket = buckets.find((b) => b.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.fee += tx.feeSatang;
  }
  return buckets;
}

/**
 * The console's landing page, in phonerefun's dashboard anatomy — Nexus has
 * none: a row of stat cards (label top-left, the figure bottom-left, a large
 * standalone icon top-right, 155px tall), two chart cards, and a second row of
 * stat cards. No "latest" lists; neither reference console has them.
 *
 * Every figure is the API's, read as `?limit=1` totals (and the payouts page for
 * the amount owed), except the fee chart: the API has no route that lists
 * invoices, so that one chart still sums `lib/mock-db` transactions and says so
 * under its title.
 */
export function DashboardScreen() {
  const t = useTranslations("cms.dashboard");
  const live = useDashboardCounts();
  const db = useDatabase((d) => d);
  const revenue = useMemo(() => revenueByMonth(db), [db]);
  const peak = Math.max(1, ...revenue.map((m) => m.fee));
  const totalFee = revenue.reduce((sum, m) => sum + m.fee, 0);

  const queues = [
    { label: t("identity"), value: live.identity, href: "/admin/verification" },
    { label: t("proofs"), value: live.proofs, href: "/admin/skill-proofs" },
    { label: t("refunds"), value: live.refunds, href: "/admin/refunds" },
    { label: t("reports"), value: live.reports, href: "/admin/reports" },
    { label: t("flags"), value: live.flags, href: "/admin/off-platform" },
  ];
  const queuePeak = Math.max(1, ...queues.map((q) => q.value ?? 0));
  const waiting = queues.reduce((sum, q) => sum + (q.value ?? 0), 0);

  return (
    <CmsPage title={t("title")}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/admin/users" icon={Users} label={t("users")} value={live.users} />
        <StatCard
          href="/admin/verification"
          icon={ShieldCheck}
          label={t("verifications")}
          value={live.verification}
        />
        <StatCard href="/admin/refunds" icon={Receipt} label={t("refunds")} value={live.refunds} />
        <StatCard href="/admin/reports" icon={Flag} label={t("reports")} value={live.reports} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          subtitle={t("revenueHint")}
          title={t("revenueTitle")}
          value={formatBaht(totalFee)}
        >
          <div className="flex h-full items-end gap-4 sm:gap-6" role="list">
            {revenue.map((month) => (
              <div
                aria-label={`${month.label} ${formatBaht(month.fee)}`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                key={month.key}
                role="listitem"
              >
                <span className="font-latin text-xs font-medium text-muted-foreground">
                  {formatBaht(month.fee)}
                </span>
                <span
                  className="w-full max-w-12 rounded-t-md bg-action"
                  style={{ height: `${Math.max(2, (month.fee / peak) * 100)}%` }}
                />
                <span className="text-xs text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard subtitle={t("queuesHint")} title={t("queuesTitle")} value={String(waiting)}>
          <ul className="flex h-full flex-col justify-center gap-5">
            {queues.map((queue) => (
              <li key={queue.href}>
                <Link className="group flex flex-col gap-2" href={queue.href}>
                  <span className="flex items-center justify-between text-sm">
                    <span className="text-foreground group-hover:text-highlighted">{queue.label}</span>
                    <span className="font-latin font-semibold text-highlighted">
                      {queue.value ?? "-"}
                    </span>
                  </span>
                  <span className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-action transition-[width]"
                      style={{ width: `${((queue.value ?? 0) / queuePeak) * 100}%` }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/admin/payouts"
          icon={Banknote}
          label={t("payoutsDue")}
          value={live.payoutsDue === undefined ? undefined : formatBaht(live.payoutsDue)}
        />
        <StatCard href="/admin/off-platform" icon={Radar} label={t("flags")} value={live.flags} />
        <StatCard href="/admin/services" icon={Store} label={t("services")} value={live.services} />
        <StatCard
          href="/admin/skill-proofs"
          icon={ShieldCheck}
          label={t("proofs")}
          value={live.proofs}
        />
      </div>
    </CmsPage>
  );
}

/**
 * phonerefun's `StatCard`: white, 8px corners, a slate hairline, 24px padding,
 * 155px tall; the label top-left, the figure bottom-left at 32px bold, and a
 * 56px icon standing on its own top-right — no chip behind it.
 */
function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  /** `undefined` while it loads or if the read failed: a dash, never a false zero. */
  readonly value: number | string | undefined;
}) {
  return (
    <Link
      className="flex h-[155px] items-stretch justify-between rounded-lg border border-border bg-card p-6 transition-colors hover:border-accented"
      href={href}
    >
      <span className="flex h-full min-w-0 flex-col justify-between">
        <span className="truncate text-sm font-medium text-muted-foreground">{label}</span>
        {/* Size and colour on separate elements: tailwind-merge reads the custom
            `text-heading-lg` as a colour and would drop it beside `text-highlighted`. */}
        <span className="font-latin text-heading-lg leading-none font-bold tracking-tight">
          <span className={value === undefined ? "text-dimmed" : "text-highlighted"}>
            {value ?? "-"}
          </span>
        </span>
      </span>
      <Icon aria-hidden className="size-14 shrink-0 text-accented" strokeWidth={1.5} />
    </Link>
  );
}

/** phonerefun's chart card: title and total on one line, a muted subtitle, the chart. */
function ChartCard({
  title,
  subtitle,
  value,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly value: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h2 className="font-bold text-highlighted">{title}</h2>
        <span className="font-latin text-lg font-bold text-highlighted">{value}</span>
      </div>
      <p className="mb-4 text-xs text-dimmed">{subtitle}</p>
      <div className="h-[280px]">{children}</div>
    </section>
  );
}
