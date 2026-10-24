"use client";

import {
  ChevronRight,
  CircleCheckBig,
  CreditCard,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { Figures } from "@/components/figures";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import {
  RECEIPTS,
  RECEIPT_HREF,
  TRANSACTIONS,
  groupByMonth,
  type Receipt,
  type Transaction,
  type TransactionStatus,
} from "@/components/payment/transactions-data";
import { Button } from "@/components/ui/button";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Figma "Back Bar" + "Head Band" / "Hero Band": the page title on the card
 * surface behind a hairline, full-bleed, over the page ground.
 *
 * The receipts below no longer draw it; the checkout and card screens still
 * do, and import it from here.
 */
export const PAGE_HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * Figma "Body": 788 + 32 + 380 on the 1200 column `PAGE` establishes. The third
 * row is the flexible one, which lets the aside's two blocks sit tight together
 * at the top while the main column runs on past them.
 *
 * Kept here for the checkout and card screens, which lay out on it.
 */
export const BODY_GRID = cn(
  "flex w-full flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-8 lg:pt-12 lg:pb-14",
  PAGE,
);

/**
 * The phone's side margin, and the tablet's. From `lg` the account column
 * (`AccountShell`) owns the inset, so the blocks drop theirs there.
 */
const GUTTER = "px-5 md:px-10 lg:px-0";

/**
 * The capsule from `lg`. The account column is drawn at 1710 and zoomed (×0.84
 * on a 1440 screen), so `authPill`'s 48px / 16px would land near 40 / 13.
 */
const PILL_LG = "lg:h-14 lg:px-8 lg:text-lg";

/** How each outcome is said: its pill, its mark, and the panel that explains it. */
const OUTCOME = {
  paid: {
    tone: "success",
    icon: CircleCheckBig,
    mark: "bg-success-surface text-success",
    panel: "bg-success-surface/60",
    ink: "text-success",
  },
  refunded: {
    tone: "info",
    icon: RotateCcw,
    mark: "bg-accent-surface text-primary",
    panel: "bg-accent-surface/60",
    ink: "text-primary",
  },
  failed: {
    tone: "danger",
    icon: TriangleAlert,
    mark: "bg-destructive/10 text-destructive",
    panel: "bg-destructive/6",
    ink: "text-destructive",
  },
} as const satisfies Record<
  TransactionStatus,
  {
    readonly tone: StatusTone;
    readonly icon: LucideIcon;
    readonly mark: string;
    readonly panel: string;
    readonly ink: string;
  }
>;

/** Baht as the reader's language writes it, always with the ฿ sign. */
function useBaht(): (value: number) => string {
  const format = useFormatter();
  return (value) =>
    format.number(value, {
      style: "currency",
      currency: "THB",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
}

/**
 * The frame both money pages share. On the phone it is the back chevron and the
 * page; from `lg` the app frame (`AppFrame`), whose rail is the way between the
 * account's pages, with the page in its white panel.
 *
 * `wide="md"`: a tablet held upright gets the phone layout at its own width,
 * rather than a phone-width strip between grey margins.
 */
function TransactionsFrame({
  back,
  children,
}: {
  readonly back: string;
  readonly children: ReactNode;
}) {
  const c = useTranslations("common");

  return (
    <MobileScreen className="bg-card" wide="md">
      <ScreenTopBar className="lg:hidden" href={back} label={c("back")} />
      <AppFrame active="payments">
        <ScreenBody className="bg-card">
          <AccountShell active="transactions">{children}</AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/* ------------------------------------------------------------------ history */

const FILTERS = ["all", "paid", "refunded", "failed"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * What the history adds up to: everything that was actually charged, which is
 * the paid rows only. A refunded row was charged and returned, a failed one
 * never charged. Beside it, the one standing fact about where that money is.
 */
function PaidSummary({
  rows,
  className,
}: {
  readonly rows: readonly Transaction[];
  readonly className?: string;
}) {
  const t = useTranslations("transactions");
  const baht = useBaht();
  const label = useId();
  const paid = rows.filter((row) => row.status === "paid");
  const total = paid.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className={cn("w-full shrink-0", GUTTER, className)}>
      {/* The home hero's two lights, faintly, behind the one figure on the page. */}
      <section
        aria-labelledby={label}
        className="flex flex-col gap-5 rounded-card border border-hero-card-border bg-card bg-legal-wash p-5 shadow-hero-card md:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8 lg:py-7"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground lg:text-base" id={label}>
            {t("summaryLabel")}
          </p>
          <p className="font-latin text-3xl font-semibold tracking-tight tabular-nums text-hero-ink md:text-4xl lg:text-frame-title">
            {baht(total)}
          </p>
          <p className="text-sm text-muted-foreground lg:text-base">
            <Figures>{t("summaryCount", { count: paid.length })}</Figures>
          </p>
        </div>
        <p className="flex items-start gap-3 rounded-xl bg-card/80 p-3.5 text-sm text-foreground lg:max-w-sm lg:p-4 lg:text-base">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-surface text-success lg:size-10">
            <ShieldCheck aria-hidden className="size-4.5 lg:size-5" />
          </span>
          <span className="pt-1 lg:pt-2">{t("escrowNote")}</span>
        </p>
      </section>
    </div>
  );
}

/**
 * The four outcomes as pill toggles, each with how many rows it holds, the
 * chosen one in the hero's black like the search page's chips. 44px on the
 * phone and 52 from `lg`: they are the page's buttons.
 */
function StatusFilter({
  value,
  counts,
  onChange,
  className,
}: {
  readonly value: Filter;
  readonly counts: Readonly<Record<Filter, number>>;
  readonly onChange: (next: Filter) => void;
  readonly className?: string;
}) {
  const t = useTranslations("transactions");

  return (
    // `<fieldset>`: a group by its own semantics; reset so it lays out as the row it was.
    <fieldset
      aria-label={t("filterLabel")}
      className={cn("flex w-full min-w-0 shrink-0 gap-2 overflow-x-auto border-0 py-0", GUTTER, className)}
    >
      {FILTERS.map((key) => {
        const active = key === value;
        return (
          <Button
            aria-pressed={active}
            className={cn(
              "h-11 shrink-0 gap-2 rounded-full px-4 text-sm font-medium shadow-none lg:h-13 lg:px-6 lg:text-base",
              active
                ? // The outline variant darkens its ink on hover; the chosen pill keeps its white.
                  "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            key={key}
            onClick={() => onChange(key)}
            type="button"
            variant="outline"
          >
            {key === "all" ? t("filterAll") : t(`status.${key}`)}
            <span
              className={cn(
                "font-latin text-xs font-normal tabular-nums lg:text-base",
                active ? "text-hero-action-foreground/70" : "text-muted-foreground",
              )}
            >
              {counts[key]}
            </span>
          </Button>
        );
      })}
    </fieldset>
  );
}

/**
 * One payment: the day as a tile (the month is the group's heading already),
 * what it was for and with whom, then the amount and how it ended.
 *
 * On the phone the amount sits over its status at the right edge. From `lg`
 * the row is a grid and each takes a column of its own, status first, so the
 * figures line up down the right edge the way a statement's do. Only a paid
 * row's amount is in full ink: the others are money that did not leave, or
 * came back.
 */
function TransactionRow({ row }: { readonly row: Transaction }) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const baht = useBaht();
  const date = new Date(row.date);
  const look = OUTCOME[row.status];

  return (
    <Link
      className="group grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3.5 px-4 py-3.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none md:px-5 lg:grid-cols-[4rem_minmax(0,1fr)_12rem_8rem_1.25rem] lg:gap-x-6 lg:px-7 lg:py-5"
      href={RECEIPT_HREF[row.status]}
    >
      <span
        aria-hidden
        className="flex size-11 flex-col items-center justify-center gap-1 rounded-xl bg-muted lg:size-16 lg:gap-1.5 lg:rounded-2xl"
      >
        <span className="text-xs leading-none text-muted-foreground lg:text-base lg:leading-none">
          {format.dateTime(date, { weekday: "short" })}
        </span>
        <span className="font-latin text-base leading-none font-semibold tabular-nums text-foreground lg:text-xl lg:leading-none">
          {format.dateTime(date, { day: "numeric" })}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground md:text-base lg:text-lg">
          {t(`services.${row.service}`)}
        </span>
        <span className="truncate text-xs text-muted-foreground md:text-sm lg:text-base">
          {row.advisor}
          <span className="sr-only">
            {", "}
            {format.dateTime(date, { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </span>
      </span>
      <span className="flex flex-col items-end gap-1 lg:contents">
        <span
          className={cn(
            "font-latin text-sm font-semibold whitespace-nowrap tabular-nums md:text-base lg:order-2 lg:justify-self-end lg:text-xl",
            row.status === "paid" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {baht(row.amount)}
        </span>
        <StatusPill
          className="lg:order-1 lg:justify-self-start lg:px-3.5 lg:py-1.5 lg:text-base"
          icon={look.icon}
          tone={look.tone}
        >
          {t(`status.${row.status}`)}
        </StatusPill>
      </span>
      <ChevronRight
        aria-hidden
        className="hidden size-5 text-muted-foreground transition-colors duration-150 group-hover:text-foreground motion-reduce:transition-none lg:order-3 lg:block"
      />
    </Link>
  );
}

/**
 * A month: its name and how many payments it holds, then one card of rows.
 * No rule under every row; the tile, the padding and the hover keep them
 * apart, and the card is what groups them.
 */
function MonthGroup({
  date,
  rows,
}: {
  readonly date: Date;
  readonly rows: readonly Transaction[];
}) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const heading = useId();

  return (
    <section aria-labelledby={heading} className="flex w-full flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-base font-semibold text-foreground lg:text-xl" id={heading}>
          <Figures>{format.dateTime(date, { month: "long", year: "numeric" })}</Figures>
        </h2>
        <span className="text-sm text-muted-foreground lg:text-base">
          <Figures>{t("monthCount", { count: rows.length })}</Figures>
        </span>
      </div>
      <ul className="flex flex-col overflow-hidden rounded-card border border-hero-card-border bg-card shadow-hero-card">
        {rows.map((row) => (
          <li key={row.id}>
            <TransactionRow row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Nothing to list: none at all yet, or none with the chosen status. */
function HistoryEmpty({
  filtered = false,
  onShowAll,
  className,
}: {
  readonly filtered?: boolean;
  readonly onShowAll?: () => void;
  readonly className?: string;
}) {
  const t = useTranslations("transactions");

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 px-6 py-14 text-center lg:py-20",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <ReceiptText aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground md:text-xl">
          {filtered ? t("filteredEmptyTitle") : t("emptyTitle")}
        </h2>
        <p className="text-sm text-balance text-muted-foreground md:text-base">
          {filtered ? t("filteredEmptyBody") : t("emptyBody")}
        </p>
      </div>
      {filtered ? (
        <Button className={cn(authPill(), "w-auto", PILL_LG)} onClick={onShowAll} type="button" variant="outline">
          {t("showAll")}
        </Button>
      ) : (
        <Button
          className={cn(authPill(true), "w-auto", PILL_LG)}
          nativeButton={false}
          render={<Link href="/search" />}
        >
          {t("findExpert")}
        </Button>
      )}
    </div>
  );
}

/**
 * `/transactions`: the advisee's money history, newest first and grouped by
 * month, under what it all adds up to and a filter by outcome.
 *
 * The rows are the sample fixture (`transactions-data.ts`): there is no
 * advisee-facing invoice route to read yet, so there is nothing to wait for
 * and nothing that can fail here.
 */
export function TransactionHistoryScreen() {
  const t = useTranslations("transactions");
  const [filter, setFilter] = useState<Filter>("all");
  const rows = filter === "all" ? TRANSACTIONS : TRANSACTIONS.filter((row) => row.status === filter);
  const counts: Record<Filter, number> = {
    all: TRANSACTIONS.length,
    paid: TRANSACTIONS.filter((row) => row.status === "paid").length,
    refunded: TRANSACTIONS.filter((row) => row.status === "refunded").length,
    failed: TRANSACTIONS.filter((row) => row.status === "failed").length,
  };

  return (
    <TransactionsFrame back="/profile">
      <header className={cn("flex w-full shrink-0 flex-col gap-1.5 pt-2 lg:pt-0", GUTTER)}>
        <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-heading-lg lg:text-frame-title">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base lg:text-lg">{t("subtitle")}</p>
      </header>

      {TRANSACTIONS.length === 0 ? (
        <HistoryEmpty className="mt-4 pb-10 lg:pb-0" />
      ) : (
        <>
          <PaidSummary className="mt-6 lg:mt-8" rows={TRANSACTIONS} />
          <StatusFilter className="mt-7 lg:mt-10" counts={counts} onChange={setFilter} value={filter} />
          {/* Says what the filter left, for a reader who cannot see the list change. */}
          <p aria-live="polite" className="sr-only">
            {t("showing", { count: rows.length })}
          </p>
          <div className={cn("mt-5 flex w-full flex-col gap-7 pb-10 lg:mt-6 lg:gap-9 lg:pb-0", GUTTER)}>
            {rows.length === 0 ? (
              <HistoryEmpty filtered onShowAll={() => setFilter("all")} />
            ) : (
              groupByMonth(rows).map((group) => (
                <MonthGroup date={group.date} key={group.key} rows={group.rows} />
              ))
            )}
          </div>
        </>
      )}
    </TransactionsFrame>
  );
}

/* ------------------------------------------------------------------ receipt */

/** The outcome's mark at the head of the receipt, in its status colour. */
function StatusMark({ status }: { readonly status: TransactionStatus }) {
  const look = OUTCOME[status];
  const Icon = look.icon;

  return (
    <span className={cn("flex size-14 items-center justify-center rounded-full lg:size-16", look.mark)}>
      <Icon aria-hidden className="size-7 lg:size-8" />
    </span>
  );
}

/** A receipt line: what, then how much or which, in a definition list. */
function Line({
  label,
  value,
  latin = false,
  valueClassName,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /** The value is a Latin run (an amount, a reference): the Latin face, tabular figures. */
  readonly latin?: boolean;
  readonly valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground lg:text-base">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm break-words text-foreground lg:text-lg",
          latin && "font-latin tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The card as a receipt names it, "Visa •••• 4242", held together with
 * no-break spaces so a wrapping sentence never leaves the last four digits on
 * a line of their own.
 */
function cardName(receipt: Receipt): string {
  return `${receipt.card.brand} •••• ${receipt.card.last4}`;
}

/** A receipt's perforation between its parts. */
function Perforation() {
  return <div aria-hidden className="mx-5 border-t border-dashed border-border md:mx-6 lg:mx-10" />;
}

const RECEIPT_PART = "flex flex-col gap-3 px-5 py-5 md:px-6 lg:px-10 lg:py-6";

/**
 * The receipt itself, top to bottom the way a paper one reads: how it ended
 * and for how much, what was bought, what it cost, and how it was paid.
 */
function ReceiptCard({ receipt }: { readonly receipt: Receipt }) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const baht = useBaht();
  const look = OUTCOME[receipt.status];
  const at = new Date(receipt.at);
  const clock = (iso: string) =>
    format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const service = t(`services.${receipt.service}`);
  const card = cardName(receipt);
  const charged = receipt.price + receipt.fee;
  // A refund's receipt leads with what came back; the others with what was asked for.
  const headline = receipt.status === "refunded" ? (receipt.refund ?? charged) : charged;
  const { from, to } = receipt.session;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-card border border-hero-card-border bg-card shadow-hero-card">
      <header className="flex flex-col items-center px-6 pt-8 pb-7 text-center lg:px-10 lg:pt-10 lg:pb-8">
        <StatusMark status={receipt.status} />
        <h1 className="mt-4 font-hero text-xl font-normal tracking-tight text-hero-ink md:text-2xl lg:mt-5 lg:text-frame-title">
          {t(`headline.${receipt.status}`)}
        </h1>
        <p className="font-latin mt-1.5 text-4xl font-semibold tracking-tight tabular-nums text-foreground lg:text-hero">
          {baht(headline)}
        </p>
        <StatusPill className="mt-3 lg:mt-4 lg:px-3.5 lg:py-1.5 lg:text-base" icon={look.icon} tone={look.tone}>
          {t(`pill.${receipt.status}`)}
        </StatusPill>
        <p className="mt-3 text-sm text-muted-foreground lg:text-base">
          <Figures>
            {t(`at.${receipt.status}`, {
              date: format.dateTime(at, { day: "numeric", month: "short", year: "numeric" }),
              time: clock(receipt.at),
            })}
          </Figures>
        </p>
      </header>

      <Perforation />
      <dl className={RECEIPT_PART}>
        <Line label={t("serviceLabel")} value={service} />
        <Line label={t("advisorLabel")} value={receipt.advisor} />
        <Line
          label={receipt.booking === "unconfirmed" ? t("requestedDateLabel") : t("sessionDateLabel")}
          value={
            <Figures>
              {format.dateTime(new Date(receipt.session.date), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Figures>
          }
        />
        {from && to ? (
          <Line
            label={t("timeLabel")}
            value={<Figures>{t("timeRange", { from: clock(from), to: clock(to) })}</Figures>}
          />
        ) : null}
        {receipt.booking ? (
          <Line
            label={t("bookingLabel")}
            value={t(`booking.${receipt.booking}`)}
            valueClassName="font-medium text-destructive"
          />
        ) : null}
      </dl>

      <Perforation />
      <dl className={RECEIPT_PART}>
        <Line label={service} latin value={baht(receipt.price)} />
        <Line label={t("feeLabel")} latin value={baht(receipt.fee)} />
        {receipt.refund ? (
          // U+2212, a true minus: the figure lines up with the ones above it.
          <Line label={t("refundLabel")} latin value={`−${baht(receipt.refund)}`} />
        ) : null}
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="text-base font-semibold text-foreground lg:text-xl">{t(`total.${receipt.status}`)}</dt>
          <dd className="font-latin text-2xl font-semibold tracking-tight tabular-nums text-foreground lg:text-2xl">
            {baht(charged - (receipt.refund ?? 0))}
          </dd>
        </div>
      </dl>

      <Perforation />
      <dl className={RECEIPT_PART}>
        <Line
          label={t(`cardLabel.${receipt.status}`)}
          latin
          value={
            <span className="inline-flex items-center gap-2">
              <CreditCard aria-hidden className="size-4 text-muted-foreground" />
              {card}
            </span>
          }
        />
        {receipt.status === "failed" ? (
          <Line label={t("reasonLabel")} value={t("reasonValue")} valueClassName="text-destructive" />
        ) : null}
        <Line label={t("invoiceNoLabel")} latin value={receipt.invoiceNo} />
        <Line label={t("chargeIdLabel")} latin value={receipt.chargeId} valueClassName="text-muted-foreground" />
      </dl>
    </article>
  );
}

/**
 * What the outcome means and what to do about it: the escrow promise under a
 * paid receipt; for a declined one, that nothing was taken and the way to pay
 * again; for a refund, where the money went and that a bank can take a while
 * to show it. Then a way to ask about it, quoting the receipt number.
 */
function NextSteps({ receipt }: { readonly receipt: Receipt }) {
  const t = useTranslations("transactions");
  const l = useTranslations("landing");
  const baht = useBaht();
  const look = OUTCOME[receipt.status];
  const card = cardName(receipt);

  const notes: Record<TransactionStatus, { icon: LucideIcon; title?: string; body: string }> = {
    paid: { icon: ShieldCheck, body: t("escrowNote") },
    failed: { icon: look.icon, title: t("failedTitle"), body: t("failedBody") },
    refunded: {
      icon: look.icon,
      title: t("refundedTitle", { amount: baht(receipt.refund ?? 0), card }),
      body: t("refundedBody"),
    },
  };
  const actions: Record<TransactionStatus, readonly { label: string; href: string; solid: boolean }[]> = {
    paid: [{ label: t("viewBookings"), href: "/bookings", solid: true }],
    failed: [{ label: t("payAgain"), href: "/checkout/card", solid: true }],
    refunded: [
      { label: t("findExpert"), href: "/search", solid: true },
      { label: t("viewBookings"), href: "/bookings", solid: false },
    ],
  };
  const note = notes[receipt.status];
  const NoteIcon = note.icon;
  const subject = encodeURIComponent(t("supportSubject", { number: receipt.invoiceNo }));

  return (
    <aside className="w-full lg:sticky lg:top-28">
      <div className="flex flex-col gap-4">
        <div className={cn("flex items-start gap-3 rounded-card p-4 lg:p-5", look.panel)}>
          <NoteIcon aria-hidden className={cn("mt-0.5 size-5 shrink-0", look.ink)} />
          <div className="flex min-w-0 flex-col gap-1">
            {note.title ? (
              <p className="text-sm font-semibold text-foreground lg:text-lg">
                <Figures>{note.title}</Figures>
              </p>
            ) : null}
            <p className="text-sm text-foreground/80 lg:text-base">{note.body}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {actions[receipt.status].map((action) => (
            <Button
              className={cn(authPill(action.solid), PILL_LG)}
              key={action.href}
              nativeButton={false}
              render={<Link href={action.href} />}
              variant={action.solid ? "default" : "outline"}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4 text-sm lg:text-base">
          <p className="text-muted-foreground">{t("helpPrompt")}</p>
          <p className="flex flex-wrap items-center gap-x-5">
            <a
              className={cn(AUTH_LINK, "py-1.5")}
              href={`mailto:${l("footerEmailAddress")}?subject=${subject}`}
            >
              {t("contactSupport")}
            </a>
            <Link className={cn(AUTH_LINK, "py-1.5")} href="/landing#faq">
              {t("faq")}
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * `/transactions/detail` and its `failed` / `refunded` siblings: one receipt.
 *
 * The receipt is a single card that reads like paper; beside it from `lg`
 * (under it on the phone) is what the outcome means and what to do next. The
 * app bar's sidebar is the way back on a desktop, with the breadcrumb saying
 * where this sits; the phone has its back chevron.
 *
 * No download: the old button had nothing behind it, and a control that does
 * nothing on a money page costs more trust than it adds.
 */
export function InvoiceDetailScreen({ state }: { readonly state: TransactionStatus }) {
  const t = useTranslations("transactions");
  const receipt = RECEIPTS[state];

  return (
    <TransactionsFrame back="/transactions">
      <nav aria-label={t("breadcrumbLabel")} className="hidden text-base text-muted-foreground lg:block">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="transition-colors hover:text-foreground" href="/transactions">
              {t("title")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-latin text-foreground">
            {receipt.invoiceNo}
          </li>
        </ol>
      </nav>

      <div
        className={cn(
          "flex w-full flex-col gap-5 pt-2 pb-10 md:mx-auto md:max-w-2xl lg:mt-6 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-10 lg:pt-0 lg:pb-0",
          GUTTER,
        )}
      >
        <ReceiptCard receipt={receipt} />
        <NextSteps receipt={receipt} />
      </div>
    </TransactionsFrame>
  );
}
