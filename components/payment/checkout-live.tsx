"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { getBooking } from "@/lib/api/resources";
import type { ApiBooking, ApiCouponPreview } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { ApiErrorCard } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

import {
  BookingWhen,
  CardFields,
  MethodList,
  OrderHead,
  PriceBreakdown,
  TermsNote,
  useCardPayment,
  useOrder,
  type CardPayment,
  type PayMethod,
} from "./checkout-parts";
import { GooglePayButton, useGooglePay, type GooglePayment } from "./checkout-googlepay";
import { PromptPayDialog, usePromptPay, type PromptPayment } from "./checkout-promptpay";
import { CheckoutSteps } from "./checkout-steps";

/**
 * `/checkout/card?bookingId=<uuid>` — confirm and pay for a held slot.
 *
 * Laid out the way a booking ends on the best of the booking sites, and at
 * their widths, not ours:
 *
 * - below 744, the phone's three steps (`checkout-steps.tsx`);
 * - from 744, one page: the title with a round way back beside it, the order
 *   as a card, the ways to pay as one card of rows with the card's fields
 *   under its row, and the button that pays. One column 440 across, the order
 *   on top, to 950; from there two, the ways to pay at the left and the order
 *   at the right — 386 + 64 + 332, then 440 + 80 + 368 from 1128, then
 *   524 + 80 + 372 from 1440. At the sizes the screen draws them (this page is
 *   not zoomed by `app-scale`).
 *
 * Which of the two is drawn is decided in the browser (`useWideCheckout`), not
 * by CSS alone: the two ask for the card differently, and drawing both would
 * put every field in the page twice.
 *
 * ## How it pays
 *
 * `POST /bookings` has already held the time (`PENDING_PAYMENT`). Paying is
 * four steps, all on the press of the button (`useCardPayment`):
 *
 * 1. the card becomes a token in Omise's own script (`lib/payment/omise.ts`),
 *    against the API's public key, so its number never reaches our servers;
 * 2. `POST /payment/invoice/for-booking/:id` makes (or finds) the invoice for
 *    this booking, priced as booked, less the coupon if one is added;
 * 3. `POST /payment/checkout` charges the invoice to the token and answers the
 *    card's 3-D Secure page;
 * 4. the browser goes there. The bank returns it to the API, which confirms the
 *    booking and sends it on to `/checkout/success`, `/failed` or `/unconfirmed`
 *    with the invoice's id.
 *
 * When the API has no public key, card payments are not set up and the button
 * stays off. PromptPay pays by a QR code (`checkout-promptpay.tsx`); Google
 * Pay is a card chosen in Google's sheet, charged as above
 * (`checkout-googlepay.tsx`).
 */

