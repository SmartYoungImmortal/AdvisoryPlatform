import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WeekTable } from "@/components/availability/week-table";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { getAdvisor } from "@/lib/catalogue/services";
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

/** Figma "Stats" — three counts separated by hairlines, the sold one in accent. */
function SlotStat({
  value,
  label,
  accent = false,
}: {
  readonly value: number;
  readonly label: ReactNode;
  readonly accent?: boolean;
}) {
  return (
    <div className="flex min-w-px flex-1 flex-col items-center gap-0.5">
      <p
        className={cn(
          "font-latin text-lg font-semibold",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** Figma's small read-only pills under the week — the scheduling rules in force. */
function RulePill({ children }: { readonly children: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-normal whitespace-nowrap text-muted-foreground">
      {children}
    </span>
  );
}

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

function BookingRow({ booking }: { readonly booking: ServiceBookingFixture }) {
  const t = useTranslations("advisorServices");
  const advisor = getAdvisor(booking.avatarId);
  const upcoming = booking.state === "upcoming";

  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl border border-border bg-card p-3">
      {advisor ? (
        <Image
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          src={advisor.avatar}
        />
      ) : null}
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {booking.name}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {booking.when}
        </p>
        <span
          className={cn(
            "flex shrink-0 items-start rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap",
            upcoming
              ? "bg-accent-surface text-primary"
              : "bg-success-surface text-success",
          )}
        >
          {upcoming ? t("bookingUpcoming") : t("bookingCompleted")}
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </div>
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

  return (
    <MobileScreen>
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip pt-8 pr-6 pb-2 pl-4">
        <ScreenTopBar
          className="w-auto min-w-px flex-1 p-0 pl-0"
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

      <ScreenBody className="gap-4 pb-6">
        {/* Figma "Service Card" — the same card as the list, one row tall. */}
        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-xl border border-border bg-card p-2">
            <Image
              alt=""
              className="size-20 shrink-0 rounded-[12px] object-cover"
              src={record.service.cover}
            />
            <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
              <p className="w-full text-sm font-semibold text-foreground">
                {record.service.title}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("priceLine", {
                  price: record.shortPrice,
                  minutes: SLOT_MINUTES,
                })}
              </p>
              <span
                className={cn(
                  "flex shrink-0 items-start rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap",
                  published
                    ? "bg-success-surface text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {published ? t("statusPublished") : t("statusHidden")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
          <div className="flex w-full shrink-0 items-stretch overflow-clip rounded-[12px] bg-card py-3">
            <SlotStat
              label={t("statSlots", { days: SERVICE_SLOT_STATS.horizonDays })}
              value={SERVICE_SLOT_STATS.openedSlots}
            />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <SlotStat
              accent
              label={t("statBooked")}
              value={SERVICE_SLOT_STATS.booked}
            />
            <div className="w-px shrink-0 self-stretch bg-border" />
            <SlotStat label={t("statFree")} value={SERVICE_SLOT_STATS.free} />
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
          <SectionHead
            action={t("viewSchedule")}
            href={`/advisor/services/${serviceId}/schedule`}
            title={t("availabilityTitle")}
          />

          <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl border border-border bg-card p-3.5">
            <SectionHead
              action={t("editProfile")}
              href="/availability/profiles/edit"
              title={record.profileName}
            />
            <WeekTable windows={SERVICE_WEEK} />
            <div className="flex w-full flex-wrap content-start items-start gap-2">
              <RulePill>{t("ruleSlot", { minutes: SLOT_MINUTES })}</RulePill>
              <RulePill>{t("ruleBuffer", { minutes: SLOT_MINUTES })}</RulePill>
              <RulePill>{t("ruleHorizon", { days: 60 })}</RulePill>
            </div>
            <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {t("serviceCeiling")}
              </p>
              <p className="shrink-0 text-sm font-medium whitespace-nowrap text-foreground">
                {t("ceilingUnlimited")}
              </p>
            </div>
          </div>

          {/* Figma "ช่วงเวลาที่จองได้ถัดไป" — the next open slots, already derived. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl border border-border bg-card p-3.5">
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
                <p className="min-w-px flex-1 font-latin text-sm font-normal text-foreground">
                  {slot.times}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
          <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
            <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
              {t("bookingsTitle")}
            </h2>
            <p className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
              {t("bookingsCount", { count: SERVICE_SLOT_STATS.booked })}
            </p>
          </div>
          {SERVICE_BOOKINGS.map((booking) => (
            <BookingRow booking={booking} key={booking.id} />
          ))}
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}
