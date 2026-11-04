"use client";

import { CreditCard, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Children, createContext, Fragment, useContext, type ReactNode } from "react";

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
    /** No-break spaces: a wrapping line moves the whole deadline down, never half of it. */
    deadline: (date: When) => `${day(date)} · ${clock(date)}`.replaceAll(" ", "\u{a0}"),
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

/** "฿1,000 back to Visa •••• 1111": the refund step, in every list of steps that has one. */
export function useRefundLine(invoice: ApiAdviseeInvoice): (satang: number) => string {
  const t = useTranslations("bookingRefund");
  const when = useRefundFormat();
  return (satang) =>
    invoice.card
      ? t("progress.refund", { amount: when.baht(satang), card: cardName(invoice.card) })
      : t("progress.refundNoCard", { amount: when.baht(satang) });
}

export function useSupportMail(invoiceNumber: string): string {
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const subject = encodeURIComponent(tr("supportSubject", { number: invoiceNumber }));
  return `mailto:${l("footerEmailAddress")}?subject=${subject}`;
}

/** The head from `lg`: two cells (head and sections), or one across the card. */
type HeadShape = "split" | "wide";

/** The head a foot runs under, whose columns a list in the foot puts its rows on. */
const FootUnder = createContext<HeadShape | null>(null);

/**
 * From `lg` the page is the bookings' wide column, so the sheet opens into
 * two cells (head left, sections right behind a dashed rule) rather than
 * stretching one receipt across it.
 *
 * `foot` runs across the whole card under the cells, its lists on the head's
 * columns. On a phone it follows the other sections, in the order the task is
 * done.
 */
export function RefundCard({
  head,
  foot,
  children,
  className,
}: {
  readonly head: ReactNode;
  readonly foot?: ReactNode;
  /** None: the head takes the whole width and the foot runs under it, so no half-empty cell stands beside it. */
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  const shape: HeadShape = children ? "split" : "wide";

  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-card border border-hero-card-border bg-card shadow-hero-card lg:grid lg:grid-cols-2",
        className,
      )}
    >
      <div
        className={cn("group/head flex min-w-0 flex-col lg:col-start-1 lg:row-start-1", shape === "wide" && "lg:col-span-2")}
        data-cell="head"
        data-wide={shape === "wide" ? "" : undefined}
      >
        {head}
      </div>
      {children ? (
        <div
          className="group/cell flex min-w-0 flex-col lg:col-start-2 lg:row-start-1 lg:border-l lg:border-dashed lg:border-border"
          data-cell="sections"
        >
          {children}
        </div>
      ) : null}
      {foot ? (
        <div className="flex min-w-0 flex-col lg:col-span-2 lg:row-start-2" data-cell="foot">
          <FootUnder value={shape}>{foot}</FootUnder>
        </div>
      ) : null}
    </article>
  );
}

/** Breaks only between the parts. A part keeps whole while it fits a line, and wraps inside itself once it does not. */
function MetaParts({ parts }: { readonly parts: readonly string[] }) {
  return parts.map((part, index) => (
    <Fragment key={part}>
      {index > 0 ? " " : null}
      <span className="inline-block">
        <Figures>{index < parts.length - 1 ? `${part}\u{a0}·` : part}</Figures>
      </span>
    </Fragment>
  ));
}

/**
 * The card's type and spacing, without its colours. The page's skeleton
 * builds its bones in these same boxes, so the page does not jump when the
 * booking and its money land.
 */
