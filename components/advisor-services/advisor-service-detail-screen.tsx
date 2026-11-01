"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useResource } from "@/lib/api/use-resource";
import {
  readServiceDetail,
  profileWeek,
  type ServiceDetail,
} from "@/lib/advisor-services/detail";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { Button } from "@/components/ui/button";
import { useStanding } from "@/components/bookings/booking-sheet";
import { useMountTime } from "@/components/bookings/booking-flow";
import { ServiceOpenSlots } from "@/components/advisor-services/service-open-slots";
import type { ReactNode } from "react";

import { WeekTable } from "@/components/availability/week-table";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatTile } from "@/components/mobile/stat-tile";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { TopBar } from "@/components/topbar";

import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/** Figma "Section Head" — a 16/24 title with an accent link trailing. */
function SectionHead({
  title,
  action,
  href,
}: {
  readonly title: ReactNode;
  readonly action: ReactNode;
  readonly href: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
        {title}
      </h2>
      <Link
        className="shrink-0 text-sm font-medium whitespace-nowrap text-primary"
        href={href}
      >
        {action}
      </Link>
    </div>
  );
}

/**
 * One booking on this service.
 *
 * It was three separate cards stacked with a gap, each carrying its own border on
 * the page ground; it is a list, so it is one card with hairlines between its rows
 * — `SurfaceList` — and each row is the link to that session. The chevron was
 * already drawn on a `<div>` that went nowhere, which is a promise a row should not
 * make; `/work/session` is where the Advisor actually opens one.
 *
 * The state moves from under the name to the trailing edge, where the eye already
 * is after the chevron, without changing the reading order in the markup.
 */
function BookingRow({
  booking,
  timeZone,
}: {
  readonly booking: AdvisorBooking;
  readonly timeZone: string;
}) {
  const locale = useLocale();
  const upcoming =
    booking.state === "BOOKED" ||
    booking.state === "IN_PROGRESS" ||
    booking.state === "PENDING_PAYMENT";
  const standing = useStanding()(booking, useMountTime());

  return (
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3 transition-colors hover:bg-muted/50 lg:p-4"
      href={`/work/session?id=${encodeURIComponent(booking.id)}`}
    >
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full truncate text-sm font-medium text-foreground">
          {booking.adviseeName}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
          }).format(new Date(booking.startTime))}
        </p>
      </div>
      <StatusPill tone={upcoming ? "accent" : booking.state === "COMPLETED" ? "success" : "neutral"}>
        {standing.label}
      </StatusPill>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/**
 * Figma "Service detail - advisor" (1998:29813) — one service seen from the inside:
 * how many slots it opened, how many sold, the week it draws them from, and who
 * booked them.
 *
 * The week is the same `WeekTable` the profile list renders, because it is the same
 * profile: showing it a second way here would let the two drift.
 */
export function AdvisorServiceDetailScreen({
  serviceId,
}: {
  readonly serviceId: string;
}) {
  const resource = useResource(
    `advisors/me/services/${serviceId}/detail`,
    (signal) => readServiceDetail(serviceId, signal),
  );
  const t = useTranslations("advisorServices");
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
  return <ServiceDetailContent data={resource.data} />;
}

