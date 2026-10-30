"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check, ChevronDown, CreditCard, Lock, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

import {
  createBookingInvoice,
  getPaymentPublicKey,
  getService,
  previewCoupon,
  startCheckout,
} from "@/lib/api/resources";
import type { ApiBooking, ApiCouponPreview, ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { createCardToken, type OmiseCard } from "@/lib/payment/omise";
import { baht } from "@/components/bookings/booking-flow";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The pieces `/checkout/card` is built from, shared by the page's two shapes:
 * the one page of the tablet and the desktop (`checkout-live.tsx`) and the
 * phone's three steps (`checkout-steps.tsx`). The card being typed, the order
 * and the coupon live in the screen, above both, so a window resized across
 * the line between them keeps what was typed.
 */

/**
 * How many digits a card number has, by its first digits: American Express (34, 37) 15, UnionPay (62) up to 19,
 * every other card Omise takes in Thailand (Visa, Mastercard, JCB) 16. Typing stops there, so a stray extra digit
 * can't make the number invalid.
 */
function cardLength(digits: string): number {
  if (digits.startsWith("34") || digits.startsWith("37")) return 15;
  if (digits.startsWith("62")) return 19;
  return 16;
}

/** How a card number is shown while it is typed: groups of four. */
export function groupCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, cardLength(digits)).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** And an expiry: `MM / YY`. */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

export type CardInput = {
  number: string;
  expiry: string;
  cvc: string;
  first: string;
  last: string;
  zip: string;
  /** ISO 3166 alpha-2, the card's billing country. */
  country: string;
};

const EMPTY_CARD: CardInput = { number: "", expiry: "", cvc: "", first: "", last: "", zip: "", country: "TH" };