/** The width the page stops being the phone's steps: 744 (46.5rem). */
const WIDE = "(min-width: 46.5rem)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the screen is 744 or wider; the server draws the wide page, which hydrates and then answers. */
function useWideCheckout(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

/** The order on the right: what is bought, when, and for how much, less a coupon if one is added. */
function OrderCard({
  booking,
  coupon,
  onCoupon,
  className,
}: {
  readonly booking: ApiBooking;
  readonly coupon: ApiCouponPreview | null;
  readonly onCoupon: (coupon: ApiCouponPreview | null) => void;
  readonly className?: string;
}) {
  const t = useTranslations("payment");
  const order = useOrder(booking);
  return (
    <aside aria-label={t("orderSummary")} className={cn("w-full rounded-[24px] border border-border p-6", className)}>
      <OrderHead order={order} />
      <BookingWhen booking={booking} />
      <PriceBreakdown bookingId={booking.id} coupon={coupon} onCoupon={onCoupon} order={order} />
    </aside>
  );
}

/** What the chosen way to pay is doing and what went wrong with it, whichever it is. */
function methodState(method: PayMethod, payment: CardPayment, promptPay: PromptPayment, googlePay: GooglePayment) {
  if (method === "card") return { working: payment.paying, problem: payment.problem };
  if (method === "googlepay") return { working: googlePay.paying, problem: googlePay.problem };
  return { working: promptPay.starting, problem: promptPay.problem };
}

/**
 * The ways to pay, the card's fields under its row while the card is chosen,
 * and the button that pays: the card through 3-D Secure, PromptPay by the QR
 * code it opens, or Google's own button for Google Pay.
 */
function PayForm({
  method,
  onMethodChange,
  payment,
  promptPay,
  googlePay,
  className,
}: {
  readonly method: PayMethod;
  readonly onMethodChange: (method: PayMethod) => void;
  readonly payment: CardPayment;
  readonly promptPay: PromptPayment;
  readonly googlePay: GooglePayment;
  readonly className?: string;
}) {
  const t = useTranslations("payment");
  const byCard = method === "card";
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (byCard) payment.pay();
    else if (method === "promptpay") promptPay.start();
  };
  const { working, problem } = methodState(method, payment, promptPay, googlePay);

  return (
    <form className={cn("flex w-full flex-col", className)} noValidate onSubmit={onSubmit}>
      <MethodList
        className="w-full rounded-[24px] border border-border pb-1"
        fields={<CardFields className="pb-4" payment={payment} />}
        googlePay={googlePay.available}
        heading={t("methodTitle")}
        method={method}
        onMethodChange={onMethodChange}
      />

      <TermsNote className="mt-3.5" />

      {method === "googlepay" ? (
        <GooglePayButton className="mt-3" googlePay={googlePay} />
      ) : (
        <PrimaryButton
          block
          className="mt-3 h-12 rounded-[12px] text-base font-medium lg:h-12"
          disabled={!payment.configured || working || (byCard && !payment.ready)}
          type="submit"
        >
          {working ? t("payWorking") : t("confirmTitle")}
        </PrimaryButton>
      )}
      {problem ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  );
}

/** The checkout's white ground and hairlines, scoped in `app/globals.css`. */
const SURFACE = "checkout-surface";

/**
 * The page's column from 744: 440 across, then 782 from 950, 888 from 1128
 * and 976 from 1440. Its breakpoints are in rem, all four, so Tailwind sorts
 * them by width and each wins over the one before it.
 */
const COLUMN =
  "w-full px-6 pt-8 pb-20 min-[46.5rem]:mx-auto min-[46.5rem]:w-110 min-[46.5rem]:px-0 min-[59.375rem]:w-[782px] min-[70.5rem]:w-[888px] min-[90rem]:w-[976px]";

/** And its two columns: stacked to 950, the order first; then side by side at the widths above. */
const COLUMNS =
  "mt-6 flex flex-col gap-8 min-[59.375rem]:grid min-[59.375rem]:grid-cols-[386px_332px] min-[59.375rem]:items-start min-[59.375rem]:gap-x-16 min-[70.5rem]:grid-cols-[440px_368px] min-[70.5rem]:gap-x-20 min-[90rem]:grid-cols-[524px_372px]";

/**
 * The checkout's floor: one line, the privacy and terms pages and nothing
 * else, so a page about to take a payment has no column of links leading
 * away from it. Pushed to the bottom of a short page (`mt-auto`). Centred to
 * 950; from there at the left, 32 in, and 48 in from 1440.
 */
function CheckoutFooter() {
  const t = useTranslations("payment");
  const link = "underline-offset-2 hover:underline";
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-border bg-footer-ground">
      <div className="mx-auto w-full max-w-[1920px] px-6 py-5 text-center text-sm text-foreground min-[59.375rem]:px-8 min-[59.375rem]:text-left min-[90rem]:px-12">
        <Link className={link} href="/privacy-policy">
          {t("footerPrivacy")}
        </Link>
        <span aria-hidden className="mx-2">
          ·
        </span>
        <Link className={link} href="/terms">
          {t("footerTerms")}
        </Link>
      </div>
    </footer>
  );
}