function ServiceDetailContent({ data }: { readonly data: ServiceDetail }) {
  const t = useTranslations("advisorServices");
  const c = useTranslations("common");
  const { service, profile, global, owner, bookings, images } = data;
  const serviceId = service.id;
  const published = service.isPublished;

  return (
    // Figma "Desktop / Service detail - advisor (Light)" (1998:28898): the phone's
    // one column becomes the 788px record beside a 380px rail — the counts, the
    // week it draws slots from, and the next ones it will open.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar />
      </div>

      {/* Figma "Back Bar" (1998:28921) — the chevron and the edit link on the
          same row, at the 120px page inset from `lg`. */}
      <div
        className={cn(
          "flex w-full shrink-0 items-center gap-3 overflow-clip pt-8 pr-6 pb-2 pl-4",
          PAGE,
          "lg:h-19 lg:bg-card lg:pt-0 lg:pr-10 lg:pb-0 lg:pl-10 xl:pr-30 xl:pl-30",
        )}
      >
        <ScreenTopBar
          className="w-auto min-w-px flex-1 p-0 pl-0 lg:h-auto lg:bg-transparent lg:pl-0"
          href="/advisor/services"
          label={c("back")}
        />
        <Link
          className="shrink-0 text-sm font-medium whitespace-nowrap text-primary"
          href={`/advisor/services/manage?serviceId=${encodeURIComponent(serviceId)}`}
        >
          {t("editService")}
        </Link>
      </div>

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div
          className={cn(
            "contents lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8 lg:gap-y-5 lg:pt-10 lg:pb-22",
            PAGE,
          )}
        >
          {/* Figma "Service Card" — the same card as the list, one row tall, and
            now with the same proof line: the score, the reviews behind it and the
            consultations this service has delivered. The screen is about how one
            service is doing and those were the three numbers it did not print. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 lg:col-start-1 lg:row-start-1 lg:px-0">
            <Surface className="flex w-full shrink-0 items-center gap-3 overflow-clip p-2 lg:gap-4 lg:p-3">
              {images[0] ? (
                <Image
                  alt={service.name}
                  className="size-20 shrink-0 rounded-card object-cover lg:size-26"
                  src={images[0]}
                  width={104}
                  height={104}
                />
              ) : null}
              <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
                <p className="w-full text-sm font-semibold text-foreground lg:text-base">
                  {service.name}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("priceLine", {
                    price: service.priceSatang / 100,
                    minutes: service.durationMinutes,
                  })}
                </p>
                <StatusPill tone={published ? "success" : "neutral"}>
                  {published ? t("statusPublished") : t("statusHidden")}
                </StatusPill>
              </div>
            </Surface>
          </div>

          {/* Figma "Stats" — the head of the desktop rail, the second block of the
            phone's column. Three tiles rather than three columns of one card: the
            figures take the Latin face at 20/32 with tabular figures, and each
            count now owns a surface instead of leaning on a 1px divider. */}
          <div className="grid w-full shrink-0 grid-cols-3 items-stretch gap-2.5 px-6 lg:col-start-2 lg:row-start-1 lg:px-0">
            <StatTile
              className="h-full p-3"
              label={t("statSlots", { days: global.bookingHorizonDays })}
              value="—"
            />
            <StatTile
              className="h-full p-3"
              label={t("statBooked")}
              value={
                bookings.filter((booking) => booking.state !== "CANCELLED")
                  .length
              }
            />
            <StatTile className="h-full p-3" label={t("statFree")} value="—" />
            <p className="col-span-3 text-xs text-muted-foreground">
              {t("statsUnavailable")}
            </p>
          </div>

          {/* The week this service draws its slots from — under the record on the
            phone, beside it in the desktop rail. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6 lg:col-start-2 lg:row-start-2 lg:px-0">
            <SectionHead
              action={t("viewSchedule")}
              href={`/advisor/services/schedule?serviceId=${encodeURIComponent(serviceId)}`}
              title={t("availabilityTitle")}
            />

            <Surface className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip p-3.5">
              <SectionHead
                action={t("editProfile")}
                href={
                  profile
                    ? `/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`
                    : "/availability/profiles"
                }
                title={profile?.name ?? t("profileUnavailable")}
              />
              {profile ? (
                <WeekTable windows={profileWeek(profile)} />
              ) : (
                <p>{t("profileUnavailable")}</p>
              )}
              {/* The scheduling rules in force. They were white pills with a
                hairline on a white card, which is a chip drawn twice and read
                once; the neutral pill's muted ground is the one that separates. */}
              <div className="flex w-full flex-wrap content-start items-start gap-2">
                <StatusPill>
                  {t("ruleSlot", { minutes: global.slotIntervalMinutes })}
                </StatusPill>
                <StatusPill>
                  {t("ruleBuffer", { minutes: global.bufferMinutes })}
                </StatusPill>
                <StatusPill>
                  {t("ruleHorizon", { days: global.bookingHorizonDays })}
                </StatusPill>
              </div>
              <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
                <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                  {t("serviceCeiling")}
                </p>
                <p className="shrink-0 text-sm font-medium whitespace-nowrap text-foreground">
                  {service.dailyConsultationLimitMinutes === null
                    ? t("ceilingUnlimited")
                    : t("ceilingMinutes", {
                        minutes: service.dailyConsultationLimitMinutes,
                      })}
                </p>
              </div>
            </Surface>

            {/* Figma "ช่วงเวลาที่จองได้ถัดไป" — the next open slots, already derived. */}
            <Surface className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip p-3.5">
              <h3 className="w-full text-sm font-semibold text-foreground">
                {t("nextSlotsTitle")}
              </h3>
              <ServiceOpenSlots data={data} />
            </Surface>
          </div>

          <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6 lg:col-start-1 lg:row-start-2 lg:px-0">
            <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
              <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
                {t("bookingsTitle")}
              </h2>
              <p className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
                {t("bookingsCount", { count: bookings.length })}
              </p>
            </div>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBookings")}</p>
            ) : null}
            <SurfaceList>
              {bookings.map((booking) => (
                <BookingRow
                  booking={booking}
                  timeZone={owner.timezone}
                  key={booking.id}
                />
              ))}
            </SurfaceList>
          </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
