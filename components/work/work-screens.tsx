"use client";

import { CalendarDays, CreditCard, Inbox, ShieldCheck, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { DayGroup } from "@/components/notifications/notification-center-screen";
import { useOwnProfile } from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { AdvisorCalendarScreen } from "@/components/work/advisor-calendar-screen";
import { AdvisorSessionDetailScreen } from "@/components/work/session-detail";
import { EarningsGlance } from "@/components/work/today-earnings";
import { ERROR_CARD_LG } from "@/components/work/today-parts";
import { RequestsPreview, RequestsPreviewBones } from "@/components/work/today-requests";
import { TodaySessions, todaysSessions } from "@/components/work/today-sessions";
import { WeekAhead } from "@/components/work/today-week";
import { useAdvisorBookings, usePayouts, usePendingScreening, useRatingSummary } from "@/components/work/work-data";
import { DESK_PILL } from "@/components/work/desk-page";
import { DESK_BONE, DeskEmpty, DeskFilter, DeskListSkeleton } from "@/components/work/desk-parts";
import { WorkHub } from "@/components/work/work-hub";
import type { ApiPayout } from "@/lib/api/advisor-work";
import { getOwnAdvisorProfile, type ApiOwnAdvisorProfile } from "@/lib/api/onboarding";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The dashboard's blocks one under another: the figures, today, the week, then its foot. */
const PAGE = "mt-5 flex flex-col gap-8 lg:mt-8 lg:gap-10";

/** The dashboard's foot: the requests waiting and the earnings, side by side from `lg`. */
const FOOT = "grid gap-8 lg:grid-cols-2 lg:items-start";

/** The earnings page's capsules while they load: everything, paid and on its way, at their labels' widths. */
const EARNINGS_CAPSULES = ["w-22 lg:w-26", "w-32 lg:w-38", "w-26 lg:w-30"];

/** Satang as baht with the ฿ sign; satang shown only when there are some. */
function useBaht(): (satang: number) => string {
  const format = useFormatter();
  return (satang) => {
    const digits = satang % 100 === 0 ? 0 : 2;
    return format.number(satang / 100, {
      style: "currency",
      currency: "THB",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };
}

/* -------------------------------------------------------------- the pieces */

/** A figure still on its way: one line box of the figure's step, the bone inside. */
function FigureBone() {
  return (
    <span aria-hidden className="flex h-lh items-center">
      <span className={cn(DESK_BONE, "h-6 w-12 rounded-md lg:h-8 lg:w-16")} />
    </span>
  );
}

/**
 * The account the desk belongs to, read once; each view draws from it, and
 * until it lands the view's own skeleton (`skeleton`) holds its place.
 */
function WithProfile({ tab, skeleton, children }: {
  readonly tab: "today" | "earnings";
  readonly skeleton: ReactNode;
  readonly children: (profile: ApiOwnProfile) => ReactNode;
}) {
  const t = useTranslations("workDesk");
  const profile = useOwnProfile();
  if (profile.data) return children(profile.data);
  return (
    <WorkHub tab={tab}>
      {profile.error ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard className={ERROR_CARD_LG} error={profile.error} onRetry={profile.reload} title={t("loadFailed")} />
        </div>
      ) : (
        skeleton
      )}
    </WorkHub>
  );
}

/* ------------------------------------------------------------------- today */

/**
 * `/work`: the advisor's dashboard. A banner says so when their identity is
 * not verified; then the four figures an advisor checks (sessions today,
 * requests waiting, paid this month, the score), each the way to its page;
 * today's sessions as cards, each with the way into it; the week after today
 * as a strip of days, the chosen one's sessions under it; and at the foot the
 * requests waiting on an answer beside what has been paid. Every figure and
 * row is the API's.
 */
export function WorkTodayScreen() {
  return (
    <WithProfile skeleton={<TodaySkeleton />} tab="today">
      {(profile) => <Today profile={profile} />}
    </WithProfile>
  );
}

/** The dashboard's four figures in their row's order, each the way to its page. */
const FIGURES = [
  { key: "figToday", icon: CalendarDays, href: "/work/calendar" },
  { key: "figPending", icon: Inbox, href: "/screening/requests" },
  { key: "figPaidMonth", icon: Wallet, href: "/work/earnings" },
  { key: "figRating", icon: Star, href: "/profile?tab=reviews" },
] as const;

type Figure = (typeof FIGURES)[number]["key"];

/**
 * The four figures as a row of hairline tiles, two to a row on a phone and
 * four from `lg`: the soft glyph, what it counts, and its figure large under
 * it, the whole tile the way to its page. A figure not given yet is a bone,
 * so the row stands whole while the API answers.
 */
function FigureRow({ values = {} }: { readonly values?: Partial<Record<Figure, ReactNode>> }) {
  const t = useTranslations("workDesk");
  return (
    <ul aria-label={t("figuresLabel")} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {FIGURES.map(({ key, icon: Icon, href }) => (
        <li className="min-w-0" key={key}>
          <Link
            className="flex h-full flex-col gap-3 rounded-2xl border border-border p-4 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-4 lg:p-5"
            href={href}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-10">
              <Icon aria-hidden className="size-4 lg:size-5" strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
              <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">{t(key)}</span>
              <span className="flex items-start gap-1.5 font-latin text-2xl font-semibold text-foreground tabular-nums lg:gap-2 lg:text-frame-title">
                {values[key] ?? <FigureBone />}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * `/work` while the account is on its way: the page's own blocks in the
 * shape they hold while their data loads — the figures with their bones, two
 * cards of today, the week's strip over a day of rows, and the requests
 * beside the earnings box — so nothing shifts when it lands.
 */
function TodaySkeleton() {
  const t = useTranslations("workDesk");
  const baht = useBaht();
  const now = useMountTime();
  return (
    <div aria-busy className={PAGE}>
      <span className="sr-only">{t("loading")}</span>
      <FigureRow />
      <TodaySessions bookings={undefined} now={now} />
      <WeekAhead bookings={undefined} now={now} />
      <div className={FOOT}>
        <RequestsPreviewBones />
        <EarningsGlance baht={baht} now={now} />
      </div>
    </div>
  );
}

/** Said once, above everything, while customers cannot book the advisor yet. */
function VerificationBanner() {
  const t = useTranslations("workDesk");
  const profile = useResource<ApiOwnAdvisorProfile | null>(
    "advisors/me",
    useCallback((signal: AbortSignal) => getOwnAdvisorProfile(signal), []),
  );
  const status = profile.data?.verificationStatus;
  if (!status || status === "VERIFIED") return null;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-muted/60 px-4 py-3.5 md:flex-row md:items-center md:justify-between lg:mt-8 lg:px-6 lg:py-5" role="status">
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground lg:text-frame-body">{t(`verify.${status}.title`)}</p>
          <p className="text-xs text-muted-foreground lg:text-frame-meta">{t(`verify.${status}.body`)}</p>
        </div>
      </div>
      {status !== "SUBMITTED" ? (
        <Button className={cn(authPill(true), DESK_PILL)} nativeButton={false} render={<Link href="/advisor-onboarding/stage-2" />}>
          {t("verifyAction")}
        </Button>
      ) : null}
    </div>
  );
}

function Today({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const now = useMountTime();
  const timeZone = profile.timezone;
  const bookings = useAdvisorBookings(profile);
  const pending = usePendingScreening();
  const rating = useRatingSummary(profile.id);
  const payouts = usePayouts();

  const month = bookingDay(now, timeZone).slice(0, 7);
  const paidThisMonth = (payouts.data?.items ?? [])
    .filter((payout) => payout.status === "PAID" && payout.paidAt && bookingDay(payout.paidAt, timeZone).startsWith(month))
    .reduce((sum, payout) => sum + payout.netAmountSatang, 0);

  return (
    <WorkHub tab="today">
      <VerificationBanner />
      <div className={PAGE}>
        <FigureRow
          values={{
            figToday: bookings.data ? format.number(todaysSessions(bookings.data, now, timeZone).length) : bookings.error ? "—" : undefined,
            // Waiting on an answer: an ink dot after the count, so it reads as something to do.
            figPending:
              pending.data === undefined ? (
                pending.error ? "—" : undefined
              ) : pending.data > 0 ? (
                <>
                  {format.number(pending.data)}
                  <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-hero-action lg:mt-2.5 lg:size-2.5" />
                </>
              ) : (
                format.number(0)
              ),
            figPaidMonth: payouts.data ? baht(paidThisMonth) : payouts.error ? "—" : undefined,
            figRating: rating.data
              ? rating.data.total > 0
                ? format.number(rating.data.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                : "—"
              : rating.error
                ? "—"
                : undefined,
          }}
        />
        <TodaySessions
          bookings={bookings.data}
          failure={
            bookings.error ? (
              <ApiErrorCard className={ERROR_CARD_LG} error={bookings.error} onRetry={bookings.reload} title={t("loadFailed")} />
            ) : undefined
          }
          now={now}
          timeZone={timeZone}
        />
        {/* The week reads the same bookings: when they failed, the card above says so once. */}
        {bookings.error ? null : <WeekAhead bookings={bookings.data} now={now} timeZone={timeZone} />}
        <div className={FOOT}>
          <RequestsPreview now={now} />
          <EarningsGlance baht={baht} now={now} payouts={payouts} timeZone={timeZone} />
        </div>
      </div>
    </WorkHub>
  );
}

/* ---------------------------------------------------------------- calendar */

export function WorkCalendarScreen() {
  return <AdvisorCalendarScreen />;
}

/* ---------------------------------------------------------------- earnings */

/** A payout's state in its own word and ink, as the transactions page colours an outcome. */
const PAYOUT_INK: Record<ApiPayout["status"], string> = {
  PENDING: "text-warning",
  PAID: "text-success",
  FAILED: "text-destructive",
};

/**
 * `/work/earnings`: what the platform has paid the advisor and what it is
 * paying. The figures (paid in, on its way, how many transfers), then every
 * payout a month to a group, newest first — each the net that reached the
 * account over its state, the transfer fee under the date. All of it is
 * `GET /advisors/me/payouts`.
 */
export function WorkEarningsScreen() {
  return (
    <WithProfile skeleton={<EarningsSkeleton />} tab="earnings">
      {(profile) => <Earnings profile={profile} />}
    </WithProfile>
  );
}

/** The earnings page while it loads, the account or its payouts: the capsules' row over a month of payouts. */
function EarningsSkeleton() {
  const t = useTranslations("workDesk");
  return <DeskListSkeleton capsules={EARNINGS_CAPSULES} label={t("loading")} rows={1} />;
}

function Earnings({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const payouts = usePayouts();
  const timeZone = profile.timezone;

  const [shown, setShown] = useState<"all" | ApiPayout["status"]>("all");
  const items = payouts.data?.items ?? [];
  const sum = (status: ApiPayout["status"]) =>
    items.filter((item) => item.status === status).reduce((total, item) => total + item.netAmountSatang, 0);
  const visible = shown === "all" ? items : items.filter((item) => item.status === shown);

  const months: { key: string; label: string; rows: ApiPayout[] }[] = [];
  for (const payout of visible.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = bookingDay(payout.createdAt, timeZone).slice(0, 7);
    let group = months.at(-1);
    if (group?.key !== key) {
      group = { key, label: format.dateTime(new Date(payout.createdAt), { month: "long", year: "numeric", timeZone }), rows: [] };
      months.push(group);
    }
    group.rows.push(payout);
  }

  return (
    <WorkHub
      action={
        <Button className={cn(authPill(false), DESK_PILL)} nativeButton={false} render={<Link href="/earnings/payout-account" />} variant="outline">
          <CreditCard aria-hidden />
          {t("toolPayoutAccount")}
        </Button>
      }
      tab="earnings"
    >
      {payouts.error ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard className={ERROR_CARD_LG} error={payouts.error} onRetry={payouts.reload} title={t("earningsLoadFailed")} />
        </div>
      ) : !payouts.data ? (
        <EarningsSkeleton />
      ) : items.length === 0 ? (
        <DeskEmpty
          action={{ label: t("earningsEmptyAction"), href: "/earnings/payout-account" }}
          body={t("earningsEmptyBody")}
          icon={Wallet}
          title={t("earningsEmptyTitle")}
        />
      ) : (
        <>
          {/* What each holds is its sum: the money is the point of the page. */}
          <DeskFilter
            label={t("historyTitle")}
            onChange={setShown}
            options={[
              { key: "all", label: t("filterAll"), note: format.number(items.length) },
              { key: "PAID", label: t("payoutStatus.PAID"), note: baht(sum("PAID")) },
              { key: "PENDING", label: t("payoutStatus.PENDING"), note: baht(sum("PENDING")) },
              ...(items.some((item) => item.status === "FAILED")
                ? [{ key: "FAILED" as const, label: t("payoutStatus.FAILED"), note: baht(sum("FAILED")) }]
                : []),
            ]}
            value={shown}
          />
          {months.length === 0 ? (
            <p className="pt-8 text-sm text-muted-foreground lg:pt-12 lg:text-frame-body">{t("filteredEmpty")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {months.map((month) => (
                <DayGroup key={month.key} label={month.label}>
                  {month.rows.map((payout) => (
                    <PayoutRow baht={baht} key={payout.id} payout={payout} timeZone={timeZone} />
                  ))}
                </DayGroup>
              ))}
            </div>
          )}
        </>
      )}
    </WorkHub>
  );
}

/** One payout, the transactions page's row: the wallet in a soft circle, the transfer and its day, the net over its state. */
function PayoutRow({ payout, timeZone, baht }: {
  readonly payout: ApiPayout;
  readonly timeZone: string;
  readonly baht: (satang: number) => string;
}) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const day = format.dateTime(new Date(payout.paidAt ?? payout.createdAt), { day: "numeric", month: "short", timeZone });

  return (
    <li className="-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12">
        <Wallet aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{t("payoutTitle")}</span>
        <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">
          <span className="font-latin tabular-nums">{day}</span>
          {payout.transferFeeSatang > 0 ? ` · ${t("payoutFee", { fee: baht(payout.transferFeeSatang) })}` : null}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
        <span
          className={cn(
            "font-latin text-sm font-semibold whitespace-nowrap tabular-nums lg:text-frame-meta",
            payout.status === "PAID" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {baht(payout.netAmountSatang)}
        </span>
        <span className={cn("text-xs whitespace-nowrap lg:text-frame-label", PAYOUT_INK[payout.status])}>
          {t(`payoutStatus.${payout.status}`)}
        </span>
      </span>
    </li>
  );
}

/* ----------------------------------------------------------------- session */

export function SessionDetailScreen() {
  return <AdvisorSessionDetailScreen />;
}
