import { CalendarDays, CreditCard, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { FEED_COLUMN } from "@/components/notifications/notification-center-screen";
import { TopBar } from "@/components/topbar";

/** Figma "Info Card" row — 64px tall, 16px glyph, title/body stack. */
function PrimerRow({
  icon: Icon,
  title,
  body,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-3.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

/**
 * Figma "Push primer (Light)" — 995:10920.
 *
 * "Desktop / Push primer (Light)" (1952:35766) reseats the same four parts at
 * 1440: the app nav, a white heading band, the three-row card on the 800px feed
 * column, and the two actions side by side under it instead of pinned to the
 * bottom edge.
 */
export function PushPrimerScreen() {
  const t = useTranslations("notifications");
  const c = useTranslations("common");

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/notifications" label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref="/notifications" />
        </div>

        {/* Figma "Head Band" — title over subtitle on the card surface. */}
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card">
          <ScreenHeading
            className={`gap-2 pt-4 lg:pt-5 lg:pb-9 ${FEED_COLUMN}`}
            subtitle={t("primerSubtitle")}
            title={t("primerTitle")}
          />
        </div>

        {/* Figma "What We Use": 12px top padding, then a 194px three-row card. */}
        <div
          className={`flex w-full shrink-0 flex-col items-start px-6 pt-3 lg:pt-12 ${FEED_COLUMN}`}
        >
          <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card lg:border lg:border-border">
            <PrimerRow
              body={t("primerBookingsBody")}
              icon={CalendarDays}
              title={t("primerBookingsTitle")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <PrimerRow
              body={t("primerMessagesBody")}
              icon={MessageSquare}
              title={t("primerMessagesTitle")}
            />
            <div className="h-px w-full shrink-0 bg-muted" />
            <PrimerRow
              body={t("primerPaymentsBody")}
              icon={CreditCard}
              title={t("primerPaymentsTitle")}
            />
          </div>
        </div>

        {/* The phone pins the pair to the bottom edge; the 1440 frame sets them
            as one centred row 20px under the card, so the spacer swaps sides. */}
        <ScreenSpacer className="lg:hidden" />
        <ScreenActions className="lg:flex-row lg:justify-center lg:pt-5 lg:pb-0">
          <PrimaryButton className="lg:w-55" href="/notifications">
            {t("primerEnable")}
          </PrimaryButton>
          <NeutralButton className="lg:w-55" href="/profile">
            {t("primerLater")}
          </NeutralButton>
        </ScreenActions>
        <ScreenSpacer className="hidden lg:block lg:min-h-22" />

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
