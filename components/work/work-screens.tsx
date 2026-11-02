"use client";

import {
  Briefcase,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  Star,
  UserRoundPen,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LinkList, LinkListCount } from "@/components/account/link-list";
import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { DayGroup } from "@/components/notifications/notification-center-screen";
import { useOwnProfile } from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { AdvisorCalendarScreen } from "@/components/work/advisor-calendar-screen";
import { SessionRow } from "@/components/work/session-row";
import { AdvisorSessionDetailScreen } from "@/components/work/session-detail";
import { useAdvisorBookings, usePayouts, usePendingScreening, useRatingSummary } from "@/components/work/work-data";
import { WorkHub } from "@/components/work/work-hub";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import type { ApiPayout } from "@/lib/api/advisor-work";
import type { ApiOwnProfile } from "@/lib/api/types";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The desk's two columns from `lg`: the view, and its tools beside it — the profile's feed and rail. */
const DESK = "mt-5 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem]";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/** `ApiErrorCard` at the frame's type steps from `lg`, as the transactions page draws it. */
const ERROR_CARD_LG =
  "lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure";

/** How many sessions the desk lists before it points at the calendar. */
const UPCOMING_SHOWN = 8;

/** A booking still to happen, or happening: held-for-payment ones are not the advisor's yet. */
function isAhead(booking: AdvisorBooking, now: number): boolean {
  return (booking.state === "BOOKED" || booking.state === "IN_PROGRESS") && Date.parse(booking.endTime) > now;
}

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

type Figure = { readonly label: string; readonly value: ReactNode };

