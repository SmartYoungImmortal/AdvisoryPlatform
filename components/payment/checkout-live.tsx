"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { ArrowLeft, CreditCard, Lock, QrCode, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  createBookingInvoice,
  getBooking,
  getPaymentPublicKey,
  getService,
  startCheckout,
} from "@/lib/api/resources";
import type { ApiBooking, ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { createCardToken } from "@/lib/payment/omise";
import { baht } from "@/components/bookings/booking-flow";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ApiErrorCard } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * `/checkout/card?bookingId=<uuid>` — confirm and pay for a held slot.
 *
 * Laid out the way a booking ends on the best of the booking sites: the title
 * with a round way back beside it, the ways to pay as one card of rows with the
 * button under it on the left, and on the right a card of what is being bought
 * — the service's cover, name, advisor and rating, when it is, and what it
 * costs. 976 across, 524 + 80 + 372, at the sizes the screen draws them (this
 * page is not zoomed by `app-scale`); the phone stacks the order card first.
 *
 * ## How it pays
 *
 * `POST /bookings` has already held the time (`PENDING_PAYMENT`). Paying is
 * four steps, all on the press of the button:
 *
 * 1. the card becomes a token in Omise's own script (`lib/payment/omise.ts`),
 *    against the API's public key, so its number never reaches our servers;
 * 2. `POST /payment/invoice/for-booking/:id` makes (or finds) the invoice for
 *    this booking, priced as booked;
 * 3. `POST /payment/checkout` charges the invoice to the token and answers the
 *    card's 3-D Secure page;
 * 4. the browser goes there. The bank returns it to the API, which confirms the
 *    booking and sends it on to `/checkout/success`, `/failed` or `/unconfirmed`
 *    with the invoice's id.
 *
 * When the API has no public key, card payments are not set up: the button stays
 * off and says so, and the two things that still work — the booking, and giving
 * the time back — sit under it. PromptPay is listed and not yet choosable: the
 * API charges cards only.
 *
 * ## Where the amount comes from
 *
 * The order card shows the package booked, or the service, at its price now; the
 * invoice is priced the same way when it is made, so the two agree.
 */

/** How a card number is shown while it is typed: groups of four. */
function groupCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** And an expiry: `MM / YY`. */
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

type CardInput = { number: string; expiry: string; cvc: string; first: string; last: string };

/** The card as Omise takes it, or null while any part of it cannot be right. */
function readCard(card: CardInput) {
  const number = card.number.replace(/\D/g, "");
  const expiry = /^(\d{2}) \/ (\d{2})$/.exec(card.expiry);
  const month = expiry ? Number(expiry[1]) : 0;
  const name = `${card.first.trim()} ${card.last.trim()}`.trim();
  if (number.length < 13 || !expiry || month < 1 || month > 12) return null;
  if (!/^\d{3,4}$/.test(card.cvc) || !name) return null;
  return {
    name,
    number,
    expiration_month: month,
    expiration_year: 2000 + Number(expiry[2]),
    security_code: card.cvc,
  };
}

