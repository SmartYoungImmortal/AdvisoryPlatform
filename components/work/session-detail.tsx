"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, MessageSquare, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback } from "react";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { useStanding } from "@/components/bookings/booking-sheet";
import { useBookingMeeting } from "@/components/bookings/use-booking-meeting";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdvisorBookingReadState } from "@/components/work/advisor-calendar-screen";
import { WorkSectionHead } from "@/components/work/section-head";
import {
  getAdvisorBooking,
  getAdvisorBookingScreening,
  type AdvisorBookingDetail,
  type AdvisorBookingScreening,
} from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

export function AdvisorSessionDetailScreen() {
  const t = useTranslations("work");
  const c = useTranslations("common");
  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>
        <div className="flex w-full flex-col gap-4 lg:mx-auto lg:max-w-[1440px] lg:px-30 lg:pb-14">
          <ScreenTopBar
            href="/work/calendar"
            label={c("back")}
            className="lg:px-0"
          />
          <h1 className="w-full px-6 text-2xl font-semibold lg:px-0">
            {t("sessionTitle")}
          </h1>
          <Suspense fallback={<AdvisorBookingReadState />}>
            <SessionFromQuery />
          </Suspense>
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

function SessionFromQuery() {
  const id = asUuid(useSearchParams().get("id"));
  const t = useTranslations("advisorBookings");
  return id ? (
    <SessionData id={id} key={id} />
  ) : (
    <p className="px-6 py-10 text-sm text-muted-foreground" role="alert">
      {t("missingBooking")}
    </p>
  );
}

function SessionData({ id }: { readonly id: string }) {
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorBooking(id, signal),
    [id],
  );
  const booking = useResource<AdvisorBookingDetail>(
    `advisors/me/bookings/${id}`,
    fetcher,
  );
  const profile = useResource<ApiOwnProfile>("users/me", getOwnProfile);
  if (booking.error || profile.error)
    return (
      <AdvisorBookingReadState
        failed
        retry={() => {
          booking.reload();
          profile.reload();
        }}
      />
    );
  if (!booking.data || !profile.data) return <AdvisorBookingReadState />;
  return (
    <SessionView booking={booking.data} timeZone={profile.data.timezone} />
  );
}

function SessionView({
  booking,
  timeZone,
}: {
  readonly booking: AdvisorBookingDetail;
  readonly timeZone: string;
}) {
  const t = useTranslations("advisorBookings");
  const w = useTranslations("work");
  const locale = useLocale();
  const now = useMountTime();
  const standing = useStanding()(booking, now);
  const call = useBookingMeeting(booking, now);
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone,
  }).format(new Date(booking.startTime));
  const clock = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  });
  const range = `${clock.format(new Date(booking.startTime))}–${clock.format(new Date(booking.endTime))}`;
  const minutes = Math.round(
    (Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60_000,
  );
  const opensAt = call.opensAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone,
      }).format(call.opensAt)
    : null;
  return (
    <div className="flex w-full flex-col gap-5 px-6 pb-40 lg:pb-0 lg:px-0 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-2.5">
          <WorkSectionHead title={w("adviseeHeading")} />
          <Surface className="flex w-full items-center gap-3 p-3.5">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-base"
            >
              {booking.adviseeName.trim().slice(0, 1)}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-semibold">{booking.adviseeName}</p>
              <p className="text-xs text-muted-foreground">
                {booking.serviceName} · {t("duration", { minutes })}
              </p>
            </div>
          </Surface>
        </section>
        {booking.latestScreeningRequestId ? (
          <ScreeningAnswers
            id={booking.latestScreeningRequestId}
            timeZone={timeZone}
          />
        ) : (
          <section className="flex flex-col gap-2.5">
            <WorkSectionHead title={t("latestScreening")} />
            <Surface className="p-4 text-sm text-muted-foreground">
              {t("noScreening")}
            </Surface>
          </section>
        )}
      </div>
      <aside className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
        <Surface
          className="-order-1 flex items-start gap-3 p-4 lg:order-none"
          tier="well"
        >
          <Clock aria-hidden className="size-5 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-semibold">{date}</p>
            <p className="font-latin text-sm tabular-nums">{range}</p>
            <p className={cn("text-xs font-medium", standing.ink)}>
              {standing.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("timezone", { zone: timeZone })}
            </p>
          </div>
        </Surface>
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-112 flex-col gap-3 border-t border-border bg-background px-6 pt-3 pb-6 lg:static lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex gap-3">
            {booking.chatRoomId ? (
              <Link
                aria-label={w("openChat")}
                className={buttonVariants({ size: "icon", variant: "outline" })}
                href={`/chat/room?id=${booking.chatRoomId}`}
              >
                <MessageSquare aria-hidden />
              </Link>
            ) : (
              <Button
                aria-label={w("openChat")}
                disabled
                size="icon"
                type="button"
                variant="outline"
              >
                <MessageSquare aria-hidden />
              </Button>
            )}
            <Button
              aria-busy={call.joining || undefined}
              className="min-w-0 flex-1"
              disabled={!call.open || call.joining}
              onClick={() => void call.join()}
              type="button"
            >
              <Video aria-hidden />
              {call.joining ? t("joining") : w("joinRoom")}
            </Button>
          </div>
          {opensAt ? (
            <p className="text-xs text-muted-foreground">
              {t("opensAt", { time: opensAt })}
            </p>
          ) : null}
          {call.problem ? (
            <p className="text-xs text-destructive" role="alert">
              {call.problem}
            </p>
          ) : null}
          {!booking.chatRoomId ? (
            <p className="text-xs text-muted-foreground">
              {t("chatUnavailable")}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function ScreeningAnswers({
  id,
  timeZone,
}: {
  readonly id: string;
  readonly timeZone: string;
}) {
  const t = useTranslations("advisorBookings");
  const locale = useLocale();
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorBookingScreening(id, signal),
    [id],
  );
  const resource = useResource<AdvisorBookingScreening>(
    `advisors/me/screening-requests/${id}`,
    fetcher,
  );
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <WorkSectionHead title={t("latestScreening")} />
      {resource.error ? (
        <AdvisorBookingReadState failed retry={resource.reload} />
      ) : !resource.data ? (
        <AdvisorBookingReadState />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t(`screeningStatus.${resource.data.status}`)} ·{" "}
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone,
            }).format(new Date(resource.data.createdAt))}
          </p>
          <SurfaceList>
            {resource.data.answers.map((answer) => (
              <div
                className="flex min-w-0 flex-col gap-1 p-3.5"
                key={answer.questionId}
              >
                <p className="text-xs text-muted-foreground">
                  {answer.questionText}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  <ThaiText>{answer.answer}</ThaiText>
                </p>
              </div>
            ))}
          </SurfaceList>
          {!resource.data.answers.length ? (
            <p className="text-sm text-muted-foreground">{t("noAnswers")}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
