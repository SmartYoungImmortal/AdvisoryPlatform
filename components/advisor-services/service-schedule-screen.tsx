import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { WEEKDAY_KEYS, buddhistYear } from "@/lib/calendar";
import { advisorService } from "@/lib/advisor-services";
import {
  AVAILABLE_DAYS,
  DAY_SLOTS,
  DAY_SOURCE,
  MONTH_SUMMARY,
  SCHEDULE_MONTH,
  SCHEDULE_YEAR,
  SELECTED_DAY,
  monthGrid,
  type SlotKind,
} from "@/lib/advisor-services/schedule";

/**
 * Figma "Back Bar" — the 52px row under the app's nav, at the page inset — and
 * the white "Head Band" the title sits in, above the grey body.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/** The 1200 content column, inset 120 from the 1440 page. */
const COLUMN = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-10 xl:px-30";

/** Figma month-nav button — a small white square with a hairline and an arrow. */
function MonthNav({
  direction,
  label,
}: {
  readonly direction: "prev" | "next";
  readonly label: string;
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;

  return (
    <span
      aria-label={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs"
      role="img"
    >
      <Icon className="size-4 text-foreground" />
    </span>
  );
}

/**
 * Figma "Slot" — one row of the selected day. A bookable slot is the only one on a
 * white card with a hairline; everything the Advisee cannot take sits on the muted
 * ground, and its badge says why.
 */
function SlotRow({
  range,
  kind,
}: {
  readonly range: string;
  readonly kind: SlotKind;
}) {
  const t = useTranslations("serviceSchedule");
  const free = kind === "free";

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl px-3.5 py-3",
        free ? "border border-border bg-card" : "bg-muted",
      )}
    >
      <p
        className={cn(
          "min-w-px flex-1 font-latin text-sm",
          free ? "font-medium text-foreground" : "font-normal text-muted-foreground",
        )}
      >
        {range}
      </p>
      <span
        className={cn(
          "flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-normal whitespace-nowrap",
          free
            ? "bg-accent-surface text-primary"
            : "border border-border bg-card text-muted-foreground",
        )}
      >
        {t(`slot.${kind}`, { hours: DAY_SOURCE.ceiling.hours })}
      </span>
    </div>
  );
}

/** Figma "Source row" — one line of the day's arithmetic on a muted ground. */
function SourceRow({
  label,
  children,
  highlight = false,
}: {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-3 overflow-clip rounded-lg px-3 py-2.5",
        highlight ? "bg-accent-surface" : "bg-muted",
      )}
    >
      <p className="shrink-0 text-xs font-normal text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "min-w-px flex-1 text-right text-sm font-medium",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Figma "Service availability" (1594:33136) — one service's month, a selected day,
 * and where that day's bookable slots came from.
 *
 * The breakdown at the bottom is the point of the screen: it shows the Advisor the
 * same arithmetic the API performs — weekly windows, minus bookings, minus buffers,
 * capped by the daily ceiling — so a slot that is missing has a visible reason.
 */