/** One way to pay: its icon, its name and a radio at the row's end, the whole row the target. */
function MethodRow({
  value,
  icon: Icon,
  label,
  note,
  detail,
  disabled = false,
  first = false,
  children,
}: {
  readonly value: string;
  readonly icon: typeof CreditCard;
  readonly label: string;
  readonly note?: string;
  /** A small line under the name: the cards it takes. */
  readonly detail?: string;
  readonly disabled?: boolean;
  readonly first?: boolean;
  readonly children?: ReactNode;
}) {
  return (
    <div className={cn(!first && "border-t border-border")}>
      <label className={cn("flex h-16 items-center gap-4", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
        <Icon aria-hidden className="size-8 shrink-0 p-1 text-foreground" strokeWidth={1.5} />
        <span className="flex min-w-0 flex-1 flex-col text-base text-foreground">
          <span>
            {label}
            {note ? <span className="ml-2 text-xs text-muted-foreground">{note}</span> : null}
          </span>
          {detail ? <span className="font-latin text-2xs leading-3 font-semibold text-muted-foreground">{detail}</span> : null}
        </span>
        <Radio.Root
          className="flex size-5.5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/60 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-2 data-checked:border-foreground"
          disabled={disabled}
          value={value}
        >
          <Radio.Indicator className="size-3 rounded-full bg-foreground" />
        </Radio.Root>
      </label>
      {children}
    </div>
  );
}

/** A box of the card form's fields, hairlines between them, as the provider's own form groups them. */
const FIELD_GROUP = "overflow-hidden rounded-[12px] border border-muted-foreground/70";

/** One of those fields: 60 high, its name inside it until something is typed, the whole box its target. */
function BoxInput({
  label,
  trailing,
  className,
  ...input
}: {
  readonly label: string;
  readonly trailing?: ReactNode;
  readonly className?: string;
} & Omit<ComponentProps<"input">, "className" | "placeholder" | "aria-label">) {
  return (
    <label className={cn("relative flex h-15 items-center gap-1.5 px-5 focus-within:z-10 focus-within:ring-2 focus-within:ring-foreground focus-within:ring-inset", className)}>
      {/* The primitive, without its own box: the group draws the box, and the
          field's focus is the ring on the label. */}
      <Input
        aria-label={label}
        className="h-full flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base text-foreground shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
        placeholder={label}
        {...input}
      />
      {trailing}
    </label>
  );
}

/** The order on the right: what is bought, when, and for how much. */
function OrderCard({ booking, className }: { readonly booking: ApiBooking; readonly className?: string }) {
  const t = useTranslations("payment");
  const format = useFormatter();
  const catalogue = useLiveCatalogue();
  const item = catalogue.items.find((entry) => entry.id === booking.serviceId);

  const fetcher = useCallback(
    (signal: AbortSignal) => getService(booking.serviceId, signal),
    [booking.serviceId],
  );
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetcher);
  const booked = service.data?.packages?.find((entry) => entry.id === booking.packageId);
  const name = service.data?.name ?? item?.title ?? "";
  const line = booked ? `${name} · ${booked.name}` : name;
  const amount = service.data
    ? format.number(baht(booked ? booked.priceSatang : service.data.priceSatang), "baht")
    : null;

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const clock = (at: Date) => format.dateTime(at, { hour: "2-digit", minute: "2-digit" });

  return (
    <aside aria-label={t("orderSummary")} className={cn("w-full rounded-[24px] border border-border p-6", className)}>
      <div className="flex items-start gap-4">
        {item ? (
          <Image alt="" className="size-[97px] shrink-0 rounded-md object-cover" src={item.cover} />
        ) : (
          <span className="size-[97px] shrink-0 rounded-md bg-muted" />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg leading-6 font-semibold text-foreground">
            <ThaiText>{name}</ThaiText>
          </p>
          {item ? <p className="text-sm text-foreground">{item.advisorName}</p> : null}
          {item?.rating ? (
            <p className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Star aria-hidden className="size-3 fill-foreground" />
              <span className="font-latin tabular-nums">
                {item.rating.toFixed(1)} ({item.reviews})
              </span>
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-5 text-sm text-foreground">{t("heldNote")}</p>

      <OrderSection label={t("bookingDateLabel")}>
        <p>{format.dateTime(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="font-latin tabular-nums">{`${clock(start)} – ${clock(end)}`}</p>
      </OrderSection>
      <OrderSection label={t("priceDetails")}>
        <p className="flex justify-between gap-3">
          <span className="min-w-0">
            <ThaiText>{line}</ThaiText>
          </span>
          <span className="font-latin shrink-0 tabular-nums">{amount}</span>
        </p>
      </OrderSection>
      <p className="mt-4 flex justify-between gap-3 border-t border-border pt-4 text-sm font-semibold text-foreground">
        <span>{t("total")}</span>
        <span className="font-latin tabular-nums">{amount}</span>
      </p>
    </aside>
  );
}

/** A block of the order card under a hairline: its label, then what it says. */
function OrderSection({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm text-foreground">
      <p className="font-semibold">{label}</p>
      {children}
    </div>
  );
}

/** The two documents the line over the button links to. */
function termsLink(chunks: ReactNode) {
  return (
    <Link className="font-semibold underline" href="/terms">
      {chunks}
    </Link>
  );
}

function privacyLink(chunks: ReactNode) {
  return (
    <Link className="font-semibold underline" href="/privacy-policy">
      {chunks}
    </Link>
  );
}

/** The ways to pay, the card's fields under its row, and the button that pays. */
function PayForm({ booking, className }: { readonly booking: ApiBooking; readonly className?: string }) {
  const t = useTranslations("payment");
  const key = useResource<{ readonly publicKey: string }>(
    "payment/public-key",
    useCallback((signal: AbortSignal) => getPaymentPublicKey(signal), []),
  );
  const publicKey = key.data?.publicKey ?? "";
  const configured = publicKey !== "";

  const [card, setCard] = useState<CardInput>({ number: "", expiry: "", cvc: "", first: "", last: "" });
  const [paying, setPaying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = readCard(card);

  const onPay = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!ready) {
        setProblem(t("cardIncomplete"));
        return;
      }
      setPaying(true);
      setProblem(null);
      void (async () => {
        try {
          const cardToken = await createCardToken(publicKey, ready);
          const invoice = await createBookingInvoice(booking.id);
          const { url } = await startCheckout({ invoiceId: invoice.id, cardToken });
          window.location.assign(url);
        } catch (cause: unknown) {
          setProblem(t("payFailed", { reason: cause instanceof Error ? cause.message : String(cause) }));
          setPaying(false);
        }
      })();
    },
    [booking.id, publicKey, ready, t],
  );

  const set = (field: keyof CardInput) => (value: string) => setCard((now) => ({ ...now, [field]: value }));

  return (
    <form className={cn("flex w-full flex-col", className)} noValidate onSubmit={onPay}>
      <section aria-labelledby="payment-method-title" className="w-full rounded-[24px] border border-border pb-1">
        <h2 className="px-6 pt-6 pb-1 text-lg leading-none font-semibold text-foreground" id="payment-method-title">
          {t("methodTitle")}
        </h2>
        <RadioGroup aria-labelledby="payment-method-title" className="flex flex-col px-6" defaultValue="card">
          <MethodRow disabled first icon={QrCode} label={t("methodPromptPay")} note={t("promptPaySoon")} value="promptpay" />
          <MethodRow detail={t("cardBrands")} icon={CreditCard} label={t("methodCard")} value="card">
            {/* The card, then its holder's name, each a box of 60-high fields
                with hairlines between, 14 apart. */}
            <div className="flex flex-col gap-3.5 pb-4">
              <div className={FIELD_GROUP}>
                <BoxInput
                  autoComplete="cc-number"
                  className="font-latin tabular-nums"
                  inputMode="numeric"
                  label={t("cardNumberLabel")}
                  onChange={(event) => set("number")(groupCardNumber(event.target.value))}
                  trailing={<Lock aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
                  value={card.number}
                />
                <div className="flex border-t border-muted-foreground/70">
                  <BoxInput
                    autoComplete="cc-exp"
                    className="flex-1 font-latin tabular-nums"
                    inputMode="numeric"
                    label={t("expiryLabel")}
                    onChange={(event) => set("expiry")(formatExpiry(event.target.value))}
                    value={card.expiry}
                  />
                  <BoxInput
                    autoComplete="cc-csc"
                    className="flex-1 border-l border-muted-foreground/70 font-latin tabular-nums"
                    inputMode="numeric"
                    label={t("cvcLabel")}
                    onChange={(event) => set("cvc")(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    value={card.cvc}
                  />
                </div>
              </div>
              <div className={FIELD_GROUP}>
                <BoxInput
                  autoComplete="cc-given-name"
                  label={t("firstNameLabel")}
                  onChange={(event) => set("first")(event.target.value)}
                  value={card.first}
                />
                <BoxInput
                  autoComplete="cc-family-name"
                  className="border-t border-muted-foreground/70"
                  label={t("lastNameLabel")}
                  onChange={(event) => set("last")(event.target.value)}
                  value={card.last}
                />
              </div>
            </div>
          </MethodRow>
        </RadioGroup>
      </section>

      <p className="mt-3.5 text-xs leading-4 text-foreground">
        {t.rich("termsNote", { terms: termsLink, privacy: privacyLink })}
      </p>

      <PrimaryButton
        aria-describedby={configured ? undefined : "pay-unavailable"}
        block
        className="mt-3 h-12 rounded-[12px] text-base font-medium lg:h-12"
        disabled={!configured || paying}
        type="submit"
      >
        {paying ? t("payWorking") : t("confirmTitle")}
      </PrimaryButton>
      {!configured && !key.loading ? (
        <p className="mt-2 text-xs text-muted-foreground" id="pay-unavailable">
          {t("payUnavailable")}
        </p>
      ) : null}
      {problem ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  );
}

/** The page's column: 976 across on the desktop, the phone's gutter below it. */
const COLUMN = "w-full px-6 pt-4 pb-12 lg:mx-auto lg:w-[976px] lg:px-0 lg:pt-8 lg:pb-20";

export function LiveCheckoutScreen({ bookingId }: { readonly bookingId: string }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const s = useTranslations("search");

  const fetcher = useCallback(
    (signal: AbortSignal) => getBooking(bookingId, signal),
    [bookingId],
  );
  const booking = useResource<ApiBooking>(`bookings/${bookingId}`, fetcher);

  const head = (
    <>
      <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />
      {/* No back control in the bar: the round one beside the title is it. */}
      <div className="hidden w-full lg:block">
        <TopBar />
      </div>
    </>
  );

  if (booking.loading) {
    return (
      <MobileScreen wide>
        <ScreenBody>
          {head}
          <div className={cn(COLUMN, "flex flex-col gap-6")}>
            <div className="h-9 w-2/5 rounded-md bg-muted" />
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[524px_372px] lg:gap-x-20">
              <div className="h-60 rounded-[24px] bg-muted" />
              <div className="h-96 rounded-[24px] bg-muted" />
            </div>
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
        </ScreenBody>
      </MobileScreen>
    );
  }

  const live = booking.data;

  return (
    <MobileScreen wide>
      <ScreenBody>
        {head}

        <div className={COLUMN}>
          {/* The round way back hangs in the margin, its top on the title's and
              24 from it, so the title lines up with both columns under it and
              the cards start 24 under the title, not under the circle. */}
          <div className="relative">
            <Link
              aria-label={c("back")}
              className="absolute -top-1 -left-17 hidden size-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent lg:flex"
              href="/search"
            >
              {/* 16 across with a 2px line: lucide draws on 24, so 3 here. */}
              <ArrowLeft aria-hidden className="size-4" strokeWidth={3} />
            </Link>
            <h1 className="text-2xl font-semibold text-foreground lg:text-3xl lg:leading-9">{t("confirmTitle")}</h1>
          </div>

          <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[524px_372px] lg:items-start lg:gap-x-20">
            <OrderCard booking={live} className="lg:col-start-2 lg:row-start-1" />
            <PayForm booking={live} className="lg:col-start-1 lg:row-start-1" />
          </div>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
