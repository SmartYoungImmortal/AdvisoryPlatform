import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  History,
  MessageSquare,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { WorkHub, WorkSectionHead } from "@/components/work/work-hub";
import { WEEKDAY_KEYS, buddhistYear, monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import {
  FREE_GAPS,
  LATER_TODAY,
  NEXT_SESSION,
  PAYOUT_ACCOUNT,
  PENDING_ITEMS,
  RECENT_CONSULTATIONS,
  SESSION_DAYS,
  SESSION_DETAIL,
  TODAY,
  TODAY_SESSIONS,
  TODAY_WEEKDAY,
  type SessionFixture,
} from "@/lib/work";

const SESSION_HREF = "/work/session";

/** "อา. 16 ส.ค. 2569" — built from the real weekday, never a typed one. */
function useTodayLabel(): string {
  const t = useTranslations("work");
  return t("dateLabel", {
    weekday: t(`weekdayAbbr.${TODAY_WEEKDAY}`),
    day: TODAY.day,
    month: t("monthAbbr"),
    year: buddhistYear(TODAY.year),
  });
}

function Avatar({
  src,
  size,
}: {
  readonly src: StaticImageData;
  readonly size: "md" | "lg";
}) {
  return (
    <Image
      alt=""
      className={cn(
        "shrink-0 rounded-full object-cover",
        size === "lg" ? "size-11" : "size-10",
      )}
      src={src}
    />
  );
}

/** Figma "Session row" — portrait, name over service, the time, a chevron. */
function SessionRow({ session }: { readonly session: SessionFixture }) {
  return (
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
      href={SESSION_HREF}
    >
      <Avatar size="md" src={session.avatar} />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">
          {session.adviseeName}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {session.serviceTitle}
        </p>
      </div>
      <p className="shrink-0 font-latin text-sm font-medium whitespace-nowrap text-foreground">
        {session.range}
      </p>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** A flat 14px-radius surface with hairlines between its rows. */
function RowCard({ children }: { readonly children: ReactNode[] }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
      {children.map((child, index) => (
        // Rows are positional and static, so their index is their identity.
        <div className="w-full" key={index}>
          {index > 0 ? <div className="h-px w-full bg-border" /> : null}
          {child}
        </div>
      ))}
    </div>
  );
}

const PENDING_ICON: Record<(typeof PENDING_ITEMS)[number]["id"], LucideIcon> = {
  bookings: CalendarDays,
  screening: FileText,
  reviews: Star,
};

/**
 * Figma "Advisor dashboard" (1962:9214) — today at a glance. The next session is the
 * only card the accent outlines, because it is the one thing on the screen that can
 * be acted on right now.
 */
export function WorkTodayScreen() {
  const t = useTranslations("work");
  const today = useTodayLabel();

  return (
    <WorkHub
      subtitle={t("todaySubtitle", { date: today, count: TODAY_SESSIONS.length })}
      tab="today"
    >
      {/* Figma's desktop dashboard stands the pending desk beside today's
          sessions rather than under them; the phone stacks the two. */}
      <div className="contents lg:grid lg:w-full lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      <section className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-2 pb-1">
        <WorkSectionHead
          title={t("todaySessions")}
          trailing={
            <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
              {t("sessionCount", { count: TODAY_SESSIONS.length })}
            </p>
          }
        />

        <div className="flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip rounded-xl border border-primary bg-card p-3.5">
          <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
            <p className="min-w-px flex-1 text-sm font-semibold text-primary">
              {t("nextSession")}
            </p>
            <span className="shrink-0 rounded-full bg-accent-surface px-2.5 py-1 text-xs font-normal whitespace-nowrap text-primary">
              {t("startsIn", { minutes: NEXT_SESSION.startsInMinutes })}
            </span>
          </div>
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
            <Avatar size="lg" src={NEXT_SESSION.avatar} />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="text-base font-semibold text-foreground">
                {NEXT_SESSION.adviseeName}
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                {t("serviceAndLength", {
                  service: NEXT_SESSION.serviceTitle,
                  hours: NEXT_SESSION.durationHours,
                })}
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium whitespace-nowrap text-foreground">
              {t("todayRange", { range: NEXT_SESSION.range })}
            </p>
          </div>
          <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
            <PrimaryButton className="min-w-px flex-1" href="/chat/sarah-jenskins">
              {t("joinRoom")}
            </PrimaryButton>
            <NeutralButton className="w-auto shrink-0" href={SESSION_HREF}>
              {t("details")}
            </NeutralButton>
          </div>
        </div>

        <RowCard>
          {LATER_TODAY.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </RowCard>
      </section>

      <section className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-3 pb-1">
        <WorkSectionHead title={t("pendingTitle")} />
        <RowCard>
          {PENDING_ITEMS.map((item) => {
            const Icon = PENDING_ICON[item.id];
            return (
              <Link
                className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
                href={item.href}
                key={item.id}
              >
                <Icon className="size-4.5 shrink-0 text-muted-foreground" />
                <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                  {t(`pending.${item.id}`)}
                </p>
                <span className="shrink-0 rounded-full bg-primary px-[9px] py-0.5 font-latin text-xs font-normal text-primary-foreground">
                  {item.count}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </RowCard>
      </section>
      </div>
    </WorkHub>
  );
}

/**
 * Figma "Advisor calendar" (1374:20803) — the month around today. Past days fade,
 * today takes the accent, and a dot under a date means a session is booked on it.
 *
 * The grid is computed, so it disagrees with the frame on purpose: the frame puts
 * the 16th on a Saturday, and 16 August 2026 is a Sunday.
 */
export function WorkCalendarScreen() {
  const t = useTranslations("work");
  const s = useTranslations("serviceSchedule");
  const today = useTodayLabel();
  const cells = monthGrid(TODAY.year, TODAY.month);

  return (
    <WorkHub subtitle={t("calendarSubtitle")} tab="calendar">
      <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-2">
        <div className="flex w-full shrink-0 items-center gap-3">
          <span
            aria-label={s("prevMonth")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs"
            role="img"
          >
            <ArrowLeft className="size-4 text-foreground" />
          </span>
          <p className="min-w-px flex-1 text-center text-base font-medium text-foreground">
            {t("monthLabel", { year: buddhistYear(TODAY.year) })}
          </p>
          <span
            aria-label={s("nextMonth")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs"
            role="img"
          >
            <ArrowRight className="size-4 text-foreground" />
          </span>
        </div>

        <div className="grid w-full grid-cols-7 gap-y-1">
          {WEEKDAY_KEYS.map((key) => (
            <p
              className="py-2 text-center text-xs font-normal text-muted-foreground"
              key={key}
            >
              {s(`weekdayShort.${key}`)}
            </p>
          ))}
          {cells.map((cell, index) => {
            const isToday = cell.inMonth && cell.day === TODAY.day;
            const past = cell.inMonth && cell.day < TODAY.day;
            const booked = cell.inMonth && SESSION_DAYS.has(cell.day);

            return (
              <span
                className={cn(
                  "relative mx-auto flex size-12 flex-col items-center justify-center rounded-lg font-latin text-base font-normal",
                  (!cell.inMonth || past) && "text-muted-foreground/50",
                  cell.inMonth && !past && !isToday && "text-foreground",
                  isToday && "bg-primary text-primary-foreground",
                )}
                // The same date can appear twice (a trailing 1 and the 1st).
                key={`${index}-${cell.day}`}
              >
                {cell.day}
                {booked ? (
                  <span className="absolute bottom-1.5 size-1.5 rounded-full bg-primary" />
                ) : null}
              </span>
            );
          })}
        </div>

        <div className="flex w-full shrink-0 items-center gap-4 py-1">
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {t("legendSession")}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="size-2.5 rounded-full bg-primary" />
            {t("legendToday")}
          </span>
        </div>
      </section>

      <section className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-2">
        <WorkSectionHead
          title={t("todayHeading", { date: today })}
          trailing={
            <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
              {t("sessionCount", { count: TODAY_SESSIONS.length })}
            </p>
          }
        />
        <RowCard>
          {TODAY_SESSIONS.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </RowCard>
        <Link
          className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl bg-muted p-3.5"
          href="/availability/profiles"
        >
          <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
            <p className="text-sm font-semibold text-foreground">
              {t("freeGaps", { count: FREE_GAPS.length })}
            </p>
            <p className="font-latin text-xs font-normal text-muted-foreground">
              {FREE_GAPS.join(" · ")}
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary">
            {t("manage")}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>
    </WorkHub>
  );
}

const EARNING_ROWS = [
  { icon: Clock, key: "inTransit", accent: true },
  { icon: ShieldCheck, key: "pending", accent: false },
  { icon: CreditCard, key: "withdrawn", accent: false },
] as const;

/**
 * Figma "Advisor dashboard - Earnings" (1374:20941) — the old earnings screen's
 * balance and ledger, now one of this hub's views, plus the latest paid sessions.
 * The balance and ledger reuse the `advisor.*` copy the standalone screen already
 * had, so the two cannot disagree about an amount.
 */
export function WorkEarningsScreen() {
  const t = useTranslations("work");
  const a = useTranslations("advisor");
  const today = useTodayLabel();

  return (
    <WorkHub
      subtitle={t("todaySubtitle", { date: today, count: TODAY_SESSIONS.length })}
      tab="earnings"
    >
      <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-2">
        <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl bg-card p-3.5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {a("available")}
          </p>
          <p className="w-full font-latin text-heading font-semibold text-foreground">
            {a("availableAmount")}
          </p>
          <PrimaryButton href="/earnings/payout-account">
            {a("withdrawCta")}
          </PrimaryButton>
        </div>

        <RowCard>
          {EARNING_ROWS.map(({ icon: Icon, key, accent }) => (
            <div
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
              key={key}
            >
              <Icon className="size-4.5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="text-sm font-medium text-foreground">{a(key)}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {a(`${key}Meta`)}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 font-latin text-sm font-medium",
                  accent ? "text-primary" : "text-foreground",
                )}
              >
                {a(`${key}Amount`)}
              </p>
            </div>
          ))}
        </RowCard>
      </section>

      <section className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-3">
        <div className="flex w-full shrink-0 items-center gap-2">
          <h2 className="min-w-px flex-1 text-sm font-medium text-muted-foreground">
            {t("recentTitle")}
          </h2>
          <Link
            className="shrink-0 text-sm font-medium text-primary"
            href="/transactions"
          >
            {t("seeAll")}
          </Link>
        </div>
        <RowCard>
          {RECENT_CONSULTATIONS.map((item) => (
            <div
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
              key={item.id}
            >
              <Avatar size="md" src={item.avatar} />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="text-sm font-semibold text-foreground">
                  {item.name}
                </p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {item.meta}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <p className="font-latin text-sm font-medium text-foreground">
                  {item.amount}
                </p>
                <p
                  className={cn(
                    "text-xs font-normal",
                    item.state === "available"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {t(`consultationState.${item.state}`)}
                </p>
              </div>
            </div>
          ))}
        </RowCard>
      </section>

      <section className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-3 pb-2">
        <RowCard>
          {[
            <Link
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
              href="/earnings/payout-account"
              key="account"
            >
              <CreditCard className="size-4.5 shrink-0 text-muted-foreground" />
              <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                {t("payoutAccount")}
              </p>
              <p className="shrink-0 text-xs font-normal text-muted-foreground">
                {PAYOUT_ACCOUNT}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>,
            <Link
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
              href="/earnings/payout-history"
              key="history"
            >
              <History className="size-4.5 shrink-0 text-muted-foreground" />
              <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                {t("payoutHistory")}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>,
          ]}
        </RowCard>
      </section>
    </WorkHub>
  );
}

/**
 * Figma "Session detail - advisor" (1961:32956) — one booked session opened up, with
 * the screening answers the Advisee gave before booking. Those answers are the
 * reason the screen exists: they are what an Advisor reads before walking in.
 */
export function SessionDetailScreen() {
  const t = useTranslations("work");
  const c = useTranslations("common");
  const d = SESSION_DETAIL;

  return (
    <MobileScreen className="pb-0">
      <ScreenTopBar href="/work" label={c("back")} />

      <ScreenBody className="gap-4 pb-6">
        <h1 className="w-full shrink-0 px-6 text-2xl font-semibold text-foreground">
          {t("sessionTitle")}
        </h1>

        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl bg-accent-surface p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <Clock className="size-4.5 text-primary-foreground" />
            </span>
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
              <p className="text-base font-semibold text-foreground">
                {t("startsInLong", { minutes: d.startsInMinutes })}
              </p>
              <p className="text-xs font-normal text-muted-foreground">
                {t("todayRangeLong", { range: d.range })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
          <WorkSectionHead title={t("adviseeHeading")} />
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl border border-border bg-card p-3.5">
            <Avatar size="lg" src={d.avatar} />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="text-sm font-semibold text-foreground">
                {d.adviseeName}
              </p>
              <p className="text-xs font-normal text-muted-foreground">
                {t("serviceSlotsLength", {
                  service: d.serviceTitle,
                  slots: d.slots,
                  hours: d.durationHours,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
          <WorkSectionHead
            title={t("answersHeading")}
            trailing={
              <p className="shrink-0 text-sm font-normal text-muted-foreground">
                {t("answerCount", { count: d.answers.length })}
              </p>
            }
          />
          {d.answers.map((item) => (
            <div
              className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip rounded-xl border border-border bg-card p-3.5"
              key={item.id}
            >
              <p className="w-full text-xs font-normal text-muted-foreground">
                {item.question}
              </p>
              <p className="w-full text-sm font-normal text-foreground">
                <ThaiText>{item.answer}</ThaiText>
              </p>
            </div>
          ))}
        </div>
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3">
        <Button
          aria-label={t("openChat")}
          className="size-9 shrink-0"
          nativeButton={false}
          render={<Link href="/chat/sarah-jenskins" />}
          size="icon"
          variant="outline"
        >
          <MessageSquare className="size-4" />
        </Button>
        <PrimaryButton className="min-w-px flex-1" href="/chat/sarah-jenskins">
          {t("joinRoom")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
