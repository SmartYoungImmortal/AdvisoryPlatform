"use client";

import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { SessionRow } from "@/components/work/session-row";
import { readServiceDetail, type ServiceDetail } from "@/lib/advisor-services/detail";
import { listServiceSlots } from "@/lib/api/resources";
import type { ApiSlot } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { WEEKDAY_KEYS, monthGrid } from "@/lib/calendar";
import { bookingDay, moveMonth } from "@/lib/work/booking-calendar";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/schedule` — when one service can be booked, the work
 * calendar's way: the month in a hairline box (a dot under each day with
 * times open to book), the day it selects beside it with those times as
 * capsules and the sessions already in it, and under them where that day's
 * times come from (the schedule, that day's extra or closed hours, the gap
 * after a session, the daily ceilings), with the schedule one press away.
 */

const BLOCK = "flex w-full min-w-0 flex-col items-start gap-3 lg:gap-4";
const HEAD = "text-lg font-semibold text-foreground lg:text-frame-heading";

export function ServiceScheduleScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("serviceSchedule");
  const s = useTranslations("advisorServices");
  const resource = useResource(
    `advisors/me/services/${serviceId}/detail`,
    useCallback((signal: AbortSignal) => readServiceDetail(serviceId, signal), [serviceId]),
  );
  const back = `/advisor/services/view?serviceId=${encodeURIComponent(serviceId)}`;

  if (!resource.data) {
    return (
      <DeskPage backHref={back} title={t("title")}>
        <div className="mt-5 w-full lg:mt-8">
          {resource.error ? (
            <ApiErrorCard error={resource.error} onRetry={resource.reload} title={s("loadFailed")} />
          ) : (
            <div aria-busy className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <span className="block aspect-[7/5] w-full animate-pulse rounded-2xl bg-muted" />
              <span className="block h-64 w-full animate-pulse rounded-2xl bg-muted" />
            </div>
          )}
        </div>
      </DeskPage>
    );
  }
  return <Schedule back={back} data={resource.data} />;
}

function Schedule({ data, back }: { readonly data: ServiceDetail; readonly back: string }) {
  const t = useTranslations("serviceSchedule");
  const s = useTranslations("advisorServices");
  const locale = useLocale();
  const now = useMountTime();
  const zone = data.owner.timezone;
  const today = bookingDay(now, zone);
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const month = shownMonth ?? today.slice(0, 7);
  let day = `${month}-01`;
  if (picked?.startsWith(month)) day = picked;
  else if (month === today.slice(0, 7)) day = today;

  const [year, monthNumber] = month.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const cells = monthGrid(year, monthNumber);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
  const dayLabel = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

  const published = data.service.isPublished;
  // Keyed by the month, so the fetcher need not be stable; a hidden service has no times to read.
  const slots = useResource<readonly ApiSlot[]>(`services/${data.service.id}/slots/${month}-01/${monthEnd}`, (signal) =>
    published ? listServiceSlots(data.service.id, { from: `${month}-01`, to: monthEnd }, signal) : Promise.resolve([]),
  );
  const openByDay = new Map<string, ApiSlot[]>();
  for (const slot of slots.data ?? []) {
    const key = bookingDay(slot.startTime, zone);
    openByDay.set(key, [...(openByDay.get(key) ?? []), slot]);
  }
  const dayOpen = openByDay.get(day) ?? [];
  const dayBookings = data.bookings.filter((booking) => bookingDay(booking.startTime, zone) === day);
  const scheduleHref = data.profile
    ? `/availability/profiles/edit?id=${encodeURIComponent(data.profile.id)}`
    : "/availability";

  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });
  const range = (from: string, to: string) => `${from.slice(0, 5)}–${to.slice(0, 5)}`;

  function navigate(offset: number) {
    setShownMonth(moveMonth(month, offset));
    setPicked(null);
  }

  return (
    <DeskPage
      action={
        <Button className={cn(authPill(false), DESK_PILL)} nativeButton={false} render={<Link href={scheduleHref} />} variant="outline">
          <Pencil aria-hidden />
          {t("editProfile")}
        </Button>
      }
      backHref={back}
      subtitle={
        data.profile
          ? t("subtitle", { service: data.service.name, profile: data.profile.name })
          : t("subtitleNoProfile", { service: data.service.name })
      }
      title={t("title")}
    >
      <div className="mt-5 grid w-full gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <section className={BLOCK}>
          <div className="flex w-full items-center justify-between gap-3">
            <Button aria-label={t("prevMonth")} onClick={() => navigate(-1)} size="icon" type="button" variant="outline">
              <ChevronLeft aria-hidden />
            </Button>
            <h2 aria-live="polite" className={HEAD}>
              {monthLabel}
            </h2>
            <Button aria-label={t("nextMonth")} onClick={() => navigate(1)} size="icon" type="button" variant="outline">
              <ChevronRight aria-hidden />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground lg:text-frame-label">{s("timezone", { zone })}</p>
          <div className="w-full overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-7">
              {WEEKDAY_KEYS.map((key) => (
                <span className="py-2 text-center text-xs text-muted-foreground" key={key}>
                  {t(`weekdayShort.${key}`)}
                </span>
              ))}
              {cells.map((cell, index) => {
                const key = `${month}-${String(cell.day).padStart(2, "0")}`;
                const open = cell.inMonth ? (openByDay.get(key)?.length ?? 0) : 0;
                const selected = cell.inMonth && key === day;
                return (
                  <button
                    aria-label={`${cell.day}, ${t("bookableCount", { count: open })}`}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex min-h-12 flex-col items-center justify-center gap-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset lg:min-h-20 lg:border-t lg:border-border",
                      !cell.inMonth && "text-muted-foreground/40",
                      cell.inMonth && key < today && !selected && "text-muted-foreground",
                      cell.inMonth && !selected && "hover:bg-muted/60",
                      selected && "bg-hero-action text-hero-action-foreground",
                    )}
                    disabled={!cell.inMonth}
                    key={`${index}-${cell.day}`}
                    onClick={() => setPicked(key)}
                    type="button"
                  >
                    <span className={cn("font-latin tabular-nums", cell.inMonth && key === today && "font-bold underline underline-offset-4")}>
                      {cell.day}
                    </span>
                    {open > 0 ? (
                      <span aria-hidden className={cn("size-1.5 rounded-full", selected ? "bg-hero-action-foreground" : "bg-hero-action")} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground lg:text-frame-label">
            {published && slots.data ? t("monthOpen", { days: openByDay.size }) : null}
            {published && slots.data ? " · " : null}
            {s("bookingsCount", {
              count: data.bookings.filter((booking) => bookingDay(booking.startTime, zone).startsWith(month)).length,
            })}
          </p>
        </section>

        <div className="flex w-full min-w-0 flex-col gap-8 lg:gap-10">
          <section className={BLOCK}>
            <h2 className={cn(HEAD, "flex min-h-11 items-center")}>{dayLabel}</h2>
            <h3 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{t("openTimes")}</h3>
            {(() => {
              if (!published) return <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("hiddenNote")}</p>;
              if (slots.error) return <ApiErrorCard error={slots.error} onRetry={slots.reload} title={s("loadFailed")} />;
              if (!slots.data) {
                return (
                  <div aria-busy className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map((key) => (
                      <span className="block h-10 w-28 animate-pulse rounded-full bg-muted" key={key} />
                    ))}
                  </div>
                );
              }
              if (dayOpen.length === 0) return <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noOpenTimes")}</p>;
              return (
                <ul className="flex flex-wrap gap-2">
                  {dayOpen.map((slot) => (
                    <li
                      className="flex h-10 items-center rounded-full border border-border px-4 font-latin text-sm text-foreground tabular-nums lg:h-11 lg:text-frame-meta"
                      key={slot.startTime}
                    >
                      {clock.format(new Date(slot.startTime))}–{clock.format(new Date(slot.endTime))}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </section>

          <section className={BLOCK}>
            <h3 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{t("dayBookings")}</h3>
            {dayBookings.length > 0 ? (
              <ul className="flex w-full flex-col">
                {dayBookings.map((booking) => (
                  <SessionRow booking={booking} key={booking.id} now={now} timeZone={zone} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noDayBookings")}</p>
            )}
          </section>

          <Why data={data} day={day} range={range} scheduleHref={scheduleHref} />
        </div>
      </div>
    </DeskPage>
  );
}

/** Where a day's times come from: rows of a label and its value on hairlines, the schedule's one a link to it. */
function Why({
  data,
  day,
  range,
  scheduleHref,
}: {
  readonly data: ServiceDetail;
  readonly day: string;
  readonly range: (from: string, to: string) => string;
  readonly scheduleHref: string;
}) {
  const t = useTranslations("serviceSchedule");
  const s = useTranslations("advisorServices");
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
  const weekly = data.profile?.weeklyWindows.filter((window) => window.dayOfWeek === weekday) ?? [];
  const extra = data.profile?.specificWindows.filter((window) => window.availableDate === day) ?? [];
  const closed = data.profile?.blockedPeriods.filter((period) => period.blockedDate === day) ?? [];
  const ceiling = (minutes: number | null) => (minutes === null ? s("ceilingUnlimited") : t("minutes", { count: minutes }));

  const rows: { readonly label: string; readonly value: ReactNode }[] = [
    {
      label: t("weeklyToday"),
      value: weekly.length ? weekly.map((window) => range(window.startTime, window.endTime)).join(", ") : t("closedDay"),
    },
    { label: t("extraToday"), value: extra.length ? extra.map((window) => range(window.startTime, window.endTime)).join(", ") : "—" },
    {
      label: t("blockedToday"),
      value: closed.length
        ? closed.map((period) => (period.startTime && period.endTime ? range(period.startTime, period.endTime) : t("allDay"))).join(", ")
        : "—",
    },
    { label: t("sourceBuffer"), value: t("minutes", { count: data.global.bufferMinutes }) },
    { label: s("serviceCeiling"), value: ceiling(data.service.dailyConsultationLimitMinutes) },
    { label: t("globalCeiling"), value: ceiling(data.global.dailyConsultationLimitMinutes) },
  ];

  return (
    <section className={BLOCK}>
      <h3 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{t("whyTitle")}</h3>
      <dl className="flex w-full flex-col divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-4 py-3 lg:py-3.5">
          <dt className="text-sm text-muted-foreground lg:text-frame-meta">{t("scheduleRow")}</dt>
          <dd>
            <Link
              className="text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta"
              href={scheduleHref}
            >
              {data.profile?.name ?? s("profileUnavailable")}
            </Link>
          </dd>
        </div>
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-4 py-3 lg:py-3.5" key={row.label}>
            <dt className="text-sm text-muted-foreground lg:text-frame-meta">{row.label}</dt>
            <dd className="text-right font-latin text-sm font-medium text-foreground tabular-nums lg:text-frame-meta">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
