"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Lock, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  cancelBooking,
  getAdvisor,
  getBooking,
  getService,
} from "@/lib/api/resources";
import type {
  ApiBooking,
  ApiPublicAdvisor,
  ApiPublicService,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { baht, isCancellable } from "@/components/bookings/booking-flow";
import { NeutralButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BODY_GRID, PAGE_HEAD_BAND } from "@/components/payment/invoice-screens";
import { DetailRow, FootNote } from "@/components/screening/parts";
import { ApiErrorCard } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * `/checkout/card?bookingId=<uuid>` — the slot that is held, and what it costs.
 *
 * ## Why there is no card form here
 *
 * The slot chips on `/service/…` call `POST /bookings`, which answers
 * `PENDING_PAYMENT`: the range is blocked and nothing is charged. The next step
 * in the design is `POST /payment/checkout`, and this app cannot call it — see
 * `startCheckout` in `lib/api/resources.ts` for the three reasons, of which the
 * shortest is that it answers a 303 redirect to a 3-D Secure page and `fetch`
 * would chase that into a CORS wall.
 *
 * So the fixture screen's card fields do not appear in this mode. A form that
 * cannot charge, asking for a card number, is not a lesser version of checkout —
 * it is a place to type a card number into nothing. The screen states what is
 * true instead: the booking exists, it is unsettled, here is the amount, and here
 * are the two things that do work — look at it, or give the time back.
 *
 * Restoring the pay button needs one copy key (`payment.payAmount`, taking the
 * real total, because `payment.pay` has ฿1,260 baked into the string) and the API
 * change. Nothing else here would move.
 *
 * ## Where the amount comes from
 *
 * `priceSatang` on the joined service, which is the price **now** rather than the
 * price this booking was taken at — the appointment records no amount and
 * `service_invoices` has no advisee-facing route. There is also no platform fee
 * to show: `platformFeeSatang` exists only on an invoice row, so the summary is
 * one line and its total, not the fixture's session + 5% + total.
 */

/** The advisor's name, once the booking has named them. Its own component so the
 *  request never fires with an undefined id. */
function AdvisorRow({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("payment");

  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisor(advisorId, signal),
    [advisorId],
  );
  const advisor = useResource<ApiPublicAdvisor>(
    `advisors/${advisorId}`,
    fetcher,
  );

  if (!advisor.data) return null;

  return (
    <DetailRow
      icon={UserRound}
      label={t("advisorLabel")}
      value={advisor.data.displayName}
    />
  );
}

/** The service line, once the booking has named it. */
function ServiceSummary({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("payment");
  const format = useFormatter();

  const fetcher = useCallback(
    (signal: AbortSignal) => getService(serviceId, signal),
    [serviceId],
  );
  const service = useResource<ApiPublicService>(
    `services/${serviceId}`,
    fetcher,
  );

  if (service.loading) {
    return <div className="h-24 w-full rounded-card bg-muted" />;
  }
  if (!service.data) return null;

  const total = format.number(baht(service.data.priceSatang), "baht");

  return (
    <Surface className="w-full divide-y divide-border overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3 p-3.5">
        <span className="text-base font-semibold text-foreground lg:text-lg">
          {t("orderSummary")}
        </span>
      </div>
      <div className="flex w-full shrink-0 items-center justify-between gap-3 px-3.5 py-2.5">
        <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
          <ThaiText>{service.data.name}</ThaiText>
        </span>
        <span className="font-latin shrink-0 text-sm font-normal whitespace-nowrap tabular-nums text-foreground">
          {total}
        </span>
      </div>
      {/* One line and its total. The fixture screen adds a 5% platform fee; that
          figure lives on `service_invoices.platform_fee_satang` and no route this
          app can call returns it, so it is not shown rather than assumed. */}
      <div className="flex w-full items-center justify-between gap-3 bg-muted px-3.5 py-3">
        <span className="min-w-px flex-1 text-sm font-medium text-foreground">
          {t("total")}
        </span>
        <span className="font-latin shrink-0 text-2xl font-semibold whitespace-nowrap tabular-nums text-foreground">
          {total}
        </span>
      </div>
    </Surface>
  );
}

export function LiveCheckoutScreen({
  bookingId,
}: {
  readonly bookingId: string;
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const s = useTranslations("search");
  const format = useFormatter();
  const router = useRouter();
  const [releasing, setReleasing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const fetcher = useCallback(
    (signal: AbortSignal) => getBooking(bookingId, signal),
    [bookingId],
  );
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetcher);

  const onRelease = useCallback(() => {
    setReleasing(true);
    setFailure(null);
    void cancelBooking(bookingId)
      .then(() => router.push("/bookings"))
      .catch((cause: unknown) => {
        setFailure(cause instanceof Error ? cause.message : String(cause));
        setReleasing(false);
      });
  }, [bookingId, router]);

  const head = (
    <>
      <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />
      <div className="hidden w-full lg:block">
        <TopBar backHref="/search" />
      </div>
    </>
  );

  if (booking.loading) {
    return (
      <MobileScreen wide>
        <ScreenBody>
          {head}
          <div className={cn("flex w-full flex-col gap-4 px-6 pt-4", PAGE)}>
            <div className="h-7 w-2/5 rounded-md bg-muted" />
            <div className="h-32 w-full rounded-card bg-muted" />
            <div className="h-24 w-full rounded-card bg-muted" />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  if (booking.error || !booking.data) {
    return (
      <MobileScreen wide>
        <ScreenBody>
          {head}
          <div className={cn("w-full px-6 pt-4", PAGE)}>
            <ApiErrorCard
              error={booking.error ?? new Error(t("orderSummary"))}
              extra={
                <NeutralButton className="w-auto shrink-0" href="/bookings" size="sm">
                  {t("viewBooking")}
                </NeutralButton>
              }
              onRetry={booking.reload}
              title={s("loadFailedTitle")}
            />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  const live = booking.data;
  const start = new Date(live.startTime);
  const end = new Date(live.endTime);

  return (
    <MobileScreen wide>
      <ScreenBody>
        {head}

        <div className={PAGE_HEAD_BAND}>
          <ScreenHeading
            className={cn("pt-4 lg:pt-5 lg:pb-9", PAGE)}
            title={t("orderSummary")}
          />
        </div>

        <div className={BODY_GRID}>
          {/* The 380 aside at 1440, above the phone's fields — the same grid the
              fixture checkout and the invoice both lay out on. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            <ServiceSummary serviceId={live.serviceId} />
          </div>

          {/* What is actually held, and its state. This is the column the card
              fields used to run down. */}
          <div className="flex w-full flex-col lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:*:px-0">
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4 lg:pt-0">
              <Surface className="flex w-full flex-col items-start gap-3 p-3.5">
                <AdvisorRow advisorId={live.advisorId} />
                <DetailRow
                  icon={CalendarDays}
                  label={t("bookingDateLabel")}
                  value={format.dateTime(start, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
                <DetailRow
                  icon={Clock}
                  label={t("timeLabel")}
                  value={`${format.dateTime(start, { hour: "2-digit", minute: "2-digit" })} – ${format.dateTime(end, { hour: "2-digit", minute: "2-digit" })}`}
                  valueClassName="font-latin tabular-nums"
                />
                <DetailRow
                  icon={Lock}
                  label={t("bookingLabel")}
                  value={
                    <StatusPill tone="warning">
                      {t("bookingUnconfirmed")}
                    </StatusPill>
                  }
                />
              </Surface>
            </div>

            {/* The note the fixture screen puts under its card fields. It is the
                literal truth of where this flow stops: Omise tokenises the card
                and the charge happens on confirmation, and neither has been
                built yet. */}
            <FootNote icon={Lock}>{t("secureNote")}</FootNote>

            {failure ? (
              <p className="w-full px-6 pt-2 text-sm font-normal text-destructive lg:px-0">
                {failure}
              </p>
            ) : null}
          </div>

          <ScreenSpacer className="lg:hidden" />
          <ScreenActions
            className="lg:col-start-2 lg:row-start-2 lg:px-0 lg:pt-5 lg:pb-0"
            stacked
          >
            <NeutralButton block className="lg:h-11" href="/bookings">
              {t("viewBooking")}
            </NeutralButton>
            {/* Giving the time back is the other thing that genuinely works, and
                the API allows it in exactly the two states it allows it in. */}
            {isCancellable(live.state) ? (
              <NeutralButton
                block
                className="lg:h-11"
                disabled={releasing}
                onClick={onRelease}
              >
                {c("cancel")}
              </NeutralButton>
            ) : null}
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
