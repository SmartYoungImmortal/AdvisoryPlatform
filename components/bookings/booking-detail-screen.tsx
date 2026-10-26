"use client";

import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { BookingStatePill } from "@/components/bookings/my-bookings-screen";
import { NeutralButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody, ScreenHeading, ScreenTopBar } from "@/components/mobile/screen";
import { Surface } from "@/components/mobile/surface";
import { AppFrame } from "@/components/account/app-frame";
import { chatWithHref } from "@/components/chat/chat-data";
import { cancelBooking, getAdvisor, getBooking, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { asUuid, isCancellable, useQueryValue } from "@/components/bookings/booking-flow";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/** Current Main-page Figma "Booking detail" (1594:27904), backed by live booking data. */
export function BookingDetailScreen() {
  const rawBookingId = useQueryValue("bookingId");
  const bookingId = asUuid(rawBookingId);
  const t = useTranslations("bookings");

  if (!bookingId) {
    return <BookingDetailState title={t("detailsMissingTitle")} body={t("detailsMissingBody")} />;
  }

  return <BookingDetailData bookingId={bookingId} />;
}

function BookingDetailData({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("bookings");
  const fetchBooking = useCallback(
    (signal: AbortSignal) => getBooking(bookingId, signal),
    [bookingId],
  );
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetchBooking);

  if (booking.loading) return <BookingDetailState title={t("detailsLoadingTitle")} body={t("detailsLoadingBody")} />;
  if (booking.error || !booking.data) {
    return (
      <BookingDetailState
        title={t("detailsFailedTitle")}
        body={booking.error?.message ?? t("detailsFailedBody")}
        retry={booking.reload}
      />
    );
  }

  return <BookingDetailContent booking={booking.data} reload={booking.reload} />;
}

function BookingDetailContent({ booking, reload }: { readonly booking: ApiBooking; readonly reload: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelFailure, setCancelFailure] = useState(false);
  async function cancel() {
    setCancelling(true);
    setCancelFailure(false);
    try {
      await cancelBooking(booking.id);
      invalidate("bookings/me?limit=50");
      reload();
    } catch {
      setCancelFailure(true);
    } finally {
      setCancelling(false);
    }
  }
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const format = useFormatter();
  const fetchService = useCallback(
    (signal: AbortSignal) => getService(booking.serviceId, signal),
    [booking.serviceId],
  );
  const fetchAdvisor = useCallback(
    (signal: AbortSignal) => getAdvisor(booking.advisorId, signal),
    [booking.advisorId],
  );
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  const advisor = useResource<ApiPublicAdvisor>(`advisors/${booking.advisorId}`, fetchAdvisor);
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  return (
    <MobileScreen wide>
      <AppFrame active="bookings"><ScreenBody className="pb-18 lg:pb-0">
        
        <div className={cn("flex w-full shrink-0 flex-col items-center gap-4 px-6 pb-8", PAGE)}>
          <ScreenTopBar href="/bookings" label={c("back")} />
          <ScreenHeading title={t("detailsTitle")} subtitle={<BookingStatePill state={booking.state} />} />

          <Surface className="flex w-full flex-col gap-4 p-4">
            <div className="flex items-start gap-3">
              <UserRound aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t("detailsAdvisorLabel")}</p>
                <p className="font-medium text-foreground">{advisor.data?.displayName ?? t(advisor.loading ? "detailsLoadingValue" : "detailsUnavailableValue")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t("detailsServiceLabel")}</p>
                <p className="font-medium text-foreground">{service.data?.name ?? t(service.loading ? "detailsLoadingValue" : "detailsUnavailableValue")}</p>
                <p className="text-sm text-muted-foreground">{t("detailsDuration", { count: Math.round((end.getTime() - start.getTime()) / 60000) })}</p>
              </div>
            </div>
            <div className="h-px w-full bg-border" />
            <div className="flex items-start gap-3">
              <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">{t("detailsDateLabel")}</p>
                <p className="font-medium text-foreground">{format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="font-latin text-sm tabular-nums text-muted-foreground">
                  {format.dateTime(start, { hour: "2-digit", minute: "2-digit" })} – {format.dateTime(end, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <div className="h-px w-full bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">{t("detailsCreatedLabel")}</p>
              <p className="font-medium text-foreground">{format.dateTime(new Date(booking.createdAt), { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </Surface>

          {cancelFailure ? <p role="alert" className="text-sm text-destructive">{t("detailsCancelFailed")}</p> : null}
          {isCancellable(booking.state) ? <NeutralButton disabled={cancelling} onClick={() => void cancel()}>{t("detailsCancel")}</NeutralButton> : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <NeutralButton className="w-full" href={chatWithHref(booking.advisorId)}>{t("detailsChat")}</NeutralButton>
            <NeutralButton className="w-full" href="/bookings">{t("detailsBackToBookings")}</NeutralButton>
          </div>
        </div>
      </ScreenBody></AppFrame>
    </MobileScreen>
  );
}

function BookingDetailState({ title, body, retry }: { readonly title: string; readonly body: string; readonly retry?: () => void }) {
  const c = useTranslations("common");
  const t = useTranslations("bookings");
  return (
    <MobileScreen wide>
      <AppFrame active="bookings"><ScreenBody className="pb-18 lg:pb-0">
        
        <div className={cn("flex w-full flex-col gap-4 px-6", PAGE)}>
          <ScreenTopBar href="/bookings" label={c("back")} />
          <div className="w-full" role="status" aria-live="polite">
            <Surface className="flex w-full flex-col gap-3 p-5">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
              {retry ? <NeutralButton className="w-auto self-start" onClick={retry} size="sm">{t("detailsRetry")}</NeutralButton> : null}
            </Surface>
          </div>
        </div>
      </ScreenBody></AppFrame>
    </MobileScreen>
  );
}