/** The card as Omise takes it, or null while any part of it cannot be right. */
/** The card number's own check digit (Luhn): a mistyped number fails it before Omise is asked. */
function passesLuhn(number: string): boolean {
  let sum = 0;
  for (let i = 0; i < number.length; i++) {
    let digit = Number(number[number.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** A card is good through the last day of its expiry month. */
function notExpired(month: number, year: number, now: Date = new Date()): boolean {
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export function readCard(card: CardInput): OmiseCard | null {
  const number = card.number.replace(/\D/g, "");
  const expiry = /^(\d{2}) \/ (\d{2})$/.exec(card.expiry);
  const month = expiry ? Number(expiry[1]) : 0;
  const name = `${card.first.trim()} ${card.last.trim()}`.trim();
  if (number.length < 13 || !passesLuhn(number) || !expiry || month < 1 || month > 12) return null;
  if (!notExpired(month, 2000 + Number(expiry[2]))) return null;
  if (!/^\d{3,4}$/.test(card.cvc) || !name || !card.zip.trim()) return null;
  return {
    name,
    number,
    expiration_month: month,
    expiration_year: 2000 + Number(expiry[2]),
    security_code: card.cvc,
    postal_code: card.zip.trim(),
    country: card.country,
  };
}

/**
 * The card being typed and the payment it makes. Paying is three calls on one
 * press: the card becomes a token in Omise's own script, against the API's
 * public key; the booking's invoice is made, less the coupon if one is added;
 * and the invoice is charged to the token, which answers the card's 3-D Secure
 * page, where the browser goes. With no public key, card payments are not set
 * up (`configured` is false) and nothing can be paid.
 */
export function useCardPayment(bookingId: string, couponCode: string | undefined) {
  const t = useTranslations("payment");
  const key = useResource<{ readonly publicKey: string }>(
    "payment/public-key",
    useCallback((signal: AbortSignal) => getPaymentPublicKey(signal), []),
  );
  const publicKey = key.data?.publicKey ?? "";

  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [paying, setPaying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = readCard(card);

  const set = useCallback(
    (field: keyof CardInput) => (value: string) => setCard((now) => ({ ...now, [field]: value })),
    [],
  );

  const pay = useCallback(() => {
    if (!ready) {
      setProblem(t("cardIncomplete"));
      return;
    }
    setPaying(true);
    setProblem(null);
    void (async () => {
      try {
        const cardToken = await createCardToken(publicKey, ready);
        const invoice = await createBookingInvoice(bookingId, couponCode);
        const { url } = await startCheckout({ invoiceId: invoice.id, cardToken });
        window.location.assign(url);
      } catch (cause: unknown) {
        setProblem(t("payFailed", { reason: cause instanceof Error ? cause.message : String(cause) }));
        setPaying(false);
      }
    })();
  }, [bookingId, couponCode, publicKey, ready, t]);

  return { card, set, ready, configured: publicKey !== "", paying, problem, setProblem, pay };
}

export type CardPayment = ReturnType<typeof useCardPayment>;

/**
 * What is being bought: the service's listing for its cover, advisor and
 * rating, and the service itself for its name and the package booked, priced
 * now — the invoice is priced the same way when it is made, so the two agree.
 */
export function useOrder(booking: ApiBooking) {
  const catalogue = useLiveCatalogue();
  const item = catalogue.items.find((entry) => entry.id === booking.serviceId);
  const fetcher = useCallback(
    (signal: AbortSignal) => getService(booking.serviceId, signal),
    [booking.serviceId],
  );
  const service = useResource<ApiPublicService>(`services/${booking.serviceId}`, fetcher);
  const booked = service.data?.packages?.find((entry) => entry.id === booking.packageId);
  const name = service.data?.name ?? item?.title ?? "";
  let priceSatang: number | null = null;
  if (service.data) priceSatang = booked ? booked.priceSatang : service.data.priceSatang;
  return { item, name, line: booked ? `${name} · ${booked.name}` : name, priceSatang };
}

export type Order = ReturnType<typeof useOrder>;

/**
 * Every country a card can be billed in, by ISO 3166 code; their names are
 * the browser's own in the page's language (`Intl.DisplayNames`), sorted the
 * way that language sorts.
 */
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

/** The checkout's popups lie over the page darkened to 40% black, not blurred. */
export const POPUP_OVERLAY = "bg-scrim/40 supports-backdrop-filter:backdrop-blur-none";

/**
 * The card's billing country: a box like the fields over it, its name small
 * at the top and the country under it at 16, the arrow at the end. Thailand
 * to start with.
 *
 * Pressing it opens the countries in a popup of their own rather than a
 * dropdown under the field: 568 wide and the screen's height less 40 above
 * and below, its corners 32. Its name over a hairline with the way out at the
 * left; then every country a 72-high row ruled off from the next, the chosen
 * one bold with a tick at the end. A row chooses and closes it.
 */
function CountryField({
  value,
  onChange,
  className,
}: {
  readonly value: string;
  readonly onChange: (code: string) => void;
  readonly className?: string;
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    const collator = new Intl.Collator(locale);
    return COUNTRY_CODES.map((code) => ({ value: code, label: names.of(code) ?? code })).sort((a, b) =>
      collator.compare(a.label, b.label),
    );
  }, [locale]);
  const chosen = countries.find((country) => country.value === value);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {/* The field's box, and its 2px ink box while focused. */}
      <DialogTrigger
        className={cn(
          "flex h-15 w-full items-center gap-3 rounded-[12px] border border-input bg-card px-4 text-left outline-none",
          "focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-inset",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="text-xs leading-4 text-muted-foreground">{t("countryLabel")}</span>
          <span className="text-base leading-6 text-foreground">{chosen?.label ?? value}</span>
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-foreground" />
      </DialogTrigger>
      <DialogContent
        className="flex h-[calc(100dvh-5rem)] flex-col gap-0 overflow-hidden rounded-[32px] p-0 shadow-[0_8px_28px_color-mix(in_srgb,var(--scrim)_28%,transparent)] ring-0 sm:max-w-[568px]"
        overlayClassName={POPUP_OVERLAY}
        showCloseButton={false}
      >
        <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-border">
          <DialogClose
            aria-label={c("close")}
            className="absolute top-1/2 left-6 flex size-8 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <X aria-hidden className="size-4" strokeWidth={2.5} />
          </DialogClose>
          <DialogTitle className="text-base leading-5 font-semibold text-foreground">{t("countryLabel")}</DialogTitle>
        </div>
        <div aria-label={t("countryLabel")} className="min-h-0 flex-1 overflow-y-auto px-6" role="listbox">
          {countries.map((country) => {
            const selected = country.value === value;
            return (
              <Button
                aria-selected={selected}
                className={cn(
                  "flex h-18 w-full items-center justify-between rounded-none border-0 border-t border-border px-0 text-base leading-5 font-normal text-foreground first:border-t-0 hover:bg-transparent",
                  selected && "font-bold",
                )}
                key={country.value}
                onClick={() => {
                  onChange(country.value);
                  setOpen(false);
                }}
                role="option"
                type="button"
                variant="ghost"
              >
                {country.label}
                {/* The tick 36 across in a 2px line: lucide's spans 16 of its
                    24, so a 54 box, the line held at 2. */}
                {selected ? <Check absoluteStrokeWidth aria-hidden className="size-13.5 shrink-0" strokeWidth={2} /> : null}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The marks the rows carry, each the company's own: PromptPay's, Google
 * Pay's acceptance mark, and Visa's and Mastercard's under the card's name.
 * Every one in a 32 slot, the width it is drawn to.
 */
function BrandMark({ src, width, height, className }: { readonly src: string; readonly width: number; readonly height: number; readonly className: string }) {
  return <Image alt="" className={cn("shrink-0", className)} height={height} src={src} width={width} />;
}

/** The cards the card row takes, by their marks: Visa 28 across, Mastercard 16, 6 apart. */
export function CardBrands({ className }: { readonly className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5 pt-1", className)}>
      <Image alt="Visa" className="h-2.25 w-auto" height={325} src="/icons/visa.svg" width={1000} />
      <Image alt="Mastercard" className="h-2.5 w-auto" height={618} src="/icons/mastercard.svg" width={1000} />
    </span>
  );
}

/** One way to pay: its mark, its name and a radio at the row's end, the whole row the target. */
function MethodRow({
  value,
  mark,
  label,
  note,
  detail,
  disabled = false,
  first = false,
  tall = false,
  children,
}: {
  readonly value: string;
  /** The method's mark, drawn in a 32 slot before its name. */
  readonly mark: ReactNode;
  readonly label: string;
  readonly note?: string;
  /** Under the name: the cards it takes. */
  readonly detail?: ReactNode;
  readonly disabled?: boolean;
  readonly first?: boolean;
  /** 72 high rather than 64, as the phone's list draws them. */
  readonly tall?: boolean;
  readonly children?: ReactNode;
}) {
  return (
    <div className={cn(!first && "border-t border-border")}>
      {/* A method not yet open keeps its mark in full colour, the company's
          own; its name and its radio fade. */}
      <label className={cn("flex items-center gap-4", tall ? "h-18" : "h-16", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center text-foreground">
          {mark}
        </span>
        <span className={cn("flex min-w-0 flex-1 flex-col text-base text-foreground", disabled && "opacity-50")}>
          <span>
            {label}
            {note ? <span className="ml-2 text-xs text-muted-foreground">{note}</span> : null}
          </span>
          {detail}
        </span>
        <Radio.Root
          // 22 across: a 1px ring in the field grey, and once chosen a 2px ink
          // ring round a 14 dot, both easing in over 300ms.
          className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-input transition-shadow duration-300 outline-none ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-checked:ring-2 data-checked:ring-foreground data-disabled:opacity-50 motion-reduce:transition-none"
          disabled={disabled}
          value={value}
        >
          <Radio.Indicator className="size-3.5 rounded-full bg-foreground transition-transform duration-300 data-ending-style:scale-0 data-starting-style:scale-0 motion-reduce:transition-none" />
        </Radio.Root>
      </label>
      {children}
    </div>
  );
}

/** The ways to pay: PromptPay's code, a typed card, or a card from Google Pay. */
export type PayMethod = "promptpay" | "card" | "googlepay";

/** PromptPay's mark, the company's own, in a 32 slot. */
export function PromptPayMark() {
  return <BrandMark className="w-8" height={216} src="/icons/promptpay.png" width={643} />;
}

/** Google Pay's mark, the company's own, in a 32 slot. */
export function GooglePayMark() {
  return <BrandMark className="w-8" height={400} src="/icons/google-pay.svg" width={752} />;
}

/**
 * The ways to pay as one card of rows: PromptPay, the card, Google Pay.
 * `fields` go under the card's row while the card is chosen, as the desktop
 * draws them; the phone asks for them in a sheet of their own and passes
 * none. Google Pay can be chosen once the browser has said it can pay with
 * it (`googlePay`: null while it is asked), and says so where it cannot.
 */
export function MethodList({
  method,
  onMethodChange,
  googlePay,
  fields,
  heading,
  tall = false,
  className,
}: {
  readonly method: PayMethod;
  readonly onMethodChange: (method: PayMethod) => void;
  readonly googlePay: boolean | null;
  readonly fields?: ReactNode;
  /** The card's own heading, over its rows; the phone's page title says it instead. */
  readonly heading?: string;
  readonly tall?: boolean;
  readonly className?: string;
}) {
  const t = useTranslations("payment");
  return (
    <section aria-label={heading ? undefined : t("methodTitle")} aria-labelledby={heading ? "payment-method-title" : undefined} className={className}>
      {heading ? (
        <h2 className="px-6 pt-6 pb-1 text-lg leading-none font-semibold text-foreground" id="payment-method-title">
          {heading}
        </h2>
      ) : null}
      <RadioGroup
        aria-label={t("methodTitle")}
        className={cn("flex flex-col", tall ? "px-4" : "px-6")}
        onValueChange={(value) => onMethodChange(value as PayMethod)}
        value={method}
      >
        <MethodRow first label={t("methodPromptPay")} mark={<PromptPayMark />} tall={tall} value="promptpay" />
        <MethodRow
          detail={<CardBrands />}
          label={t("methodCard")}
          mark={<CreditCard className="size-6" strokeWidth={1.5} />}
          tall={tall}
          value="card"
        >
          {method === "card" ? fields : null}
        </MethodRow>
        <MethodRow
          disabled={googlePay !== true}
          label={t("methodGooglePay")}
          mark={<GooglePayMark />}
          note={googlePay === false ? t("googlePayUnavailable") : undefined}
          tall={tall}
          value="googlepay"
        />
      </RadioGroup>
    </section>
  );
}

/**
 * A field's box: 1px in the field grey on white. Fields in a group overlap by
 * that pixel (`-mt-px`, `-ml-px`), so neighbours share one hairline and only
 * the group's outer corners are rounded, by the caller. The one being typed in
 * lifts over its neighbours as a 2px ink box rounded at every corner.
 */
const FIELD_BOX =
  "border border-input bg-card focus-within:z-10 focus-within:rounded-[12px] focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground focus-within:ring-inset";

/**
 * One field, 60 high, the whole box its target. Its name sits in it at 16
 * until the field is focused or filled, then moves to its top at 12, over what
 * is typed (`placeholder=" "` is what tells an empty field from a filled one).
 */
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
    <label className={cn("relative flex h-15 items-center gap-1.5 px-4", FIELD_BOX, className)}>
      {/* The primitive without its own box: the label draws it. */}
      <Input
        aria-label={label}
        className="peer h-full flex-1 rounded-none border-0 bg-transparent px-0 pt-4 pb-0 text-base text-foreground shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
        placeholder=" "
        {...input}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-muted-foreground transition-all duration-150 peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs motion-reduce:transition-none"
      >
        {label}
      </span>
      {trailing}
    </label>
  );
}

/**
 * The card's fields: the card, then its holder's name, each a group of
 * 60-high fields sharing hairlines, 12 apart; then the postcode 8 under them
 * and the country 16 under that, each a box of its own.
 */
export function CardFields({ payment, className }: { readonly payment: CardPayment; readonly className?: string }) {
  const t = useTranslations("payment");
  const { card, set } = payment;
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-col">
        <BoxInput
          autoComplete="cc-number"
          className="rounded-t-[12px] font-latin tabular-nums"
          inputMode="numeric"
          label={t("cardNumberLabel")}
          onChange={(event) => set("number")(groupCardNumber(event.target.value))}
          trailing={<Lock aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
          value={card.number}
        />
        <div className="-mt-px flex">
          <BoxInput
            autoComplete="cc-exp"
            className="flex-1 rounded-bl-[12px] font-latin tabular-nums"
            inputMode="numeric"
            label={t("expiryLabel")}
            onChange={(event) => set("expiry")(formatExpiry(event.target.value))}
            value={card.expiry}
          />
          <BoxInput
            autoComplete="cc-csc"
            className="-ml-px flex-1 rounded-br-[12px] font-latin tabular-nums"
            inputMode="numeric"
            label={t("cvcLabel")}
            onChange={(event) => set("cvc")(event.target.value.replace(/\D/g, "").slice(0, 4))}
            value={card.cvc}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col">
        <BoxInput
          autoComplete="cc-given-name"
          className="rounded-t-[12px]"
          label={t("firstNameLabel")}
          onChange={(event) => set("first")(event.target.value)}
          value={card.first}
        />
        <BoxInput
          autoComplete="cc-family-name"
          className="-mt-px rounded-b-[12px]"
          label={t("lastNameLabel")}
          onChange={(event) => set("last")(event.target.value)}
          value={card.last}
        />
      </div>
      <BoxInput
        autoComplete="postal-code"
        className="mt-2 rounded-[12px] font-latin"
        label={t("zipLabel")}
        onChange={(event) => set("zip")(event.target.value.slice(0, 10))}
        value={card.zip}
      />
      <CountryField className="mt-4" onChange={set("country")} value={card.country} />
    </div>
  );
}

/**
 * A coupon tried against the booking: a box of its own, 569 wide on the
 * desktop, flat on white. Its title over a hairline, the code in a field like
 * the card's, and under a hairline the way out at the left and Add in ink at
 * the right. Add asks the API what the code takes off this booking
 * (`POST /payment/coupons/preview`); a code it refuses says so under the field,
 * and one it takes closes the box and lands on the order card.
 */
function CouponDialog({
  bookingId,
  open,
  onOpenChange,
  onApplied,
}: {
  readonly bookingId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onApplied: (coupon: ApiCouponPreview) => void;
}) {
  const t = useTranslations("payment");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const wanted = code.trim();
    if (!wanted) return;
    setWorking(true);
    setProblem(null);
    previewCoupon(bookingId, wanted)
      .then((coupon) => {
        onApplied(coupon);
        onOpenChange(false);
        setCode("");
      })
      .catch(() => setProblem(t("couponInvalid")))
      .finally(() => setWorking(false));
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 rounded-[24px] p-0 sm:max-w-[569px]" overlayClassName={POPUP_OVERLAY}>
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-center text-base font-semibold">{t("couponTitle")}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={onSubmit}>
          <div className="px-6 py-6">
            <p className="text-lg leading-6 font-semibold text-foreground">{t("couponSubtitle")}</p>
            <BoxInput
              autoComplete="off"
              className="mt-4 rounded-[12px] font-latin"
              label={t("couponPlaceholder")}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 32))}
              value={code}
            />
            {problem ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {problem}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <DialogClose render={<Button className="h-12 px-0 text-base font-semibold text-foreground underline" type="button" variant="link" />}>
              {t("couponCancel")}
            </DialogClose>
            <Button
              className="h-12 rounded-lg bg-foreground px-6 text-base font-semibold text-background hover:bg-foreground/85"
              disabled={!code.trim() || working}
              type="submit"
            >
              {t("couponApply")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The order's head: the cover, then the service's name, its advisor and its
 * rating beside it. 97 square on the desktop's card, 80 on the phone's.
 */
export function OrderHead({ order, compact = false }: { readonly order: Order; readonly compact?: boolean }) {
  const { item, name } = order;
  const cover = compact ? "size-20" : "size-[97px]";
  return (
    <div className="flex items-start gap-4">
      {item ? (
        <Image alt="" className={cn(cover, "shrink-0 rounded-md object-cover")} src={item.cover} />
      ) : (
        <span className={cn(cover, "shrink-0 rounded-md bg-muted")} />
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
  );
}

/** A block of the order card under a hairline: its label, then what it says. */
export function OrderSection({
  label,
  aside,
  className,
  children,
}: {
  readonly label: string;
  /** At the block's end, level with its label: a button that acts on it. */
  readonly aside?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn("mt-4 flex items-start justify-between gap-3 border-t border-border pt-4 text-sm text-foreground", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-semibold">{label}</p>
        {children}
      </div>
      {aside}
    </div>
  );
}

/** When the booking is: its day, then its hours. */
export function BookingWhen({ booking }: { readonly booking: ApiBooking }) {
  const t = useTranslations("payment");
  const format = useFormatter();
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const clock = (at: Date) => format.dateTime(at, { hour: "2-digit", minute: "2-digit" });
  return (
    <OrderSection label={t("bookingDateLabel")}>
      <p>{format.dateTime(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <p className="font-latin tabular-nums">{`${clock(start)} – ${clock(end)}`}</p>
    </OrderSection>
  );
}

/** What is paid, as a figure: the coupon's total once one is added, the price before. */
export function useTotal(order: Order, coupon: ApiCouponPreview | null): string | null {
  const format = useFormatter();
  if (coupon) return format.number(baht(coupon.amountSatang), "baht");
  return order.priceSatang === null ? null : format.number(baht(order.priceSatang), "baht");
}

/**
 * The price, line by line, the coupon under it; then the coupon's own control —
 * a link that opens its box, or the one added and a way to take it off — and
 * the total under a hairline.
 */
export function PriceBreakdown({
  bookingId,
  order,
  coupon,
  onCoupon,
  flush = false,
}: {
  readonly bookingId: string;
  readonly order: Order;
  readonly coupon: ApiCouponPreview | null;
  readonly onCoupon: (coupon: ApiCouponPreview | null) => void;
  /** First in its box, so no hairline over it: the phone's price popup. */
  readonly flush?: boolean;
}) {
  const t = useTranslations("payment");
  const format = useFormatter();
  const [couponOpen, setCouponOpen] = useState(false);
  const total = useTotal(order, coupon);
  const price = order.priceSatang === null ? null : format.number(baht(order.priceSatang), "baht");
  const link = "h-auto px-0 text-sm text-foreground underline";
  return (
    <>
      <OrderSection className={flush ? "mt-0 border-t-0 pt-0" : undefined} label={t("priceDetails")}>
        <p className="flex justify-between gap-3">
          <span className="min-w-0">
            <ThaiText>{order.line}</ThaiText>
          </span>
          <span className="font-latin shrink-0 tabular-nums">{price}</span>
        </p>
        {coupon ? (
          <p className="flex justify-between gap-3">
            <span className="min-w-0">{t("couponLine", { code: coupon.code })}</span>
            <span className="font-latin shrink-0 tabular-nums">{`−${format.number(baht(coupon.discountSatang), "baht")}`}</span>
          </p>
        ) : null}
      </OrderSection>
      <div className="mt-4 border-t border-border pt-4 text-sm text-foreground">
        {coupon ? (
          <Button className={link} onClick={() => onCoupon(null)} type="button" variant="link">
            {t("couponRemove")}
          </Button>
        ) : (
          <Button className={link} onClick={() => setCouponOpen(true)} type="button" variant="link">
            {t("couponAdd")}
          </Button>
        )}
      </div>
      <p className="mt-4 flex justify-between gap-3 border-t border-border pt-4 text-sm font-semibold text-foreground">
        <span>{t("total")}</span>
        <span className="font-latin tabular-nums">{total}</span>
      </p>
      <CouponDialog bookingId={bookingId} onApplied={onCoupon} onOpenChange={setCouponOpen} open={couponOpen} />
    </>
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

/** The line over the button that pays: the booking terms and the privacy policy it agrees to. */
export function TermsNote({ className }: { readonly className?: string }) {
  const t = useTranslations("payment");
  return <p className={cn("text-xs leading-4 text-foreground", className)}>{t.rich("termsNote", { terms: termsLink, privacy: privacyLink })}</p>;
}