export const REFUND_SHAPE = {
  /** `pt-6`: the receipt's own top inset, which its logo row takes and this sheet has no logo row for. */
  head: cn("flex flex-col pt-6 pb-3 md:pb-4 lg:pt-9 lg:pb-8", SHEET_X),
  status: "flex items-center gap-1.5 text-xs font-medium lg:gap-2 lg:text-frame-meta",
  statusIcon: "size-4 shrink-0 lg:size-5",
  amount: "font-latin mt-1.5 text-2xl font-semibold tracking-tight tabular-nums lg:mt-2 lg:text-frame-title",
  meta: "mt-1.5 text-xs lg:text-frame-meta",
  facts:
    "mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 md:mt-3 md:gap-y-2.5 lg:mt-7 lg:gap-x-6 lg:gap-y-5 lg:group-data-wide/head:grid-cols-4",
  fact: "flex min-w-0 flex-col gap-1",
  term: "text-xs lg:text-frame-label",
  value: "text-xs text-balance break-words lg:text-frame-meta",
  row: "flex items-start gap-3",
  rowIcon: "size-5 shrink-0 lg:mt-0.5",
  rowText: "flex min-w-0 flex-1 flex-col gap-0.5",
  rowLine: "flex flex-wrap items-center gap-x-2 gap-y-1",
  rowTitle: "min-w-0 text-sm text-balance lg:text-frame-meta",
  rowSub: "text-xs text-balance lg:text-frame-label",
} as const;

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
  /** As parts, the line is set as "a · b · c" and breaks only between them. */
  readonly meta?: string | readonly string[];
  readonly children?: ReactNode;
}) {
  const look = TONE[tone];

  return (
    <section className={REFUND_SHAPE.head}>
      <h1 className={cn(REFUND_SHAPE.status, look.ink)}>
        <Icon aria-hidden className={cn(REFUND_SHAPE.statusIcon, look.icon)} />
        {title}
      </h1>
      <p className={cn(REFUND_SHAPE.amount, "text-hero-ink")}>{amount}</p>
      {meta ? (
        <p className={cn(REFUND_SHAPE.meta, "text-muted-foreground")}>
          {typeof meta === "string" ? <Figures>{meta}</Figures> : <MetaParts parts={meta} />}
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
    <div className={REFUND_SHAPE.fact}>
      <dt className={cn(REFUND_SHAPE.term, "text-muted-foreground")}>{label}</dt>
      <dd className={cn(REFUND_SHAPE.value, "text-foreground", className)}>{children}</dd>
    </div>
  );
}

/** What the card fact calls the card: where the money goes back, or only how it was paid once none will. */
export type CardFact = "refundTo" | "paidWith";

/** The booking's hours, not the invoice's: a rescheduled booking's invoice still names the first time. */
export function RefundFacts({
  booking,
  invoice,
  card = "refundTo",
}: {
  readonly booking: ApiBooking;
  readonly invoice: ApiAdviseeInvoice;
  readonly card?: CardFact;
}) {
  const t = useTranslations("bookingRefund");
  const tr = useTranslations("transactions");
  const when = useRefundFormat();

  return (
    <dl className={REFUND_SHAPE.facts}>
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
        <Fact className="font-latin" label={t(`facts.${card}`)}>
          <span className="inline-flex items-center gap-2">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            {cardName(invoice.card)}
          </span>
        </Fact>
      ) : (
        <Fact label={t(`facts.${card}`)}>{t("facts.paymentMethod")}</Fact>
      )}
    </dl>
  );
}

/**
 * From `lg` the right cell is as tall as the head beside it. Its last section
 * grows into that height (`RefundSection`) and its box or list spreads down
 * it, so it ends on the head's last line, at the head's own bottom inset.
 */
const CELL_SPREAD = "lg:group-data-[cell=sections]/cell:grow lg:group-data-[cell=sections]/cell:justify-between";

export type RefundBoxLine = { readonly label: string; readonly value: string };

/** The half refund's lines on the receipt's faint ground; it sits in a `RefundSection`, which heads it. */
export function RefundBox({ lines, total }: { readonly lines: readonly RefundBoxLine[]; readonly total: RefundBoxLine }) {
  return (
    <dl className={cn("flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5 md:gap-2 md:p-3 lg:gap-4 lg:p-5", CELL_SPREAD)}>
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
  );
}

/** A section's heading, and a form field's title inside a section, which reads as one of them. */
export const REFUND_HEADING = "text-xs font-medium text-muted-foreground lg:text-frame-label";

/** A section's dashed rule and insets. */
export const REFUND_SECTION = cn("border-t border-dashed border-border pt-2.5 pb-3 md:pt-3 md:pb-4 lg:pt-6 lg:pb-9", SHEET_X);

/** From a section's heading down to what it heads. */
export const REFUND_UNDER_HEADING = "mt-1.5 md:mt-2 lg:mt-4";

/**
 * From `lg` the first section of the card's right cell sits at its top, whose
 * dashed edge already divides it from the head, so it drops its own rule and
 * starts level with the head. A section in the foot keeps its rule.
 */
