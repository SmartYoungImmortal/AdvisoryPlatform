"use client";

import { CircleCheckBig, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
import { OutcomeDialog, useOutcomeActions, usePaymentOutcome } from "@/components/payment/checkout-outcome";
import { checkoutBookingOf, checkoutOutcomeHref, type CheckoutOutcome } from "@/components/payment/checkout-return";
import {
  PILL_LG,
  ReceiptCard,
  SHEET_W,
} from "@/components/payment/invoice-screens";
import { invoiceHref, invoiceReceipt } from "@/components/payment/transactions-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { getMyInvoice } from "@/lib/api/resources";
import type { ApiAdviseeInvoice } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * A paid booking, read from its invoice: the redesign of `/checkout/success`.
 *
 * What the reader came for first, then the money: the booking is confirmed,
 * with whom and when, over the very receipt sheet the transactions page opens
 * (`ReceiptCard`), so the two never disagree. Under it the escrow promise, one
 * black capsule to the booking and a quiet way home, and the support line
 * quoting the receipt's number.
 *
 * Inside the account frame (`AppFrame`): the reader is signed in and has just
 * made a booking, so the rail is the way on from here. The frame's zoom
 * (`app-scale`) sizes the page from the 1710 space, as it does the receipt on
 * `/transactions`.
 */
function PaidBooking({ invoice }: { readonly invoice: ApiAdviseeInvoice }) {
  const t = useTranslations("payment");
  const tx = useTranslations("transactions");
  const l = useTranslations("landing");
  const format = useFormatter();
  const receipt = invoiceReceipt(invoice);
  const start = invoice.session ? new Date(invoice.session.startTime) : null;
  const end = invoice.session ? new Date(invoice.session.endTime) : null;
  const clock = (at: Date) =>
    format.dateTime(at, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  const subject = encodeURIComponent(
    tx("supportSubject", { number: receipt.invoiceNo }),
  );

  return (
    <PaidFrame>
      {/* The booking, said first: a calm green mark, the headline, and who
          and when, the two facts the reader will act on. */}
      <header className="flex flex-col items-center text-center lg:self-end lg:items-start lg:text-left">
        <span className="flex size-14 items-center justify-center rounded-full bg-success/10 lg:size-20">
          <CircleCheckBig
            aria-hidden
            className="size-7 text-success lg:size-10"
            strokeWidth={2}
          />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-hero-ink lg:mt-6 lg:text-frame-title">
          {t("bookedTitle")}
        </h1>
        <p className="mt-2 text-sm text-foreground lg:mt-3 lg:text-frame-body">
          {t("bookedWith", { advisor: invoice.advisor.displayName })}
        </p>
        {start && end ? (
          <p className="mt-0.5 text-sm text-muted-foreground lg:text-frame-body">
            <Figures>
              {t("bookedWhen", {
                date: format.dateTime(start, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
                time: `${clock(start)}–${clock(end)}`,
              })}
            </Figures>
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          "w-full lg:col-start-2 lg:row-span-2 lg:row-start-1",
          SHEET_W,
        )}
      >
        <ReceiptCard receipt={receipt} />
      </div>

      <div className="flex flex-col gap-2.5 lg:max-w-110 lg:self-start lg:gap-3">
        <p className="mb-2 flex items-start gap-2 text-xs text-muted-foreground lg:mb-4 lg:gap-3 lg:text-frame-meta">
          <ShieldCheck
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-success lg:size-5"
          />
          {t("escrowNote")}
        </p>
        <Button
          className={cn(authPill(true), "md:h-11 md:text-sm", PILL_LG)}
          nativeButton={false}
          render={<Link href={receipt.bookingHref ?? "/bookings"} />}
        >
          {t("viewMyBookings")}
        </Button>
        <Button
          className={cn(authPill(false), "md:h-11 md:text-sm", PILL_LG)}
          nativeButton={false}
          render={<Link href="/" />}
          variant="outline"
        >
          {t("backHome")}
        </Button>
        <p className="mt-1 text-center text-xs text-muted-foreground lg:mt-2 lg:text-left lg:text-frame-label">
          {tx("helpPrompt")}{" "}
          <a
            className={cn(AUTH_LINK, "py-1.5")}
            href={`mailto:${l("footerEmailAddress")}?subject=${subject}`}
          >
            {tx("contactSupport")}
          </a>
        </p>
      </div>
    </PaidFrame>
  );
}

/**
 * The paid booking's page, whatever it holds: the account frame and its column.
 *
 * A phone reads it top to bottom: the booking, the receipt, then the way on.
 * From `lg` the panel is wide enough for two columns, so the whole page fits
 * one 985-high screen: the booking and the way on on the left, the receipt
 * sheet at its own width on the right.
 */
function PaidFrame({
  children,
  busy = false,
}: {
  readonly children: ReactNode;
  readonly busy?: boolean;
}) {
  return (
    <MobileScreen className="bg-card" wide="md">
      <AppFrame active="bookings">
        <ScreenBody className="bg-card">
          <AccountShell>
            <div
              aria-busy={busy || undefined}
              className="flex w-full flex-col gap-6 px-5 pt-10 pb-10 md:mx-auto md:max-w-xl md:px-10 lg:grid lg:max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-[auto_auto] lg:content-center lg:my-auto lg:gap-x-20 lg:gap-y-10 lg:px-0 lg:py-10"
            >
              {children}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/** A placeholder's surface while the invoice loads, still for a reader who asks for less motion. */
const BONE = "animate-pulse rounded-md bg-muted motion-reduce:animate-none";

/**
 * The paid page's own shape while the invoice is asked for: the mark, the
 * headline and its two lines, the receipt sheet, the two capsules. Never the
 * old outcome screen, which is what used to flash up first.
 */
function PaidSkeleton() {
  const t = useTranslations("payment");

  return (
    <PaidFrame busy>
      <span className="sr-only">{t("processingTitle")}</span>
      <div
        aria-hidden
        className="flex flex-col items-center lg:self-end lg:items-start"
      >
        <span className={cn(BONE, "size-14 rounded-full lg:size-20")} />
        <span className={cn(BONE, "mt-4 h-7 w-44 lg:mt-6 lg:h-11 lg:w-72")} />
        <span className={cn(BONE, "mt-3 h-4 w-36 lg:h-5 lg:w-56")} />
        <span className={cn(BONE, "mt-2 h-4 w-56 lg:h-5 lg:w-80")} />
      </div>
      <div
        aria-hidden
        className={cn(
          "h-96 w-full rounded-card border border-hero-card-border bg-card shadow-hero-card lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[620px]",
          SHEET_W,
        )}
      />
      <div
        aria-hidden
        className="flex flex-col gap-2.5 lg:max-w-110 lg:self-start lg:gap-3"
      >
        <span className={cn(BONE, "mb-2 h-4 w-full lg:mb-4 lg:h-5")} />
        <span className={cn(BONE, "h-12 w-full rounded-full lg:h-14")} />
        <span className={cn(BONE, "h-12 w-full rounded-full lg:h-14")} />
      </div>
    </PaidFrame>
  );
}

/** True once the page is running in the browser; false in the prerendered HTML and while it hydrates. */
const noSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Where the browser goes instead of the success page: no invoice named
 * (`/checkout/success` on its own, which used to show a sample booking that
 * never happened) goes to the reader's bookings; an invoice that did not end
 * paid goes to its own outcome, or its receipt.
 */
function elsewhere(invoiceId: string | undefined, invoice: ApiAdviseeInvoice | null): string | null {
  if (!invoiceId) return "/bookings";
  if (!invoice || invoice.status === "paid") return null;
  const query = `?invoiceId=${encodeURIComponent(invoiceId)}`;
  if (invoice.status === "failed") return `/checkout/failed${query}`;
  if (invoice.status === "pending") return `/checkout/unconfirmed${query}`;
  return invoiceHref(invoiceId);
}

/**
 * `/checkout/success?invoiceId=…`: the paid booking once its invoice has
 * answered, its skeleton until then.
 *
 * The prerendered HTML cannot know the query, so it holds the skeleton too.
 * The old sample outcome screen is never drawn here: without an invoice, or
 * with one that is not paid, the browser is sent on (`elsewhere`), and an
 * invoice that cannot be read says so in the page's own frame.
 */
export function PaymentSuccessScreen() {
  const t = useTranslations("transactions");
  const router = useRouter();
  const hydrated = useHydrated();
  const invoiceId = asUuid(useQueryValue("invoiceId"));
  const invoice = useResource<ApiAdviseeInvoice | null>(
    invoiceId ? `payment/invoices/${invoiceId}` : "payment/invoices/none",
    useCallback(
      (signal: AbortSignal) =>
        invoiceId ? getMyInvoice(invoiceId, signal) : Promise.resolve(null),
      [invoiceId],
    ),
  );
  const target = hydrated ? elsewhere(invoiceId, invoice.data ?? null) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (hydrated && invoice.data?.status === "paid")
    return <PaidBooking invoice={invoice.data} />;
  if (hydrated && invoiceId && invoice.error)
    return (
      <PaidFrame>
        <ApiErrorCard
          className="lg:col-span-2"
          error={invoice.error}
          onRetry={invoice.reload}
          title={t("receiptLoadFailed")}
        />
      </PaidFrame>
    );
  return <PaidSkeleton />;
}

/**
 * `/checkout/failed` and `/checkout/unconfirmed`, where the API sends the
 * bank's answer with `?invoiceId=`.
 *
 * A payment that left from this tab's checkout goes back to it, with the
 * outcome as a popup over it (`checkout-return.ts`). One that returns anywhere
 * else — another tab, a bank's app opening the browser afresh — has no
 * checkout to go back to, so the same popup stands over an empty page under
 * the site's bar, and paying again starts from the reader's bookings. Without an
 * invoice it is the design state, with a sample's figures.
 */
export function PaymentOutcomeScreen({ state }: { readonly state: CheckoutOutcome }) {
  const c = useTranslations("common");
  const router = useRouter();
  const hydrated = useHydrated();
  const invoiceId = asUuid(useQueryValue("invoiceId"));
  const bookingId = hydrated && invoiceId ? asUuid(checkoutBookingOf(invoiceId)) : undefined;
  const copy = usePaymentOutcome(state, invoiceId, hydrated && !invoiceId);
  const actions = useOutcomeActions(state, invoiceId, "/bookings");

  useEffect(() => {
    if (bookingId && invoiceId) router.replace(checkoutOutcomeHref(bookingId, state, invoiceId));
  }, [bookingId, invoiceId, router, state]);

  return (
    <MobileScreen className="bg-card" wide>
      <ScreenTopBar className="lg:hidden" href="/bookings" label={c("back")} />
      <ScreenBody className="bg-card">
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>
      </ScreenBody>
      <OutcomeDialog {...copy} {...actions} dismissible={false} open={hydrated && !bookingId} />
    </MobileScreen>
  );
}
