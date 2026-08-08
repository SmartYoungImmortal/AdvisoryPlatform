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
import { useTranslations } from "next-intl";

import walletFailed from "@/assets/illustrations/wallet-failed.svg";
import walletSuccess from "@/assets/illustrations/wallet-success.svg";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import { MobileScreen, ScreenActions, ScreenBody } from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { DetailRow, FootNote } from "@/components/screening/parts";

type Result = "success" | "failed" | "unconfirmed" | "slot-taken";

/**
 * Figma payment outcomes — "Payment - Success" (995:10411), "Payment - Failed"
 * (995:10243), "Payment - Unconfirmed" (995:10455) and "Payment - Slot taken"
 * (995:10370). All share the 95px inset, 366px hero, detail card and action pair.
 */
export function PaymentResultScreen({ state }: { readonly state: Result }) {
  const t = useTranslations("payment");
  const success = state === "success";
  const slotTaken = state === "slot-taken";
  const unconfirmed = state === "unconfirmed";

  const copy = {
    success: { title: t("successTitle"), body: t("successBody") },
    failed: { title: t("failedTitle"), body: t("failedBody") },
    unconfirmed: { title: t("unconfirmedTitle"), body: t("unconfirmedBody") },
    "slot-taken": { title: t("slotTakenTitle"), body: t("slotTakenBody") },
  }[state];

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
          {unconfirmed ? (
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
            {success ? (
              <>
                <DetailRow icon={UserRound} label={t("advisorLabel")} value={t("advisor")} />
                <DetailRow icon={CalendarDays} label={t("dateLabel")} value={t("dateValue")} />
                <DetailRow icon={Clock} label={t("timeLabel")} value={t("timeValue")} />
              </>
            ) : null}
            {state === "failed" ? (
              <>
                <DetailRow icon={CreditCard} label={t("cardLabel")} value={t("cardValue")} />
                <DetailRow icon={CreditCard} label={t("amountLabel")} value={t("amountValue")} />
                <DetailRow
                  icon={TriangleAlert}
                  label={t("reasonLabel")}
                  value={t("reasonValue")}
                  valueClassName="text-destructive"
                />
              </>
            ) : null}
            {unconfirmed ? (
              <>
                <DetailRow icon={CreditCard} label={t("cardLabel")} value={t("cardValue")} />
                <DetailRow
                  icon={Clock}
                  label={t("statusLabel")}
                  value={t("statusValue")}
                  valueClassName="text-primary"
                />
                <DetailRow icon={ShieldCheck} label={t("refLabel")} value={t("refValue")} />
              </>
            ) : null}
            {slotTaken ? (
              <>
                <DetailRow icon={CalendarDays} label={t("slotLabel")} value={t("slotValue")} />
                <DetailRow icon={CreditCard} label={t("cardLabel")} value={t("cardValue")} />
                <DetailRow
                  icon={CreditCard}
                  label={t("chargedLabel")}
                  value={t("chargedValue")}
                />
              </>
            ) : null}
          </div>
        </div>

        {success ? <FootNote icon={ShieldCheck}>{t("escrowNote")}</FootNote> : null}
        {state === "failed" ? (
          <FootNote icon={CircleCheckBig}>{t("failedHelp")}</FootNote>
        ) : null}

        <div className="w-full min-h-px flex-1" />
        <ScreenActions>
          {success ? (
            <>
              <PrimaryButton href="/profile">{t("viewBooking")}</PrimaryButton>
              <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
            </>
          ) : null}
          {state === "failed" ? (
            <>
              <PrimaryButton href="/checkout/card">{t("tryAgain")}</PrimaryButton>
              <NeutralButton href="/checkout/card">{t("useOther")}</NeutralButton>
            </>
          ) : null}
          {unconfirmed ? (
            <>
              <PrimaryButton href="/transactions">{t("viewHistory")}</PrimaryButton>
              <NeutralButton href="/transactions">{t("contactSupport")}</NeutralButton>
            </>
          ) : null}
          {slotTaken ? (
            <>
              <PrimaryButton href="/matching/results">{t("pickAnotherTime")}</PrimaryButton>
              <NeutralButton href="/matching/results">{t("backToAdvisor")}</NeutralButton>
            </>
          ) : null}
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
          <span
            aria-label={t("processingTitle")}
            className="size-11 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary"
            role="status"
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
