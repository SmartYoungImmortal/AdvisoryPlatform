"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Video } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { useStanding } from "@/components/bookings/booking-sheet";
import { useBookingMeeting } from "@/components/bookings/use-booking-meeting";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { AdvisorBookingReadState } from "@/components/work/advisor-calendar-screen";
import { DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { useAdvisorBookings } from "@/components/work/work-data";
import { getMyAdvisorService, listMyServicePackages, type AdvisorService } from "@/lib/advisor-services/api";
import {
  getAdvisorBooking,
  getAdvisorBookingScreening,
  type AdvisorBookingDetail,
  type AdvisorBookingScreening,
} from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile, ApiServicePackage } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/work/session?id=`: one session, from the advisor's side, on the desk's
 * frame. First when it is, large, where it stands and the ways into it — the
 * chat and, once it opens, the video room; then who it is with (and which of
 * their sessions with you this is), what they booked (its picture, package,
 * price and length) and what they answered before booking; and beside them
 * the booking's own facts on hairlines.
 */
export function AdvisorSessionDetailScreen() {
  const t = useTranslations("work");
  return (
    <Suspense
      fallback={
        <DeskPage title={t("sessionTitle")}>
          <AdvisorBookingReadState />
        </DeskPage>
      }
    >
      <SessionFromQuery />
    </Suspense>
  );
}

function SessionFromQuery() {
  const id = asUuid(useSearchParams().get("id"));
  const t = useTranslations("advisorBookings");
  const w = useTranslations("work");
  return id ? (
    <SessionData id={id} key={id} />
  ) : (
    <DeskPage title={w("sessionTitle")}>
      <p className="mt-5 text-sm text-muted-foreground lg:mt-8 lg:text-frame-meta" role="alert">
        {t("missingBooking")}
      </p>
    </DeskPage>
  );
}

function SessionData({ id }: { readonly id: string }) {
  const w = useTranslations("work");
  const booking = useResource<AdvisorBookingDetail>(
    `advisors/me/bookings/${id}`,
    useCallback((signal: AbortSignal) => getAdvisorBooking(id, signal), [id]),
  );
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  if (booking.data && profile.data) return <SessionView booking={booking.data} profile={profile.data} />;
  return (
    <DeskPage title={w("sessionTitle")}>
      <div className="mt-5 lg:mt-8">
        {booking.error || profile.error ? (
          <AdvisorBookingReadState
            failed
            retry={() => {
              booking.reload();
              profile.reload();
            }}
          />
        ) : (
          <AdvisorBookingReadState />
        )}
      </div>
    </DeskPage>
  );
}

function SessionView({ booking, profile }: { readonly booking: AdvisorBookingDetail; readonly profile: ApiOwnProfile }) {
  const t = useTranslations("advisorBookings");
  const w = useTranslations("work");
  const s = useTranslations("session");
  const locale = useLocale();
  const format = useFormatter();
  const now = useMountTime();
  const timeZone = profile.timezone;
  const standing = useStanding()(booking, now);
  const call = useBookingMeeting(booking, now);
  const service = useResource<AdvisorService>(
    `advisors/me/services/${booking.serviceId}`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(booking.serviceId, signal), [booking.serviceId]),
  );
  const packages = useResource<ApiServicePackage[]>(
    `advisors/me/services/${booking.serviceId}/packages`,
    useCallback((signal: AbortSignal) => listMyServicePackages(booking.serviceId, signal), [booking.serviceId]),
  );
  const all = useAdvisorBookings(profile);

  const start = new Date(booking.startTime);
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone }).format(start);
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const range = `${clock.format(start)}–${clock.format(new Date(booking.endTime))}`;
  const minutes = Math.round((Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60_000);
  const opensAt = call.opensAt ? clock.format(call.opensAt) : null;
  const pack = booking.packageId ? packages.data?.find((item) => item.id === booking.packageId) : undefined;
  const priceSatang = pack?.priceSatang ?? service.data?.priceSatang;
  const picture = pack?.image ?? service.data?.coverImage ?? null;
  // Their sessions with this advisor, oldest first, none cancelled: which of them this one is.
  const theirs = (all.data ?? [])
    .filter((item) => item.adviseeId === booking.adviseeId && item.state !== "CANCELLED")
    .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
  const nth = theirs.findIndex((item) => item.id === booking.id) + 1;
  const reference = booking.id.slice(0, 8).toUpperCase();
  const booked = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(booking.createdAt));

  return (
    <DeskPage title={w("sessionTitle")}>
      <div className="mt-5 flex flex-col gap-8 lg:mt-8 lg:gap-10">
        {/* When, where it stands, and the ways in: the reason to open this page. */}
        <section className="flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-end md:justify-between lg:pb-10">
          <div className="flex min-w-0 flex-col gap-2">
            <span className={cn("inline-flex w-fit items-center gap-2 text-sm font-medium lg:text-frame-meta", standing.ink)}>
              <span aria-hidden className={cn("size-2 rounded-full", standing.dot)} />
              {standing.label}
            </span>
            <p className="font-hero text-title-compact tracking-tight text-hero-ink lg:text-frame-title">{day}</p>
            <p className="font-latin text-lg text-foreground tabular-nums lg:text-frame-heading">
              {range} <span className="text-muted-foreground">· {t("duration", { minutes })}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex flex-wrap gap-2">
              {booking.chatRoomId ? (
                <Button
                  className={cn(authPill(false), DESK_PILL)}
                  nativeButton={false}
                  render={<Link href={`/chat/room?id=${booking.chatRoomId}`} />}
                  variant="outline"
                >
                  <MessageSquare aria-hidden />
                  {w("openChat")}
                </Button>
              ) : null}
              <Button
                aria-busy={call.joining || undefined}
                className={cn(authPill(true), DESK_PILL)}
                disabled={!call.open || call.joining}
                onClick={() => void call.join()}
                type="button"
              >
                <Video aria-hidden />
                {call.joining ? t("joining") : w("joinRoom")}
              </Button>
            </div>
            {opensAt ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{s("opensAt", { time: opensAt })}</p> : null}
            {call.ended ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{s("ended")}</p> : null}
            {call.problem ? (
              <p className="text-sm text-destructive lg:text-frame-meta" role="alert">
                {call.problem}
              </p>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-8 lg:gap-10">
            <Part title={s("advisee")}>
              <div className="flex items-center gap-3 lg:gap-4">
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium text-foreground lg:size-14 lg:text-frame-body"
                >
                  {booking.adviseeName.trim().slice(0, 1)}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base font-medium text-foreground lg:text-frame-body">{booking.adviseeName}</span>
                  {nth > 0 ? (
                    <span className="text-sm text-muted-foreground lg:text-frame-meta">{nth === 1 ? s("firstTime") : s("nthTime", { n: nth })}</span>
                  ) : null}
                </span>
              </div>
            </Part>

            <Part title={s("booked")}>
              <Link
                className="-mx-3 flex items-center gap-4 rounded-2xl px-3 py-2 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                href={`/advisor/services/view?serviceId=${encodeURIComponent(booking.serviceId)}`}
              >
                <span
                  className={cn(
                    "block aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-muted lg:w-32",
                    (service.loading || packages.loading) && !picture && "animate-pulse motion-reduce:animate-none",
                  )}
                >
                  {picture ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned storage URLs change per read
                    <img alt="" className="size-full object-cover" src={picture} />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base font-medium text-foreground lg:text-frame-body">{booking.serviceName}</span>
                  {pack ? <span className="truncate text-sm text-muted-foreground lg:text-frame-meta">{pack.name}</span> : null}
                  <span className="font-latin text-sm text-foreground tabular-nums lg:text-frame-meta">
                    {priceSatang === undefined ? t("duration", { minutes }) : `${format.number(priceSatang / 100, "baht")} · ${t("duration", { minutes })}`}
                  </span>
                </span>
              </Link>
            </Part>

            {booking.latestScreeningRequestId ? (
              <ScreeningAnswers id={booking.latestScreeningRequestId} timeZone={timeZone} />
            ) : (
              <Part title={t("latestScreening")}>
                {/* None asked, or asked but not yet answered for this client: which is the service's to say. */}
                <p className="text-sm text-muted-foreground lg:text-frame-meta">
                  {service.data?.screeningRequired ? t("noScreening") : s("noScreening")}
                </p>
              </Part>
            )}
          </div>

          <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{s("details")}</h2>
            <dl className="flex flex-col divide-y divide-border border-y border-border">
              {[
                { label: s("referenceLabel"), value: reference },
                { label: s("bookedAt"), value: booked },
                { label: s("standing"), value: standing.label },
                { label: s("timeZone"), value: timeZone },
              ].map((row) => (
                <div className="flex items-center justify-between gap-4 py-3" key={row.label}>
                  <dt className="text-sm text-muted-foreground lg:text-frame-meta">{row.label}</dt>
                  <dd className="text-right font-latin text-sm font-medium text-foreground tabular-nums lg:text-frame-meta">{row.value}</dd>
                </div>
              ))}
            </dl>
            {!booking.chatRoomId ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("chatUnavailable")}</p> : null}
          </aside>
        </div>
      </div>
    </DeskPage>
  );
}

/** A part of the session page: its name small and grey, then what it holds. */
function Part({ title, meta, children }: { readonly title: string; readonly meta?: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 lg:gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

/** What the advisee answered before booking: each question a step down, its answer under it, hairlines between. */
function ScreeningAnswers({ id, timeZone }: { readonly id: string; readonly timeZone: string }) {
  const t = useTranslations("advisorBookings");
  const locale = useLocale();
  const resource = useResource<AdvisorBookingScreening>(
    `advisors/me/screening-requests/${id}`,
    useCallback((signal: AbortSignal) => getAdvisorBookingScreening(id, signal), [id]),
  );
  if (resource.error) {
    return (
      <Part title={t("latestScreening")}>
        <AdvisorBookingReadState failed retry={resource.reload} />
      </Part>
    );
  }
  if (!resource.data) {
    return (
      <Part title={t("latestScreening")}>
        <AdvisorBookingReadState />
      </Part>
    );
  }
  return (
    <Part
      meta={
        <p className="text-sm text-muted-foreground lg:text-frame-meta">
          {t(`screeningStatus.${resource.data.status}`)} ·{" "}
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(new Date(resource.data.createdAt))}
        </p>
      }
      title={t("latestScreening")}
    >
      {resource.data.answers.length > 0 ? (
        <dl className="flex flex-col divide-y divide-border">
          {resource.data.answers.map((answer) => (
            <div className="flex min-w-0 flex-col gap-1.5 py-4 first:pt-1 lg:py-5" key={answer.questionId}>
              <dt className="text-sm text-muted-foreground lg:text-frame-meta">{answer.questionText}</dt>
              <dd className="text-base whitespace-pre-wrap text-foreground lg:text-frame-body">
                <ThaiText>{answer.answer}</ThaiText>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noAnswers")}</p>
      )}
    </Part>
  );
}
