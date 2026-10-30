"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  FileBadge,
  Flag,
  Radar,
  Receipt,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { CmsSection } from "@/components/cms/card";
import { useDashboardCounts, type Count } from "@/components/cms/dashboard-data";
import { CmsPage } from "@/components/cms/layout";
import { formatBaht } from "@/lib/mock-db/format";

/**
 * The console's landing page: what is waiting, then the size of the platform.
 *
 * Two rows of figures and nothing else. The first is the work — one figure per
 * queue, each the way into it, a queue with nothing in it said in grey rather
 * than as a loud zero. The second is the platform itself: accounts, listings
 * and the money still owed to advisors. Every figure is the API's, read as
 * `?limit=1` totals (and the payouts page for the amount owed); there is no
 * chart, because there is no invoices route to draw one from.
 */
export function DashboardScreen() {
  const t = useTranslations("cms.dashboard");
  const live = useDashboardCounts();

  const queues: ReadonlyArray<{
    readonly label: string;
    readonly value: Count;
    readonly href: string;
    readonly icon: LucideIcon;
  }> = [
    { label: t("identity"), value: live.identity, href: "/admin/verification", icon: ShieldCheck },
    { label: t("proofs"), value: live.proofs, href: "/admin/verification?tab=skills", icon: FileBadge },
    { label: t("refunds"), value: live.refunds, href: "/admin/refunds", icon: Receipt },
    { label: t("reports"), value: live.reports, href: "/admin/reports", icon: Flag },
    { label: t("flags"), value: live.flags, href: "/admin/reports?tab=flags", icon: Radar },
  ];
  const waiting = queues.some((queue) => queue.value === undefined)
    ? undefined
    : queues.reduce((sum, queue) => sum + (queue.value ?? 0), 0);
  // No line until every queue has answered; then all clear, or how many wait.
  let summary: string | undefined;
  if (waiting === 0) summary = t("allClear");
  else if (waiting !== undefined) summary = t("waitingSummary", { count: waiting });

  return (
    <CmsPage
      description={summary}
      title={t("title")}
    >
      <CmsSection title={t("queuesTitle")}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {queues.map((queue) => (
            <li key={queue.href}>
              <Tile
                href={queue.href}
                icon={queue.icon}
                label={queue.label}
                quiet={queue.value === 0}
                value={queue.value}
                way={queue.value === 0 ? t("nothingWaiting") : t("openQueue")}
              />
            </li>
          ))}
        </ul>
      </CmsSection>

      <CmsSection title={t("platformTitle")}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li>
            <Tile href="/admin/users" icon={Users} label={t("users")} value={live.users} way={t("openList")} />
          </li>
          <li>
            <Tile
              href="/admin/services"
              icon={Store}
              label={t("services")}
              value={live.services}
              way={t("openList")}
            />
          </li>
          <li>
            <Tile
              href="/admin/payouts"
              icon={Banknote}
              label={t("payoutsDue")}
              value={live.payoutsDue === undefined ? undefined : formatBaht(live.payoutsDue)}
              way={
                live.payoutsWaiting
                  ? t("payoutsWaiting", { count: live.payoutsWaiting })
                  : t("openList")
              }
            />
          </li>
        </ul>
      </CmsSection>
    </CmsPage>
  );
}

/**
 * One figure: a white tile on a hairline with 18px corners (the bordered
 * empty states on the account pages), its name and line icon over the figure
 * in the Latin face, and where it leads along the foot. The whole tile is the
 * link.
 */
function Tile({
  href,
  icon: Icon,
  label,
  value,
  way,
  quiet = false,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  /** `undefined` while it loads or if the read failed: a dash, never a false zero. */
  readonly value: number | string | undefined;
  readonly way: string;
  /** Nothing waiting: the figure in grey. */
  readonly quiet?: boolean;
}) {
  return (
    <Link
      className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-colors hover:border-accented hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50"
      href={href}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      </span>
      {/* At the foot, so the figures of a row line up when a name wraps. Size
          and colour on separate elements: the merge reads the theme's own
          `text-heading` as a colour and would drop it beside one. */}
      <span className="mt-auto flex flex-col gap-4">
        <span className="font-latin text-heading leading-none font-semibold tracking-tight">
          <span className={value === undefined || quiet ? "text-dimmed" : "text-hero-ink"}>
            {value ?? "-"}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
          {way}
          <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </span>
    </Link>
  );
}
