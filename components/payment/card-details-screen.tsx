import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { FootNote } from "@/components/screening/parts";
import { SummaryLine } from "@/components/payment/summary-line";
import { CardForm } from "@/components/payment/card-form";

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

        <CardForm />

        {/* <ScreenSpacer /> */}
        {/* <div className="flex w-full shrink-0 flex-col items-center px-6 pt-2 pb-2">
          <PrimaryButton href="/checkout/processing">{t("methodForm.card.payButtonReady")}</PrimaryButton>
        </div> */}
      </ScreenBody>
    </MobileScreen>
  );
}
