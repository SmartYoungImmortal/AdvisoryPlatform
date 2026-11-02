"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Figures } from "@/components/figures";
import { ApiErrorCard } from "@/components/service/parts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DESK_BONE, DeskSection } from "@/components/work/desk-parts";
import { BoneLine, ERROR_CARD_LG, LIST_SECTION, SECTION_LINK } from "@/components/work/today-parts";
import type { ApiPayout } from "@/lib/api/advisor-work";
import type { Paginated } from "@/lib/api/client";
import type { Resource } from "@/lib/api/use-resource";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** How many months the chart shows, ending on this one. */
const MONTHS = 6;

/** The plot: the bars standing on the baseline, at the chart's height. */
const PLOT = "relative flex h-28 items-end gap-2 border-b border-border sm:gap-4 lg:h-40 lg:gap-5";

/** The month names under the bars, on the plot's columns. */
const AXIS = "flex gap-2 sm:gap-4 lg:gap-5";

/** A bar's shape inside its column: no wider than a thumb, its top rounded. */
const BAR = "w-full max-w-12 rounded-t lg:max-w-16 lg:rounded-t-md";

/** The bones' bars, at heights a few months of payouts might stand. */
const BONE_BARS = ["h-2/5", "h-3/5", "h-1/4", "h-4/5", "h-1/2", "h-3/4"] as const;

type MonthPaid = { readonly key: string; readonly amount: number };

/** The net paid in each of the last `MONTHS` months ending on `month` (`YYYY-MM`), by the day it was paid in the advisor's zone. */
function paidByMonth(items: readonly ApiPayout[], timeZone: string, month: string): MonthPaid[] {
  const sums = new Map<string, number>();
  for (const payout of items) {
    if (payout.status !== "PAID" || !payout.paidAt) continue;
    const key = bookingDay(payout.paidAt, timeZone).slice(0, 7);
    sums.set(key, (sums.get(key) ?? 0) + payout.netAmountSatang);
  }
  return Array.from({ length: MONTHS }, (_, index) => {
    const key = moveMonth(month, index - MONTHS + 1);
    return { key, amount: sums.get(key) ?? 0 };
  });
}

/**
 * The months as bars of what was paid, this month's in ink and the rest a
 * light ink, a month with nothing a stub on the baseline. Over the plot the
 * largest month's figure on its dashed line, the scale the bars are drawn to;
 * under it the months' names. Each bar takes focus and shows its month and
 * amount in a tooltip, and says the same to a screen reader.
 */
