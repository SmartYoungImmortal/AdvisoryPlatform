"use client";

import {
  ChevronLeft,
  CircleCheckBig,
  Clock3,
  CreditCard,
  ReceiptText,
  RotateCcw,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTimeZone, useTranslations } from "next-intl";
import { Suspense, useCallback, useId, useState, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { AUTH_LINK, authPill } from "@/components/auth/auth-split";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import { Figures } from "@/components/figures";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import {
  groupByMonth,
  invoiceReceipt,
  invoiceTransaction,
  sampleHistory,
  sampleReceipt,
  type Receipt,
  type SampleStatus,
  type ServiceKey,
  type Transaction,
  type TransactionStatus,
} from "@/components/payment/transactions-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { DayGroup, FEED_COLUMN } from "@/components/notifications/notification-center-screen";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { ApiError, isApiConfigured, type Paginated } from "@/lib/api/client";
import { getMyInvoice, listMyInvoices } from "@/lib/api/resources";
import type { ApiAdviseeInvoice } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { logo } from "@/lib/assets/r2";
import { PAGE } from "@/lib/layout";
import { useSession } from "@/lib/session";
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
 * The booking sheet's capsules share it (`components/bookings/booking-sheet.tsx`).
 */
export const PILL_LG = "lg:h-14 lg:px-8 lg:text-lg";

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
const BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/**
 * `ApiErrorCard` is drawn at phone sizes; from `lg` it takes the frame's type
 * steps, since the column is zoomed down from 1710 there. The notification
 * centre's card, step for step.
 */
const ERROR_CARD_LG =
  "lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure";

/** How each outcome is said: its mark beside the receipt's heading, and its ink. */
const OUTCOME = {
  paid: { icon: CircleCheckBig, ink: "text-success" },
  refunded: { icon: RotateCcw, ink: "text-primary" },
  failed: { icon: TriangleAlert, ink: "text-destructive" },
  // Nothing has happened to the money yet: muted, not an alarm.
  pending: { icon: Clock3, ink: "text-muted-foreground" },
} as const satisfies Record<TransactionStatus, { readonly icon: LucideIcon; readonly ink: string }>;

/**
 * Satang as the reader's language writes baht, always with the ฿ sign. Whole
 * baht print as the receipts always have; the satang show only when there
 * are some, so a fee of 62.50 is not rounded on a receipt.
 */
function useBaht(): (satang: number) => string {
  const format = useFormatter();
  return (satang) => {
    const digits = satang % 100 === 0 ? 0 : 2;
    return format.number(satang / 100, {
      style: "currency",
      currency: "THB",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };
}

/** A sample's service in the reader's language. The API's arrive already named. */
function useServiceName(): (key: ServiceKey) => string {
  const t = useTranslations("transactions");
  return (key) => t(`services.${key}`);
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

type Filter = "all" | TransactionStatus;

/** The outcomes in the order their capsules sit, for the list to keep only the ones it has. */
const STATUS_ORDER: readonly TransactionStatus[] = ["paid", "refunded", "failed", "pending"];

/** The row's mark: what happened to the money, in the feed's soft grey circle. */
const ROW_ICON = {
  paid: CreditCard,
  refunded: RotateCcw,
  failed: TriangleAlert,
  pending: Clock3,
} as const satisfies Record<TransactionStatus, LucideIcon>;

/**
 * The page around the history, laid out like the notification centre: one
 * column in the app frame, the heading, the filters and the list.
 *
 * No running total of what the account has spent. The reader comes here to
 * check one charge or one refund, and a lifetime sum only puts the cost in
 * front of them before the next booking. Where the money waits (escrow) is
 * said on the paid receipt, where it is about that payment.
 *
 * From `lg` the page takes the notification feed's column (`FEED_COLUMN`), so
 * the title sits where that page's does as the rail moves between them, and
 * the rows run its width unboxed, a hairline between months, as the feed's
 * do. Rows rather than a table of columns: a table reads as a back office.
 *
 * `wide="md"`: a tablet held upright gets the phone layout at its own width.
 */
function HistoryFrame({ children }: { readonly children: ReactNode }) {
  return (
    <MobileScreen className="bg-card" wide="md">
      <AppFrame active="payments">
        <ScreenBody className="bg-card">
          <AccountShell active="transactions">
            {/* `lg:flex-1`: the column runs to the panel's foot, so an empty
                history's box can fill it (`HistoryEmpty`). */}
            <div className={cn("flex w-full min-w-0 flex-col pt-6 pb-12 lg:flex-1 lg:pt-0 lg:pb-0", FEED_COLUMN, GUTTER)}>
              {children}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
    </MobileScreen>
  );
}

/**
 * The heading: the phone's back chevron on a row of its own, then the title at
 * the frame's title step. The rail is the way back from `lg`.
 *
 * No search and no date filter: an advisee pays a few times a month at most,
 * so the list stays short and the month headings already index it by date.
 */
function HistoryHeader() {
  const t = useTranslations("transactions");
  const c = useTranslations("common");

  return (
    <header className="flex w-full flex-col items-start gap-3 lg:gap-0">
      <Button
        aria-label={c("back")}
        className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-[''] lg:hidden"
        nativeButton={false}
        render={<Link href="/profile" />}
        size="icon"
        variant="ghost"
      >
        <ChevronLeft aria-hidden className="size-6" />
      </Button>
      <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:text-frame-title">
        {t("title")}
      </h1>
    </header>
  );
}

/**
 * The filters as capsules, the chosen one filled in ink, the same as the
 * notification centre's. An outcome only gets a capsule when the list has it.
 */
function StatusFilter({
  value,
  kinds,
  onChange,
}: {
  readonly value: Filter;
  readonly kinds: readonly TransactionStatus[];
  readonly onChange: (next: Filter) => void;
}) {
  const t = useTranslations("transactions");
  const options: readonly Filter[] = ["all", ...kinds];

  return (
    // `<fieldset>`: a group by its own semantics; reset so it lays out as the row it was.
    <fieldset
      aria-label={t("filterLabel")}
      className="-mx-5 flex min-w-0 gap-2 overflow-x-auto border-0 px-5 py-0 md:-mx-10 md:px-10 lg:mx-0 lg:gap-3 lg:px-0"
    >
      {options.map((key) => {
        const active = key === value;
        return (
          <Button
            aria-pressed={active}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap lg:h-12 lg:px-5 lg:text-frame-meta",
              active
                ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            key={key}
            onClick={() => onChange(key)}
            type="button"
            variant="ghost"
          >
            {key === "all" ? t("filterAll") : t(`status.${key}`)}
          </Button>
        );
      })}
    </fieldset>
  );
}

/**
 * One transaction, shaped like a notification row at every width: what
 * happened in a soft circle, what it was for, with whom and on which day, then
 * the amount over how it ended at the right edge. Only a paid row's amount is
 * in full ink: the others are money that did not leave, came back, or has not
 * been asked for yet.
 *
 * A plain click opens the row's receipt over the list (`onOpen`); the row is
 * still a link to the receipt's own page, so a new tab or a copied address
 * works.
 */
function TransactionRow({
  row,
  onOpen,
}: {
  readonly row: Transaction;
  readonly onOpen: (receipt: Receipt) => void;
}) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const baht = useBaht();
  const date = new Date(row.date);
  const Icon = ROW_ICON[row.status];

  return (
    <li>
      <Link
        className="-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5"
        href={row.href}
        onClick={(event) => {
          // A new tab or window keeps the link's own behaviour.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          onOpen(row.receipt);
        }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12">
          <Icon aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{row.service}</span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">
            {row.advisor}
            {" · "}
            <Figures>{format.dateTime(date, { day: "numeric", month: "short" })}</Figures>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
          <span
            className={cn(
              // A step under the row's title: Latin figures stand taller than
              // Thai at the same size, and at the title's step the amounts
              // read heavier than the feed's rows do.
              "font-latin text-sm font-semibold whitespace-nowrap tabular-nums lg:text-frame-meta",
              row.status === "paid" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {baht(row.amount)}
          </span>
          <span className={cn("text-xs whitespace-nowrap lg:text-frame-label", OUTCOME[row.status].ink)}>
            {t(`status.${row.status}`)}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Nothing yet, unboxed like the notification centre's: one muted icon, what
 * will land here, and the way to start. Centred in the space below the heading
 * on a phone or an upright tablet; from `lg` a box that fills the column down
 * to the panel's foot.
 */
function HistoryEmpty() {
  const t = useTranslations("transactions");

  return (
    <div className="mt-6 flex min-h-[calc(100dvh-11rem)] w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:mt-8 lg:min-h-0 lg:flex-1 lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <ReceiptText aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("emptyTitle")}</h2>
        <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{t("emptyBody")}</p>
      </div>
      <Button
        className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
        nativeButton={false}
        render={<Link href="/search" />}
      >
        {t("findExpert")}
      </Button>
    </div>
  );
}

/** A filter that leaves nothing: say so, and the way back to everything. */
function FilteredEmpty({ onShowAll }: { readonly onShowAll: () => void }) {
  const t = useTranslations("transactions");

  return (
    <div className="flex w-full flex-col items-start gap-2 pt-8 lg:pt-12">
      <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("filteredEmptyTitle")}</h2>
      <Button
        className="h-11 px-0 text-sm font-normal text-muted-foreground underline underline-offset-4 hover:bg-transparent hover:text-foreground lg:text-frame-body"
        onClick={onShowAll}
        type="button"
        variant="ghost"
      >
        {t("showAll")}
      </Button>
    </div>
  );
}

/**
 * The list's own shape while it loads, so nothing shifts when it lands: the
 * capsules' row (everything and paid, what most histories hold), then two
 * months of two rows with the hairline between, each row the circle, the two
 * lines and the amount over its status. Each line is one line box of its
 * text's step (`h-lh`) with the bone inside, so a row stands as tall as a
 * real one.
 */
function HistorySkeleton() {
  const t = useTranslations("transactions");

  return (
    <div aria-busy className="flex w-full flex-col">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className="mt-5 flex gap-2 lg:mt-8 lg:gap-3">
        {["w-18 lg:w-23", "w-20 lg:w-25"].map((width) => (
          <span className={cn(BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
        ))}
      </div>
      <div aria-hidden className="flex flex-col divide-y divide-border">
        {[0, 1].map((month) => (
          <div className="flex flex-col pt-5 lg:pt-8" key={month}>
            <span className="flex h-lh items-center text-xs lg:text-frame-label">
              <span className={cn(BONE, "h-3 w-24 rounded lg:h-3.5 lg:w-28")} />
            </span>
            {[0, 1].map((i) => (
              <div className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5" key={i}>
                <span className={cn(BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                  <span className="flex h-lh items-center text-sm lg:text-frame-body">
                    <span className={cn(BONE, "h-3.5 w-1/2 rounded lg:h-4.5")} />
                  </span>
                  <span className="flex h-lh items-center text-xs lg:text-frame-meta">
                    <span className={cn(BONE, "h-3 w-1/3 rounded lg:h-4")} />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
                  <span className="flex h-lh items-center text-sm lg:text-frame-meta">
                    <span className={cn(BONE, "h-3.5 w-12 rounded lg:h-4 lg:w-14")} />
                  </span>
                  <span className="flex h-lh items-center text-xs lg:text-frame-label">
                    <span className={cn(BONE, "h-3 w-10 rounded lg:h-3.5 lg:w-12")} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * `/transactions`: the advisee's money history, laid out like the
 * notification centre. Newest first, a month to a group with a hairline
 * between groups, and filters by outcome above. A row opens its receipt over
 * the list (`ReceiptDialog`).
 *
 * The rows are the signed-in advisee's invoices whenever the build has an API
 * (`listMyInvoices`); without one, the samples (`transactions-data.ts`).
 */
export function TransactionHistoryScreen() {
  return isApiConfigured ? <LiveTransactionHistory /> : <SampleTransactionHistory />;
}

function SampleTransactionHistory() {
  const serviceName = useServiceName();
  return <TransactionHistory history={sampleHistory(serviceName)} />;
}

/**
 * The first page of the API's invoices, fifty of them: an advisee pays a few
 * times a month at most, so that is years of history and no paging to draw.
 * Each row carries its own receipt, so the dialog needs no second call.
 */
function LiveTransactionHistory() {
  const t = useTranslations("transactions");
  const fetcher = useCallback((signal: AbortSignal) => listMyInvoices({ page: 1, limit: 50 }, signal), []);
  const invoices = useResource<Paginated<ApiAdviseeInvoice>>("payment/invoices?page=1&limit=50", fetcher);

  if (invoices.data) return <TransactionHistory history={invoices.data.items.map(invoiceTransaction)} />;

  return (
    <HistoryFrame>
      <HistoryHeader />
      {invoices.error ? (
        // The API's own sentence: it tells "signed out" from "the server is down".
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard
            className={ERROR_CARD_LG}
            error={invoices.error}
            onRetry={invoices.reload}
            title={t("loadFailed")}
          />
        </div>
      ) : (
        <HistorySkeleton />
      )}
    </HistoryFrame>
  );
}

/** The history once its rows are in, whichever source they came from. */
function TransactionHistory({ history }: { readonly history: readonly Transaction[] }) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "Asia/Bangkok";
  const [filter, setFilter] = useState<Filter>("all");
  // Which receipt is open, kept apart from whether the dialog is: the receipt
  // stays on screen while the dialog plays its exit.
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  // `?invoiceId=`, a link to one receipt (a payment notification's "see the
  // receipt"): the history opens with it over the list, until the reader
  // closes it or opens another.
  const linkedId = asUuid(useQueryValue("invoiceId"));
  const [linkSpent, setLinkSpent] = useState(false);
  const linked = linkSpent || !linkedId ? undefined : history.find((row) => row.id === linkedId);
  const openReceipt = (next: Receipt) => {
    setLinkSpent(true);
    setReceipt(next);
    setReceiptOpen(true);
  };
  const receiptOpenChange = (next: boolean) => {
    // A linked receipt that closes keeps its sheet for the exit, as any other.
    if (linked) {
      setLinkSpent(true);
      setReceipt(linked.receipt);
    }
    setReceiptOpen(next);
  };
  const rows = filter === "all" ? history : history.filter((row) => row.status === filter);
  const kinds = STATUS_ORDER.filter((status) => history.some((row) => row.status === status));

  if (history.length === 0) {
    return (
      <HistoryFrame>
        <HistoryHeader />
        <HistoryEmpty />
      </HistoryFrame>
    );
  }

  return (
    <HistoryFrame>
      <HistoryHeader />
      <div className="mt-5 lg:mt-8">
        <StatusFilter kinds={kinds} onChange={setFilter} value={filter} />
      </div>
      {/* Says what the filter left, for a reader who cannot see the list change. */}
      <p aria-live="polite" className="sr-only">
        {t("showing", { count: rows.length })}
      </p>
      {rows.length === 0 ? (
        <FilteredEmpty onShowAll={() => setFilter("all")} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {groupByMonth(rows, timeZone).map((group) => (
            <DayGroup key={group.key} label={format.dateTime(group.date, { month: "long", year: "numeric" })}>
              {group.rows.map((row) => (
                <TransactionRow key={row.id} onOpen={openReceipt} row={row} />
              ))}
            </DayGroup>
          ))}
        </div>
      )}
      <ReceiptDialog
        onOpenChange={receiptOpenChange}
        open={receiptOpen || linked !== undefined}
        receipt={linked ? linked.receipt : receipt}
      />
    </HistoryFrame>
  );
}

/* ------------------------------------------------------------------ receipt */

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
      <dt className="min-w-0 text-xs text-muted-foreground lg:text-frame-meta">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-xs break-words text-foreground lg:text-frame-meta",
          // An amount never breaks: on a narrow sheet "฿855" split into
          // "฿85 / 5". The label beside it wraps instead.
          latin && "shrink-0 font-latin whitespace-nowrap tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** One of the facts under the amount: its name small and muted over the value. */
function Fact({
  label,
  children,
  className,
}: {
  readonly label: ReactNode;
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

/**
 * The card as a receipt names it, "Visa •••• 4242", held together with
 * no-break spaces so a wrapping sentence never leaves the last four digits on
 * a line of their own.
 */
function cardName(card: NonNullable<Receipt["card"]>): string {
  return `${card.brand} •••• ${card.last4}`;
}

/** The receipt's side margin, on the paper itself: the phone's on an upright tablet too. */
export const SHEET_X = "px-5 lg:px-10";

/**
 * The facts of the booking and the card, two to a row: who advised, when, the
 * card it went on, who it is made out to, and how the booking stands.
 */
function ReceiptFacts({ receipt }: { readonly receipt: Receipt }) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const clock = (iso: string) =>
    format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const { session, card } = receipt;
  const signedIn = useSession();
  const payer = signedIn.status === "authenticated" ? signedIn.account : null;

  return (
    <dl className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 md:mt-3 md:gap-y-2.5 lg:mt-7 lg:gap-x-6 lg:gap-y-5">
      <Fact label={t("advisorLabel")}>{receipt.advisor}</Fact>
      {session ? (
        <Fact label={receipt.booking === "unconfirmed" ? t("requestedDateLabel") : t("sessionDateLabel")}>
          {/* The day, then the hours on a line of their own. */}
          <span className="block">
            <Figures>
              {format.dateTime(new Date(session.date), {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Figures>
          </span>
          {session.from && session.to ? (
            <span className="block">
              <Figures>{t("timeRange", { from: clock(session.from), to: clock(session.to) })}</Figures>
            </span>
          ) : null}
        </Fact>
      ) : null}
      {card ? (
        <Fact className="font-latin" label={t(`cardLabel.${receipt.status}`)}>
          <span className="inline-flex items-center gap-2">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            {cardName(card)}
          </span>
        </Fact>
      ) : null}
      {/* Who the receipt is made out to, as a printed one names them. */}
      {payer ? (
        <Fact label={t("billedToLabel")}>
          <span className="block">{payer.name}</span>
          <span className="block truncate text-muted-foreground">{payer.email}</span>
        </Fact>
      ) : null}
      {receipt.booking ? (
        <Fact className="font-medium text-destructive" label={t("bookingLabel")}>
          {t(`booking.${receipt.booking}`)}
        </Fact>
      ) : null}
    </dl>
  );
}

/**
 * The receipt itself, laid out as a sheet of paper rather than a panel: narrow
 * and upright, top to bottom the way a printed one reads. Who issued it and
 * its number; how it ended, for how much and when; the facts of the booking
 * and the card; the line items and their total; then the references.
 *
 * A fact the record does not hold (no session, no card, no instant for a
 * refund) is left out rather than drawn empty or made up.
 *
 * `inDialog`: the sheet is the dialog's own surface, so it drops its border
 * and shadow, and its heading is an `h2` under the page's `h1`, named by
 * `titleId` for the dialog to be labelled by.
 */
function ReceiptCard({
  receipt,
  inDialog = false,
  titleId,
}: {
  readonly receipt: Receipt;
  readonly inDialog?: boolean;
  readonly titleId?: string;
}) {
  const t = useTranslations("transactions");
  const format = useFormatter();
  const baht = useBaht();
  const look = OUTCOME[receipt.status];
  const StatusIcon = look.icon;
  const clock = (iso: string) =>
    format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const charged = receipt.price + receipt.fee;
  // A refund's receipt leads with what came back; the others with what was asked for.
  const headline = receipt.status === "refunded" ? (receipt.refund ?? charged) : charged;
  const { at } = receipt;
  const Heading = inDialog ? "h2" : "h1";

  return (
    <article
      className={cn(
        "flex w-full flex-col bg-card",
        !inDialog && "rounded-card border border-hero-card-border shadow-hero-card",
      )}
    >
      {/* In the popup the close sits outside the sheet, so the header starts
          the sheet at every width. */}
      <header className={cn("flex items-start justify-between gap-4", inDialog ? "pt-5 md:pt-4 lg:pt-9" : "pt-6 lg:pt-9", SHEET_X)}>
        <Image alt="Advisory" className="h-5 w-auto lg:h-8" src={logo} />
        <div className="flex flex-col items-end gap-0.5 text-right">
          <p className="text-xs text-muted-foreground lg:text-frame-label">{t("receiptLabel")}</p>
          <p className="font-latin text-xs tabular-nums text-foreground lg:text-frame-meta">{receipt.invoiceNo}</p>
        </div>
      </header>

      {/* Below `lg` the sheet keeps its steps tight: on a phone or an upright
          tablet it opens as a popup, and every row it saves is one less to
          scroll inside it. */}
      <section className={cn("flex flex-col pt-3 pb-3 md:pt-4 md:pb-4 lg:pt-9 lg:pb-8", SHEET_X)}>
        <Heading
          className={cn("flex items-center gap-1.5 text-xs font-medium lg:gap-2 lg:text-frame-meta", look.ink)}
          id={titleId}
        >
          <StatusIcon aria-hidden className="size-4 shrink-0 lg:size-5" />
          {t(`headline.${receipt.status}`)}
        </Heading>
        <p className="font-latin mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-hero-ink lg:mt-2 lg:text-frame-title">
          {baht(headline)}
        </p>
        {at ? (
          <p className="mt-1.5 text-xs text-muted-foreground lg:text-frame-meta">
            <Figures>
              {t(`at.${receipt.status}`, {
                date: format.dateTime(new Date(at), { day: "numeric", month: "short", year: "numeric" }),
                time: clock(at),
              })}
            </Figures>
          </p>
        ) : null}

        <ReceiptFacts receipt={receipt} />
      </section>

      {/* The line items on a faint ground of their own, the way a printed
          receipt boxes what was bought. */}
      <section className={cn("border-t border-dashed border-border pt-2.5 pb-3 md:pt-3 md:pb-4 lg:pt-6 lg:pb-9", SHEET_X)}>
        <h2 className="text-xs font-medium text-muted-foreground lg:text-frame-label">{t("summaryHeading")}</h2>
        <dl className="mt-1.5 flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5 md:mt-2 md:gap-2 md:p-3 lg:mt-4 lg:gap-4 lg:p-5">
          <Line label={<span className="text-foreground">{receipt.service}</span>} latin value={baht(receipt.price)} />
          <Line label={t("feeLabel")} latin value={baht(receipt.fee)} />
          {receipt.refund ? (
            // U+2212, a true minus: the figure lines up with the ones above it.
            <Line label={t("refundLabel")} latin value={`−${baht(receipt.refund)}`} />
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3 lg:pt-4">
            <dt className="text-xs font-semibold text-foreground lg:text-frame-body">{t(`total.${receipt.status}`)}</dt>
            <dd className="font-latin text-sm font-semibold tabular-nums text-foreground lg:text-frame-figure">
              {baht(charged - (receipt.refund ?? 0))}
            </dd>
          </div>
        </dl>
        {/* No card network reference here: the API keeps the charge id to
            itself (it strips it from the invoice it returns), and the receipt
            number at the top is what the reader quotes to support. The
            reason is said only when it is known: the API sends none. */}
        {receipt.status === "failed" && receipt.issuerDeclined ? (
          <dl className="mt-3 px-1 lg:mt-4">
            <Line label={t("reasonLabel")} value={t("reasonValue")} valueClassName="text-destructive" />
          </dl>
        ) : null}
      </section>
    </article>
  );
}

/**
 * What to do next, and nothing that repeats the receipt: the outcome, the
 * amount, the card and the reason are all on the sheet above, so there is no
 * note restating them. The way on for this outcome, then one quiet, centred
 * line for a question about this charge, quoting the receipt number.
 */
function NextSteps({ receipt, className }: { readonly receipt: Receipt; readonly className?: string }) {
  const t = useTranslations("transactions");
  const l = useTranslations("landing");

  // The booking this was for, open over the list.
  const bookings = receipt.bookingHref ?? "/bookings";
  const actions: Record<TransactionStatus, readonly { label: string; href: string; solid: boolean }[]> = {
    paid: [{ label: t("viewBookings"), href: bookings, solid: true }],
    failed: [{ label: t("payAgain"), href: "/checkout/card", solid: true }],
    refunded: [
      { label: t("findExpert"), href: "/search", solid: true },
      { label: t("viewBookings"), href: bookings, solid: false },
    ],
    // The booking it is for is where the reader picks it up again.
    pending: [{ label: t("viewBookings"), href: bookings, solid: true }],
  };
  const subject = encodeURIComponent(t("supportSubject", { number: receipt.invoiceNo }));

  return (
    <aside className={cn("w-full", className)}>
      <div className="flex flex-col gap-2.5 md:gap-3 lg:gap-4">
        <div className="flex flex-col gap-2.5">
          {actions[receipt.status].map((action) => (
            <Button
              // The phone's 44px on an upright tablet too: the sheet there is a phone's width.
              className={cn(authPill(action.solid), "md:h-11 md:text-sm", PILL_LG)}
              key={action.href}
              nativeButton={false}
              render={<Link href={action.href} />}
              variant={action.solid ? "default" : "outline"}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-frame-label">
          {t("helpPrompt")}{" "}
          <a className={cn(AUTH_LINK, "py-1.5")} href={`mailto:${l("footerEmailAddress")}?subject=${subject}`}>
            {t("contactSupport")}
          </a>
        </p>
      </div>
    </aside>
  );
}

/** The sheet's width from `lg`, in the 1710 space: narrow and upright, the shape of a receipt. */
export const SHEET_W = "lg:w-144";

/**
 * A receipt over the history: the sheet, then what the outcome means and what
 * to do next under it, on one white surface that scrolls inside the window
 * with its close button held at the top.
 *
 * The popup is portalled out of the account column, so it takes that column's
 * zoom itself (`app-scale`) from `lg` and its sizes match the page behind it;
 * below `lg` the wrapper is `contents` and nothing is zoomed, as in the column.
 *
 * `receipt` is null until a row is first opened; the dialog is closed then.
 */
function ReceiptDialog({
  receipt,
  open,
  onOpenChange,
}: {
  readonly receipt: Receipt | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("transactions");
  const title = useId();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-labelledby={title}
        // On a phone 24px clear of each edge rather than the dialog's 16, so
        // the receipt reads as a sheet over the list rather than a second page.
        // The popup itself only places things: the sheet below scrolls, and
        // the close sits outside it.
        className="block max-w-[calc(100%-3rem)] gap-0 overflow-visible bg-transparent p-0 text-foreground ring-0 sm:max-w-sm lg:w-auto lg:max-w-none"
        // The close sits out on the page in white, so the page under it is
        // dimmed by half, as under the settings' dialogs.
        overlayClassName="bg-scrim/50"
        showCloseButton={false}
      >
        {receipt ? (
          <>
            {/* Out on the dimmed page above the sheet's top right corner at
                every width, so it never sits over the receipt: the bare glyph
                in white, a thumb's 44px around it to press. */}
            <DialogClose
              render={
                <Button
                  aria-label={t("closeReceipt")}
                  className="absolute -top-12 right-0 size-11 text-on-media hover:bg-transparent hover:text-on-media md:-top-13 lg:-top-14 lg:size-12"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden className="size-6 lg:size-7" />
            </DialogClose>
            {/* As tall as the screen allows under the close (its 48 and a
                margin), so the whole receipt fits without scrolling on any
                phone the height of an SE or more. */}
            <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-card bg-card shadow-hero-card md:max-h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-9rem)]">
              <div className={cn("app-scale contents lg:block", SHEET_W)}>
                <ReceiptCard inDialog receipt={receipt} titleId={title} />
                <NextSteps className={cn("pb-5 md:pb-4 lg:pb-6", SHEET_X)} receipt={receipt} />
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The receipt page's column, whatever it holds: centred in the panel, narrow
 * the way a receipt is, under the breadcrumb that says where this sits on a
 * desktop. `crumb` is the receipt's number, once there is one to name.
 */
function ReceiptColumn({ crumb, children }: { readonly crumb?: string; readonly children: ReactNode }) {
  const t = useTranslations("transactions");

  return (
    <TransactionsFrame back="/transactions">
      <div className={cn("flex w-full flex-col lg:mx-auto", SHEET_W)}>
        <nav aria-label={t("breadcrumbLabel")} className="hidden text-frame-meta text-muted-foreground lg:block">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link className="transition-colors hover:text-foreground" href="/transactions">
                {t("title")}
              </Link>
            </li>
            {crumb ? (
              <>
                <li aria-hidden>/</li>
                <li aria-current="page" className="font-latin text-foreground">
                  {crumb}
                </li>
              </>
            ) : null}
          </ol>
        </nav>

        <div className={cn("flex w-full flex-col gap-6 pt-2 pb-10 md:mx-auto md:max-w-xl lg:mt-6 lg:max-w-none lg:gap-8 lg:pt-0 lg:pb-0", GUTTER)}>
          {children}
        </div>
      </div>
    </TransactionsFrame>
  );
}

/** One receipt on its page, with what to do next under it. */
function ReceiptPage({ receipt }: { readonly receipt: Receipt }) {
  return (
    <ReceiptColumn crumb={receipt.invoiceNo}>
      <ReceiptCard receipt={receipt} />
      <NextSteps receipt={receipt} />
    </ReceiptColumn>
  );
}

/** The sheet's own shape while the invoice loads: the heading row, the amount, the facts, the line items. */
function ReceiptSkeleton() {
  const t = useTranslations("transactions");

  return (
    <ReceiptColumn>
      <div aria-busy className="flex w-full flex-col gap-6 lg:gap-8">
        <span className="sr-only">{t("loadingReceipt")}</span>
        <div
          aria-hidden
          className={cn(
            "flex w-full flex-col gap-5 rounded-card border border-hero-card-border bg-card pt-6 pb-6 shadow-hero-card lg:gap-8 lg:pt-9 lg:pb-9",
            SHEET_X,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <span className={cn(BONE, "h-5 w-24 rounded lg:h-8 lg:w-36")} />
            <span className={cn(BONE, "h-4 w-32 rounded lg:h-5 lg:w-44")} />
          </div>
          <div className="flex flex-col gap-2 lg:gap-3">
            <span className={cn(BONE, "h-4 w-32 rounded lg:h-5 lg:w-44")} />
            <span className={cn(BONE, "h-8 w-40 rounded-lg lg:h-12 lg:w-56")} />
            <span className={cn(BONE, "h-4 w-48 rounded lg:h-5 lg:w-64")} />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 lg:gap-x-6 lg:gap-y-5">
            {[0, 1, 2, 3].map((i) => (
              <span className={cn(BONE, "h-10 rounded lg:h-12")} key={i} />
            ))}
          </div>
          <span className={cn(BONE, "h-32 w-full rounded-xl lg:h-44")} />
        </div>
        <span aria-hidden className={cn(BONE, "h-11 w-full rounded-full lg:h-14")} />
      </div>
    </ReceiptColumn>
  );
}

/**
 * The invoice could not be shown. A 404 is an id that is not one of the
 * reader's receipts, which asking again will not change: say so, with the way
 * back to the list. Anything else is the API's own sentence with a retry.
 */
function ReceiptUnavailable({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  const t = useTranslations("transactions");

  if (error instanceof ApiError && error.status === 404) {
    return (
      <ReceiptColumn>
        <div className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
            <ReceiptText aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
          </span>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("notFoundTitle")}</h1>
            <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{t("notFoundBody")}</p>
          </div>
          <Button
            className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
            nativeButton={false}
            render={<Link href="/transactions" />}
          >
            {t("backToList")}
          </Button>
        </div>
      </ReceiptColumn>
    );
  }

  return (
    <ReceiptColumn>
      <ApiErrorCard className={ERROR_CARD_LG} error={error} onRetry={onRetry} title={t("receiptLoadFailed")} />
    </ReceiptColumn>
  );
}

/** One of the reader's invoices, read from the API by its id. */
function LiveInvoiceDetail({ invoiceId }: { readonly invoiceId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => getMyInvoice(invoiceId, signal), [invoiceId]);
  const invoice = useResource<ApiAdviseeInvoice>(`payment/invoices/${invoiceId}`, fetcher);

  if (invoice.data) return <ReceiptPage receipt={invoiceReceipt(invoice.data)} />;
  if (invoice.error) return <ReceiptUnavailable error={invoice.error} onRetry={invoice.reload} />;
  return <ReceiptSkeleton />;
}

/** The route's sample receipt, unchanged from before the API existed. */
function SampleInvoiceDetail({ state }: { readonly state: SampleStatus }) {
  const serviceName = useServiceName();
  return <ReceiptPage receipt={sampleReceipt(state, serviceName)} />;
}

/**
 * `?id=` names an invoice, and with an API to ask it is that invoice's
 * receipt. Without either it is exactly what it was: the route's sample.
 *
 * `useSearchParams`, as the service page reads `?serviceId=`, so a link that
 * keeps the path and changes only the query still lands. Keyed by the id, so
 * the next invoice starts from its own clean state.
 */
function InvoiceDetailHandoff({ state }: { readonly state: SampleStatus }) {
  const query = useSearchParams();
  const invoiceId = isApiConfigured ? query.get("id") : null;
  if (invoiceId) return <LiveInvoiceDetail invoiceId={invoiceId} key={invoiceId} />;
  return <SampleInvoiceDetail state={state} />;
}

/**
 * `/transactions/detail` and its `failed` / `refunded` siblings: one receipt
 * on a page of its own, for a link from a notification or an email, or a row
 * opened in a new tab. The history itself opens the same receipt in
 * `ReceiptDialog`.
 *
 * The sheet is centred in the panel, narrow the way a receipt is, with what
 * the outcome means and what to do next under it. The rail is the way back on
 * a desktop, with the breadcrumb saying where this sits; the phone has its
 * back chevron.
 *
 * No download: the old button had nothing behind it, and a control that does
 * nothing on a money page costs more trust than it adds.
 */
export function InvoiceDetailScreen({ state }: { readonly state: SampleStatus }) {
  // The query is only known in the browser, so the prerendered HTML is this
  // fallback. On the route the history's rows link to, with an API to ask, it
  // is the receipt's skeleton: as the sample, a cold load of a real receipt
  // would first paint a made-up one, amount and all. The sibling routes keep
  // their samples.
  return (
    <Suspense
      fallback={isApiConfigured && state === "paid" ? <ReceiptSkeleton /> : <SampleInvoiceDetail state={state} />}
    >
      <InvoiceDetailHandoff state={state} />
    </Suspense>
  );
}
