"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useMountTime } from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/api/use-resource";
import { listServiceSlots } from "@/lib/api/resources";
import {
  readServiceDetail,
  type ServiceDetail,
} from "@/lib/advisor-services/detail";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { TopBar } from "@/components/topbar";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { WEEKDAY_KEYS, monthGrid } from "@/lib/calendar";

/**
 * Figma "Back Bar" — the 52px row under the app's nav, at the page inset — and
 * the white "Head Band" the title sits in, above the grey body.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * The calendar sits on the page ground on the phone, where the screen is the
 * calendar. At `lg` it has 788 of the 1200 column to itself and was floating on
 * the grey with 112px between weekday columns — the airiest block on the screen.
 * From `lg` it becomes the card it already reads as beside the rail's own cards.
 */
const CALENDAR_CARD =
  "lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-6 lg:shadow-card";

/** Figma month-nav button — a small white square with a hairline and an arrow. */
function MonthNav({
  direction,
  label,
  onClick,
}: {
  readonly direction: "prev" | "next";
  readonly label: string;
  readonly onClick: () => void;
}) {
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-xs"
    >
      <Icon className="size-4 text-foreground" />
    </button>
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
  const t = useTranslations("advisorServices");
  const resource = useResource(
    `advisors/me/services/${serviceId}/detail`,
    (signal) => readServiceDetail(serviceId, signal),
  );
  if (!resource.data)
    return (
      <MobileScreen wide>
        <ScreenTopBar href="/advisor/services" label={t("title")} />
        <ScreenBody className="gap-4 p-6">
          <div role={resource.error ? "alert" : "status"}>
            {resource.error?.message ?? t("loading")}
          </div>
          {resource.error ? (
            <Button onClick={resource.reload}>{t("retry")}</Button>
          ) : null}
        </ScreenBody>
      </MobileScreen>
    );
  return <Schedule data={resource.data} />;
}