/** The figures box: values over their labels in one hairline box, as the profile's. */
function Figures({ label, figures }: { readonly label: string; readonly figures: readonly Figure[] }) {
  return (
    <dl aria-label={label} className="flex w-full max-w-xl rounded-2xl border border-border py-1 md:w-fit lg:py-1.5">
      {figures.map((figure) => (
        <div className="flex flex-1 flex-col items-center px-3 py-2 md:flex-none md:px-5 lg:px-6" key={figure.label}>
          <dt className="order-2 text-xs whitespace-nowrap text-muted-foreground md:text-sm lg:text-frame-label">
            {figure.label}
          </dt>
          <dd className="order-1 font-latin text-xl leading-tight font-semibold text-foreground tabular-nums md:text-2xl lg:text-frame-figure">
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A figure still on its way. */
function FigureBone() {
  return <span aria-hidden className={cn(BONE, "my-1 block h-6 w-8 rounded-md lg:h-8")} />;
}

/** A titled column: the heading at the profile's rail step, then its body. */
function Section({ id, title, action, children }: {
  readonly id: string;
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3 lg:gap-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" id={id}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Nothing yet: one muted icon, what will land here, and the way to start — the transactions page's empty box. */
function Empty({ icon: Icon, title, body, href, action }: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly action: string;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border px-6 py-12 text-center lg:gap-5 lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <Icon aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h3>
        <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
      </div>
      <Button
        className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
        nativeButton={false}
        render={<Link href={href} />}
      >
        {action}
      </Button>
    </div>
  );
}

/** Rows still on their way, at a row's own height. */
function RowsBone({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5" key={i}>
          <span className={cn(BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
          <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <span className={cn(BONE, "h-3.5 w-1/2 rounded lg:h-4.5")} />
            <span className={cn(BONE, "h-3 w-1/3 rounded lg:h-4")} />
          </span>
          <span className={cn(BONE, "mt-1 h-3.5 w-16 rounded lg:h-4")} />
        </div>
      ))}
    </div>
  );
}

/** The desk's tools, beside every view: what the advisor sells, when, and what they owe an answer to. */
function Tools({ pending }: { readonly pending: number | undefined }) {
  const t = useTranslations("workDesk");
  return (
    <Section id="work-tools" title={t("toolsTitle")}>
      <LinkList
        label={t("toolsTitle")}
        rows={[
          { icon: Briefcase, label: t("toolServices"), href: "/advisor/services" },
          { icon: Clock, label: t("toolAvailability"), href: "/availability" },
          {
            icon: FileText,
            label: t("toolScreening"),
            href: "/screening/requests",
            badge: pending ? <LinkListCount count={pending} label={t("pendingCount", { count: pending })} /> : null,
          },
          { icon: Star, label: t("toolReviews"), href: "/reviews" },
          { icon: UserRoundPen, label: t("toolAdvisorEdit"), href: "/advisor/edit" },
          { icon: CreditCard, label: t("toolPayoutAccount"), href: "/earnings/payout-account" },
        ]}
      />
    </Section>
  );
}

/** The account the desk belongs to, read once; each view draws from it. */
function WithProfile({ tab, children }: {
  readonly tab: "today" | "earnings";
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
        <div aria-busy className="mt-5 lg:mt-8">
          <span className="sr-only">{t("loading")}</span>
          <RowsBone />
        </div>
      )}
    </WorkHub>
  );
}

/* ------------------------------------------------------------------- today */

/**
 * `/work`: the advisor's day. The figures (today, what is ahead, screening
 * requests waiting, the score), then the sessions ahead a day to a group, and
 * the tools beside them. Every figure and row is the API's: the advisor's
 * bookings, the pending screening count and the rating summary.
 */
export function WorkTodayScreen() {
  return <WithProfile tab="today">{(profile) => <Today profile={profile} />}</WithProfile>;
}

function Today({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const now = useMountTime();
  const timeZone = profile.timezone;
  const bookings = useAdvisorBookings(profile);
  const pending = usePendingScreening();
  const rating = useRatingSummary(profile.id);

  const today = bookingDay(now, timeZone);
  const tomorrow = bookingDay(now + 86_400_000, timeZone);
  const ahead = (bookings.data ?? [])
    .filter((booking) => isAhead(booking, now))
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  const todayCount = ahead.filter((booking) => bookingDay(booking.startTime, timeZone) === today).length;
  const shown = ahead.slice(0, UPCOMING_SHOWN);

  const groups: { key: string; label: string; rows: AdvisorBooking[] }[] = [];
  for (const booking of shown) {
    const key = bookingDay(booking.startTime, timeZone);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label =
        key === today
          ? t("today")
          : key === tomorrow
            ? t("tomorrow")
            : format.dateTime(new Date(booking.startTime), { weekday: "long", day: "numeric", month: "long", timeZone });
      group = { key, label, rows: [] };
      groups.push(group);
    }
    group.rows.push(booking);
  }

  const dateLabel = format.dateTime(new Date(now), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone });

  return (
    <WorkHub
      subtitle={bookings.data ? t("todaySubtitle", { date: dateLabel, count: todayCount }) : dateLabel}
      tab="today"
    >
      <div className={DESK}>
        <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
          <Figures
            figures={[
              { label: t("figToday"), value: bookings.data ? format.number(todayCount) : <FigureBone /> },
              { label: t("figUpcoming"), value: bookings.data ? format.number(ahead.length) : <FigureBone /> },
              { label: t("figPending"), value: pending.data === undefined ? (pending.error ? "—" : <FigureBone />) : format.number(pending.data) },
              {
                label: t("figRating"),
                value: rating.data
                  ? rating.data.total > 0
                    ? format.number(rating.data.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : "—"
                  : rating.error
                    ? "—"
                    : <FigureBone />,
              },
            ]}
            label={t("figuresLabel")}
          />

          <Section
            action={
              ahead.length > UPCOMING_SHOWN ? (
                <Link
                  className="text-sm font-medium text-foreground underline underline-offset-4 lg:text-frame-meta"
                  href="/work/calendar"
                >
                  {t("seeCalendar")}
                </Link>
              ) : null
            }
            id="work-upcoming"
            title={t("upcomingTitle")}
          >
            {bookings.error ? (
              <ApiErrorCard className={ERROR_CARD_LG} error={bookings.error} onRetry={bookings.reload} title={t("loadFailed")} />
            ) : !bookings.data ? (
              <RowsBone />
            ) : groups.length === 0 ? (
              <Empty
                action={t("emptyAction")}
                body={t("emptyBody")}
                href="/advisor/services"
                icon={CalendarDays}
                title={t("emptyTitle")}
              />
            ) : (
              <div className="-mt-5 flex flex-col divide-y divide-border lg:-mt-8">
                {groups.map((group) => (
                  <DayGroup key={group.key} label={group.label}>
                    {group.rows.map((booking) => (
                      <SessionRow booking={booking} key={booking.id} now={now} timeZone={timeZone} />
                    ))}
                  </DayGroup>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Tools pending={pending.data} />
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
  return <WithProfile tab="earnings">{(profile) => <Earnings profile={profile} />}</WithProfile>;
}

function Earnings({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const payouts = usePayouts();
  const pending = usePendingScreening();
  const timeZone = profile.timezone;

  const items = payouts.data?.items ?? [];
  const sum = (status: ApiPayout["status"]) =>
    items.filter((item) => item.status === status).reduce((total, item) => total + item.netAmountSatang, 0);

  const months: { key: string; label: string; rows: ApiPayout[] }[] = [];
  for (const payout of items.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = bookingDay(payout.createdAt, timeZone).slice(0, 7);
    let group = months.at(-1);
    if (group?.key !== key) {
      group = { key, label: format.dateTime(new Date(payout.createdAt), { month: "long", year: "numeric", timeZone }), rows: [] };
      months.push(group);
    }
    group.rows.push(payout);
  }

  return (
    <WorkHub subtitle={t("earningsSubtitle")} tab="earnings">
      <div className={DESK}>
        <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
          <Figures
            figures={[
              { label: t("figPaid"), value: payouts.data ? baht(sum("PAID")) : <FigureBone /> },
              { label: t("figPendingPay"), value: payouts.data ? baht(sum("PENDING")) : <FigureBone /> },
              { label: t("figCount"), value: payouts.data ? format.number(payouts.data.total) : <FigureBone /> },
            ]}
            label={t("figuresLabel")}
          />

          <Section id="work-payouts" title={t("historyTitle")}>
            {payouts.error ? (
              <ApiErrorCard className={ERROR_CARD_LG} error={payouts.error} onRetry={payouts.reload} title={t("earningsLoadFailed")} />
            ) : !payouts.data ? (
              <RowsBone />
            ) : months.length === 0 ? (
              <Empty
                action={t("earningsEmptyAction")}
                body={t("earningsEmptyBody")}
                href="/earnings/payout-account"
                icon={Wallet}
                title={t("earningsEmptyTitle")}
              />
            ) : (
              <div className="-mt-5 flex flex-col divide-y divide-border lg:-mt-8">
                {months.map((month) => (
                  <DayGroup key={month.key} label={month.label}>
                    {month.rows.map((payout) => (
                      <PayoutRow baht={baht} key={payout.id} payout={payout} timeZone={timeZone} />
                    ))}
                  </DayGroup>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Tools pending={pending.data} />
      </div>
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
