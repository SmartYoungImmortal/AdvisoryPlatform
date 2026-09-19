import { CreditCard, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { PAGE_BAND, PAGE_HEAD_BAND } from "@/components/payment/invoice-screens";
import { FootNote } from "@/components/screening/parts";
import { SummaryLine } from "@/components/payment/summary-line";
import { CardForm } from "@/components/payment/card-form";

/**
 * The card this reader has already paid with. There is no saved-card model yet —
 * nothing in `lib/mock-db` stores a payment instrument — so the one the frame
 * draws is a fixture here, beside the rest of this screen's numbers. Only the
 * data is local; the wording it goes into stays in `messages/th.json`.
 */
const SAVED_CARD = { last4: "7841", expiry: "09/28" } as const;

/**
 * Figma "Payment Method" — the saved card, and what it expires on. A real
 * select: the frame draws a combobox, and it is the control a second card would
 * be chosen from once there is more than one to choose between.
 */
function SavedCardMethod() {
  const t = useTranslations("payment");
  const label = t("savedCard", { last4: SAVED_CARD.last4 });

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
      <p className="w-full text-sm font-semibold text-foreground" id="payment-method-label">
        {t("methodTitle")}
      </p>
      <Select defaultValue="saved" items={[{ label, value: "saved" }]}>
        <SelectTrigger
          aria-labelledby="payment-method-label"
          className="w-full bg-card shadow-none"
          id="payment-method"
        >
          <CreditCard className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="saved">{label}</SelectItem>
        </SelectContent>
      </Select>
      <p className="w-full text-xs font-normal text-muted-foreground">
        {t("savedCardHint", { expiry: SAVED_CARD.expiry })}
      </p>
    </div>
  );
}

/**
 * Figma "Payment - Card details (Light)" (995:10140) and its error state
 * (995:10190), which fills the fields and adds inline messages.
 *
 * "Desktop / Payment - Card details (Light)" (1952:34120) keeps every part and
 * deals them into two columns of the 1200 grid: the form runs down the 788
 * column on the left, and the order summary — which the phone stacks above the
 * fields — becomes a 380 aside on the right with the pay button under it.
 *
 * The three blocks stay siblings rather than being regrouped into two wrappers,
 * so the phone order (summary, fields, note, action at the bottom edge) is
 * untouched; the grid places each one explicitly from `lg` up.
 *
 * `saved` (1594:28231 / 1952:34217) is the same screen for someone who has paid
 * here before: the card form collapses to the stored card and the CVC that
 * re-authorises it, and the pay button waits on that CVC. Both frames drop the
 * encryption note with the form it belonged to.
 */
export function CardDetailsScreen({
  state = "default",
}: {
  readonly state?: "default" | "errors" | "saved";
}) {
  const t = useTranslations("payment");
  const c = useTranslations("common");
  const err = state === "errors";
  const saved = state === "saved";

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/screening/accepted" label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref="/screening/accepted" />
        </div>

        <div className={PAGE_HEAD_BAND}>
          <ScreenHeading className={`pt-4 ${PAGE_BAND} lg:pt-5 lg:pb-9`} title={t("cardTitle")} />
        </div>

        {/* Figma "Body" — 788 + 32 + 380 on the 1200 column. The third row is
            the flexible one, so the aside's two blocks sit tight together at
            the top while the form column runs past them. */}
        <div className="flex w-full flex-1 flex-col lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-x-8 lg:px-10 xl:px-30 lg:pt-12 lg:pb-14">
          {/* Figma "Order Summary": caption, advisor line, fees, then the total. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
            <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip rounded-xl bg-card p-3.5 lg:border lg:border-border">
              <div className="flex w-full items-center justify-between gap-3">
                <span className="text-xs font-normal text-muted-foreground lg:text-sm">
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

          {/* The form column. `lg:*:px-0` drops the phone's 24px gutter off both
              blocks inside it — the grid already holds the 120px page inset. */}
          <div className="flex w-full flex-col lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:*:px-0">
            {/* Figma "Payment Method" + "Form Fields (CVC only)" — the stored
                card, then the one number it still has to be told. The frame
                holds the field to 220 of the 788 column; the phone gives it the
                width it has. */}
            {saved ? (
              <>
                <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4 lg:pt-0">
                  <SavedCardMethod />
                </div>
                <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4 lg:pt-6">
                  <div className="w-full lg:max-w-55">
                    <Field
                      id="card-cvc"
                      label={t("cvcLabel")}
                      latin
                      placeholder={t("cvcPlaceholder")}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Figma "Form Fields": card number, an expiry/CVC row, then
                    the name. The row is already two halves, which is what the
                    frame's 388 + 12 + 388 comes to inside the 788 column. */}
                <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4 lg:pt-0">
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
              </>
            )}
          </div>

          {/* The phone pins the action to the bottom edge; the 1440 frame sets
              it 20px under the summary, as wide as the aside.

              Both saved-card frames draw the button at 40% — the CVC above it
              is still empty, and this screen has no state to clear that with,
              so it stays disabled there rather than pretending to authorise. */}
          <ScreenSpacer className="lg:hidden" />
          <div className="flex w-full shrink-0 flex-col items-center px-6 pt-2 pb-2 lg:col-start-2 lg:row-start-2 lg:px-0 lg:pt-5 lg:pb-0">
            {saved ? (
              <PrimaryButton className="disabled:opacity-40 lg:h-11" disabled>
                {t("pay")}
              </PrimaryButton>
            ) : (
              <PrimaryButton className="lg:h-11" href="/checkout/processing">
                {t("pay")}
              </PrimaryButton>
            )}
          </div>
        </div>

        <CardForm />

        {/* <ScreenSpacer /> */}
        {/* <div className="flex w-full shrink-0 flex-col items-center px-6 pt-2 pb-2">
          <PrimaryButton href="/checkout/processing">{t("methodForm.card.payButtonReady")}</PrimaryButton>
        </div> */}
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
