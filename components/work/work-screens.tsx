"use client";

import { CalendarDays, ChevronRight, CreditCard, Inbox, MessageSquare, ShieldCheck, Star, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import { LinkListCount } from "@/components/account/link-list";
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
import { DESK_GLYPH, DESK_PILL } from "@/components/work/desk-page";
import { WorkHub } from "@/components/work/work-hub";
import { getAdvisorBooking, type AdvisorBooking, type AdvisorBookingDetail } from "@/lib/api/advisor-bookings";
import type { ApiPayout } from "@/lib/api/advisor-work";
import { getOwnAdvisorProfile, type ApiOwnAdvisorProfile } from "@/lib/api/onboarding";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
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
 * `/work`: the advisor's dashboard. What needs them first — the next session,
 * large, with the way into it and how long until it starts — then the rest of
 * today, and what comes after a day to a group. Beside it the four figures an
 * advisor checks (today, requests waiting, paid this month, the score), each
 * the way to its page, and the desk's tools. A banner says so when their
 * identity is not verified. Every figure and row is the API's.
 */
export function WorkTodayScreen() {
  return <WithProfile tab="today">{(profile) => <Today profile={profile} />}</WithProfile>;
}

/** "อีก 25 นาที", "อีก 3 ชม. 10 นาที", or the day and time when it is further off. */
function useStartsIn(now: number, timeZone: string): (booking: AdvisorBooking) => string {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  return (booking) => {
    const start = Date.parse(booking.startTime);
    if (start <= now) return t("inSession");
    const minutes = Math.ceil((start - now) / 60_000);
    if (minutes < 60) return t("startsInMinutes", { minutes });
    if (minutes < 24 * 60) return t("startsInHours", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
    return format.dateTime(new Date(start), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  };
}

/** The next session, large: who, what and when, how long until it starts, and the ways into it. */
function NextSession({ booking, now, timeZone }: { readonly booking: AdvisorBooking; readonly now: number; readonly timeZone: string }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const startsIn = useStartsIn(now, timeZone);
  const detail = useResource<AdvisorBookingDetail>(
    `advisors/me/bookings/${booking.id}`,
    useCallback((signal: AbortSignal) => getAdvisorBooking(booking.id, signal), [booking.id]),
  );
  const clock = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const live = Date.parse(booking.startTime) <= now;
  const chatRoomId = detail.data?.chatRoomId;

  return (
    <section aria-labelledby="work-next" className="flex flex-col gap-5 rounded-2xl border border-border p-5 lg:gap-7 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground lg:text-frame-meta" id="work-next">
          {t("nextTitle")}
        </h2>
        <span
          className={cn(
            "flex h-8 items-center rounded-full px-3 text-xs font-medium lg:h-10 lg:px-4 lg:text-frame-label",
            live ? "bg-hero-action text-hero-action-foreground" : "bg-muted text-foreground",
          )}
        >
          {startsIn(booking)}
        </span>
      </div>
      <div className="flex items-center gap-4 lg:gap-6">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-medium text-foreground lg:size-20 lg:text-frame-heading"
        >
          {booking.adviseeName.trim().slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
          <p className="truncate font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-frame-title">
            {booking.adviseeName}
          </p>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">
            {booking.serviceName}
            {" · "}
            <span className="font-latin tabular-nums">
              {clock(booking.startTime)}–{clock(booking.endTime)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5 lg:gap-3">
        <Button className={cn(authPill(true), DESK_PILL)} nativeButton={false} render={<Link href={`/work/session?id=${booking.id}`} />}>
          {live ? t("joinNow") : t("openSession")}
        </Button>
        {chatRoomId ? (
          <Button
            className={cn(authPill(false), DESK_PILL)}
            nativeButton={false}
            render={<Link href={`/chat/room?id=${chatRoomId}`} />}
            variant="outline"
          >
            <MessageSquare aria-hidden />
            {t("openChat")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** One of the dashboard's figures: a hairline box, its value large over its name, and the way to its page. */
type OverviewRow = { readonly icon: LucideIcon; readonly label: string; readonly value: ReactNode; readonly href: string };

/**
 * Today's figures beside the sessions, as one hairline box of rows — the
 * payout account's rows: the soft glyph, what it counts, its figure at the
 * right and the chevron to where it is kept.
 */
function Overview({ label, rows }: { readonly label: string; readonly rows: readonly OverviewRow[] }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <li key={row.label}>
            <Link
              className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset lg:gap-4 lg:px-5 lg:py-4"
              href={row.href}
            >
              <span className={DESK_GLYPH}>
                <Icon aria-hidden className="size-4 lg:size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground lg:text-frame-body">{row.label}</span>
              <span className="font-latin text-base font-semibold text-foreground tabular-nums lg:text-frame-body">{row.value}</span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
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

  const today = bookingDay(now, timeZone);
  const tomorrow = bookingDay(now + 86_400_000, timeZone);
  const ahead = (bookings.data ?? [])
    .filter((booking) => isAhead(booking, now))
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  const next = ahead[0];
  const todayRows = ahead.filter((booking) => booking !== next && bookingDay(booking.startTime, timeZone) === today);
  const todayCount = ahead.filter((booking) => bookingDay(booking.startTime, timeZone) === today).length;
  const later = ahead.filter((booking) => booking !== next && bookingDay(booking.startTime, timeZone) !== today).slice(0, UPCOMING_SHOWN);

  const groups: { key: string; label: string; rows: AdvisorBooking[] }[] = [];
  for (const booking of later) {
    const key = bookingDay(booking.startTime, timeZone);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const label =
        key === tomorrow
          ? t("tomorrow")
          : format.dateTime(new Date(booking.startTime), { weekday: "long", day: "numeric", month: "long", timeZone });
      group = { key, label, rows: [] };
      groups.push(group);
    }
    group.rows.push(booking);
  }

  const month = today.slice(0, 7);
  const paidThisMonth = (payouts.data?.items ?? [])
    .filter((payout) => payout.status === "PAID" && payout.paidAt && bookingDay(payout.paidAt, timeZone).startsWith(month))
    .reduce((sum, payout) => sum + payout.netAmountSatang, 0);
  const dateLabel = format.dateTime(new Date(now), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone });

  return (
    <WorkHub
      subtitle={bookings.data ? t("todaySubtitle", { date: dateLabel, count: todayCount }) : dateLabel}
      tab="today"
    >
      <VerificationBanner />
      {/* Four blocks, placed so the phone reads them in the order that matters
          — the next session, the figures, the rest of the days, the tools —
          while the desktop stands the figures and tools beside the sessions. */}
      <div className={cn(DESK, "lg:items-start")}>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {bookings.error ? (
            <ApiErrorCard className={ERROR_CARD_LG} error={bookings.error} onRetry={bookings.reload} title={t("loadFailed")} />
          ) : !bookings.data ? (
            <div aria-hidden className={cn(BONE, "h-56 rounded-2xl lg:h-72")} />
          ) : next ? (
            <NextSession booking={next} now={now} timeZone={timeZone} />
          ) : (
            <Empty
              action={t("emptyAction")}
              body={t("emptyBody")}
              href="/advisor/services"
              icon={CalendarDays}
              title={t("emptyTitle")}
            />
          )}
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <Overview
            label={t("figuresLabel")}
            rows={[
              { icon: CalendarDays, label: t("figToday"), href: "/work/calendar", value: bookings.data ? format.number(todayCount) : <FigureBone /> },
              {
                icon: Inbox,
                label: t("figPending"),
                href: "/screening/requests",
                // Waiting on an answer: the count as the menu's badge, so it reads as something to do.
                value:
                  pending.data === undefined ? (
                    pending.error ? "—" : <FigureBone />
                  ) : pending.data > 0 ? (
                    <LinkListCount count={pending.data} label={t("pendingCount", { count: pending.data })} />
                  ) : (
                    format.number(0)
                  ),
              },
              { icon: Wallet, label: t("figPaidMonth"), href: "/work/earnings", value: payouts.data ? baht(paidThisMonth) : payouts.error ? "—" : <FigureBone /> },
              {
                icon: Star,
                label: t("figRating"),
                href: "/profile?tab=reviews",
                value: rating.data
                  ? rating.data.total > 0
                    ? format.number(rating.data.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : "—"
                  : rating.error
                    ? "—"
                    : <FigureBone />,
              },
            ]}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-8 empty:hidden lg:col-start-1 lg:row-start-2 lg:gap-10">
          {/* The rest of today, only when there is more of it than the card above. */}
          {todayRows.length > 0 ? (
            <Section id="work-today" title={t("todayTitle")}>
              <ul className="-mt-1 flex flex-col">
                {todayRows.map((booking) => (
                  <SessionRow booking={booking} key={booking.id} now={now} timeZone={timeZone} />
                ))}
              </ul>
            </Section>
          ) : null}

          {groups.length > 0 ? (
            <Section
              action={
                <Link className="text-sm font-medium text-foreground underline underline-offset-4 lg:text-frame-meta" href="/work/calendar">
                  {t("seeCalendar")}
                </Link>
              }
              id="work-later"
              title={t("laterTitle")}
            >
              <div className="-mt-5 flex flex-col divide-y divide-border lg:-mt-8">
                {groups.map((group) => (
                  <DayGroup key={group.key} label={group.label}>
                    {group.rows.map((booking) => (
                      <SessionRow booking={booking} key={booking.id} now={now} timeZone={timeZone} />
                    ))}
                  </DayGroup>
                ))}
              </div>
            </Section>
          ) : null}
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
  return <WithProfile tab="earnings">{(profile) => <Earnings profile={profile} />}</WithProfile>;
}

function Earnings({ profile }: { readonly profile: ApiOwnProfile }) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const baht = useBaht();
  const payouts = usePayouts();
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
    <WorkHub
      action={
        <Button className={cn(authPill(false), DESK_PILL)} nativeButton={false} render={<Link href="/earnings/payout-account" />} variant="outline">
          <CreditCard aria-hidden />
          {t("toolPayoutAccount")}
        </Button>
      }
      subtitle={t("earningsSubtitle")}
      tab="earnings"
    >
      <div className="mt-5 lg:mt-8">
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
