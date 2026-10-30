"use client";

import { ArrowLeft, CreditCard, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { ApiBooking, ApiCouponPreview } from "@/lib/api/types";
import { PrimaryButton } from "@/components/mobile/buttons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  BookingWhen,
  CardBrands,
  CardFields,
  MethodList,
  OrderHead,
  OrderSection,
  POPUP_OVERLAY,
  PriceBreakdown,
  TermsNote,
  useOrder,
  useTotal,
  type CardPayment,
} from "./checkout-parts";

/**
 * The checkout on a phone, below 744: not one long page but three steps, one
 * screen each, the way the booking sites take a payment on a phone.
 *
 * 1. Review and continue: the order as a card — the service, when, and its
 *    total, with the price line by line and the coupon one press away.
 * 2. Add a payment method: the ways to pay as a card of 72-high rows. Next
 *    with the card chosen raises a sheet for its fields, from 12 under the top
 *    of the screen; its own Next checks them and moves on.
 * 3. Confirm and pay: the order again, the card that will pay, the terms, and
 *    the button that pays.
 *
 * Every step opens with the way out at the top right (and the way back at the
 * left after the first), its title at 26 under them, and ends on a bar held
 * to the bottom of the screen: the steps as three 4-high segments, those done
 * in ink, and under them the step's button, 40 high, 24 in from each side.
 */

const STEP_COUNT = 3;

/** A bar of ink: the steps' Next and the sheet's. */
const INK_BUTTON = "h-10 rounded-[12px] bg-foreground text-sm font-medium text-background hover:bg-foreground/85";