function Schedule({ data }: { readonly data: ServiceDetail }) {
  const t = useTranslations("serviceSchedule");
  const a = useTranslations("availability");
  const services = useTranslations("advisorServices");
  const c = useTranslations("common");
  const locale = useLocale();
  const now = useMountTime();
  const today = bookingDay(now, data.owner.timezone);
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const month = shownMonth ?? today.slice(0, 7);
  let day = `${month}-01`;
  if (picked?.startsWith(month)) day = picked;
  else if (month === today.slice(0, 7)) day = today;

  const [year, monthNumber] = month.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);
  const cells = monthGrid(year, monthNumber);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  const dayLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
  const inMonth = data.bookings.filter((booking) =>
    bookingDay(booking.startTime, data.owner.timezone).startsWith(month),
  );
  const selectedBookings = inMonth.filter(
    (booking) => bookingDay(booking.startTime, data.owner.timezone) === day,
  );
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: data.owner.timezone,
  });
  const profileHref = data.profile
    ? `/availability/profiles/edit?id=${encodeURIComponent(data.profile.id)}`
    : "/availability/profiles";
  const windows =
    data.profile?.weeklyWindows.filter(
      (window) =>
        window.dayOfWeek === (new Date(`${day}T12:00:00Z`).getUTCDay() || 7),
    ) ?? [];
  const specific =
    data.profile?.specificWindows.filter(
      (window) => window.availableDate === day,
    ) ?? [];
  const blocked =
    data.profile?.blockedPeriods.filter(
      (period) => period.blockedDate === day,
    ) ?? [];

  return (
    // Figma "Desktop / Service availability (Light)" (1998:29072): the month and
    // the day it selects hold the 788px column, and the arithmetic behind that
    // day — plus the way to change it — moves into the 380px rail.
    <MobileScreen className="pb-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar />
      </div>
      <ScreenTopBar
        className={BACK_BAR}
        href={`/advisor/services/view?serviceId=${encodeURIComponent(data.service.id)}`}
        label={c("back")}
      />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6",
              PAGE,
              "lg:py-6",
            )}
          >
            <h1 className="w-full text-2xl font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              {t("subtitle", {
                service: data.service.name,
                profile: data.profile?.name ?? services("profileUnavailable"),
              })}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:pt-10 lg:pb-22",
            PAGE,
          )}
        >
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-start gap-3 px-6 lg:col-start-1 lg:row-start-1 lg:px-0",
              CALENDAR_CARD,
            )}
          >
            <div className="flex w-full shrink-0 items-center gap-3">
              <MonthNav
                direction="prev"
                label={t("prevMonth")}
                onClick={() => setShownMonth(moveMonth(month, -1))}
              />
              <p className="min-w-px flex-1 text-center text-base font-medium text-foreground">
                {monthLabel}
              </p>
              <MonthNav
                direction="next"
                label={t("nextMonth")}
                onClick={() => setShownMonth(moveMonth(month, 1))}
              />
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
                const date = `${month}-${String(cell.day).padStart(2, "0")}`;
                const selected = cell.inMonth && date === day;

                return (
                  <button
                    type="button"
                    disabled={!cell.inMonth}
                    aria-label={cell.inMonth ? date : undefined}
                    aria-pressed={selected}
                    onClick={() => setPicked(date)}
                    className={cn(
                      // 48px under a thumb, 56 once the grid has 740px of the
                      // desktop column to spread a date over.
                      "mx-auto flex size-12 items-center justify-center rounded-lg font-latin text-base font-normal tabular-nums lg:size-14",
                      !cell.inMonth && "text-muted-foreground/50",
                      cell.inMonth && !selected && "text-foreground",
                      cell.inMonth && !selected && "hover:bg-muted",
                      selected && "bg-primary text-primary-foreground",
                    )}
                    // The same date can appear twice (a trailing 1 and the 1st), so the
                    // position is part of the key.
                    key={`${index}-${cell.day}`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <p className="w-full text-xs font-normal text-muted-foreground">
              {services("bookingsCount", { count: inMonth.length })}
            </p>
            <div className="flex w-full shrink-0 items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="size-2.5 rounded-full bg-primary" />
                {t("legendSelected")}
              </span>
            </div>
          </div>

          {/* No `overflow-clip` from here down: it would crop the card shadow off
            every bookable slot and off the arithmetic panel beside them. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 lg:col-start-1 lg:row-start-2 lg:px-0">
            <div className="flex w-full shrink-0 items-center gap-3">
              <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
                {dayLabel}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {services("timezone", { zone: data.owner.timezone })}
            </p>
            <MonthSlots
              data={data}
              from={`${month}-01`}
              to={monthEnd}
              day={day}
            />
            <h3 className="text-base font-semibold">
              {services("bookingsTitle")}
            </h3>
            {selectedBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {services("noBookings")}
              </p>
            ) : (
              selectedBookings.map((booking) => (
                <Link
                  className="flex w-full items-center justify-between gap-3 rounded-card border border-border bg-card p-3 text-sm"
                  key={booking.id}
                  href={`/work/session?id=${encodeURIComponent(booking.id)}`}
                >
                  <span>
                    {booking.adviseeName} ·{" "}
                    {clock.format(new Date(booking.startTime))}–
                    {clock.format(new Date(booking.endTime))}
                  </span>
                  <StatusPill>{t(`bookingState.${booking.state}`)}</StatusPill>
                </Link>
              ))
            )}
          </div>

          {/* The day's arithmetic — under the slots on the phone, beside them in
            the desktop rail, with the way to change it directly below. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:gap-4 lg:px-0">
            <Surface className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip p-3.5">
              <h3 className="w-full text-sm font-semibold text-foreground">
                {t("sourceTitle")}
              </h3>
              <SourceRow label={a("profilesTitle")}>
                {data.profile?.name ?? services("profileUnavailable")}
              </SourceRow>
              <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-lg bg-muted px-3 py-2.5">
                <p className="text-xs font-normal text-muted-foreground">
                  {t("sourceWeekly")}
                </p>
                <div className="flex w-full flex-wrap gap-2">
                  {windows.map((window) => (
                    <span
                      className="rounded-full border border-border bg-card px-2.5 py-1 font-latin text-xs font-normal text-foreground"
                      key={`${window.startTime}-${window.endTime}`}
                    >
                      {window.startTime.slice(0, 5)}–
                      {window.endTime.slice(0, 5)}
                    </span>
                  ))}
                </div>
              </div>
              <SourceRow label={t("specificWindows")}>
                {specific.length
                  ? specific
                      .map(
                        (window) =>
                          `${window.startTime.slice(0, 5)}–${window.endTime.slice(0, 5)}`,
                      )
                      .join(", ")
                  : "—"}
              </SourceRow>
              <SourceRow label={t("blockedPeriods")}>
                {blocked.length
                  ? blocked
                      .map((period) =>
                        period.startTime && period.endTime
                          ? `${period.startTime.slice(0, 5)}–${period.endTime.slice(0, 5)}`
                          : t("allDay"),
                      )
                      .join(", ")
                  : "—"}
              </SourceRow>
              <SourceRow label={t("sourceBooked")}>
                {services("bookingsCount", {
                  count: selectedBookings.filter(
                    (booking) => booking.state !== "CANCELLED",
                  ).length,
                })}
              </SourceRow>
              <SourceRow label={t("sourceBuffer")}>
                {t("minutes", { count: data.global.bufferMinutes })}
              </SourceRow>
              <SourceRow label={services("serviceCeiling")}>
                {data.service.dailyConsultationLimitMinutes === null
                  ? services("ceilingUnlimited")
                  : t("minutes", {
                      count: data.service.dailyConsultationLimitMinutes,
                    })}
              </SourceRow>
              <SourceRow label={t("globalCeiling")}>
                {data.global.dailyConsultationLimitMinutes === null
                  ? services("ceilingUnlimited")
                  : t("minutes", {
                      count: data.global.dailyConsultationLimitMinutes,
                    })}
              </SourceRow>
              <p className="w-full text-xs font-normal text-muted-foreground">
                <ThaiText>{t("sourceRulesNote")}</ThaiText>
              </p>
            </Surface>

            {/* `block`: the rail's one action, under a panel that spans it — the
              button's auto width from `lg` would leave it floating at the left. */}
            <PrimaryButton
              block
              className="hidden lg:flex"
              href={profileHref}
              size="lg"
            >
              {t("editProfile")}
            </PrimaryButton>
          </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {/* The desktop rail carries the same action, so the pinned bar stops here. */}
      <div className="flex w-full shrink-0 items-start overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        <PrimaryButton href={profileHref}>{t("editProfile")}</PrimaryButton>
      </div>
    </MobileScreen>
  );
}