/** The page once the booking is in: the phone's steps, or the one page from 744. */
function CheckoutReady({ booking }: { readonly booking: ApiBooking }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const wide = useWideCheckout();
  const [coupon, setCoupon] = useState<ApiCouponPreview | null>(null);
  // PromptPay first, as it is the way most here pay.
  const [method, setMethod] = useState<PayMethod>("promptpay");
  const payment = useCardPayment(booking.id, coupon?.code);
  const promptPay = usePromptPay(booking.id, coupon?.code);
  // Google's sheet shows the total, so it is known before the press: the
  // coupon's, or the price as booked.
  const order = useOrder(booking);
  const googlePay = useGooglePay(booking.id, coupon?.code, coupon ? coupon.amountSatang : order.priceSatang);

  if (!wide) {
    return (
      <>
        <CheckoutSteps
          booking={booking}
          coupon={coupon}
          googlePay={googlePay}
          method={method}
          onCoupon={setCoupon}
          onMethodChange={setMethod}
          payment={payment}
          promptPay={promptPay}
        />
        <PromptPayDialog promptPay={promptPay} />
      </>
    );
  }

  return (
    <>
      <PromptPayDialog promptPay={promptPay} />
      <TopBar />
      <div className={cn(COLUMN, "relative")}>
        {/* The round way back hangs in the margin, centred on the title's
            line and 24 from it, so the title lines up with both columns under
            it and the cards start 24 under the title, not under the circle.
            It rides a rail the column's height and sticks to the top of the
            screen exactly where it starts, under the bar (80 high to 768, 88
            from there, and 88 zoomed by `doc-scale` from 1024) plus the 28 to
            the title's line, so scrolling never moves it. */}
        <div className="pointer-events-none absolute top-7 bottom-20 -left-17">
          <Link
            aria-label={c("back")}
            className="pointer-events-auto sticky top-27 flex size-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent md:top-29 lg:top-[calc(88px*clamp(0.75,tan(atan2(100vw,1710px)),1)+28px)]"
            href="/search"
          >
            {/* The arrow 13 across in a 2px line: lucide's spans 14 of its
                24, so a 22 box, the line held at 2 whatever the box. */}
            <ArrowLeft absoluteStrokeWidth aria-hidden className="size-5.5" strokeWidth={2} />
          </Link>
        </div>
        <h1 className="text-3xl leading-9 font-semibold tracking-tight text-foreground">{t("confirmTitle")}</h1>

        <div className={COLUMNS}>
          <OrderCard booking={booking} className="min-[59.375rem]:col-start-2 min-[59.375rem]:row-start-1" coupon={coupon} onCoupon={setCoupon} />
          <PayForm
            className="min-[59.375rem]:col-start-1 min-[59.375rem]:row-start-1"
            googlePay={googlePay}
            method={method}
            onMethodChange={setMethod}
            payment={payment}
            promptPay={promptPay}
          />
        </div>
      </div>
      <CheckoutFooter />
    </>
  );
}

export function LiveCheckoutScreen({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const s = useTranslations("search");
  const wide = useWideCheckout();

  const fetcher = useCallback(
    (signal: AbortSignal) => getBooking(bookingId, signal),
    [bookingId],
  );
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetcher);

  // The checkout's own white and hairlines (`.checkout-surface`): on the
  // frame for what it draws, on <body> while it is mounted for the popups,
  // which portal out of it.
  useEffect(() => {
    document.body.classList.add(SURFACE);
    return () => document.body.classList.remove(SURFACE);
  }, []);

  // While the booking loads, or if it cannot: the site's bar from 744, the
  // phone's bar with its way back below it.
  const head = wide ? <TopBar /> : <ScreenTopBar href="/search" label={c("back")} />;

  let body;
  if (booking.loading) {
    body = (
      <>
        {head}
        <div className={cn(COLUMN, "flex flex-col gap-6")}>
          <div className="h-9 w-2/5 rounded-md bg-muted" />
          <div className="flex flex-col gap-8 min-[59.375rem]:grid min-[59.375rem]:grid-cols-[386px_332px] min-[59.375rem]:gap-x-16 min-[70.5rem]:grid-cols-[440px_368px] min-[70.5rem]:gap-x-20 min-[90rem]:grid-cols-[524px_372px]">
            <div className="h-60 rounded-[24px] bg-muted" />
            <div className="h-96 rounded-[24px] bg-muted" />
          </div>
        </div>
      </>
    );
  } else if (booking.error || !booking.data) {
    body = (
      <>
        {head}
        <div className={COLUMN}>
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
      </>
    );
  } else {
    body = <CheckoutReady booking={booking.data} />;
  }

  return (
    <MobileScreen className={cn(SURFACE, "pb-0")} wide="tablet">
      <ScreenBody>{body}</ScreenBody>
    </MobileScreen>
  );
}