/** The order as the phone's steps show it: a card 16 in, 12 round, its total at the end with the price behind a button. */
function OrderSummary({
  booking,
  coupon,
  onCoupon,
  extra,
}: {
  readonly booking: ApiBooking;
  readonly coupon: ApiCouponPreview | null;
  readonly onCoupon: (coupon: ApiCouponPreview | null) => void;
  readonly extra?: ReactNode;
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const order = useOrder(booking);
  const total = useTotal(order, coupon);
  const [priceOpen, setPriceOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-border p-4">
      <OrderHead compact order={order} />
      <BookingWhen booking={booking} />
      <OrderSection
        aside={
          <Button
            className="h-8 rounded-lg bg-muted px-4 text-xs font-medium text-foreground hover:bg-accent"
            onClick={() => setPriceOpen(true)}
            type="button"
            variant="ghost"
          >
            {t("details")}
          </Button>
        }
        label={t("totalPrice")}
      >
        <p className="font-latin tabular-nums">{total}</p>
      </OrderSection>
      {extra}

      {/* The price line by line and the coupon, in a popup like the
          desktop's coupon box: a title over a hairline, the way out at its
          right. */}
      <Dialog onOpenChange={setPriceOpen} open={priceOpen}>
        <DialogContent className="gap-0 rounded-[24px] p-0 sm:max-w-[569px]" overlayClassName={POPUP_OVERLAY} showCloseButton={false}>
          <div className="relative flex h-16 items-center justify-center border-b border-border">
            <DialogTitle className="text-base leading-5 font-semibold text-foreground">{t("priceDetails")}</DialogTitle>
            <DialogClose
              aria-label={c("close")}
              className="absolute top-1/2 right-2.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <X aria-hidden className="size-4" strokeWidth={2.5} />
            </DialogClose>
          </div>
          <div className="px-6 pt-6 pb-6">
            <PriceBreakdown bookingId={booking.id} coupon={coupon} flush onCoupon={onCoupon} order={order} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The card's fields in a sheet raised from the bottom of the screen, 12 under
 * its top, its corners 24: its title in a 48-high head with the way out at
 * the right, the fields 24 under it, and at its foot Cancel at the left and
 * Next in ink at the right.
 */
function CardSheet({
  open,
  onOpenChange,
  payment,
  onDone,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly payment: CardPayment;
  readonly onDone: () => void;
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-3 bottom-0 flex max-w-md translate-y-0 flex-col gap-0 rounded-none rounded-t-[24px] p-0 ring-0 duration-200 sm:max-w-md data-closed:slide-out-to-bottom-8 data-open:slide-in-from-bottom-8"
        overlayClassName={POPUP_OVERLAY}
        showCloseButton={false}
      >
        <div className="relative flex h-12 shrink-0 items-center justify-center">
          <DialogTitle className="text-base leading-5 font-semibold text-foreground">{t("addCardTitle")}</DialogTitle>
          <DialogClose
            aria-label={c("close")}
            className="absolute top-1/2 right-2.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-6">
          <CardFields payment={payment} />
          {payment.problem ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {payment.problem}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-3">
          <DialogClose render={<Button className="h-10 px-3 text-sm font-semibold text-foreground underline" type="button" variant="link" />}>
            {t("couponCancel")}
          </DialogClose>
          <Button
            className={cn(INK_BUTTON, "mr-3 px-8")}
            onClick={() => {
              if (payment.ready) {
                payment.setProblem(null);
                onDone();
              } else {
                payment.setProblem(t("cardIncomplete"));
              }
            }}
            type="button"
          >
            {t("next")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CheckoutSteps({
  booking,
  coupon,
  onCoupon,
  payment,
}: {
  readonly booking: ApiBooking;
  readonly coupon: ApiCouponPreview | null;
  readonly onCoupon: (coupon: ApiCouponPreview | null) => void;
  readonly payment: CardPayment;
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const [step, setStep] = useState(0);
  const [cardOpen, setCardOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titles = [t("reviewTitle"), t("addMethodTitle"), t("confirmTitle")];
  const last4 = payment.card.number.replace(/\D/g, "").slice(-4);

  // Each step starts at its top, as a new screen would.
  useEffect(() => {
    rootRef.current?.closest('[data-slot="screen-body"]')?.scrollTo({ top: 0 });
  }, [step]);

  const onNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1) setCardOpen(true);
  };

  return (
    <div className="flex w-full flex-1 flex-col" ref={rootRef}>
      <div className="w-full flex-1 px-6 pb-8">
        {/* The way back and the way out, each a 44 target round its 16 glyph,
            the glyphs 24 in from the edges and 20 down. */}
        <div className="relative -mx-6 h-14">
          {step > 0 ? (
            <Button
              aria-label={c("back")}
              className="absolute top-1.5 left-2.5 size-11 rounded-full"
              onClick={() => setStep(step - 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowLeft absoluteStrokeWidth aria-hidden className="size-4" strokeWidth={2} />
            </Button>
          ) : null}
          <Link
            aria-label={t("exit")}
            className="absolute top-1.5 right-2.5 flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            href="/search"
          >
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </Link>
        </div>
        <h1 className="text-2xl leading-7.5 font-semibold tracking-tight text-foreground">{titles[step]}</h1>

        <div className="mt-6">
          {step === 0 ? <OrderSummary booking={booking} coupon={coupon} onCoupon={onCoupon} /> : null}
          {step === 1 ? <MethodList className="rounded-[12px] border border-border" tall /> : null}
          {step === 2 ? (
            <>
              <OrderSummary
                booking={booking}
                coupon={coupon}
                extra={
                  <OrderSection
                    aside={
                      <Button
                        className="h-8 rounded-lg bg-muted px-4 text-xs font-medium text-foreground hover:bg-accent"
                        onClick={() => setCardOpen(true)}
                        type="button"
                        variant="ghost"
                      >
                        {t("change")}
                      </Button>
                    }
                    label={t("methodTitle")}
                  >
                    <p className="flex items-center gap-2">
                      <CreditCard aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
                      <span>{t("cardEnding", { last4 })}</span>
                    </p>
                    <CardBrands className="pt-0" />
                  </OrderSection>
                }
                onCoupon={onCoupon}
              />
              <TermsNote className="mt-4" />
              {payment.problem ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {payment.problem}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* The bar at the foot of every step, held to the bottom of the screen. */}
      <div className="sticky bottom-0 z-10 mt-auto w-full bg-card">
        <div
          aria-label={t("stepOf", { step: step + 1, total: STEP_COUNT })}
          aria-valuemax={STEP_COUNT}
          aria-valuemin={1}
          aria-valuenow={step + 1}
          className="flex gap-1"
          role="progressbar"
        >
          {titles.map((title, i) => (
            <span className={cn("h-1 flex-1 transition-colors duration-300", i <= step ? "bg-foreground" : "bg-border")} key={title} />
          ))}
        </div>
        <div className="px-6 py-3">
          {step < 2 ? (
            <Button className={cn(INK_BUTTON, "w-full")} onClick={onNext} type="button">
              {t("next")}
            </Button>
          ) : (
            <PrimaryButton
              block
              className="h-10 rounded-[12px] text-sm font-medium lg:h-10"
              disabled={!payment.configured || payment.paying || !payment.ready}
              onClick={payment.pay}
              type="button"
            >
              {payment.paying ? t("payWorking") : t("confirmTitle")}
            </PrimaryButton>
          )}
        </div>
      </div>

      <CardSheet
        onDone={() => {
          setCardOpen(false);
          setStep(2);
        }}
        onOpenChange={setCardOpen}
        open={cardOpen}
        payment={payment}
      />
    </div>
  );
}
