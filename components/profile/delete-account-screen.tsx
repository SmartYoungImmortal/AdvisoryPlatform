import { CalendarDays, Trash2, TriangleAlert, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

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

/**
 * Figma "Delete account" (995:7458) and its blocked state (995:7499), which swaps
 * the loss list for outstanding items and drops the DELETE confirmation field.
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
    <MobileScreen>
      <ScreenTopBar href="/settings" label={c("back")} />
      <ScreenBody>
        <WarningHero
          icon={TriangleAlert}
          subtitle={isBlocked ? t("subtitleBlocked") : t("subtitle")}
          title={t("title")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
          {/* The blocked frame outlines the card in destructive to flag the
              outstanding items; the plain loss list has no border. */}
          <InfoCard
            caption={isBlocked ? t("blockedTitle") : t("lossTitle")}
            className={isBlocked ? "ring-1 ring-destructive ring-inset" : undefined}
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

        <ScreenSpacer />
        <ScreenActions>
          {isBlocked ? (
            <>
              <PrimaryButton href="/transactions">{t("viewBookings")}</PrimaryButton>
              <NeutralButton href="/settings">{t("backToSettings")}</NeutralButton>
            </>
          ) : (
            <>
              <DestructiveButton href="/login">{t("submit")}</DestructiveButton>
              <NeutralButton href="/settings">{t("keep")}</NeutralButton>
            </>
          )}
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