function MonthlyBars({ series, current, baht }: {
  readonly series: readonly MonthPaid[];
  readonly current: string;
  readonly baht: (satang: number) => string;
}) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const max = Math.max(0, ...series.map((month) => month.amount));
  const monthName = (key: string, style: "short" | "long") =>
    format.dateTime(
      new Date(`${key}-15T12:00:00Z`),
      style === "short" ? { month: "short", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" },
    );
  const scale =
    max > 0
      ? format.number(max / 100, {
          style: "currency",
          currency: "THB",
          currencyDisplay: "narrowSymbol",
          notation: "compact",
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })
      : null;

  return (
    <div aria-label={t("monthlyLabel")} className="flex flex-col gap-2 lg:gap-3" role="group">
      <span aria-hidden className="flex h-lh items-center justify-end font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-label">
        {scale}
      </span>
      <div className={PLOT}>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        {series.map((month) => {
          const label = t("barLabel", { month: monthName(month.key, "long"), amount: baht(month.amount) });
          return (
            <Tooltip key={month.key}>
              <TooltipTrigger
                aria-label={label}
                className="group/bar flex h-full min-w-0 flex-1 items-end justify-center rounded-t-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden
                  className={cn(
                    BAR,
                    "transition-colors",
                    month.key === current ? "bg-foreground" : "bg-foreground/15 group-hover/bar:bg-foreground/30",
                    month.amount > 0 ? null : "h-0.5",
                  )}
                  style={month.amount > 0 ? { height: `max(0.125rem, ${(month.amount / max) * 100}%)` } : undefined}
                />
              </TooltipTrigger>
              {/* `duration-0`: the popup appears and goes without its fade. */}
              <TooltipContent className="duration-0">
                <Figures>{label}</Figures>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div aria-hidden className={AXIS}>
        {series.map((month) => (
          <span className="min-w-0 flex-1 text-center text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label" key={month.key}>
            {monthName(month.key, "short")}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The chart while the payouts load: the scale's figure, bars of bones on the baseline, the months' names. */
function MonthlyBarsBone() {
  return (
    <div aria-hidden className="flex flex-col gap-2 lg:gap-3">
      <span className="flex h-lh items-center justify-end text-xs lg:text-frame-label">
        <span className={cn(DESK_BONE, "h-3 w-10 rounded lg:h-3.5 lg:w-12")} />
      </span>
      <div className={PLOT}>
        <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        {BONE_BARS.map((height) => (
          <span className="flex h-full min-w-0 flex-1 items-end justify-center" key={height}>
            <span className={cn(DESK_BONE, BAR, height)} />
          </span>
        ))}
      </div>
      <div className={AXIS}>
        {BONE_BARS.map((height) => (
          <span className="flex h-lh min-w-0 flex-1 items-center justify-center text-xs lg:text-frame-label" key={height}>
            <span className={cn(DESK_BONE, "h-3 w-6 rounded lg:h-3.5 lg:w-8")} />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * "รายได้" on the dashboard: one hairline box with what was paid in this
 * year, large, over the last six months as bars, and the way to the earnings
 * page at the section's right. All of it is `GET /advisors/me/payouts`.
 * `payouts` or `timeZone` not given yet draws the box's bones.
 */
export function EarningsGlance({ payouts, now, timeZone, baht }: {
  readonly payouts?: Resource<Paginated<ApiPayout>>;
  readonly now: number;
  readonly timeZone?: string;
  readonly baht: (satang: number) => string;
}) {
  const t = useTranslations("workDesk");
  const w = useTranslations("work");
  const items = payouts?.data?.items;

  let body: ReactNode;
  if (payouts?.error) {
    body = <ApiErrorCard className={ERROR_CARD_LG} error={payouts.error} onRetry={payouts.reload} title={t("earningsLoadFailed")} />;
  } else {
    const month = timeZone === undefined ? undefined : bookingDay(now, timeZone).slice(0, 7);
    const ready = items && timeZone !== undefined && month !== undefined;
    const paidThisYear = ready
      ? items
          .filter((payout) => payout.status === "PAID" && payout.paidAt && bookingDay(payout.paidAt, timeZone).startsWith(month.slice(0, 4)))
          .reduce((sum, payout) => sum + payout.netAmountSatang, 0)
      : 0;
    body = (
      <div className="flex flex-col gap-5 rounded-2xl border border-border p-5 lg:gap-7 lg:p-7">
        <div className="flex flex-col gap-0.5 lg:gap-1">
          <span className="text-xs text-muted-foreground lg:text-frame-meta">{t("figPaidYear")}</span>
          {ready ? (
            <span className="font-latin text-2xl font-semibold text-foreground tabular-nums lg:text-frame-title">{baht(paidThisYear)}</span>
          ) : (
            <BoneLine bone="h-6 w-28 rounded-md lg:h-8 lg:w-40" text="text-2xl lg:text-frame-title" />
          )}
        </div>
        {ready ? <MonthlyBars baht={baht} current={month} series={paidByMonth(items, timeZone, month)} /> : <MonthlyBarsBone />}
      </div>
    );
  }

  return (
    <DeskSection
      action={
        <Link className={SECTION_LINK} href="/work/earnings">
          {t("seeEarnings")}
        </Link>
      }
      className={LIST_SECTION}
      id="work-earnings"
      title={w("tab.earnings")}
    >
      {body}
    </DeskSection>
  );
}
