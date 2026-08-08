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
import { useTranslations } from "next-intl";

import walletFailed from "@/assets/illustrations/wallet-failed.svg";
import walletSuccess from "@/assets/illustrations/wallet-success.svg";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import { MobileScreen, ScreenActions, ScreenBody } from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { DetailRow, FootNote } from "@/components/screening/parts";

type Result = "success" | "failed" | "unconfirmed" | "slot-taken";

type ResultRow = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
  readonly tone?: string;
};

/** Copy, detail rows and actions per outcome — keeps the screen itself flat. */
function useResultCopy(state: Result) {
  const t = useTranslations("payment");

  const table: Record<
    Result,
    {
      readonly title: string;
      readonly body: string;
      readonly rows: readonly ResultRow[];
      readonly primary: { readonly label: string; readonly href: string };
      readonly secondary: { readonly label: string; readonly href: string };
    }
  > = {
    success: {
      title: t("successTitle"),
      body: t("successBody"),
      rows: [
        { icon: UserRound, label: t("advisorLabel"), value: t("advisor") },
        { icon: CalendarDays, label: t("dateLabel"), value: t("dateValue") },
        { icon: Clock, label: t("timeLabel"), value: t("timeValue") },
      ],
      primary: { label: t("viewBooking"), href: "/profile" },
      secondary: { label: t("backHome"), href: "/profile" },
    },
    failed: {
      title: t("failedTitle"),
      body: t("failedBody"),
      rows: [
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue") },
        { icon: CreditCard, label: t("amountLabel"), value: t("amountValue") },
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
      rows: [
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue") },
        {
          icon: Clock,
          label: t("statusLabel"),
          value: t("statusValue"),
          tone: "text-primary",
        },
        { icon: ShieldCheck, label: t("refLabel"), value: t("refValue") },
      ],
      primary: { label: t("viewHistory"), href: "/transactions" },
      secondary: { label: t("contactSupport"), href: "/transactions" },
    },
    "slot-taken": {
      title: t("slotTakenTitle"),
      body: t("slotTakenBody"),
      rows: [
        { icon: CalendarDays, label: t("slotLabel"), value: t("slotValue") },
        { icon: CreditCard, label: t("cardLabel"), value: t("cardValue") },
        { icon: CreditCard, label: t("chargedLabel"), value: t("chargedValue") },
      ],
      primary: { label: t("pickAnotherTime"), href: "/matching/results" },
      secondary: { label: t("backToAdvisor"), href: "/matching/results" },
    },
  };

  return table[state];
}

/**
 * Figma payment outcomes — "Payment - Success" (995:10411), "Payment - Failed"
 * (995:10243), "Payment - Unconfirmed" (995:10455) and "Payment - Slot taken"
 * (995:10370). All share the 95px inset, 366px hero, detail card and action pair.
 */
export function PaymentResultScreen({ state }: { readonly state: Result }) {
  const t = useTranslations("payment");
  const copy = useResultCopy(state);
  const success = state === "success";
  const slotTaken = state === "slot-taken";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenBody>
        {/* Figma "Hero": a 280px wallet illustration (or a 96px badge for the
            slot-taken frame), then the 28/40 title and 14/20 muted body. */}
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[95px]">
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
                  className="absolute size-[49px] text-[#65a30d]"
                  strokeWidth={3}
                  style={{ left: 188, top: 142.55 }}
                />
              ) : null}
            </div>
          )}
          {state === "unconfirmed" ? (
            <p className="font-latin mt-4 w-full text-center text-[28px] leading-[40px] font-semibold text-foreground">
              {t("unconfirmedAmount")}
            </p>
          ) : null}
          <p className="font-thai mt-4 w-full text-center text-[28px] leading-[40px] font-semibold text-foreground">
            {copy.title}
          </p>
          <p className="font-thai mt-2 w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
            {copy.body}
          </p>
        </div>

        {/* Figma "Details": a 3-row summary card. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-[14px] bg-card p-[14px]">
            {copy.rows.map((row) => (
              <DetailRow
                icon={row.icon}
                key={row.label}
                label={row.label}
                value={row.value}
                valueClassName={row.tone}
              />
            ))}
          </div>
        </div>

        {success ? <FootNote icon={ShieldCheck}>{t("escrowNote")}</FootNote> : null}
        {state === "failed" ? (
          <FootNote icon={CircleCheckBig}>{t("failedHelp")}</FootNote>
        ) : null}

        <div className="w-full min-h-px flex-1" />
        <ScreenActions>
          <PrimaryButton href={copy.primary.href}>{copy.primary.label}</PrimaryButton>
          <NeutralButton href={copy.secondary.href}>{copy.secondary.label}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Payment - Bank verification (Light)" — 995:10116. */
export function PaymentProcessingScreen() {
  const t = useTranslations("payment");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenBody>
        <div className="w-full flex-1" />
        <div className="flex w-full shrink-0 flex-col items-center px-6">
          <output
            aria-label={t("processingTitle")}
            className="block size-11 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary"
          />
          <p className="font-thai mt-[64px] w-full text-center text-[24px] leading-[34px] font-semibold text-foreground">
            {t("processingTitle")}
          </p>
        </div>
        <div className="w-full flex-1" />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <NeutralButton href="/checkout/card">{t("cancelPayment")}</NeutralButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
