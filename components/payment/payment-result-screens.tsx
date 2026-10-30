"use client";

import Image from "next/image";
import {
  CalendarDays,
  Check,
  CircleCheckBig,
  Clock,
  CreditCard,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  asUuid,
  baht,
  liveServiceHref,
  useQueryValue,
} from "@/components/bookings/booking-flow";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
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
import { walletFailed, walletSuccess } from "@/lib/assets/r2";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenActions, ScreenBody } from "@/components/mobile/screen";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { DetailRow, FootNote } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Card" on the desktop payment outcomes — 560px wide, centred in the
 * page, 48px of padding on the card surface behind a hairline and a 360px
 * action column inside it.
 *
 * Below `lg` those same blocks *are* the phone frame, edge to edge and pinned
 * to its bottom edge, so this wrapper is `display: contents` there: the phone
 * keeps the flat stack it already had and the box only exists from `lg` up.
 * `lg:*:px-0` lifts the phone's 24px gutter off every block inside, which the
 * card's own padding has taken over.
 */
const RESULT_CARD =
  "contents lg:my-24 lg:flex lg:w-140 lg:flex-none lg:flex-col lg:items-center lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-12 lg:shadow-panel lg:*:px-0";

type Result = "success" | "failed" | "unconfirmed" | "slot-taken";

type ResultRow = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly tone?: string;
  /** A Latin run — a masked card, an amount, a charge id — not a Thai date. */
  readonly latin?: boolean;
};

/** Copy, detail rows and actions per outcome — keeps the screen itself flat. */
function useResultCopy(state: Result) {
  const t = useTranslations("payment");

  const table: Record<
    Result,
    {
      readonly title: string;
      readonly body: string;
      /** The outcome in one word, in the colour that outcome is. */
      readonly pillTone: StatusTone;
      readonly pillLabel: string;
      readonly rows: readonly ResultRow[];
      readonly primary: { readonly label: string; readonly href: string };
      readonly secondary: { readonly label: string; readonly href: string };
    }
  > = {
    success: {
      title: t("successTitle"),
      body: t("successBody"),
      pillTone: "success",
      pillLabel: t("filterPaid"),
      rows: [
        { icon: UserRound, label: t("advisorLabel"), value: t("advisor"), latin: true },
        { icon: CalendarDays, label: t("dateLabel"), value: t("dateValue") },
        { icon: Clock, label: t("timeLabel"), value: t("timeValue"), latin: true },
      ],
      primary: { label: t("viewBooking"), href: "/profile" },
      secondary: { label: t("backHome"), href: "/profile" },
    },
    failed: {
      title: t("failedTitle"),
      body: t("failedBody"),
      pillTone: "danger",
      pillLabel: t("filterFailed"),
      rows: [
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue"), latin: true },
        { icon: CreditCard, label: t("amountLabel"), value: t("amountValue"), latin: true },
        {
          icon: TriangleAlert,
          label: t("reasonLabel"),
          value: t("reasonValue"),
          tone: "text-destructive",
        },
      ],
      primary: { label: t("tryAgain"), href: "/checkout/card" },
      secondary: { label: t("useOther"), href: "/checkout/card" },
    },
    unconfirmed: {
      title: t("unconfirmedTitle"),
      body: t("unconfirmedBody"),
      // Waiting on a bank is not a failure and not a success; it is the one state
      // on these four screens where the reader's next move is to do nothing.
      pillTone: "warning",
      pillLabel: t("statusValue"),
      rows: [
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue"), latin: true },
        {
          icon: Clock,
          label: t("statusLabel"),
          value: t("statusValue"),
          tone: "text-warning",
        },
        { icon: ShieldCheck, label: t("refLabel"), value: t("refValue"), latin: true },
      ],
      primary: { label: t("viewHistory"), href: "/transactions" },
      secondary: { label: t("contactSupport"), href: "/transactions" },
    },
    "slot-taken": {
      title: t("slotTakenTitle"),
      body: t("slotTakenBody"),
      pillTone: "warning",
      pillLabel: t("bookingUnconfirmed"),
      rows: [
        { icon: CalendarDays, label: t("slotLabel"), value: t("slotValue") },
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue"), latin: true },
        { icon: CreditCard, label: t("chargedLabel"), value: t("chargedValue"), latin: true },
      ],
      primary: { label: t("pickAnotherTime"), href: "/matching/results" },
      secondary: { label: t("backToAdvisor"), href: "/matching/results" },
    },
  };

  return table[state];
}

type ResultCopy = ReturnType<typeof useResultCopy>;

/**
 * The outcome of a real charge. The API's 3-D Secure callback sends the reader
 * to `/checkout/success`, `/failed` or `/unconfirmed` with `?invoiceId=`, and
 * the receipt it names (`GET /payment/invoices/:id`) replaces the fixture's
 * figures: the amount, the card, the advisor and the session. Until it has
 * answered there are no rows and no sentence with a number in it, rather than
 * the fixture's numbers for a moment.
 */
