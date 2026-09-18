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

import { walletFailed, walletSuccess } from "@/lib/assets/r2";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenActions, ScreenBody } from "@/components/mobile/screen";
import { DetailRow, FootNote } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Card" on the desktop payment outcomes — 560px wide, centred in the
 * page, 48px of padding on the card surface behind a hairline and a 360px
 * action column inside it.
 *
 * Below `lg` those same blocks *are* the phone frame, edge to edge and pinned
 * to its bottom edge, so this wrapper is `display: contents` there: the phone
 * keeps the flat stack it already had and the box only exists from `lg` up.
 * `lg:*:px-0` lifts the phone's 24px gutter off every block inside, which the
 * card's own padding has taken over.
 */
const RESULT_CARD =
  "contents lg:my-24 lg:flex lg:w-140 lg:flex-none lg:flex-col lg:items-center lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-12 lg:*:px-0";

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
 *
 * Their desktop frames (1952:34481, 34562, 34640 and 34859) share one shape
 * too: the very same stack, gathered into a 560px card centred between the app
 * nav and the site footer. Nothing is added or dropped — see `RESULT_CARD`.
 */
export function PaymentResultScreen({ state }: { readonly state: Result }) {
  const t = useTranslations("payment");
  const copy = useResultCopy(state);
  const success = state === "success";
  const slotTaken = state === "slot-taken";

  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <div className={RESULT_CARD}>
          {/* Figma "Hero": a 280px wallet illustration (or a 96px badge for the
              slot-taken frame), then the 28/40 title and 14/20 muted body. */}
          <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[95px] lg:pt-0">
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
                    className="absolute size-[49px] text-success"
                    strokeWidth={3}
                    style={{ left: 188, top: 142.55 }}
                  />
                ) : null}
              </div>
            )}
            {state === "unconfirmed" ? (
              <p className="font-latin mt-4 w-full text-center text-heading font-semibold text-foreground lg:text-heading-lg">
                {t("unconfirmedAmount")}
              </p>
            ) : null}
            <p className="mt-4 w-full text-center text-heading font-semibold text-foreground">
              {copy.title}
            </p>
            <p className="mt-2 w-full text-center text-sm font-normal text-muted-foreground">
              {copy.body}
            </p>
          </div>

          {/* Figma "Details": a 3-row summary card. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6 lg:pt-8">
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5 lg:border lg:border-border">
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

          {/* The phone drops the pair onto its bottom edge; inside the card they
              sit 32px under the details, in a 360px column. */}
          <div className="w-full min-h-px flex-1 lg:hidden" />
          <ScreenActions className="lg:w-90 lg:pt-8 lg:pb-0">
            <PrimaryButton className="lg:h-11" href={copy.primary.href}>
              {copy.primary.label}
            </PrimaryButton>
            <NeutralButton className="lg:h-11" href={copy.secondary.href}>
              {copy.secondary.label}
            </NeutralButton>
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * Figma "Payment - Bank verification (Light)" — 995:10116, and
 * "Desktop / Payment - Processing (Light)" (1952:34413), where the spinner and
 * the way out stop being the whole screen and become a 560px card with 56px of
 * padding, centred between the nav and the footer.
 */
export function PaymentProcessingScreen() {
  const t = useTranslations("payment");

  return (
    <MobileScreen className="pt-6 lg:pt-0" wide>
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        <div className="w-full flex-1 lg:hidden" />
        <div className={cn(RESULT_CARD, "lg:my-35 lg:p-14")}>
          <div className="flex w-full shrink-0 flex-col items-center px-6">
            <output
              aria-label={t("processingTitle")}
              className="block size-11 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-primary"
            />
            <p className="mt-16 w-full text-center text-2xl font-semibold text-foreground lg:mt-5">
              {t("processingTitle")}
            </p>
          </div>
          <div className="w-full flex-1 lg:hidden" />
          <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2 lg:pt-7 lg:pb-0">
            <NeutralButton className="lg:h-11 lg:w-55" href="/checkout/card">
              {t("cancelPayment")}
            </NeutralButton>
          </div>
        </div>
        <div className="w-full flex-1 lg:hidden" />

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
