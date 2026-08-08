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

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { DetailRow } from "@/components/screening/parts";

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
        className={`font-thai min-w-px flex-1 text-[14px] leading-[20px] ${
          strong ? "font-medium text-foreground" : "font-normal text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-latin shrink-0 text-[14px] leading-[20px] whitespace-nowrap ${
          strong ? "font-semibold" : "font-normal"
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
      tint: "bg-[#ecfccb] text-foreground",
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
 */
export function InvoiceDetailScreen({ state }: { readonly state: Invoice }) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const copy = useInvoiceCopy(state);
  const HeroIcon = copy.icon;

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/transactions" label={c("back")} />
      <ScreenBody>
        {/* Figma "Hero": a 40px status badge, the amount, then the timestamp. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-4">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${copy.tint}`}
          >
            <HeroIcon className="size-5" />
          </span>
          <p className="font-latin mt-3 w-full text-center text-[28px] leading-[40px] font-semibold text-foreground">
            {copy.amount}
          </p>
          <p className="font-thai mt-1 w-full text-center text-[12px] leading-[18px] font-normal text-muted-foreground">
            {copy.when}
          </p>
        </div>

        {/* Figma "Session": who and when the consultation is for. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[14px] bg-card p-[14px]">
            <div className="flex w-full flex-col items-start gap-[2px]">
              <p className="font-latin w-full text-[14px] leading-[20px] font-medium text-foreground">
                {copy.who}
              </p>
              <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
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
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <div className="flex w-full shrink-0 flex-col items-start gap-[10px] overflow-clip rounded-[14px] bg-card p-[14px]">
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

        {/* Figma "Reference": payment method, invoice number and charge id. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[14px] bg-card p-[14px]">
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

        <ScreenSpacer />
        <ScreenActions>
          {state === "failed" ? (
            <PrimaryButton href="/checkout/card">{t("payAgain")}</PrimaryButton>
          ) : (
            <>
              <NeutralButton>{t("downloadReceipt")}</NeutralButton>
              <NeutralButton href="/profile">{t("viewBooking")}</NeutralButton>
            </>
          )}
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
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
      className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-[14px]"
      href={href}
    >
      <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
        <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
          {title}
        </p>
        <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
          {sub}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-[2px]">
        <p className="font-latin text-[14px] leading-[20px] font-medium whitespace-nowrap text-foreground">
          {amount}
        </p>
        <p className={`font-thai text-[12px] leading-[18px] font-normal whitespace-nowrap ${toneClass}`}>
          {status}
        </p>
      </div>
    </Link>
  );
}

/** Figma "Transaction history (Light)" — 995:10496. */
export function TransactionHistoryScreen() {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const filters = [t("filterAll"), t("filterPaid"), t("filterRefunded"), t("filterFailed")];

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("historyTitle")} />

        {/* Figma "Summary": a single 44px wallet strip. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex h-11 w-full shrink-0 items-center gap-3 overflow-clip rounded-[14px] bg-card px-[14px]">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-latin text-[14px] leading-[20px] font-medium text-foreground">
              {t("historySummary")}
            </span>
          </div>
        </div>

        {/* Figma "Filters": pill row, first pill selected. */}
        <div className="flex w-full shrink-0 items-center gap-2 overflow-x-auto px-6 pt-3">
          {filters.map((f, i) => (
            <span
              className={`font-thai shrink-0 rounded-full px-3 py-[5px] text-[12px] leading-[18px] font-medium whitespace-nowrap ${
                i === 0 ? "bg-foreground text-background" : "bg-card text-muted-foreground"
              }`}
              key={f}
            >
              {f}
            </span>
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
        ].map((group) => (
          <div
            className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5"
            key={group.month}
          >
            <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
              {group.month}
            </p>
            <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-[14px] bg-card">
              {group.rows.map((r, i) => (
                <div className="w-full" key={`${r.title}-${r.sub}`}>
                  {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                  <TxRow {...r} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