function useLiveResult(state: Result, fixture: ResultCopy): { copy: ResultCopy; amount: string | null } | null {
  const t = useTranslations("payment");
  const format = useFormatter();
  const invoiceId = asUuid(useQueryValue("invoiceId"));
  const receipt = useResource<ApiAdviseeInvoice | null>(
    invoiceId ? `payment/invoices/${invoiceId}` : "payment/invoices/none",
    useCallback(
      (signal: AbortSignal) => (invoiceId ? getMyInvoice(invoiceId, signal) : Promise.resolve(null)),
      [invoiceId],
    ),
  );

  if (!invoiceId || state === "slot-taken") return null;
  const paid = receipt.data;
  if (!paid) return { copy: { ...fixture, body: "", rows: [] }, amount: null };

  const amount = format.number(baht(paid.amountSatang), "baht");
  const card = paid.card ? `${paid.card.brand} •••• ${paid.card.lastDigits}` : null;
  const start = paid.session ? new Date(paid.session.startTime) : null;
  const end = paid.session ? new Date(paid.session.endTime) : null;
  const clock = (at: Date) => format.dateTime(at, { hour: "2-digit", minute: "2-digit" });
  const cardRow: readonly ResultRow[] = card
    ? [{ icon: CreditCard, label: t("cardLabel"), value: card, latin: true }]
    : [];

  if (state === "success")
    return {
      amount,
      copy: {
        ...fixture,
        body: t("successBodyLive", { amount, advisor: paid.advisor.displayName }),
        rows: [
          { icon: UserRound, label: t("advisorLabel"), value: paid.advisor.displayName },
          ...(start && end
            ? [
                {
                  icon: CalendarDays,
                  label: t("dateLabel"),
                  value: format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
                },
                { icon: Clock, label: t("timeLabel"), value: `${clock(start)} – ${clock(end)}`, latin: true },
              ]
            : []),
        ],
        primary: { label: t("viewBooking"), href: "/bookings" },
        secondary: { label: t("backHome"), href: "/" },
      },
    };

  if (state === "failed")
    return {
      amount,
      copy: {
        ...fixture,
        rows: [...cardRow, { icon: CreditCard, label: t("amountLabel"), value: amount, latin: true }],
        primary: { label: t("tryAgain"), href: "/bookings" },
        secondary: { label: t("viewHistory"), href: "/transactions" },
      },
    };

  return {
    amount,
    copy: {
      ...fixture,
      rows: [
        ...cardRow,
        { icon: Clock, label: t("statusLabel"), value: t("statusValue"), tone: "text-warning" },
        { icon: ShieldCheck, label: t("refLabel"), value: paid.invoiceNumber, latin: true },
      ],
    },
  };
}

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
function SuccessScreen() {
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
 * Figma payment outcomes — "Payment - Success" (995:10411), "Payment - Failed"
 * (995:10243), "Payment - Unconfirmed" (995:10455) and "Payment - Slot taken"
 * (995:10370). All share the 95px inset, 366px hero, detail card and action pair.
 *
 * Their desktop frames (1952:34481, 34562, 34640 and 34859) share one shape
 * too: the very same stack, gathered into a 560px card centred between the app
 * nav and the site footer. Nothing is added or dropped — see `RESULT_CARD`.
 */
export function PaymentResultScreen({ state }: { readonly state: Result }) {
  return state === "success" ? (
    <SuccessScreen />
  ) : (
    <ResultScreen state={state} />
  );
}

function ResultScreen({ state }: { readonly state: Result }) {
  const t = useTranslations("payment");
  const format = useFormatter();
  const fixture = useResultCopy(state);
  const success = state === "success";
  const slotTaken = state === "slot-taken";

  /**
   * `slot-taken` is the one outcome in this file the app actually reaches:
   * `POST /bookings` answers 409 when another advisee took the time first, and
   * the slot chips on `/service/…` send the reader here with the time they tried
   * for and the service they tried it on.
   *
   * So those two facts stop being fixtures. The masked-card row goes with them —
   * nothing was charged and no card was involved, which is what
   * "เรียกเก็บ ฿0" already says — and both actions point back at the slot rail
   * that can still be picked from, instead of at `/matching/results`.
   */
  const attempted = useQueryValue("startTime");
  const attemptedService = asUuid(useQueryValue("serviceId"));
  const attemptedAt =
    attempted && !Number.isNaN(Date.parse(attempted))
      ? new Date(attempted)
      : undefined;

  const live = useLiveResult(state, fixture);

  const attemptCopy =
    slotTaken && (attemptedAt || attemptedService)
      ? {
          ...fixture,
          rows: [
            {
              icon: CalendarDays,
              label: t("slotLabel"),
              value: attemptedAt
                ? format.dateTime(attemptedAt, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : t("slotValue"),
              latin: true,
            },
            {
              icon: CreditCard,
              label: t("chargedLabel"),
              value: t("chargedValue"),
              latin: true,
            },
          ] as const,
          primary: {
            label: fixture.primary.label,
            href: attemptedService
              ? `${liveServiceHref(attemptedService)}#slots`
              : fixture.primary.href,
          },
          secondary: {
            label: fixture.secondary.label,
            href: attemptedService
              ? liveServiceHref(attemptedService)
              : fixture.secondary.href,
          },
        }
      : fixture;
  const copy = live ? live.copy : attemptCopy;

  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <div className={RESULT_CARD}>
          {/* Figma "Hero": a 280px wallet illustration (or a 96px badge for the
              slot-taken frame), then the 28/40 title and 14/20 muted body. */}
          <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[95px] lg:pt-0">
            {slotTaken ? (
              <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-10 text-destructive" />
              </span>
            ) : (
              /* Figma layers a 49px lime check over the success wallet at
                 x=188 / y=142.55 within the 280px illustration. */
              <div className="relative size-[280px] shrink-0">
                <Image alt="" className="size-full" src={success ? walletSuccess : walletFailed} />
                {success ? (
                  <Check
                    className="absolute size-[49px] text-success"
                    strokeWidth={3}
                    style={{ left: 188, top: 142.55 }}
                  />
                ) : null}
              </div>
            )}
            {state === "unconfirmed" ? (
              <p className="font-latin mt-4 w-full text-center text-heading font-semibold tabular-nums text-foreground lg:text-heading-lg">
                {live ? live.amount : t("unconfirmedAmount")}
              </p>
            ) : null}
            {/* The outcome in colour. These four screens are the clearest case in
                the app — success, declined, waiting, gone — and all four said it
                in the same near-black 28px type, with the wallet illustration
                doing the only distinguishing. The figure still carries the
                weight; the pill just names what the figure means. */}
            <StatusPill className="mt-4" tone={copy.pillTone}>
              {copy.pillLabel}
            </StatusPill>
            <p className="mt-3 w-full text-center text-heading font-semibold text-foreground lg:text-heading-lg">
              {copy.title}
            </p>
            <p className="mt-2 w-full text-center text-sm font-normal text-muted-foreground">
              {copy.body}
            </p>
          </div>

          {/* Figma "Details": a 3-row summary card — a `Surface` with hairlines
              between its rows, and the Latin runs (a masked card, an amount, a
              charge id) in tabular figures. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6 lg:pt-8">
            <Surface className="flex w-full flex-col items-start gap-3 p-3.5 lg:shadow-none">
              {copy.rows.map((row) => (
                <DetailRow
                  icon={row.icon}
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  valueClassName={cn(row.latin && "font-latin tabular-nums", row.tone)}
                />
              ))}
            </Surface>
          </div>

          {success ? <FootNote icon={ShieldCheck}>{t("escrowNote")}</FootNote> : null}
          {state === "failed" ? (
            <FootNote icon={CircleCheckBig}>{t("failedHelp")}</FootNote>
          ) : null}

          {/* The phone drops the pair onto its bottom edge; inside the card they
              sit 32px under the details, in a 360px column. */}
          <div className="w-full min-h-px flex-1 lg:hidden" />
          {/* Figma draws a 360px stack inside the card, so the pair stays a
              column at `lg` rather than becoming the row `ScreenActions` gives a
              full-width page. */}
          <ScreenActions className="lg:w-90 lg:pt-8 lg:pb-0" stacked>
            <PrimaryButton block className="lg:h-11" href={copy.primary.href}>
              {copy.primary.label}
            </PrimaryButton>
            <NeutralButton block className="lg:h-11" href={copy.secondary.href}>
              {copy.secondary.label}
            </NeutralButton>
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * Figma "Payment - Bank verification (Light)" — 995:10116, and
 * "Desktop / Payment - Processing (Light)" (1952:34413), where the spinner and
 * the way out stop being the whole screen and become a 560px card with 56px of
 * padding, centred between the nav and the footer.
 */
export function PaymentProcessingScreen() {
  const t = useTranslations("payment");

  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <div className="w-full flex-1 lg:hidden" />
        <div className={cn(RESULT_CARD, "lg:my-35 lg:p-14")}>
          <div className="flex w-full shrink-0 flex-col items-center px-6">
            <output
              aria-label={t("processingTitle")}
              className="block size-11 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary"
            />
            <p className="mt-16 w-full text-center text-2xl font-semibold text-foreground lg:mt-5">
              {t("processingTitle")}
            </p>
            {/* What is being waited on, in the colour of a wait — the spinner says
                "something is happening", not "the bank has not answered yet". */}
            <StatusPill className="mt-3" icon={Clock} tone="info">
              {t("statusValue")}
            </StatusPill>
            {/* The desktop frame (1952:34413) says out loud what the spinner
                only implies: what is being confirmed, and not to leave. */}
            <p className="hidden w-full max-w-90 pt-2 text-center text-sm font-normal text-muted-foreground lg:block">
              {t("processingBody")}
            </p>
          </div>
          <div className="w-full flex-1 lg:hidden" />
          <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2 lg:pt-7 lg:pb-0">
            <NeutralButton className="lg:h-11 lg:w-55" href="/checkout/card">
              {t("cancelPayment")}
            </NeutralButton>
          </div>
        </div>
        <div className="w-full flex-1 lg:hidden" />

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
