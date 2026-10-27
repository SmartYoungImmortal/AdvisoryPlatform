"use client";

import { CalendarDays, ChevronLeft, CircleCheckBig, CircleX, Clock, CreditCard, MessageSquare, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { ScreenTopBar } from "@/components/mobile/screen";
import { Surface } from "@/components/mobile/surface";
import { BookingDetailFrame } from "./booking-detail-frame";
import { downloadBookingCalendar } from "./booking-calendar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import styles from "./booking-detail.module.css";
import { chatWithHref } from "@/components/chat/chat-data";
import { getAdvisor, getBooking, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiBookingState, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { asUuid, isCancellable, useQueryValue } from "@/components/bookings/booking-flow";
import { useBookingCancellation } from "@/components/bookings/use-booking-cancellation";
import { CancellationFeedback } from "@/components/bookings/cancellation-feedback";
import { cn } from "@/lib/utils";

/** Current Main-page Figma "Booking detail" (1594:27904), backed by live booking data. */
export function BookingDetailScreen() {
  const rawBookingId = useQueryValue("bookingId");
  const bookingId = asUuid(rawBookingId);
  const t = useTranslations("bookings");

  if (!bookingId) {
    return <BookingDetailState title={t("detailsMissingTitle")} body={t("detailsMissingBody")} />;
  }

  return <BookingDetailData key={bookingId} bookingId={bookingId} />;
}

function BookingDetailData({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("bookings");
  const fetchBooking = useCallback(
    (signal: AbortSignal) => getBooking(bookingId, signal),
    [bookingId],
  );
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetchBooking);
  const cancellation = useBookingCancellation(booking.reload);

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

  return <BookingDetailContent booking={booking.data} cancellation={cancellation} />;
}

const TITLES = {
  BOOKED: "detailConfirmed", PENDING_PAYMENT: "detailPending", IN_PROGRESS: "detailStarted",
  COMPLETED: "detailCompleted", CANCELLED: "detailCancelled", NO_SHOW: "detailNoShow",
} satisfies Record<ApiBookingState, `detail${string}`>;

function BookingCountdown({ booking }: { readonly booking: ApiBooking }) {
  const t = useTranslations("bookings");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);
  if (now === null || (booking.state !== "BOOKED" && booking.state !== "IN_PROGRESS")) return null;
  const minutes = Math.ceil((new Date(booking.startTime).getTime() - now) / 60000);
  const label = minutes > 0 ? t("detailStartsIn", { count: minutes })
    : now < new Date(booking.endTime).getTime() ? t("detailScheduledNow") : t("detailTimePassed");
  return <p className="rounded-full bg-accent-surface px-3 py-1.25 text-sm font-medium text-primary">{label}</p>;
}

const CARD = "w-full rounded-card border-0 p-3.5 shadow-none";
const DIVIDER = <div className="h-px w-full bg-muted" />;

function BookingDetailContent({ booking, cancellation }: { readonly booking: ApiBooking; readonly cancellation: ReturnType<typeof useBookingCancellation> }) {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const format = useFormatter();
  const fetchService = useCallback((signal: AbortSignal) => getService(booking.serviceId, signal), [booking.serviceId]);
  const fetchAdvisor = useCallback((signal: AbortSignal) => getAdvisor(booking.advisorId, signal), [booking.advisorId]);
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  const advisor = useResource<ApiPublicAdvisor>(`advisors/${booking.advisorId}`, fetchAdvisor);
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const duration = t("detailsDuration", { count: Math.round((end.getTime() - start.getTime()) / 60000) });
  const advisorName = advisor.data?.displayName ?? t(advisor.loading ? "detailsLoadingValue" : "detailsUnavailableValue");
  const active = booking.state === "BOOKED" || booking.state === "IN_PROGRESS";
  const StateIcon = booking.state === "CANCELLED" || booking.state === "NO_SHOW" ? CircleX : booking.state === "PENDING_PAYMENT" ? Clock : CircleCheckBig;

  return <BookingDetailFrame>
    <div className={cn(styles.inset, "w-full shrink-0 lg:bg-card")}>
      <ScreenTopBar href="/bookings" label={t("detailsBackToBookings")} className="lg:hidden" />
      <Link href="/bookings" className="hidden items-center gap-2 pt-6 text-sm font-medium lg:flex"><ChevronLeft aria-hidden className="size-7" />{c("back")}</Link>
    </div>
    <section className={cn(styles.inset, "flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-3 lg:flex-row lg:justify-between lg:gap-4 lg:border-b lg:border-border lg:bg-card lg:pt-5 lg:pb-9")}>
      <div className="flex flex-col items-center gap-3 lg:items-start lg:gap-1">
        <span className={cn("flex size-13 items-center justify-center rounded-full lg:hidden", booking.state === "BOOKED" || booking.state === "COMPLETED" ? "bg-success-surface text-success" : "bg-muted text-muted-foreground")}><StateIcon aria-hidden className="size-6.5 text-foreground" /></span>
        <div className="text-center lg:text-left"><h1 className="text-heading font-semibold">{t(TITLES[booking.state])}</h1><p className="mt-1 text-xs text-muted-foreground">{t("detailsCreatedLabel")} {format.dateTime(new Date(booking.createdAt), { dateStyle: "medium", timeStyle: "short" })}</p></div>
      </div>
      <BookingCountdown booking={booking} />
    </section>
    <main className={cn(styles.inset, "grid w-full shrink-0 gap-4 px-6 pt-5 pb-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:pt-10 lg:pb-22")}>
      <div className="flex min-w-0 flex-col gap-3 lg:gap-5">
        <Surface className={cn(CARD, "flex flex-col gap-3")}>
          <div className="flex items-center gap-2.5">
            <Avatar size="lg"><AvatarImage src={advisor.data?.image ?? undefined} alt={advisorName} /><AvatarFallback><UserRound aria-hidden className="size-5" /></AvatarFallback></Avatar>
            <div className="min-w-0"><p className="text-sm font-medium">{advisorName}</p><p className="text-xs text-muted-foreground">{service.data?.name ?? t(service.loading ? "detailsLoadingValue" : "detailsUnavailableValue")} · {duration}</p></div>
          </div>
          {DIVIDER}
          <div className="flex items-center gap-2.5 text-sm"><CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1 text-muted-foreground">{t("detailAppointmentDate")}</span><span className="text-right font-medium">{format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span></div>
          <div className="flex items-center gap-2.5 text-sm"><Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1 text-muted-foreground">{t("detailTime")}</span><span className="font-latin font-medium tabular-nums">{format.dateTime(start, { hour: "2-digit", minute: "2-digit" })} – {format.dateTime(end, { hour: "2-digit", minute: "2-digit" })}</span></div>
        </Surface>
        <div className="-mt-2 grid grid-cols-2 gap-2.5 lg:mt-0">
          <Button nativeButton={false} render={<Link href={chatWithHref(booking.advisorId)} />} variant="ghost" className="h-auto flex-col gap-1.5 rounded-lg border-0 bg-card py-3 text-xs font-normal"><MessageSquare aria-hidden className="size-5 text-muted-foreground" />{t("detailChatTile")}</Button>
          <Button variant="ghost" disabled={!active} onClick={() => downloadBookingCalendar(booking, service.data?.name ?? t("detailsTitle"))} className="h-auto flex-col gap-1.5 rounded-lg border-0 bg-card py-3 text-xs font-normal"><CalendarDays aria-hidden className="size-5 text-muted-foreground" />{t("detailCalendar")}</Button>
        </div>
        <section className="flex flex-col gap-2"><h2 className="text-sm font-normal text-muted-foreground">{t("detailGoal")}</h2><Surface className={CARD}><p className="text-sm text-muted-foreground">{t("detailGoalUnavailable")}</p></Surface></section>
      </div>
      <aside className="flex min-w-0 flex-col gap-4">
        <Surface className={cn(CARD, "flex flex-col gap-2.5")}>
          <div className="flex items-center justify-between gap-2.5 text-sm"><span className="text-muted-foreground">{duration}</span><span>—</span></div>
          <div className="flex items-center justify-between gap-2.5 text-sm"><span className="text-muted-foreground">{t("detailFee")}</span><span>—</span></div>
          {DIVIDER}<div className="flex items-center justify-between gap-2.5 text-base font-medium"><span>{t("detailTotal")}</span><span>—</span></div>
        </Surface>
        <Surface className="w-full rounded-card border-0 shadow-none">
          <div className="flex items-center gap-2.5 px-3.5 py-3 text-sm"><CreditCard aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1 text-muted-foreground">{t("detailPaidWith")}</span><span className="text-xs">—</span></div>
          {DIVIDER}<div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3"><span className="text-sm text-muted-foreground">{t("detailReference")}</span><span className="break-all font-latin text-xs">{booking.id}</span></div>
        </Surface>
        <p className="text-xs text-muted-foreground">{t("detailPaymentUnavailable")}</p>
        <CancellationFeedback cancellation={cancellation} />
        <div className="flex flex-col gap-3">
          {active ? <><PrimaryButton block disabled aria-describedby="booking-video-unavailable" className="lg:h-9">{t("detailJoin")}</PrimaryButton><p id="booking-video-unavailable" className="text-xs text-muted-foreground">{t("detailJoinUnavailable")}</p></> : null}
          {isCancellable(booking.state) ? <NeutralButton block className="lg:h-9" disabled={cancellation.blocked} onClick={() => void cancellation.cancel(booking.id)}>{t("detailsCancel")}</NeutralButton> : null}
        </div>
      </aside>
    </main>
  </BookingDetailFrame>;
}

function BookingDetailState({ title, body, retry }: { readonly title: string; readonly body: string; readonly retry?: () => void }) {
  const t = useTranslations("bookings");
  return <BookingDetailFrame><div className={cn(styles.inset, "w-full px-6 pb-8")}>
    <ScreenTopBar href="/bookings" label={t("detailsBackToBookings")} />
    <Surface className="my-5 flex w-full flex-col gap-3 p-5" ><div role="status" aria-live="polite"><h1 className="font-semibold">{title}</h1><p className="mt-3 text-sm text-muted-foreground">{body}</p></div>{retry ? <NeutralButton className="self-start" onClick={retry} size="sm">{t("detailsRetry")}</NeutralButton> : null}</Surface>
  </div></BookingDetailFrame>;
}
