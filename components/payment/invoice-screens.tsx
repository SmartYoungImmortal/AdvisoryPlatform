import Link from "next/link";
import {
  CalendarDays,
  CircleCheckBig,
  Clock,
  CreditCard,
  RotateCcw,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { DetailRow } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Figma "Back Bar" + "Head Band" / "Hero Band" — the desktop frames put the
 * page title on the card surface behind a hairline, over the page ground the
 * body then sits on. Full-bleed, so the cap goes on the content inside it.
 */
export const PAGE_HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * Figma "Body" — 788 + 32 + 380 on the 1200 column `PAGE` establishes. The third
 * row is the flexible one, which is what lets the aside's two blocks sit tight
 * together at the top while the main column runs on past them.
 *
 * Exported because the checkout screen lays out on the very same grid and was
 * carrying a second, character-identical copy of this string.
 */
export const BODY_GRID = cn(
  "flex w-full flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-8 lg:pt-12 lg:pb-14",
  PAGE,
);

type Invoice = "paid" | "failed" | "refunded";

/**
 * Figma breakdown line — label left, amount right.
 *
 * Every amount is `font-latin tabular-nums`: Geist for the numerals, and tabular
 * so ฿800 / ฿40 / ฿840 line up down the column instead of wandering a pixel per
 * digit. Rows are hairline-separated by the card around them, so the line itself
 * only owns its own 14/10 inset.
 */
function Line({
  label,
  value,
  negative = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly negative?: boolean;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-latin shrink-0 text-sm font-normal whitespace-nowrap tabular-nums",
          negative ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The line a breakdown ends on. It used to be `Line strong` — 14px semibold
 * against a 14px label, one hairline below the fees it sums. A total that is the
 * same size as its parts is not a total, so it takes the well at the foot of the
 * card and the figure steps up to 20px.
 */
function TotalLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3 bg-muted px-3.5 py-3">
      <span className="min-w-px flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      <span className="font-latin shrink-0 text-xl font-semibold whitespace-nowrap tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

/**
 * Figma "Invoice detail" (995:9907) plus its failed (995:9975) and refunded
 * (995:10046) variants — hero amount, session card, breakdown and references.
 */
/** Everything that differs between the three invoice states, in one table. */
type InvoiceCopy = {
  readonly icon: LucideIcon;
  readonly tint: string;
  /** The outcome, said in colour beside the amount rather than in the badge alone. */
  readonly pillTone: StatusTone;
  readonly pillLabel: string;
  readonly amount: string;
  readonly when: string;
  readonly who: string;
  readonly what: string;
  readonly dateLabel: string;
  readonly dateValue: string;
  readonly statusLabel: string;
  readonly statusValue: string;
  readonly statusTone: string;
  readonly lines: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly negative?: boolean;
  }>;
  readonly totalLabel: string;
  readonly totalValue: string;
  readonly cardLabel: string;
  readonly invoiceNo: string;
  readonly chargeId: string;
};

function useInvoiceCopy(state: Invoice): InvoiceCopy {
  const t = useTranslations("payment");

  const table: Record<Invoice, InvoiceCopy> = {
    paid: {
      icon: CircleCheckBig,
      tint: "bg-success-surface text-success",
      pillTone: "success",
      pillLabel: t("filterPaid"),
      amount: t("totalValue"),
      when: t("invoicePaidTime"),
      who: t("advisor"),
      what: t("session"),
      dateLabel: t("bookingDateLabel"),
      dateValue: t("dateValue"),
      statusLabel: t("timeLabel"),
      statusValue: t("timeValue"),
      statusTone: "",
      lines: [
        { label: t("session"), value: t("sessionPrice") },
        { label: t("platformFee"), value: t("platformFeeValue") },
      ],
      totalLabel: t("grandTotal"),
      totalValue: t("totalValue"),
      cardLabel: t("paidWith"),
      invoiceNo: t("inv1No"),
      chargeId: t("inv1Charge"),
    },
    failed: {
      icon: TriangleAlert,
      tint: "bg-destructive/10 text-destructive",
      pillTone: "danger",
      pillLabel: t("filterFailed"),
      amount: t("thesisTotal"),
      when: t("invoiceFailedTime"),
      who: "กัญญา พรหมมา",
      what: t("thesisReview"),
      dateLabel: t("requestedSlotLabel"),
      dateValue: "ศ. 8 ส.ค. 2569",
      statusLabel: t("bookingLabel"),
      statusValue: t("bookingUnconfirmed"),
      statusTone: "text-destructive",
      lines: [
        { label: t("thesisReview"), value: t("thesisPrice") },
        { label: t("platformFee"), value: t("thesisFee") },
      ],
      totalLabel: t("attemptedTotal"),
      totalValue: t("thesisTotal"),
      cardLabel: t("cardUsed"),
      invoiceNo: t("inv2No"),
      chargeId: t("inv2Charge"),
    },
    refunded: {
      icon: RotateCcw,
      tint: "bg-accent-surface text-primary",
      pillTone: "info",
      pillLabel: t("filterRefunded"),
      amount: t("portfolioTotal"),
      when: t("invoiceRefundedTime"),
      who: "James Gunn",
      what: t("portfolioReview"),
      dateLabel: t("bookingDateLabel"),
      dateValue: "ส. 19 ก.ค. 2569",
      statusLabel: t("bookingLabel"),
      statusValue: t("bookingCancelled"),
      statusTone: "text-destructive",
      lines: [
        { label: t("portfolioReview"), value: t("portfolioPrice") },
        { label: t("platformFee"), value: t("portfolioFee") },
        { label: t("refundToCard"), value: t("refundValue"), negative: true },
      ],
      totalLabel: t("netCharged"),
      totalValue: t("netValue"),
      cardLabel: t("refundedTo"),
      invoiceNo: t("inv3No"),
      chargeId: t("inv3Charge"),
    },
  };

  return table[state];
}

/**
 * Figma "Invoice detail" (995:9907) plus its failed (995:9975) and refunded
 * (995:10046) variants — hero amount, session card, breakdown and references.
 *
 * "Desktop / Invoice detail (Light)" (1952:33777) keeps all four and re-seats
 * them at 1440: the amount becomes a banner band across the card surface, the
 * session and breakdown run down the 788 column, and the reference card — with
 * whatever the state offers to do next under it — becomes a 380 aside.
 */
export function InvoiceDetailScreen({ state }: { readonly state: Invoice }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const copy = useInvoiceCopy(state);
  const HeroIcon = copy.icon;

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/transactions" label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref="/transactions" />
        </div>

        {/* Figma "Hero": a 40px status badge, the amount, then the timestamp —
            52px and the 32/44 step once it is a band of its own at 1440.

            The outcome now says itself in words and colour between the two: the
            badge's glyph was carrying it alone, and a receipt whose status can
            only be inferred from a tick is a receipt you re-read. */}
        <div className={PAGE_HEAD_BAND}>
          <div className="flex w-full flex-col items-center px-6 pt-4 lg:pb-9">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full lg:size-13",
                copy.tint,
              )}
            >
              <HeroIcon className="size-5 lg:size-6.5" />
            </span>
            <p className="font-latin mt-3 w-full text-center text-heading font-semibold tabular-nums text-foreground lg:text-heading-lg">
              {copy.amount}
            </p>
            <StatusPill className="mt-2" tone={copy.pillTone}>
              {copy.pillLabel}
            </StatusPill>
            <p className="mt-2 w-full text-center text-xs font-normal text-muted-foreground">
              {copy.when}
            </p>
          </div>
        </div>

        <div className={BODY_GRID}>
          {/* The record column. `lg:*:px-0` drops the phone's 24px gutter off
              both cards — the grid already holds the 120px page inset. */}
          <div className="flex w-full flex-col lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:*:px-0">
            {/* Figma "Session": who and when the consultation is for. The three
                cards on this page were `bg-card` blocks with hand-drawn
                `h-px bg-muted` rules inside them — invisible on the phone's page
                ground and unlifted at 1440. One `Surface` each, hairlines from
                `divide-y`, and no shadow inside the desktop columns. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:pt-0">
              <Surface className="w-full divide-y divide-border overflow-hidden lg:shadow-none">
                <div className="flex w-full flex-col items-start gap-0.5 p-3.5">
                  <p className="font-latin w-full text-base font-semibold text-foreground lg:text-lg">
                    {copy.who}
                  </p>
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {copy.what}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 p-3.5">
                  <DetailRow icon={CalendarDays} label={copy.dateLabel} value={copy.dateValue} />
                  <DetailRow
                    icon={Clock}
                    label={copy.statusLabel}
                    value={copy.statusValue}
                    valueClassName={cn("font-latin tabular-nums", copy.statusTone)}
                  />
                </div>
              </Surface>
            </div>

            {/* Figma "Breakdown": line items and the resulting total. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:pt-6">
              <Surface className="w-full divide-y divide-border overflow-hidden lg:shadow-none">
                {copy.lines.map((line) => (
                  <Line
                    key={line.label}
                    label={line.label}
                    negative={line.negative}
                    value={line.value}
                  />
                ))}
                <TotalLine label={copy.totalLabel} value={copy.totalValue} />
              </Surface>
            </div>
          </div>

          {/* Figma "Reference": payment method, invoice number and charge id. All
              three values are Latin runs — a card brand, an invoice number, a
              charge id — so they take the Latin face and tabular figures. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            <Surface className="flex w-full flex-col items-start gap-3 p-3.5 lg:shadow-none">
              <DetailRow
                icon={CreditCard}
                label={copy.cardLabel}
                value={t("cardBrand")}
                valueClassName="font-latin tabular-nums"
              />
              {state === "failed" ? (
                <DetailRow
                  icon={TriangleAlert}
                  label={t("reasonLabel")}
                  value={t("reasonValue")}
                  valueClassName="text-destructive"
                />
              ) : null}
              <DetailRow
                icon={Wallet}
                label={t("invoiceNoLabel")}
                value={copy.invoiceNo}
                valueClassName="font-latin tabular-nums"
              />
              <DetailRow
                icon={Wallet}
                label={t("chargeIdLabel")}
                value={copy.chargeId}
                valueClassName="font-latin tabular-nums"
              />
            </Surface>
          </div>

          {/* The phone pins these to the bottom edge; the failed frame sets the
              pair 20px under the reference card, which is where they all go.
              `stacked` + `block`: in a 380 aside the pair is a column that holds
              the rail's width, not two buttons shrunk to their labels. */}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className="lg:col-start-2 lg:row-start-2 lg:px-0 lg:pt-5 lg:pb-0" stacked>
            {state === "failed" ? (
              <PrimaryButton block className="lg:h-11" href="/checkout/card">
                {t("payAgain")}
              </PrimaryButton>
            ) : (
              <>
                <NeutralButton block className="lg:h-11">
                  {t("downloadReceipt")}
                </NeutralButton>
                <NeutralButton block className="lg:h-11" href="/profile">
                  {t("viewBooking")}
                </NeutralButton>
              </>
            )}
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Where each outcome leads, and the colour it is said in. */
const TX_TONES = {
  paid: { href: "/transactions/detail", pill: "success" },
  failed: { href: "/transactions/detail/failed", pill: "danger" },
  refunded: { href: "/transactions/detail/refunded", pill: "info" },
} as const satisfies Record<string, { href: string; pill: StatusTone }>;

/**
 * Figma transaction row — title/subtitle stack with an amount and status.
 *
 * Three changes. The status is a pill, so "ชำระแล้ว" and "ไม่สำเร็จ" are told
 * apart before they are read — "ชำระแล้ว" was grey, i.e. the paid rows, which are
 * most of the list, said nothing. The amount takes tabular figures so the column
 * of them lines up. And the row answers the pointer: it is the only link on the
 * page and it looked exactly like the static rows on the invoice behind it.
 */
function TxRow({
  title,
  sub,
  amount,
  status,
  tone,
}: {
  readonly title: string;
  readonly sub: string;
  readonly amount: string;
  readonly status: string;
  readonly tone: keyof typeof TX_TONES;
}) {
  const { href, pill } = TX_TONES[tone];

  return (
    <Link
      className="flex w-full shrink-0 items-center gap-3 p-3.5 transition-colors hover:bg-muted/60 motion-reduce:transition-none"
      href={href}
    >
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full truncate text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {sub}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="font-latin text-sm font-semibold whitespace-nowrap tabular-nums text-foreground">
          {amount}
        </p>
        <StatusPill tone={pill}>{status}</StatusPill>
      </div>
    </Link>
  );
}

/**
 * Figma "Transaction history (Light)" — 995:10496.
 *
 * "Desktop / Payment (Light)" (1952:34715) splits the same page across the 1200
 * grid: a 380 rail on the left and the 788 list beside it. The frame fills that
 * rail with a saved-payment-methods card, which is content this screen does not
 * have yet (no keys, no mock rows), so the wallet total — the one standing fact
 * about the whole list — holds it instead, and the filters stay with the list
 * they filter.
 */
export function TransactionHistoryScreen() {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const filters = [t("filterAll"), t("filterPaid"), t("filterRefunded"), t("filterFailed")];

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref="/profile" />
        </div>

        <div className={PAGE_HEAD_BAND}>
          <ScreenHeading
            className={cn("pt-4 lg:pt-5 lg:pb-9", PAGE)}
            title={t("historyTitle")}
          />
        </div>

        <div className={cn("flex w-full flex-1 flex-col lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-x-8 lg:pt-12 lg:pb-14", PAGE)}>
          {/* Figma "Summary": a single 44px wallet strip — the 52px card that
              holds the left rail at 1440. It is the one standing fact about the
              whole list, so it reads as a figure: a tinted chip for the glyph and
              the total at 16px semibold, rather than a 14px line in a box that
              was invisible on the phone. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pt-0">
            <Surface className="flex w-full items-center gap-3 p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-surface">
                <Wallet className="size-4.5 text-primary" />
              </span>
              <span className="font-latin min-w-px flex-1 text-base font-semibold tabular-nums text-foreground">
                {t("historySummary")}
              </span>
            </Surface>
          </div>

          {/* Figma "Filters": pill row, first pill selected. The unselected ones
              gain the hairline and a hover: as borderless white on the page
              ground they read as disabled labels rather than choices. */}
          <div className="flex w-full shrink-0 items-center gap-2 overflow-x-auto px-6 pt-3 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            {filters.map((f, i) => (
              <Badge
                className={cn(
                  "h-auto px-3 py-1.25",
                  i === 0
                    ? "bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none",
                )}
                key={f}
              >
                {f}
              </Badge>
            ))}
          </div>

          {[
            {
              month: t("aug"),
              rows: [
                { title: t("session"), sub: t("tx1Sub"), amount: t("totalValue"), status: t("filterPaid"), tone: "paid" as const },
                { title: t("tx2Title"), sub: t("tx2Sub"), amount: t("tx2Amount"), status: t("filterFailed"), tone: "failed" as const },
              ],
            },
            {
              month: t("jul"),
              rows: [
                { title: t("session"), sub: t("tx3Sub"), amount: t("totalValue"), status: t("filterPaid"), tone: "paid" as const },
                { title: t("tx4Title"), sub: t("tx4Sub"), amount: t("tx4Amount"), status: t("filterRefunded"), tone: "refunded" as const },
                { title: t("session"), sub: t("tx5Sub"), amount: t("totalValue"), status: t("filterPaid"), tone: "paid" as const },
              ],
            },
            // Each month stacks under the filters in the list column; below `lg`
            // they are simply the next blocks down the phone frame.
          ].map((group) => (
            <div
              className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5 lg:col-start-2 lg:px-0 lg:pt-4"
              key={group.month}
            >
              <p className="w-full text-sm font-medium text-muted-foreground">
                {group.month}
              </p>
              {/* One card per month, hairlines between its rows — the manual
                  `h-px bg-muted` spacer and the `i > 0` wrapper it needed are
                  what `SurfaceList` is. */}
              <SurfaceList>
                {group.rows.map((r) => (
                  <TxRow key={`${r.title}-${r.sub}`} {...r} />
                ))}
              </SurfaceList>
            </div>
          ))}

          <ScreenSpacer className="lg:hidden" />
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
