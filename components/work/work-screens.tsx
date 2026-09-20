import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  History,
  MessageSquare,
  ShieldCheck,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface, SurfaceList, surfaceClass } from "@/components/mobile/surface";
import { Button } from "@/components/ui/button";
import { WorkSectionHead } from "@/components/work/section-head";
import {
  SessionDetailFallback,
  SessionDetailFromQuery,
} from "@/components/work/session-detail";
import { WorkHub, useTodayLabel } from "@/components/work/work-hub";
import { WEEKDAY_KEYS, buddhistYear, monthGrid } from "@/lib/calendar";
import { SPLIT_WITH_RAIL } from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  FREE_GAPS,
  LATER_TODAY,
  MONTH_SESSION_COUNT,
  NEXT_SESSION,
  PAYOUT_ACCOUNT,
  PENDING_ITEMS,
  RECENT_CONSULTATIONS,
  SESSIONS_BY_DAY,
  TODAY,
  TODAY_SESSIONS,
  type SessionFixture,
} from "@/lib/work";

/**
 * A block in the hub's column.
 *
 * On the phone it keeps Figma's 24px inset; from `lg` the inset belongs to the page
 * (`PAGE`, applied once in `WorkHub`) and the vertical rhythm to the column's own
 * gap, so a block stops carrying either. No `overflow-clip` here any more: these
 * blocks hold cards that now cast a shadow, and clipping the block clipped it.
 */
const BLOCK =
  "flex w-full shrink-0 flex-col items-start gap-2.5 px-6 pt-2 pb-1 lg:px-0 lg:pt-0 lg:pb-0";

/** A row that opens something — every one of them lights up under the pointer. */
const ROW = "flex w-full items-center gap-3 p-3.5 transition-colors hover:bg-muted/50";

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

/**
 * Figma "Session row" — portrait, name over service, the time, a chevron.
 *
 * The href carries the session's id. Every row used to point at a bare
 * `/work/session`, so three different sessions opened one sheet describing a fourth.
 */
