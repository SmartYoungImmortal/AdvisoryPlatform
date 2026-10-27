"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { authPill } from "@/components/auth/auth-split";
import { BookingSheet } from "@/components/bookings/booking-sheet";
import { SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import { Button } from "@/components/ui/button";
import { getAdvisor, getBooking, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { asUuid, useMountTime, useQueryValue } from "@/components/bookings/booking-flow";
import { cn } from "@/lib/utils";

/** The phone's side margin, and the tablet's; the account column owns the inset from `lg`. */
const GUTTER = "px-5 md:px-10 lg:px-0";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/**
 * The page around one booking, laid out as a receipt's page is: the sheet
 * centred in the panel, narrow and upright, under the breadcrumb that says
 * where this sits on a desktop. The rail is the way back there; the phone has
 * its back chevron. `crumb` is the service's name, once there is one.
 *
 * The session's review is a page about one booking too, and stands in the same
 * column (`components/reviews/session-review-screen.tsx`).
 */
export function DetailColumn({ crumb, children }: { readonly crumb?: string; readonly children: ReactNode }) {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const tr = useTranslations("transactions");

  return (
    // `wide="md"`: a tablet held upright gets the phone layout at its own width.
    <MobileScreen className="bg-card" wide="md">
      <ScreenTopBar className="lg:hidden" href="/bookings" label={c("back")} />
      <AppFrame active="bookings">
        <ScreenBody className="bg-card">
          <AccountShell active="bookings">
            <div className={cn("flex w-full flex-col lg:mx-auto", SHEET_W)}>
              <nav aria-label={tr("breadcrumbLabel")} className="hidden text-frame-meta text-muted-foreground lg:block">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li>
                    <Link className="transition-colors hover:text-foreground" href="/bookings">
                      {t("title")}
                    </Link>
                  </li>
                  {crumb ? (
                    <>
                      <li aria-hidden>/</li>
                      <li aria-current="page" className="text-foreground">
                        {crumb}
                      </li>
                    </>
                  ) : null}
                </ol>
              </nav>
              <div
                className={cn(
                  "flex w-full flex-col gap-6 pt-2 pb-10 md:mx-auto md:max-w-xl lg:mt-6 lg:max-w-none lg:gap-8 lg:pt-0 lg:pb-0",
                  GUTTER,
                )}
              >
                {children}
              </div>
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/**
 * `/bookings/detail?bookingId=`: one booking on a page of its own, for a link
 * from a notification or a booking opened in a new tab. The calendar itself
 * opens the same card over the month (`BookingDialog`).
 */
export function BookingDetailScreen() {
  const rawBookingId = useQueryValue("bookingId");
  const bookingId = asUuid(rawBookingId);
  const t = useTranslations("bookings");

  if (!bookingId) {
    return <BookingDetailState body={t("detailsMissingBody")} title={t("detailsMissingTitle")} />;
  }

  return <BookingDetailData bookingId={bookingId} key={bookingId} />;
}

function BookingDetailData({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("bookings");
  const fetchBooking = useCallback((signal: AbortSignal) => getBooking(bookingId, signal), [bookingId]);
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetchBooking);
  // The booking as last read, kept while it is read again after a change made
  // in the card, so the card stays mounted and keeps what it was saying.
  const [lastRead, setLastRead] = useState(booking.data);
  if (booking.data && booking.data !== lastRead) setLastRead(booking.data);
  const shown = booking.data ?? (booking.loading ? lastRead : undefined);

  if (!shown && booking.loading) return <BookingDetailSkeleton />;
  if (booking.error || !shown) {
    return (
      <BookingDetailState
        body={booking.error?.message ?? t("detailsFailedBody")}
        retry={booking.reload}
        title={t("detailsFailedTitle")}
      />
    );
  }

  return <BookingDetailContent booking={shown} reload={booking.reload} />;
}

/** The booking with its service and advisor joined, as the calendar's card. */
function BookingDetailContent({ booking, reload }: { readonly booking: ApiBooking; readonly reload: () => void }) {
  const now = useMountTime();
  const fetchService = useCallback((signal: AbortSignal) => getService(booking.serviceId, signal), [booking.serviceId]);
  const fetchAdvisor = useCallback((signal: AbortSignal) => getAdvisor(booking.advisorId, signal), [booking.advisorId]);
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetchService);
  const advisor = useResource<ApiPublicAdvisor>(`advisors/${booking.advisorId}`, fetchAdvisor);
  const entry = { booking, service: service.data, advisor: advisor.data };

  const changed = () => {
    // The list reads every booking again next time it is opened.
    invalidate("bookings/");
    reload();
  };

  return (
    <DetailColumn crumb={service.data?.name}>
      <BookingSheet entry={entry} now={now} onChanged={changed} />
    </DetailColumn>
  );
}

/** The sheet's own shape while the booking loads: the standing, the title, the hours, the advisor, the facts. */
function BookingDetailSkeleton() {
  const t = useTranslations("bookings");

  return (
    <DetailColumn>
      <div aria-busy className="flex w-full flex-col gap-6 lg:gap-8">
        <span className="sr-only">{t("detailsLoadingTitle")}</span>
        <div
          aria-hidden
          className={cn(
            "flex w-full flex-col gap-5 rounded-card border border-hero-card-border bg-card pt-6 pb-6 shadow-hero-card lg:gap-8 lg:pt-9 lg:pb-9",
            SHEET_X,
          )}
        >
          <div className="flex flex-col gap-2 lg:gap-3">
            <span className={cn(BONE, "h-4 w-28 rounded lg:h-5 lg:w-36")} />
            <span className={cn(BONE, "h-6 w-3/4 rounded-lg lg:h-8")} />
          </div>
          <div className="flex flex-col gap-2 lg:gap-3">
            <span className={cn(BONE, "h-4 w-48 rounded lg:h-5 lg:w-64")} />
            <span className={cn(BONE, "h-8 w-52 rounded-lg lg:h-12 lg:w-72")} />
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            <span className={cn(BONE, "size-10 shrink-0 rounded-full lg:size-14")} />
            <span className={cn(BONE, "h-4 w-40 rounded lg:h-5 lg:w-56")} />
          </div>
          <div className="grid grid-cols-2 gap-x-5 lg:gap-x-6">
            {[0, 1].map((i) => (
              <span className={cn(BONE, "h-10 rounded lg:h-12")} key={i} />
            ))}
          </div>
        </div>
        <span aria-hidden className={cn(BONE, "h-11 w-full rounded-full lg:h-14")} />
      </div>
    </DetailColumn>
  );
}

/**
 * The booking could not be shown, unboxed as the receipt's missing page is:
 * one muted icon, what went wrong, and the way back, with the retry when
 * asking again could change it.
 */
function BookingDetailState({ title, body, retry }: { readonly title: string; readonly body: string; readonly retry?: () => void }) {
  const t = useTranslations("bookings");
  const pill = "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

  return (
    <DetailColumn>
      <div
        aria-live="polite"
        className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20"
        role="status"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
          <CalendarDays aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h1>
          <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {retry ? (
            <Button className={cn(authPill(false), pill)} onClick={retry} type="button" variant="outline">
              {t("detailsRetry")}
            </Button>
          ) : null}
          <Button className={cn(authPill(true), pill)} nativeButton={false} render={<Link href="/bookings" />}>
            {t("detailsBackToBookings")}
          </Button>
        </div>
      </div>
    </DetailColumn>
  );
}
