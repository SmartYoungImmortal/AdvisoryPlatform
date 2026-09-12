import { Lock, CreditCard } from "lucide-react";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { SummaryLine } from "@/components/payment/summary-line";
import { FootNote } from "@/components/screening/parts";
import { useTranslations } from "next-intl";

export function MethodSelection() {
  const methods = [
    {
      key: "card",
      path: "/checkout/card",
      icon: CreditCard,
    }
  ] as const;

  const t = useTranslations("payment");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href="/screening/accepted" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("methodSelection.title")} />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <div className="flex w-full shrink-0 flex-col items-start gap-y-2.5 overflow-clip rounded-xl bg-card p-3.5">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="text-sm font-medium">{t("orderSummary")}</h2>
              <span className="font-latin text-sm font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {t("advisor")}
              </span>
            </div>
            <SummaryLine label={t("session")} value={t("sessionPrice")} />
            <SummaryLine
              label={t("platformFee")}
              value={t("platformFeeValue")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <SummaryLine label={t("total")} strong value={t("totalValue")} />
          </div>
        </div>

        <div className="mt-5 w-full px-6">
          <h2 className="text-sm font-medium text-left text-muted-foreground">
            {t("methodSelection.methodsTitle")}
          </h2>
          <div className="rounded-xl w-full overflow-clip">
            {methods.map((e, index) => (
              <div key={e.key}>
                <a
                  className="w-full bg-white p-3.5 flex flex-row gap-x-3 items-center"
                  href={e.path}
                >
                  <div className=" w-fit">
                    <e.icon />
                  </div>
                  <div className="flex flex-col gap-y-0.5 w-full">
                    <p className="text-sm">
                      {t(`methodSelection.methods.${e.key}.title`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`methodSelection.methods.${e.key}.title`)}
                    </p>
                  </div>
                </a>
                {index === (methods.length - 1) ? (undefined) : <div className="h-px w-full shrink-0 bg-muted" />}
              </div>
            ))}
          </div>
        </div>

        <FootNote icon={Lock}>{t("methodSelection.secured")}</FootNote>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}
