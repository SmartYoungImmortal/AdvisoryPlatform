"use client";

import { CreditCard, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { initialsOf } from "@/components/advisor-public/headline";
import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { DayGroup } from "@/components/notifications/notification-center-screen";
import { useOwnProfile } from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AdvisorCalendarScreen } from "@/components/work/advisor-calendar-screen";
import { AdvisorSessionDetailScreen } from "@/components/work/session-detail";
import { useAdvisorBookings, usePayouts } from "@/components/work/work-data";
import { DESK_PILL } from "@/components/work/desk-page";
import { DESK_BONE, DeskEmpty, DeskFilter, DeskListSkeleton } from "@/components/work/desk-parts";
import { WorkHub } from "@/components/work/work-hub";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import type { ApiPayout } from "@/lib/api/advisor-work";
import { getOwnAdvisorProfile, type ApiOwnAdvisorProfile } from "@/lib/api/onboarding";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { bookingDay } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/** The earnings page's capsules while they load: everything, paid and on its way, at their labels' widths. */
const EARNINGS_CAPSULES = ["w-22 lg:w-26", "w-32 lg:w-38", "w-26 lg:w-30"];

/** `ApiErrorCard` at the frame's type steps from `lg`, as the transactions page draws it. */
const ERROR_CARD_LG =
  "lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure";

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
 * `/work`: the advisor's sessions, one column down the middle of the page.
 * Two capsules choose the day — today, or everything from tomorrow on — and
 * under them one large line says how many there are, then each session is a
 * card: when, who in a large circle, the service, and a word when it is under
 * way or over. A card is the way into its session, where joining and the chat
 * are. With nothing there, the line, what will land here, and one grey button
 * (to the sessions ahead, or to the services). A banner says so above it all
 * while the advisor's identity is not verified. Every session is the API's.
 */
export function WorkTodayScreen() {
  return (
    <WithProfile skeleton={<TodaySkeleton />} tab="today">
      {(profile) => <Today profile={profile} />}
    </WithProfile>
  );
}

/** The page's two views, in the capsules' order. */
const VIEWS = ["today", "upcoming"] as const;

type View = (typeof VIEWS)[number];

/** How many sessions ahead the upcoming view draws. */
const UPCOMING_CARDS = 12;

/** A capsule: 36 tall on a phone, 48 from `lg`, the label at 14 then 16, 12 apart. */
const VIEW_CAPSULE = "h-9 rounded-full px-4 text-sm font-medium lg:h-12 lg:px-6 lg:text-base";

/** The capsules while they load, at their labels' widths. */
const VIEW_BONES = ["w-16 lg:w-21", "w-24 lg:w-30"];

/** The large line's type: 32 on 36, semibold and drawn in. */
const HEADLINE_TYPE = "text-heading-lg leading-9 font-semibold tracking-tight";

/** How far the large line sits under the capsules: further when nothing follows it. */
const HEADLINE_GAP = "mt-8 lg:mt-16";
const HEADLINE_GAP_EMPTY = "mt-12 lg:mt-24";

/**
 * The cards: one column on a phone, at most 352 wide; from `md` as many
 * 17rem columns as the page holds (four abreast on a 1440 screen), the empty
 * ones folded away so one or two cards still stand in the middle.
 */
const CARD_GRID =
  "mt-8 grid w-full max-w-88 grid-cols-1 gap-4 md:max-w-none md:grid-cols-[repeat(auto-fit,minmax(0,17rem))] md:justify-center lg:mt-10 lg:gap-6";

/** A session's card: white, a hairline and a soft shadow, everything on its centre line. */
const CARD = "flex w-full min-w-0 flex-col items-center rounded-3xl border border-border bg-card p-6 text-center shadow-hero-card lg:px-8 lg:py-10";

/**
 * The card's lines, top to bottom: when, the face, who, and the service.
 * When is held to one line box (`h-lh`): its figures are in the Latin face,
 * whose own leading would otherwise make the line a hair taller than its bone.
 */
const CARD_WHEN = "h-lh text-sm font-medium lg:text-frame-meta";
const CARD_FACE = "mt-6 size-20 shrink-0 rounded-full lg:mt-9 lg:size-24";
const CARD_NAME = "mt-6 w-full text-xl font-semibold lg:mt-8 lg:text-frame-figure";
const CARD_LINE = "mt-1 w-full text-sm lg:text-frame-meta";

