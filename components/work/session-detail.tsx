"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { useStanding } from "@/components/bookings/booking-sheet";
import { useBookingMeeting } from "@/components/bookings/use-booking-meeting";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { AdvisorBookingReadState } from "@/components/work/advisor-calendar-screen";
import { DESK_BOX, DESK_PILL, DeskPage } from "@/components/work/desk-page";
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

/**
 * `/work/session?id=`: one session, from the advisor's side, on the desk's
 * frame. The advisee's name is the title and the service the line under it;
 * beside the page (first on the phone) the day and time, where it stands and
 * the ways into it — the video room once it opens, and the chat — and on the
 * page what the advisee answered to the screening questions, read as
 * question and answer.
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
  if (booking.data && profile.data) return <SessionView booking={booking.data} timeZone={profile.data.timezone} />;
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

function SessionView({ booking, timeZone }: { readonly booking: AdvisorBookingDetail; readonly timeZone: string }) {
  const t = useTranslations("advisorBookings");
  const w = useTranslations("work");
  const locale = useLocale();
  const now = useMountTime();
  const standing = useStanding()(booking, now);
  const call = useBookingMeeting(booking, now);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }).format(new Date(booking.startTime));
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const range = `${clock.format(new Date(booking.startTime))}–${clock.format(new Date(booking.endTime))}`;
  const minutes = Math.round((Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60_000);
  const opensAt = call.opensAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone }).format(call.opensAt)
    : null;

  return (
    <DeskPage subtitle={`${booking.serviceName} · ${t("duration", { minutes })}`} title={booking.adviseeName}>
      <div className="mt-5 grid grid-cols-1 gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        {/* The time and the ways in: first on the phone, beside the answers from `lg`. */}
        <aside className={cn(DESK_BOX, "flex flex-col gap-5 p-5 lg:col-start-2 lg:row-start-1 lg:p-6")}>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-foreground lg:text-frame-heading">{date}</p>
            <p className="font-latin text-base text-foreground tabular-nums lg:text-frame-body">{range}</p>
            <p className={cn("text-sm font-medium lg:text-frame-meta", standing.ink)}>{standing.label}</p>
            <p className="text-xs text-muted-foreground lg:text-frame-label">{t("timezone", { zone: timeZone })}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button
              aria-busy={call.joining || undefined}
              className={cn(authPill(true), DESK_PILL, "w-full lg:w-full")}
              disabled={!call.open || call.joining}
              onClick={() => void call.join()}
              type="button"
            >
              <Video aria-hidden />
              {call.joining ? t("joining") : w("joinRoom")}
            </Button>
            {booking.chatRoomId ? (
              <Button
                className={cn(authPill(false), DESK_PILL, "w-full lg:w-full")}
                nativeButton={false}
                render={<Link href={`/chat/room?id=${booking.chatRoomId}`} />}
                variant="outline"
              >
                <MessageSquare aria-hidden />
                {w("openChat")}
              </Button>
            ) : null}
          </div>
          {opensAt || call.problem || !booking.chatRoomId ? (
            <div className="flex flex-col gap-1">
              {opensAt ? <p className="text-xs text-muted-foreground lg:text-frame-label">{t("opensAt", { time: opensAt })}</p> : null}
              {call.problem ? (
                <p className="text-xs text-destructive lg:text-frame-label" role="alert">
                  {call.problem}
                </p>
              ) : null}
              {!booking.chatRoomId ? <p className="text-xs text-muted-foreground lg:text-frame-label">{t("chatUnavailable")}</p> : null}
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {booking.latestScreeningRequestId ? (
            <ScreeningAnswers id={booking.latestScreeningRequestId} timeZone={timeZone} />
          ) : (
            <Answers title={t("latestScreening")}>
              <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noScreening")}</p>
            </Answers>
          )}
        </div>
      </div>
    </DeskPage>
  );
}

/** The screening section: its head, a line about the request, then the answers. */
function Answers({ title, meta, children }: { readonly title: string; readonly meta?: ReactNode; readonly children: ReactNode }) {
  return (
    <section aria-labelledby="session-answers" className="flex min-w-0 flex-col gap-3 lg:gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" id="session-answers">
          {title}
        </h2>
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
      <Answers title={t("latestScreening")}>
        <AdvisorBookingReadState failed retry={resource.reload} />
      </Answers>
    );
  }
  if (!resource.data) {
    return (
      <Answers title={t("latestScreening")}>
        <AdvisorBookingReadState />
      </Answers>
    );
  }
  return (
    <Answers
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
    </Answers>
  );
}
