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
import { DetailRow } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * The 1200 content column every desktop payment frame lays out on: a 1440 page
 * inset 120 either side. Below `lg` the same block is the phone's full-bleed
 * band and the 24px gutter lives on the content, so this only starts at the
 * breakpoint.
 */
export const PAGE_BAND = "lg:mx-auto lg:max-w-[1440px] lg:px-10 xl:px-30";

/**
 * Figma "Back Bar" + "Head Band" / "Hero Band" — the desktop frames put the
 * page title on the card surface behind a hairline, over the page ground the
 * body then sits on. Full-bleed, so the cap goes on the content inside it.
 */
export const PAGE_HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * Figma "Body" — 788 + 32 + 380 on that 1200 column. The third row is the
 * flexible one, which is what lets the aside's two blocks sit tight together at
 * the top while the main column runs on past them.
 */
const BODY_GRID =
  "flex w-full flex-1 flex-col lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-8 lg:px-10 xl:px-30 lg:pt-12 lg:pb-14";

type Invoice = "paid" | "failed" | "refunded";

/** Figma breakdown line — label left, amount right, total in semibold. */
function Line({
  label,
  value,
  strong = false,
  negative = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
  readonly negative?: boolean;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3">
      <span
        className={`min-w-px flex-1 text-sm ${
          strong ? "font-medium text-foreground" : "font-normal text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-latin shrink-0 text-sm whitespace-nowrap ${
          strong ? "font-semibold lg:text-base" : "font-normal"
        } ${negative ? "text-destructive" : "text-foreground"}`}
      >
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
      tint: "bg-success-surface text-foreground",
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
      tint: "bg-primary/10 text-primary",
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
            52px and the 32/44 step once it is a band of its own at 1440. */}
        <div className={PAGE_HEAD_BAND}>
          <div className="flex w-full flex-col items-center px-6 pt-4 lg:pb-9">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full lg:size-13 ${copy.tint}`}
            >
              <HeroIcon className="size-5 lg:size-6.5" />
            </span>
            <p className="font-latin mt-3 w-full text-center text-heading font-semibold text-foreground lg:text-heading-lg">
              {copy.amount}
            </p>
            <p className="mt-1 w-full text-center text-xs font-normal text-muted-foreground">
              {copy.when}
            </p>
          </div>
        </div>

        <div className={BODY_GRID}>
          {/* The record column. `lg:*:px-0` drops the phone's 24px gutter off
              both cards — the grid already holds the 120px page inset. */}
          <div className="flex w-full flex-col lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:*:px-0">
            {/* Figma "Session": who and when the consultation is for. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:pt-0">
              <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5 lg:border lg:border-border">
                <div className="flex w-full flex-col items-start gap-0.5">
                  <p className="font-latin w-full text-sm font-medium text-foreground">
                    {copy.who}
                  </p>
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {copy.what}
                  </p>
                </div>
                <div className="h-px w-full shrink-0 bg-muted" />
                <DetailRow icon={CalendarDays} label={copy.dateLabel} value={copy.dateValue} />
                <DetailRow
                  icon={Clock}
                  label={copy.statusLabel}
                  value={copy.statusValue}
                  valueClassName={copy.statusTone}
                />
              </div>
            </div>

            {/* Figma "Breakdown": line items and the resulting total. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:pt-6">
              <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl bg-card p-3.5 lg:border lg:border-border">
                {copy.lines.map((line) => (
                  <Line
                    key={line.label}
                    label={line.label}
                    negative={line.negative}
                    value={line.value}
                  />
                ))}
                <div className="h-px w-full shrink-0 bg-muted" />
                <Line label={copy.totalLabel} strong value={copy.totalValue} />
              </div>
            </div>
          </div>

          {/* Figma "Reference": payment method, invoice number and charge id. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5 lg:border lg:border-border">
              <DetailRow icon={CreditCard} label={copy.cardLabel} value={t("cardBrand")} />
              {state === "failed" ? (
                <DetailRow
                  icon={TriangleAlert}
                  label={t("reasonLabel")}
                  value={t("reasonValue")}
                  valueClassName="text-destructive"
                />
              ) : null}
              <DetailRow icon={Wallet} label={t("invoiceNoLabel")} value={copy.invoiceNo} />
              <DetailRow icon={Wallet} label={t("chargeIdLabel")} value={copy.chargeId} />
            </div>
          </div>

          {/* The phone pins these to the bottom edge; the failed frame sets the
              pair 20px under the reference card, which is where they all go. */}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className="lg:col-start-2 lg:row-start-2 lg:px-0 lg:pt-5 lg:pb-0">
            {state === "failed" ? (
              <PrimaryButton className="lg:h-11" href="/checkout/card">
                {t("payAgain")}
              </PrimaryButton>
            ) : (
              <>
                <NeutralButton className="lg:h-11">{t("downloadReceipt")}</NeutralButton>
                <NeutralButton className="lg:h-11" href="/profile">
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

/** Figma transaction row — title/subtitle stack with an amount and status. */
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
  readonly tone: "paid" | "failed" | "refunded";
}) {
  const href = {
    paid: "/transactions/detail",
    failed: "/transactions/detail/failed",
    refunded: "/transactions/detail/refunded",
  }[tone];
  const toneClass = {
    paid: "text-muted-foreground",
    failed: "text-destructive",
    refunded: "text-primary",
  }[tone];

  return (
    <Link
      className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5"
      href={href}
    >
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {sub}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="font-latin text-sm font-medium whitespace-nowrap text-foreground">
          {amount}
        </p>
        <p className={`text-xs font-normal whitespace-nowrap ${toneClass}`}>
          {status}
        </p>
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
            className={`pt-4 ${PAGE_BAND} lg:pt-5 lg:pb-9`}
            title={t("historyTitle")}
          />
        </div>

        <div className="flex w-full flex-1 flex-col lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-x-8 lg:px-10 xl:px-30 lg:pt-12 lg:pb-14">
          {/* Figma "Summary": a single 44px wallet strip — the 52px card that
              holds the left rail at 1440. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:col-start-1 lg:row-start-1 lg:px-0 lg:pt-0">
            <div className="flex h-11 w-full shrink-0 items-center gap-3 overflow-clip rounded-xl bg-card px-3.5 lg:h-13 lg:border lg:border-border">
              <Wallet className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-latin text-sm font-medium text-foreground">
                {t("historySummary")}
              </span>
            </div>
          </div>

          {/* Figma "Filters": pill row, first pill selected. */}
          <div className="flex w-full shrink-0 items-center gap-2 overflow-x-auto px-6 pt-3 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            {filters.map((f, i) => (
              <Badge
                className={cn(
                  "h-auto px-3 py-1.25",
                  i === 0 ? "bg-foreground text-background" : "bg-card text-muted-foreground",
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
              <p className="w-full text-xs font-normal text-muted-foreground">
                {group.month}
              </p>
              <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card lg:border lg:border-border">
                {group.rows.map((r, i) => (
                  <div className="w-full" key={`${r.title}-${r.sub}`}>
                    {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                    <TxRow {...r} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <ScreenSpacer className="lg:hidden" />
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
