"use client";

import { CreditCard, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { baht } from "@/components/bookings/booking-flow";
import { Figures } from "@/components/figures";
import { PILL_LG, SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import type { ApiAdviseeInvoice, ApiBooking } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Green and amber fall under 4.5:1 as text on white, so they colour the mark
 * only and the words stay in ink; red, blue and muted grey pass.
 */
export type RefundTone = "success" | "primary" | "warning" | "destructive" | "muted";

const TONE = {
  success: { icon: "text-success", ink: "text-foreground" },
  primary: { icon: "text-primary", ink: "text-primary" },
  warning: { icon: "text-warning", ink: "text-foreground" },
  destructive: { icon: "text-destructive", ink: "text-destructive" },
  muted: { icon: "text-muted-foreground", ink: "text-muted-foreground" },
} as const satisfies Record<RefundTone, { readonly icon: string; readonly ink: string }>;

type When = Date | string;

/**
 * Amounts as the receipts print them: the ฿ sign in English too (the named
 * format alone writes "THB"), and satang only when there are some, so half
 * of an odd fee is not rounded away.
 */
export function useRefundFormat() {
  const format = useFormatter();
  const clock = (date: When) =>
    format.dateTime(new Date(date), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const day = (date: When) =>
    format.dateTime(new Date(date), { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return {
    baht: (satang: number) => {
      const digits = satang % 100 === 0 ? 0 : 2;
      return format.number(baht(satang), "baht", {
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    },
    day,
    clock,
    deadline: (date: When) => `${day(date)} · ${clock(date)}`,
    short: (date: When) =>
      format.dateTime(new Date(date), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    stamp: (date: When) =>
      `${format.dateTime(new Date(date), { day: "numeric", month: "short", year: "numeric" })} · ${clock(date)}`,
  };
}

/** No-break spaces, so a wrapping line never leaves the last four digits alone. */
export function cardName(card: NonNullable<ApiAdviseeInvoice["card"]>): string {
  return `${card.brand} •••• ${card.lastDigits}`;
}

export function useSupportMail(invoiceNumber: string): string {
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const subject = encodeURIComponent(tr("supportSubject", { number: invoiceNumber }));
  return `mailto:${l("footerEmailAddress")}?subject=${subject}`;
}

/**
 * From `lg` the page is the bookings' wide column, so the sheet opens into
 * two cells (head left, sections right behind a dashed rule) rather than
 * stretching one receipt across it.
 */
export function RefundCard({
  head,
  children,
  className,
}: {
  readonly head: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-card border border-hero-card-border bg-card shadow-hero-card lg:grid lg:grid-cols-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">{head}</div>
      <div className="flex min-w-0 flex-col lg:border-l lg:border-dashed lg:border-border">{children}</div>
    </article>
  );
}

/** `pt-6`: the receipt's own top inset, which its logo row takes and this sheet has no logo row for. */
export function RefundHead({
  icon: Icon,
  tone,
  title,
  amount,
  meta,
  children,
}: {
  readonly icon: LucideIcon;
  readonly tone: RefundTone;
  readonly title: string;
  readonly amount: string;
  readonly meta?: string;
  readonly children?: ReactNode;
}) {
  const look = TONE[tone];

  return (
    <section className={cn("flex flex-col pt-6 pb-3 md:pb-4 lg:pt-9 lg:pb-8", SHEET_X)}>
      <h1 className={cn("flex items-center gap-1.5 text-xs font-medium lg:gap-2 lg:text-frame-meta", look.ink)}>
        <Icon aria-hidden className={cn("size-4 shrink-0 lg:size-5", look.icon)} />
        {title}
      </h1>
      <p className="font-latin mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-hero-ink lg:mt-2 lg:text-frame-title">
        {amount}
      </p>
      {meta ? (
        <p className="mt-1.5 text-xs text-muted-foreground lg:text-frame-meta">
          <Figures>{meta}</Figures>
        </p>
      ) : null}
      {children}
    </section>
  );
}

function Fact({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground lg:text-frame-label">{label}</dt>
      <dd className={cn("text-xs break-words text-foreground lg:text-frame-meta", className)}>{children}</dd>
    </div>
  );
}

/** The booking's hours, not the invoice's: a rescheduled booking's invoice still names the first time. */
export function RefundFacts({
  booking,
  invoice,
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
}) {
  const t = useTranslations("bookingRefund");
  const tr = useTranslations("transactions");
  const when = useRefundFormat();

  return (
    <dl className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 md:mt-3 md:gap-y-2.5 lg:mt-7 lg:gap-x-6 lg:gap-y-5">
      <Fact label={tr("advisorLabel")}>{invoice.advisor.displayName}</Fact>
      <Fact label={tr("sessionDateLabel")}>
        <span className="block">
          <Figures>{when.day(booking.startTime)}</Figures>
        </span>
        <span className="block">
          <Figures>{tr("timeRange", { from: when.clock(booking.startTime), to: when.clock(booking.endTime) })}</Figures>
        </span>
      </Fact>
      <Fact label={tr("serviceLabel")}>{invoice.service.name}</Fact>
      {invoice.card ? (
        <Fact className="font-latin" label={t("facts.refundTo")}>
          <span className="inline-flex items-center gap-2">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            {cardName(invoice.card)}
          </span>
        </Fact>
      ) : (
        <Fact label={t("facts.refundTo")}>{t("facts.paymentMethod")}</Fact>
      )}
    </dl>
  );
}

export type RefundBoxLine = { readonly label: string; readonly value: string };

export function RefundBox({
  heading,
  lines,
  total,
}: {
  readonly heading?: string;
  readonly lines: readonly RefundBoxLine[];
  readonly total: RefundBoxLine;
}) {
  return (
    <div className="mt-4 md:mt-5 lg:mt-7">
      {heading ? <h2 className="mb-1.5 text-xs font-medium text-muted-foreground md:mb-2 lg:mb-4 lg:text-frame-label">{heading}</h2> : null}
      <dl className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5 md:gap-2 md:p-3 lg:gap-4 lg:p-5">
        {lines.map((line) => (
          <div className="flex items-baseline justify-between gap-4" key={line.label}>
            <dt className="min-w-0 text-xs text-muted-foreground lg:text-frame-meta">{line.label}</dt>
            <dd className="shrink-0 text-right font-latin text-xs whitespace-nowrap text-foreground tabular-nums lg:text-frame-meta">
              {line.value}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3 lg:pt-4">
          <dt className="text-xs font-semibold text-foreground lg:text-frame-body">{total.label}</dt>
          <dd className="font-latin text-sm font-semibold tabular-nums text-foreground lg:text-frame-figure">{total.value}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * From `lg` the first section sits at the top of the card's right cell, whose
 * dashed edge already divides it from the head, so it drops its own rule and
 * starts level with the head.
 */
export function RefundSection({ heading, children }: { readonly heading: string; readonly children: ReactNode }) {
  return (
    <section
      className={cn(
        "border-t border-dashed border-border pt-2.5 pb-3 md:pt-3 md:pb-4 lg:pt-6 lg:pb-9 lg:first:border-t-0 lg:first:pt-9",
        SHEET_X,
      )}
    >
      <h2 className="text-xs font-medium text-muted-foreground lg:text-frame-label">{heading}</h2>
      <div className="mt-3 lg:mt-4">{children}</div>
    </section>
  );
}

export function RefundList({ ordered = false, children }: { readonly ordered?: boolean; readonly children: ReactNode }) {
  const List = ordered ? "ol" : "ul";
  return <List className="flex flex-col gap-3.5">{children}</List>;
}

export function RefundRow({
  icon: Icon,
  tone = "muted",
  title,
  sub,
  current = false,
  trailing,
}: {
  readonly icon: LucideIcon;
  /** Colours the mark only; the words follow `current`. */
  readonly tone?: RefundTone;
  readonly title: string;
  readonly sub?: string;
  readonly current?: boolean;
  readonly trailing?: ReactNode;
}) {
  return (
    <li aria-current={current || undefined} className="flex items-start gap-3">
      <Icon aria-hidden className={cn("size-5 shrink-0 lg:mt-0.5", TONE[tone].icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn("text-sm lg:text-frame-meta", current ? "font-medium text-foreground" : "text-muted-foreground")}>
          <Figures>{title}</Figures>
        </p>
        {sub ? (
          <p className="text-xs text-muted-foreground lg:text-frame-label">
            <Figures>{sub}</Figures>
          </p>
        ) : null}
      </div>
      {trailing}
    </li>
  );
}

/** `md:h-11`: an upright tablet keeps the phone's 44, since the sheet there is a phone's width. */
export function refundPill(kind: "solid" | "outline" | "danger"): string {
  return cn(
    authPill(kind !== "outline"),
    "md:h-11 md:text-sm",
    PILL_LG,
    kind === "danger" && "bg-destructive text-primary-foreground hover:bg-destructive/90",
  );
}

/**
 * From `lg` the buttons are the receipt's own column, centred under the whole
 * card: they act on the sheet, not on either of its two cells.
 */
export function RefundActions({
  children,
  invoiceNumber,
}: {
  readonly children: ReactNode;
  readonly invoiceNumber: string;
}) {
  const t = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const mail = useSupportMail(invoiceNumber);

  return (
    <div className={cn("flex w-full flex-col gap-2.5 md:gap-3 lg:mx-auto lg:gap-4", SHEET_W)}>
      <div className="flex flex-col gap-2.5">{children}</div>
      <p className="text-center text-xs text-muted-foreground lg:text-frame-label">
        {t("helpPrompt")}{" "}
        <a
          className={cn(AUTH_LINK, "rounded-sm py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}
          href={mail}
        >
          {tr("contactSupport")}
        </a>
      </p>
    </div>
  );
}