export function RefundSection({ heading, children }: { readonly heading: ReactNode; readonly children: ReactNode }) {
  return (
    <section
      className={cn(
        REFUND_SECTION,
        "lg:group-data-[cell=sections]/cell:first:border-t-0 lg:group-data-[cell=sections]/cell:first:pt-9",
        "lg:group-data-[cell=sections]/cell:flex lg:group-data-[cell=sections]/cell:flex-col lg:group-data-[cell=sections]/cell:last:grow lg:group-data-[cell=sections]/cell:last:pb-8",
      )}
    >
      <h2 className={REFUND_HEADING}>{heading}</h2>
      <div
        className={cn(
          REFUND_UNDER_HEADING,
          "lg:group-data-[cell=sections]/cell:flex lg:group-data-[cell=sections]/cell:grow lg:group-data-[cell=sections]/cell:flex-col",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Where a list's rows go from `lg`. In a cell they run down it. In the foot
 * they run left to right as one line of time, each on a column of the head
 * above. A wide head's columns are its four facts, so the list takes their
 * grid. Under a two-cell head the list undoes its section's inset and spans
 * the card in quarters, one cell to each pair, for three or four rows. Each
 * pair of rows takes a cell's two columns: the cell's inset outside, its gap
 * split at the quarter. The right cell's rows start past where its rule
 * stands, and a third row that ends the list takes that cell's whole text.
 */
const LIST_LAYOUT = {
  cell: cn("flex flex-col gap-3.5", CELL_SPREAD),
  split:
    "flex flex-col gap-3.5 lg:-mx-10 lg:grid lg:grid-cols-4 lg:gap-x-0 lg:gap-y-6 lg:*:odd:pl-10 lg:*:not-last:odd:pr-3 lg:*:even:pl-3 lg:*:even:pr-10 lg:*:last:pr-10 lg:*:nth-3:border-l lg:*:nth-3:border-transparent lg:*:nth-3:last:col-span-2",
  wide: "flex flex-col gap-3.5 lg:grid lg:grid-cols-4 lg:gap-6",
} as const satisfies Record<HeadShape | "cell", string>;

export function RefundList({ ordered = false, children }: { readonly ordered?: boolean; readonly children: ReactNode }) {
  const List = ordered ? "ol" : "ul";
  const under = useContext(FootUnder);
  return <List className={LIST_LAYOUT[under ?? "cell"]}>{children}</List>;
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
  const subLine = sub ? (
    <p className={cn(REFUND_SHAPE.rowSub, "text-muted-foreground")}>
      <Figures>{sub}</Figures>
    </p>
  ) : null;

  // `trailing` sits on the sub line: after a dated title on a narrow track it would drop under it and grow the row.
  return (
    <li aria-current={current || undefined} className={REFUND_SHAPE.row}>
      <Icon aria-hidden className={cn(REFUND_SHAPE.rowIcon, TONE[tone].icon)} />
      <div className={REFUND_SHAPE.rowText}>
        <p className={cn(REFUND_SHAPE.rowTitle, current ? "font-medium text-foreground" : "text-muted-foreground")}>
          <Figures>{title}</Figures>
        </p>
        {trailing ? (
          <div className={REFUND_SHAPE.rowLine}>
            {subLine}
            {trailing}
          </div>
        ) : (
          subLine
        )}
      </div>
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
  help = true,
}: {
  readonly children: ReactNode;
  readonly invoiceNumber: string;
  /** Off when a button above already mails support, which the line would only say again. */
  readonly help?: boolean;
}) {
  const t = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const mail = useSupportMail(invoiceNumber);

  return (
    <div className={cn("flex w-full flex-col gap-2.5 md:gap-3 lg:mx-auto lg:gap-4", SHEET_W)}>
      {/* An empty group would still take a gap, pushing the help line off the card's rhythm. */}
      {Children.toArray(children).length > 0 ? <div className="flex flex-col gap-2.5">{children}</div> : null}
      {help ? (
        <p className="text-center text-xs text-muted-foreground lg:text-frame-label">
          {t("helpPrompt")}{" "}
          {/* 44 tall to tap, overhanging its line by 10 each way: the line grows only a little, and the gap keeps the link off the button above. */}
          <a
            className={cn(
              AUTH_LINK,
              "-my-2.5 inline-flex min-h-11 items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
            href={mail}
          >
            {tr("contactSupport")}
          </a>
        </p>
      ) : null}
    </div>
  );
}
