"use client";

import Link from "next/link";
import {
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
import { cn } from "@/lib/utils";

/**
 * The console's landing page: what is waiting, then the size of the platform.
 *
 * Two lists of figures and nothing else. The first is the work — one row per
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
        <ul className="-mx-3 flex flex-col">
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
        <ul className="-mx-3 flex flex-col">
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
 * One figure, as the site's transaction rows read: the glyph in a soft grey
 * circle, the name over where it leads in grey, and the figure at the right
 * where a row's amount sits. The whole row is the link, grey under the pointer.
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
      className="flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      href={href}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden className="size-4.5 text-foreground" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-medium text-foreground">{label}</span>
        <span className="truncate text-sm text-muted-foreground">{way}</span>
      </span>
      <span
        className={cn(
          "shrink-0 font-latin text-lg font-semibold tracking-tight",
          value === undefined || quiet ? "text-dimmed" : "text-hero-ink",
        )}
      >
        {value ?? "-"}
      </span>
    </Link>
  );
}
