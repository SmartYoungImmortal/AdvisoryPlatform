import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { FootNote } from "@/components/screening/parts";

/** Figma order-summary line — label left, amount right. */
function SummaryLine({
  label,
  value,
  strong = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
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
          strong ? "font-semibold text-foreground" : "font-normal text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Figma "Payment - Card details (Light)" (995:10140) and its error state
 * (995:10190), which fills the fields and adds inline messages.
 */
export function CardDetailsScreen({
  state = "default",
}: {
  readonly state?: "default" | "errors";
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const err = state === "errors";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/screening/accepted" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("cardTitle")} />

        {/* Figma "Order Summary": caption, advisor line, fees, then the total. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl bg-card p-3.5">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-xs font-normal text-muted-foreground">
                {t("orderSummary")}
              </span>
              <span className="font-latin text-xs font-normal text-muted-foreground">
                {t("advisor")}
              </span>
            </div>
            <SummaryLine label={t("session")} value={t("sessionPrice")} />
            <SummaryLine label={t("platformFee")} value={t("platformFeeValue")} />
            <div className="h-px w-full shrink-0 bg-muted" />
            <SummaryLine label={t("total")} strong value={t("totalValue")} />
          </div>
        </div>

        {/* Figma "Form Fields": card number, a expiry/CVC row, then the name. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4">
          <Field
            defaultValue={err ? t("cardNumberFilled") : undefined}
            error={err ? t("cardNumberError") : undefined}
            id="card-number"
            invalid={err}
            label={t("cardNumberLabel")}
            latin
            placeholder={t("cardNumberPlaceholder")}
          />
          <div className="flex w-full shrink-0 items-start gap-3">
            <div className="min-w-px flex-1">
              <Field
                defaultValue={err ? t("expiryFilled") : undefined}
                error={err ? t("expiryError") : undefined}
                id="card-expiry"
                invalid={err}
                label={t("expiryLabel")}
                latin
                placeholder={t("expiryPlaceholder")}
              />
            </div>
            <div className="min-w-px flex-1">
              <Field
                defaultValue={err ? t("cvcFilled") : undefined}
                error={err ? t("cvcError") : undefined}
                id="card-cvc"
                invalid={err}
                label={t("cvcLabel")}
                latin
                placeholder={t("cvcPlaceholder")}
              />
            </div>
          </div>
          <Field
            id="card-name"
            label={t("cardNameLabel")}
            latin
            placeholder={t("cardNamePlaceholder")}
          />
        </div>

        <FootNote icon={Lock}>{t("secureNote")}</FootNote>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-2 pb-2">
          <PrimaryButton href="/checkout/processing">{t("pay")}</PrimaryButton>
        </div>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
