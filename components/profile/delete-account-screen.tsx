import { CalendarDays, Trash2, TriangleAlert, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  InfoCard,
  InfoRow,
  InfoStackRow,
  WarningHero,
} from "@/components/mobile/banner";
import { DestructiveButton, NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  ACCOUNT_CONFIRM_PANEL,
  ACCOUNT_NAV,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Delete account" (995:7458) and its blocked state (995:7499), which swaps
 * the loss list for outstanding items and drops the DELETE confirmation field.
 *
 * Figma "Desktop / Delete account (Light)" (1787:25680) and its blocked state
 * (1787:25766) drop the head band the other account frames wear — the warning
 * hero is the heading — and gather the whole screen into a 640px panel, so the
 * decision stays one object rather than spreading across a 1440 page.
 */
export function DeleteAccountScreen({
  state = "default",
}: {
  readonly state?: "default" | "blocked";
}) {
  const t = useTranslations("deleteAccount");
  const c = useTranslations("common");
  const isBlocked = state === "blocked";

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/settings" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        {/* The one frame in the section with no head band under it, so its back
            bar takes the 76px the other frames split between the two. */}
        <AccountBackBar className="lg:h-19" href="/settings" label={c("back")} />

        <div
          className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_CONFIRM_PANEL)}
        >
          <WarningHero
            icon={TriangleAlert}
            subtitle={isBlocked ? t("subtitleBlocked") : t("subtitle")}
            title={t("title")}
          />

          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
            {/* The blocked frame outlines the card in destructive to flag the
                outstanding items; the plain loss list has no border. The card is
                the page surface on the phone; on the panel it takes the muted
                tint the frame gives it, so it still reads as its own block. */}
            <InfoCard
              caption={isBlocked ? t("blockedTitle") : t("lossTitle")}
              className={cn(
                "lg:bg-muted/50",
                isBlocked && "ring-1 ring-destructive ring-inset",
              )}
              gap="gap-2.5"
            >
              {isBlocked ? (
                <>
                  <InfoStackRow
                    body={t("blocked1Body")}
                    icon={CalendarDays}
                    iconClassName="text-destructive"
                    title={t("blocked1Title")}
                  />
                  <InfoStackRow
                    body={t("blocked2Body")}
                    icon={Wallet}
                    iconClassName="text-destructive"
                    title={t("blocked2Title")}
                  />
                </>
              ) : (
                <>
                  <InfoRow align="items-start" icon={Trash2}>
                    {t("loss1")}
                  </InfoRow>
                  <InfoRow align="items-start" icon={Trash2}>
                    {t("loss2")}
                  </InfoRow>
                  <InfoRow align="items-start" icon={Trash2}>
                    {t("loss3")}
                  </InfoRow>
                </>
              )}
            </InfoCard>
          </div>

          {isBlocked ? null : (
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
              <Field
                id="delete-confirm"
                label={t("confirmLabel")}
                latin
                placeholder={t("confirmPlaceholder")}
              />
            </div>
          )}

          {/* The phone frame pins its actions to the bottom edge; the panel is
              only as tall as its content, so the spacer goes with the frame and
              the stack turns into Figma's right-aligned row — the way out on the
              left, the thing being confirmed on the right. */}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:pt-8 lg:pb-0">
            {isBlocked ? (
              <>
                <PrimaryButton className="lg:w-auto" href="/transactions">
                  {t("viewBookings")}
                </PrimaryButton>
                <NeutralButton className="lg:w-auto" href="/settings">
                  {t("backToSettings")}
                </NeutralButton>
              </>
            ) : (
              <>
                <DestructiveButton className="lg:w-auto" href="/login">
                  {t("submit")}
                </DestructiveButton>
                <NeutralButton className="lg:w-auto" href="/settings">
                  {t("keep")}
                </NeutralButton>
              </>
            )}
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
