import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WeekTable } from "@/components/availability/week-table";
import { ServiceProof } from "@/components/home/parts";
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
import { getAdvisor } from "@/lib/catalogue/services";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  NEXT_SLOTS,
  SERVICE_BOOKINGS,
  SERVICE_SLOT_STATS,
  SERVICE_WEEK,
  SLOT_MINUTES,
  advisorService,
  type ServiceBookingFixture,
} from "@/lib/advisor-services";

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
function BookingRow({ booking }: { readonly booking: ServiceBookingFixture }) {
  const t = useTranslations("advisorServices");
  const advisor = getAdvisor(booking.avatarId);
  const upcoming = booking.state === "upcoming";

  return (
    <Link
      className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3 transition-colors hover:bg-muted/50 lg:p-4"
      href="/work/session"
    >
      {advisor ? (
        <Image
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          src={advisor.avatar}
        />
      ) : null}
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full truncate text-sm font-medium text-foreground">
          {booking.name}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {booking.when}
        </p>
      </div>
      <StatusPill tone={upcoming ? "accent" : "success"}>
        {upcoming ? t("bookingUpcoming") : t("bookingCompleted")}
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
  const t = useTranslations("advisorServices");
  const c = useTranslations("common");
  const record = advisorService(serviceId);

  if (!record) notFound();

  const published = record.status === "published";
  const advisor = getAdvisor(record.service.advisorId);

  return (
    // Figma "Desktop / Service detail - advisor (Light)" (1998:28898): the phone's
    // one column becomes the 788px record beside a 380px rail — the counts, the
    // week it draws slots from, and the next ones it will open.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
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
          href={`/advisor/services/${serviceId}/edit`}
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
            <Image
              alt=""
              className="size-20 shrink-0 rounded-card object-cover lg:size-26"
              src={record.service.cover}
            />
            <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
              <p className="w-full text-sm font-semibold text-foreground lg:text-base">
                {record.service.title}
              </p>
              {advisor ? (
                <ServiceProof
                  bookings={record.service.bookings}
                  rating={advisor.rating}
                  reviews={advisor.reviews}
                />
              ) : null}
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("priceLine", {
                  price: record.shortPrice,
                  minutes: SLOT_MINUTES,
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
            label={t("statSlots", { days: SERVICE_SLOT_STATS.horizonDays })}
            value={SERVICE_SLOT_STATS.openedSlots}
          />
          <StatTile
            className="h-full p-3"
            label={t("statBooked")}
            value={SERVICE_SLOT_STATS.booked}
          />
          <StatTile
            className="h-full p-3"
            label={t("statFree")}
            value={SERVICE_SLOT_STATS.free}
          />
        </div>

        {/* The week this service draws its slots from — under the record on the
            phone, beside it in the desktop rail. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6 lg:col-start-2 lg:row-start-2 lg:px-0">
          <SectionHead
            action={t("viewSchedule")}
            href={`/advisor/services/${serviceId}/schedule`}
            title={t("availabilityTitle")}
          />

          <Surface className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip p-3.5">
            <SectionHead
              action={t("editProfile")}
              href="/availability/profiles/edit"
              title={record.profileName}
            />
            <WeekTable windows={SERVICE_WEEK} />
            {/* The scheduling rules in force. They were white pills with a
                hairline on a white card, which is a chip drawn twice and read
                once; the neutral pill's muted ground is the one that separates. */}
            <div className="flex w-full flex-wrap content-start items-start gap-2">
              <StatusPill>{t("ruleSlot", { minutes: SLOT_MINUTES })}</StatusPill>
              <StatusPill>{t("ruleBuffer", { minutes: SLOT_MINUTES })}</StatusPill>
              <StatusPill>{t("ruleHorizon", { days: 60 })}</StatusPill>
            </div>
            <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("serviceCeiling")}
              </p>
              <p className="shrink-0 text-sm font-medium whitespace-nowrap text-foreground">
                {t("ceilingUnlimited")}
              </p>
            </div>
          </Surface>

          {/* Figma "ช่วงเวลาที่จองได้ถัดไป" — the next open slots, already derived. */}
          <Surface className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip p-3.5">
            <h3 className="w-full text-sm font-semibold text-foreground">
              {t("nextSlotsTitle")}
            </h3>
            {NEXT_SLOTS.map((slot) => (
              <div
                className="flex w-full shrink-0 items-start gap-3 overflow-clip"
                key={slot.id}
              >
                <p className="w-24 shrink-0 text-xs font-normal text-muted-foreground">
                  {slot.label}
                </p>
                <p className="min-w-px flex-1 font-latin text-sm font-normal tabular-nums text-foreground">
                  {slot.times}
                </p>
              </div>
            ))}
          </Surface>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6 lg:col-start-1 lg:row-start-2 lg:px-0">
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
            <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
              {t("bookingsTitle")}
            </h2>
            <p className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
              {t("bookingsCount", { count: SERVICE_SLOT_STATS.booked })}
            </p>
          </div>
          <SurfaceList>
            {SERVICE_BOOKINGS.map((booking) => (
              <BookingRow booking={booking} key={booking.id} />
            ))}
          </SurfaceList>
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
