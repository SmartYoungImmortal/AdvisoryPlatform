import { CircleCheck, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton } from "@/components/mobile/buttons";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { CaptionedCard, LabelValueRow } from "@/components/offline/parts";
import { RetryAction } from "@/components/offline/retry";
import { TopBar } from "@/components/topbar";
import { NARROW_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";

type OfflineStateKind = "page-not-saved" | "payment";

/** "ดูได้" — what a cached section can still do, said in green. */
function Available({ children }: { readonly children: string }) {
  return (
    <StatusPill icon={CircleCheck} tone="success">
      {children}
    </StatusPill>
  );
}

/**
 * Figma "ออฟไลน์ - หน้ายังไม่ได้บันทึก" (1952:35956) and "ออฟไลน์ - ชำระเงินไม่ได้"
 * (1952:36187) — one frame drawn twice. Both are the error screens' shape with
 * a card added: a 110px spacer, an 88px muted badge holding a 38px wifi-off
 * glyph, 18px of air, the 28/40 title and 14/20 body, then a captioned card of
 * label/value rows, a flexible spacer and two stacked actions.
 *
 * The section has no desktop frame, so this follows `ErrorStateScreen`, whose
 * 1440 frame (1594:33779) sets the rule for an outcome screen: the app nav
 * replaces the bare chevron, the artwork and copy grow a step, everything is
 * held to a 560px column optically centred in the page, and the two actions sit
 * side by side over the site footer.
 */
export function OfflineStateScreen({ kind }: { readonly kind: OfflineStateKind }) {
  const t = useTranslations("offline");
  const c = useTranslations("common");

  const isPayment = kind === "payment";

  const spec = isPayment
    ? {
        // Back to the card form the held booking came from.
        back: "/checkout/card",
        title: t("paymentTitle"),
        body: t("paymentBody"),
        caption: t("paymentCaption"),
        rows: [
          { label: t("paymentAdvisorLabel"), value: t("paymentAdvisorValue") },
          { label: t("paymentTimeLabel"), value: t("paymentTimeValue") },
          { label: t("paymentAmountLabel"), value: t("paymentAmountValue") },
        ],
        primary: t("paymentPrimary"),
        secondary: t("paymentSecondary"),
        // "เก็บไว้ชำระทีหลัง" — the held payment is the queue's first blocked row.
        secondaryHref: "/offline/queue",
      }
    : {
        back: "/",
        title: t("notSavedTitle"),
        body: t("notSavedBody"),
        caption: t("notSavedCaption"),
        // "ดูได้" is an outcome, not a value: three rows of it in the same
        // semibold as an amount told a reader nothing at a glance. As pills they
        // read as a list of what still works while the network is gone.
        rows: [
          { label: t("notSavedChats"), value: <Available>{t("notSavedAvailable")}</Available> },
          { label: t("notSavedBookings"), value: <Available>{t("notSavedAvailable")}</Available> },
          { label: t("notSavedProfile"), value: <Available>{t("notSavedAvailable")}</Available> },
        ],
        primary: t("notSavedPrimary"),
        secondary: t("notSavedSecondary"),
        // "ไปหน้าที่ใช้ออฟไลน์ได้" — the cached page the banner frame draws.
        secondaryHref: "/offline/banner",
      };

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href={spec.back} label={c("back")} />
      <ScreenBody>
        {/* The frame opens on the bare back chevron; the desktop rule opens on
            the app's own nav, which is why this starts at `lg`. */}
        <div className="hidden w-full lg:block">
          <TopBar backHref={spec.back} />
        </div>

        {/* Figma "Spacer Top" is a flat 110px. A desktop page is taller than the
            874px frame, so there the fixed block gives way to the upper half of
            an optical centring — the error frames' arrangement. */}
        <div className="h-27.5 w-full shrink-0 lg:hidden" />
        <ScreenSpacer className="hidden lg:block" />

        <div className="flex w-full shrink-0 flex-col items-center gap-4.5 px-6 lg:pt-14">
          <span className="flex size-22 shrink-0 items-center justify-center overflow-clip rounded-full bg-muted lg:size-28">
            <WifiOff className="size-9.5 text-muted-foreground lg:size-12" />
          </span>
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-center gap-2 text-center",
              NARROW_COLUMN,
            )}
          >
            <h1 className="w-full text-heading font-semibold text-foreground lg:text-heading-lg">
              {spec.title}
            </h1>
            <p className="w-full text-sm font-normal text-muted-foreground lg:text-lg">
              {spec.body}
            </p>
          </div>
        </div>

        {/* Figma "Available Offline" / "Held Booking" — 24px under the copy. The
            card is the only thing on these frames that is not centred text, so
            on the desktop page it keeps the same 560px column rather than
            stretching to the width the canvas now allows. */}
        <div className={cn("w-full shrink-0 px-6 pt-6 lg:px-0", NARROW_COLUMN)}>
          <CaptionedCard caption={spec.caption} cardClassName="px-4">
            {spec.rows.map((row) => (
              <LabelValueRow key={row.label} label={row.label} value={row.value} />
            ))}
          </CaptionedCard>
        </div>

        {/* The phone pushes the actions to the bottom edge; the desktop frame
            sets them 24px under the card as one row, so the lower spacer goes
            with the phone and a new one carries the footer down. */}
        <ScreenSpacer className="lg:hidden" />
        <ScreenActions className="lg:flex-row lg:justify-center lg:pt-6 lg:pb-0">
          <RetryAction className="lg:h-11 lg:w-45">{spec.primary}</RetryAction>
          <NeutralButton className="lg:h-11 lg:w-45" href={spec.secondaryHref}>
            {spec.secondary}
          </NeutralButton>
        </ScreenActions>
        <ScreenSpacer className="hidden lg:block" />

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