function SessionRow({ session }: { readonly session: SessionFixture }) {
  return (
    <Link className={ROW} href={`/work/session?id=${session.id}`}>
      <Avatar size="md" src={session.avatar} />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">
          {session.adviseeName}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {session.serviceTitle}
        </p>
      </div>
      <p className="shrink-0 font-latin text-sm font-medium tabular-nums whitespace-nowrap text-foreground">
        {session.range}
      </p>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
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
      <div className={cn("contents", SPLIT_WITH_RAIL)}>
        <section className={BLOCK}>
          <WorkSectionHead
            title={t("todaySessions")}
            trailing={
              <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
                {t("sessionCount", { count: TODAY_SESSIONS.length })}
              </p>
            }
          />

          {/* The accent border stays — it is the one card on the screen that can be
              acted on now — and it finally sits on the elevation the rest of the
              app got, so it reads as raised rather than merely outlined. */}
          <Surface className="flex w-full flex-col items-start gap-3.5 border-primary p-3.5 lg:p-4">
            <div className="flex w-full shrink-0 items-center gap-2">
              <p className="min-w-px flex-1 text-sm font-semibold text-primary">
                {t("nextSession")}
              </p>
              <StatusPill tone="accent">
                {t("startsIn", { minutes: NEXT_SESSION.startsInMinutes })}
              </StatusPill>
            </div>
            <div className="flex w-full shrink-0 items-center gap-3">
              <Avatar size="lg" src={NEXT_SESSION.avatar} />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="text-base font-semibold text-foreground lg:text-lg">
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
            <div className="flex w-full shrink-0 items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" />
              <p className="font-latin text-sm font-medium tabular-nums whitespace-nowrap text-foreground">
                {t("todayRange", { range: NEXT_SESSION.range })}
              </p>
            </div>
            {/* Two thumb-width buttons on the phone; on a 1200 column they size to
                their labels instead of stretching into a pair of slabs. */}
            <div className="flex w-full shrink-0 items-start gap-2 lg:w-auto">
              <PrimaryButton
                className="min-w-px flex-1 lg:flex-none"
                href="/chat/sarah-jenskins"
              >
                {t("joinRoom")}
              </PrimaryButton>
              <NeutralButton
                className="w-auto shrink-0"
                href={`/work/session?id=${NEXT_SESSION.id}`}
              >
                {t("details")}
              </NeutralButton>
            </div>
          </Surface>

          <SurfaceList>
            {LATER_TODAY.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </SurfaceList>
        </section>

        <section className={BLOCK}>
          <WorkSectionHead title={t("pendingTitle")} />
          <SurfaceList>
            {PENDING_ITEMS.map((item) => {
              const Icon = PENDING_ICON[item.id];
              return (
                <Link className={ROW} href={item.href} key={item.id}>
                  <Icon className="size-4.5 shrink-0 text-muted-foreground" />
                  <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                    {t(`pending.${item.id}`)}
                  </p>
                  <span className="shrink-0 rounded-full bg-primary px-[9px] py-0.5 font-latin text-xs font-normal tabular-nums text-primary-foreground">
                    {item.count}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </SurfaceList>
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
 *
 * Three things were wrong with it. The dots started on the 17th while the same
 * screen listed three sessions today. The legend drew a filled circle for "วันนี้"
 * next to a cell that was a filled *square*, and a dot for "มีเซสชัน" that the cell
 * did draw — so half the key described something that was not on screen. And at 1440
 * it was forty-eight-pixel dots floating in 171px columns with no grid at all, which
 * is not a calendar, it is a scatter plot.
 */
export function WorkCalendarScreen() {
  const t = useTranslations("work");
  const s = useTranslations("serviceSchedule");
  const today = useTodayLabel();
  const cells = monthGrid(TODAY.year, TODAY.month);
  /** Where the last week starts — its cells own the card's bottom edge. */
  const lastRow = cells.length - 7;

  return (
    <WorkHub subtitle={t("calendarSubtitle")} tab="calendar">
      <div className={cn("contents", SPLIT_WITH_RAIL)}>
        <section className={BLOCK}>
          {/* The month used to sit between two `<span role="img">`s dressed as
              buttons — a control that could not be pressed, with an aria-label
              promising it could. Only this month has sessions, so there is nowhere
              for an arrow to go; the row states the month and what is booked in it. */}
          <WorkSectionHead
            title={t("monthLabel", { year: buddhistYear(TODAY.year) })}
            trailing={
              <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
                {t("sessionCount", { count: MONTH_SESSION_COUNT })}
              </p>
            }
          />

          <Surface className="w-full overflow-hidden">
            <div className="grid w-full grid-cols-7">
              {WEEKDAY_KEYS.map((key) => (
                <p
                  className="py-2 text-center text-xs font-normal text-muted-foreground lg:border-b lg:border-border lg:bg-muted/40 lg:py-2.5"
                  key={key}
                >
                  {s(`weekdayShort.${key}`)}
                </p>
              ))}
              {cells.map((cell, index) => {
                const isToday = cell.inMonth && cell.day === TODAY.day;
                const past = cell.inMonth && cell.day < TODAY.day;
                const count = cell.inMonth
                  ? SESSIONS_BY_DAY.get(cell.day)
                  : undefined;

                return (
                  <div
                    className={cn(
                      // A 48px dot on the phone; a real 171×88 cell with a
                      // hairline on every edge from `lg`.
                      "relative flex h-12 flex-col items-center justify-center",
                      "lg:h-22 lg:items-start lg:justify-start lg:gap-1 lg:p-2",
                      index % 7 !== 6 && "lg:border-r lg:border-border",
                      index < lastRow && "lg:border-b lg:border-border",
                      !cell.inMonth && "lg:bg-muted/40",
                    )}
                    // The same date can appear twice (a trailing 1 and the 1st).
                    key={`${index}-${cell.day}`}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full font-latin text-base font-normal tabular-nums lg:size-8 lg:text-sm",
                        (!cell.inMonth || past) && "text-muted-foreground/50",
                        cell.inMonth && !past && !isToday && "text-foreground",
                        // A filled circle, which is what the legend has always
                        // drawn for it.
                        isToday && "bg-primary font-medium text-primary-foreground",
                      )}
                    >
                      {cell.day}
                    </span>
                    {count ? (
                      <span className="absolute bottom-1.5 flex items-center gap-1.5 lg:static lg:pl-1.5">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            // Inside the accent circle on the phone, on the cell
                            // ground at desktop — it has to stay visible on both.
                            isToday
                              ? "bg-primary-foreground lg:bg-primary"
                              : "bg-primary",
                          )}
                        />
                        <span className="hidden text-xs font-normal whitespace-nowrap text-muted-foreground lg:inline">
                          {t("sessionCount", { count })}
                        </span>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Surface>

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

        <section className={BLOCK}>
          <WorkSectionHead
            title={t("todayHeading", { date: today })}
            trailing={
              <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
                {t("sessionCount", { count: TODAY_SESSIONS.length })}
              </p>
            }
          />
          <SurfaceList>
            {TODAY_SESSIONS.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </SurfaceList>
          {/* A well, not a card: the free slots are what is *left* of the day above
              them, so they belong under that surface rather than beside it. */}
          <Link
            className={cn(
              surfaceClass({ tier: "well" }),
              "flex w-full items-center gap-3 p-3.5 transition-colors hover:bg-border/40",
            )}
            href="/availability/profiles"
          >
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="text-sm font-semibold text-foreground">
                {t("freeGaps", { count: FREE_GAPS.length })}
              </p>
              <p className="font-latin text-xs font-normal tabular-nums text-muted-foreground">
                {FREE_GAPS.join(" · ")}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-primary">
              {t("manage")}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>
      </div>
    </WorkHub>
  );
}

/**
 * The ledger's three buckets. The tone is the point: "รอยืนยัน", "อยู่ระหว่างการถอน"
 * and "ถอนแล้ว" were three lines of identical grey, so the reader had to read the
 * words to learn whether the money had arrived.
 */
const LEDGER = [
  { key: "inTransit", icon: Clock, tone: "info" },
  { key: "pending", icon: ShieldCheck, tone: "warning" },
  { key: "withdrawn", icon: Wallet, tone: "success" },
] as const satisfies ReadonlyArray<{
  readonly key: string;
  readonly icon: LucideIcon;
  readonly tone: StatusTone;
}>;

/** A paid session's payout state, in the same colour vocabulary as the ledger. */
const CONSULTATION_TONE: Record<
  (typeof RECENT_CONSULTATIONS)[number]["state"],
  StatusTone
> = {
  pending: "warning",
  available: "success",
};

/**
 * Figma "Advisor dashboard - Earnings" (1374:20941) — the balance, the ledger and
 * the latest paid sessions. Also `/earnings`: there were two earnings screens with
 * two copies of the same ledger, and this is the one that survived.
 *
 * One figure is set at 28px — the balance — and every other amount on the screen at
 * 14px, in `font-latin tabular-nums` and right-aligned, so a column of money lines
 * up on the decimal instead of wandering a pixel per digit.
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
      <div className={cn("contents", SPLIT_WITH_RAIL)}>
        {/* The money reads as one column and the account settings as another; on the
            phone the four blocks stay in the order they are written. */}
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <section className={BLOCK}>
            <Surface className="flex w-full flex-col items-start gap-4 p-4 lg:flex-row lg:items-end lg:justify-between lg:p-5">
              <div className="flex min-w-px items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet aria-hidden className="size-4.5" />
                </span>
                <div className="flex min-w-px flex-col items-start gap-0.5">
                  <p className="text-xs font-normal text-muted-foreground">
                    {a("available")}
                  </p>
                  <p className="font-latin text-heading font-semibold tabular-nums text-foreground">
                    {a("availableAmount")}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {a("withdrawnMeta")}
                  </p>
                </div>
              </div>
              <PrimaryButton href="/earnings/payout-account">
                {a("withdrawCta")}
              </PrimaryButton>
            </Surface>

            <SurfaceList>
              {LEDGER.map(({ icon: Icon, key, tone }) => (
                <div
                  className="flex w-full items-start gap-3 p-3.5"
                  key={key}
                >
                  <Icon className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                    <StatusPill tone={tone}>{a(key)}</StatusPill>
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {a(`${key}Meta`)}
                    </p>
                  </div>
                  <p className="shrink-0 pt-0.5 text-right font-latin text-sm font-medium tabular-nums text-foreground">
                    {a(`${key}Amount`)}
                  </p>
                </div>
              ))}
            </SurfaceList>
          </section>

          <section className={BLOCK}>
            <div className="flex w-full shrink-0 items-center gap-2">
              <h2 className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-lg">
                {t("recentTitle")}
              </h2>
              <Link
                className="shrink-0 text-sm font-medium text-primary"
                href="/transactions"
              >
                {t("seeAll")}
              </Link>
            </div>
            <SurfaceList>
              {RECENT_CONSULTATIONS.map((item) => (
                <div
                  className="flex w-full items-center gap-3 p-3.5"
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
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-right font-latin text-sm font-medium tabular-nums text-foreground">
                      {item.amount}
                    </p>
                    <StatusPill tone={CONSULTATION_TONE[item.state]}>
                      {t(`consultationState.${item.state}`)}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </SurfaceList>
          </section>
        </div>

        <section className={BLOCK}>
          <SurfaceList>
            <Link className={ROW} href="/earnings/payout-account">
              <CreditCard className="size-4.5 shrink-0 text-muted-foreground" />
              <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                {t("payoutAccount")}
              </p>
              <p className="shrink-0 text-xs font-normal text-muted-foreground">
                {PAYOUT_ACCOUNT}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link className={ROW} href="/earnings/payout-history">
              <History className="size-4.5 shrink-0 text-muted-foreground" />
              <p className="min-w-px flex-1 text-sm font-medium text-foreground">
                {t("payoutHistory")}
              </p>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </SurfaceList>
        </section>
      </div>
    </WorkHub>
  );
}

/**
 * Figma "Session detail - advisor" (1961:32956) — one booked session opened up.
 *
 * The chrome stays on the server; the body is the client half, because the session
 * it describes comes from `?id=` and a static export has no server to resolve that.
 * The fallback is the next session, which is what the route showed when it could not
 * tell one session from another at all.
 */
export function SessionDetailScreen() {
  const t = useTranslations("work");
  const c = useTranslations("common");

  return (
    // Figma "Desktop / Session detail - advisor" (1998:29715) reads the same
    // blocks on a column rather than a phone frame; the back chevron stays,
    // because the workspace nav has nowhere else to put it.
    <MobileScreen className="pb-0" wide>
      <ScreenTopBar href="/work" label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:pb-14 lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-220">
        <h1 className="w-full shrink-0 px-6 text-2xl font-semibold text-foreground">
          {t("sessionTitle")}
        </h1>

        <Suspense fallback={<SessionDetailFallback />}>
          <SessionDetailFromQuery />
        </Suspense>
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 border-t border-border bg-card px-6 py-3 lg:justify-center">
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
        <PrimaryButton
          className="min-w-px flex-1 lg:flex-none"
          href="/chat/sarah-jenskins"
        >
          {t("joinRoom")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