export function ServiceScheduleScreen({
  serviceId,
}: {
  readonly serviceId: string;
}) {
  const t = useTranslations("serviceSchedule");
  const a = useTranslations("availability");
  const c = useTranslations("common");
  const record = advisorService(serviceId);

  if (!record) notFound();

  const cells = monthGrid(SCHEDULE_YEAR, SCHEDULE_MONTH);
  const monthLabel = t("month", { year: buddhistYear(SCHEDULE_YEAR) });

  return (
    // Figma "Desktop / Service availability (Light)" (1998:29072): the month and
    // the day it selects hold the 788px column, and the arithmetic behind that
    // day — plus the way to change it — moves into the 380px rail.
    <MobileScreen className="pb-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar
        className={BACK_BAR}
        href={`/advisor/services/${serviceId}`}
        label={c("back")}
      />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6", COLUMN, "lg:py-6")}>
            <h1 className="w-full text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              {t("subtitle", {
                service: record.service.title,
                profile: record.profileName,
              })}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:pt-10 lg:pb-22",
            COLUMN,
          )}
        >
        <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 lg:col-start-1 lg:row-start-1 lg:px-0">
          <div className="flex w-full shrink-0 items-center gap-3">
            <MonthNav direction="prev" label={t("prevMonth")} />
            <p className="min-w-px flex-1 text-center text-base font-medium text-foreground">
              {monthLabel}
            </p>
            <MonthNav direction="next" label={t("nextMonth")} />
          </div>

          <div className="grid w-full grid-cols-7 gap-y-1">
            {WEEKDAY_KEYS.map((key) => (
              <p
                className="py-2 text-center text-xs font-normal text-muted-foreground"
                key={key}
              >
                {t(`weekdayShort.${key}`)}
              </p>
            ))}
            {cells.map((cell, index) => {
              const selected = cell.inMonth && cell.day === SELECTED_DAY;
              const available = cell.inMonth && AVAILABLE_DAYS.has(cell.day);

              return (
                <span
                  className={cn(
                    "mx-auto flex size-12 items-center justify-center rounded-lg font-latin text-base font-normal",
                    !cell.inMonth && "text-muted-foreground/50",
                    cell.inMonth && !selected && "text-foreground",
                    available && !selected && "bg-muted",
                    selected && "bg-primary text-primary-foreground",
                  )}
                  // The same date can appear twice (a trailing 1 and the 1st), so the
                  // position is part of the key.
                  key={`${index}-${cell.day}`}
                >
                  {cell.day}
                </span>
              );
            })}
          </div>

          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("monthSummary", {
              month: monthLabel,
              free: MONTH_SUMMARY.freeDays,
              bookings: MONTH_SUMMARY.bookings,
            })}
          </p>
          <div className="flex w-full shrink-0 items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="size-2.5 rounded-full border border-border bg-muted" />
              {t("legendAvailable")}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="size-2.5 rounded-full bg-primary" />
              {t("legendSelected")}
            </span>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:col-start-1 lg:row-start-2 lg:px-0">
          <div className="flex w-full shrink-0 items-center gap-3">
            <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
              {t("selectedDay")}
            </h2>
            <p className="shrink-0 text-xs font-normal text-muted-foreground">
              {t("bookableCount", { count: DAY_SOURCE.bookableSlots })}
            </p>
          </div>
          {DAY_SLOTS.map((slot) => (
            <SlotRow key={slot.range} kind={slot.kind} range={slot.range} />
          ))}
        </div>

        {/* The day's arithmetic — under the slots on the phone, beside them in
            the desktop rail, with the way to change it directly below. */}
        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:gap-4 lg:px-0">
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-xl border border-border bg-card p-3.5">
            <h3 className="w-full text-sm font-semibold text-foreground">
              {t("sourceTitle")}
            </h3>
            <SourceRow label={a("profilesTitle")}>
              {DAY_SOURCE.profileName}
            </SourceRow>
            <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-lg bg-muted px-3 py-2.5">
              <p className="text-xs font-normal text-muted-foreground">
                {t("sourceWeekly")}
              </p>
              <div className="flex w-full flex-wrap gap-2">
                {DAY_SOURCE.weeklyWindows.map((window) => (
                  <span
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-latin text-xs font-normal text-foreground"
                    key={window}
                  >
                    {window}
                  </span>
                ))}
              </div>
            </div>
            <SourceRow label={t("sourceBooked")}>{DAY_SOURCE.booked}</SourceRow>
            <SourceRow label={t("sourceBuffer")}>
              {t("minutes", { count: DAY_SOURCE.bufferMinutes })}
            </SourceRow>
            <SourceRow label={t("sourceCeiling")}>
              {t("ceilingUsage", DAY_SOURCE.ceiling)}
            </SourceRow>
            <SourceRow highlight label={t("sourceBookable")}>
              {t("bookableSummary", {
                count: DAY_SOURCE.bookableSlots,
                minutes: DAY_SOURCE.slotMinutes,
              })}
            </SourceRow>
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t("sourceFootnote")}</ThaiText>
            </p>
          </div>

          <PrimaryButton className="hidden lg:flex lg:h-11" href="/availability/profiles/edit">
            {t("editProfile")}
          </PrimaryButton>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {/* The desktop rail carries the same action, so the pinned bar stops here. */}
      <div className="flex w-full shrink-0 items-start overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        <PrimaryButton href="/availability/profiles/edit">
          {t("editProfile")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
