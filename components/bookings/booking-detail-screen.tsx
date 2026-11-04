"use client";

import { CalendarDays, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { authPill } from "@/components/auth/auth-split";
import { BookingSheet } from "@/components/bookings/booking-sheet";
import { FEED_COLUMN } from "@/components/notifications/notification-center-screen";
import { SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import { Button } from "@/components/ui/button";
import { getAdvisor, getBooking, getService } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
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
 *
 * `back`: a task on one booking (its refund) is a step, not a place in the
 * hierarchy, so it gets a way back to where it was opened from instead of the
 * trail, and the bookings section's own width (`FEED_COLUMN`) instead of the
 * receipt's narrow sheet.
 */
export function DetailColumn({
  crumb,
  back,
  children,
}: {
  readonly crumb?: string;
  /** `fromLg: false`: the page's own button already goes there, so from `lg` it draws no second way back. */
  readonly back?: { readonly href: string; readonly label: string; readonly fromLg?: boolean };
  readonly children: ReactNode;
}) {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const tr = useTranslations("transactions");

  return (
    // `wide="md"`: a tablet held upright gets the phone layout at its own width.
    <MobileScreen className="bg-card" wide="md">
      <ScreenTopBar className="lg:hidden" href={back?.href ?? "/bookings"} label={back?.label ?? c("back")} />
      <AppFrame active="bookings">
        <ScreenBody className="bg-card">
          <AccountShell active="bookings">
            <div className={cn("flex w-full flex-col lg:mx-auto", back ? cn("lg:w-full", FEED_COLUMN) : SHEET_W)}>
              {back ? (
                back.fromLg === false ? null : (
                  <Link
                    className="hidden w-fit items-center gap-1.5 rounded-md text-frame-meta text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:inline-flex"
                    href={back.href}
                  >
                    <ChevronLeft aria-hidden className="size-5" />
                    {back.label}
                  </Link>
                )
              ) : (
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
              )}
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
  // Kept while the booking is read again after a change made in the card, so
  // the card stays mounted and keeps what it was saying.
  const shown = useLastAnswer(booking);

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
      <BookingSheet entry={entry} onChanged={changed} />
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
 *
 * `action` replaces the way back to the list (the refund page's states go
 * back to the booking), and `back` is the column's own, as `DetailColumn`.
 */
export function BookingDetailState({
  title,
  body,
  retry,
  retryLabel,
  action,
  back,
}: {
  readonly title: string;
  readonly body: string;
  readonly retry?: () => void;
  readonly retryLabel?: string;
  readonly action?: { readonly href: string; readonly label: string };
  readonly back?: { readonly href: string; readonly label: string };
}) {
  const t = useTranslations("bookings");
  const pill = "mt-1 h-11 w-auto px-4 text-sm md:h-11 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";
  // With `back` the column's own back link is the way out, so the state draws no second one to the same place;
  // a state whose own button goes where the back link would leaves the button, the bigger of the two.
  const way = action ?? (back ? undefined : { href: "/bookings", label: t("detailsBackToBookings") });
  const column = back && way?.href === back.href ? { ...back, fromLg: false } : back;

  return (
    <DetailColumn back={column}>
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
        {retry || way ? (
          <div className="flex flex-wrap justify-center gap-2">
            {retry ? (
              <Button
                className={cn(authPill(!way), pill)}
                onClick={retry}
                type="button"
                variant={way ? "outline" : "default"}
              >
                {retryLabel ?? t("detailsRetry")}
              </Button>
            ) : null}
            {way ? (
              <Button className={cn(authPill(true), pill)} nativeButton={false} render={<Link href={way.href} />}>
                {way.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </DetailColumn>
  );
}