/** The grey button under an empty page: 40 tall on a phone, 48 from `lg`, on the `xl` corner. */
const EMPTY_ACTION =
  "mt-8 h-10 rounded-xl bg-muted px-5 text-sm font-medium text-foreground hover:bg-muted/70 hover:text-foreground lg:mt-12 lg:h-12 lg:px-6 lg:text-base";

/** On the advisor's day: confirmed, under way or done — not held for payment, not called off. */
function isConfirmed(booking: AdvisorBooking): boolean {
  return booking.state === "BOOKED" || booking.state === "IN_PROGRESS" || booking.state === "COMPLETED";
}

/**
 * One session as a card, the whole of it the way into the session: when it
 * is (the hours today; the day and the hours ahead), who in a large circle,
 * their name, the service, and one small word while it is under way or once
 * it is over. Times are in the advisor's own zone.
 */
function SessionCard({ booking, view, now, timeZone }: {
  readonly booking: AdvisorBooking;
  readonly view: View;
  readonly now: number;
  readonly timeZone: string;
}) {
  const t = useTranslations("workDesk");
  const format = useFormatter();
  const clock = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const finished = booking.state === "COMPLETED" || Date.parse(booking.endTime) <= now;
  const live = !finished && Date.parse(booking.startTime) <= now;

  return (
    <li className="flex min-w-0">
      <Link
        className={cn(CARD, "outline-none hover:shadow-hero-card-hover focus-visible:ring-3 focus-visible:ring-ring/50")}
        href={`/work/session?id=${booking.id}`}
      >
        <span className={cn(CARD_WHEN, "text-foreground")}>
          {view === "upcoming" ? (
            <>
              {format.dateTime(new Date(booking.startTime), { weekday: "short", day: "numeric", month: "short", timeZone })}
              {" · "}
            </>
          ) : null}
          <span className="font-latin tabular-nums">
            {clock(booking.startTime)}–{clock(booking.endTime)}
          </span>
        </span>
        {/* Their face, and the service's photograph on its lower right edge,
            ringed in the card's white; the initial while there is no face. */}
        <span aria-hidden className={cn(CARD_FACE, "relative")}>
          <Avatar className="size-full after:hidden">
            {booking.adviseeAvatarUrl ? <AvatarImage alt="" src={booking.adviseeAvatarUrl} /> : null}
            <AvatarFallback className="bg-muted text-2xl font-medium text-foreground lg:text-frame-title">
              {initialsOf(booking.adviseeName).charAt(0)}
            </AvatarFallback>
          </Avatar>
          {booking.serviceImageUrl ? (
            <Avatar className="absolute -right-5 bottom-0 size-9 rounded-lg ring-3 ring-card after:hidden lg:-right-6.5 lg:size-11">
              <AvatarImage alt="" className="rounded-lg" src={booking.serviceImageUrl} />
              <AvatarFallback className="rounded-lg" />
            </Avatar>
          ) : null}
        </span>
        <span className={cn(CARD_NAME, "truncate text-foreground")}>{booking.adviseeName}</span>
        <span className={cn(CARD_LINE, "truncate text-muted-foreground")}>{booking.serviceName}</span>
        {live || finished ? (
          <span className={cn("mt-1 text-xs font-medium lg:text-frame-label", live ? "text-hero-ink" : "text-muted-foreground")}>
            {live ? t("inSession") : t("finished")}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** A card while the bookings load: the same card, each line one line box of its step with the bone inside, the circle whole. */
function SessionCardBone() {
  return (
    <li className="flex min-w-0">
      <div className={CARD}>
        <span className={cn(CARD_WHEN, "flex items-center")}>
          <span className={cn(DESK_BONE, "h-3.5 w-24 rounded lg:h-4 lg:w-28")} />
        </span>
        <span className={cn(DESK_BONE, CARD_FACE)} />
        <span className={cn(CARD_NAME, "flex h-lh items-center justify-center")}>
          <span className={cn(DESK_BONE, "h-5 w-36 rounded-md lg:h-5.5 lg:w-40")} />
        </span>
        <span className={cn(CARD_LINE, "flex h-lh items-center justify-center")}>
          <span className={cn(DESK_BONE, "h-3.5 w-28 rounded lg:h-4 lg:w-32")} />
        </span>
      </div>
    </li>
  );
}

/**
 * `/work` while the account or its bookings are on their way: the capsules
 * at their sizes, the large line as one line box with its bone, and three
 * cards in the cards' own shape, so nothing shifts when the sessions land.
 */
function TodaySkeleton() {
  const t = useTranslations("workDesk");
  return (
    <div aria-busy className="flex w-full flex-col items-center">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className="mt-6 flex gap-3">
        {VIEW_BONES.map((width) => (
          <span className={cn(DESK_BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
        ))}
      </div>
      <span aria-hidden className={cn(HEADLINE_TYPE, HEADLINE_GAP, "flex h-lh items-center")}>
        <span className={cn(DESK_BONE, "h-6 w-64 rounded-md")} />
      </span>
      <ul aria-hidden className={CARD_GRID}>
        {[0, 1, 2].map((card) => (
          <SessionCardBone key={card} />
        ))}
      </ul>
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
  const now = useMountTime();
  const timeZone = profile.timezone;
  const bookings = useAdvisorBookings(profile);
  const [view, setView] = useState<View>("today");

  const today = bookingDay(now, timeZone);
  const all = (bookings.data ?? []).toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  // Today: every confirmed session on the advisor's day, the ones already over too.
  const todays = all.filter((booking) => isConfirmed(booking) && bookingDay(booking.startTime, timeZone) === today);
  // Upcoming: what is still ahead from tomorrow on.
  const upcoming = all.filter((booking) => isAhead(booking, now) && bookingDay(booking.startTime, timeZone) > today);
  const count = view === "today" ? todays.length : upcoming.length;
  const cards = view === "today" ? todays : upcoming.slice(0, UPCOMING_CARDS);
  // Today empty with sessions ahead: the way to them; otherwise the way to the services that get booked.
  const toUpcoming = view === "today" && upcoming.length > 0;

  return (
    <WorkHub tab="today">
      <VerificationBanner />
      {bookings.error ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard className={ERROR_CARD_LG} error={bookings.error} onRetry={bookings.reload} title={t("loadFailed")} />
        </div>
      ) : !bookings.data ? (
        <TodaySkeleton />
      ) : (
        <div className="flex w-full flex-col items-center">
          {/* `<fieldset>`: a group by its own semantics; reset so it lays out as the row it is. */}
          <fieldset aria-label={t("viewsLabel")} className="mx-0 mt-6 flex min-w-0 gap-3 border-0 p-0">
            {VIEWS.map((key) => {
              const active = key === view;
              return (
                <Button
                  aria-pressed={active}
                  className={cn(
                    VIEW_CAPSULE,
                    active
                      ? "bg-hero-action/85 text-hero-action-foreground hover:bg-hero-action hover:text-hero-action-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                  key={key}
                  onClick={() => setView(key)}
                  type="button"
                >
                  {t(key)}
                </Button>
              );
            })}
          </fieldset>

          <h2
            className={cn(HEADLINE_TYPE, "max-w-93 text-center text-balance text-foreground", cards.length > 0 ? HEADLINE_GAP : HEADLINE_GAP_EMPTY)}
            id="work-today-headline"
          >
            {view === "today" ? t("todayHeadline", { count }) : t("upcomingHeadline", { count })}
          </h2>

          {cards.length > 0 ? (
            <ul aria-labelledby="work-today-headline" className={CARD_GRID}>
              {cards.map((booking) => (
                <SessionCard booking={booking} key={booking.id} now={now} timeZone={timeZone} view={view} />
              ))}
            </ul>
          ) : (
            <>
              <p className="mt-4 max-w-93 text-center text-base text-balance text-muted-foreground lg:text-lg lg:leading-6">
                {toUpcoming ? t("todayEmptyBody") : t("emptyBody")}
              </p>
              {toUpcoming ? (
                <Button className={EMPTY_ACTION} onClick={() => setView("upcoming")} type="button" variant="ghost">
                  {t("seeUpcoming")}
                </Button>
              ) : (
                <Button className={EMPTY_ACTION} nativeButton={false} render={<Link href="/advisor/services" />} variant="ghost">
                  {t("emptyAction")}
                </Button>
              )}
            </>
          )}
        </div>
      )}
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