function MonthSlots({
  data,
  from,
  to,
  day,
}: {
  readonly data: ServiceDetail;
  readonly from: string;
  readonly to: string;
  readonly day: string;
}) {
  const t = useTranslations("advisorServices");
  if (!data.service.isPublished)
    return (
      <p className="text-sm text-muted-foreground">{t("hiddenSchedule")}</p>
    );
  return <PublishedMonthSlots data={data} from={from} to={to} day={day} />;
}

function PublishedMonthSlots({
  data,
  from,
  to,
  day,
}: {
  readonly data: ServiceDetail;
  readonly from: string;
  readonly to: string;
  readonly day: string;
}) {
  const t = useTranslations("advisorServices");
  const s = useTranslations("serviceSchedule");
  const locale = useLocale();
  const resource = useResource(
    `services/${data.service.id}/slots/${from}/${to}`,
    (signal) => listServiceSlots(data.service.id, { from, to }, signal),
  );
  const slots = resource.data?.filter(
    (slot) => bookingDay(slot.startTime, data.owner.timezone) === day,
  );
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: data.owner.timezone,
  });
  return (
    <div className="flex w-full flex-col gap-2">
      {resource.loading ? <output>{t("loading")}</output> : null}
      {resource.error ? (
        <div role="alert">
          <p>{resource.error.message}</p>
          <Button variant="outline" onClick={resource.reload}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {slots ? (
        <p className="text-xs text-muted-foreground">
          {s("bookableCount", { count: slots.length })}
        </p>
      ) : null}
      {slots?.length === 0 ? <p>{t("noSlots")}</p> : null}
      {slots?.map((slot) => (
        <div
          className="flex justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
          key={slot.startTime}
        >
          <span>
            {clock.format(new Date(slot.startTime))}–
            {clock.format(new Date(slot.endTime))}
          </span>
          <StatusPill tone="accent">{s("slot.free")}</StatusPill>
        </div>
      ))}
    </div>
  );
}
