import { CircleCheck, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { AlertBanner, InfoCard, InfoRow } from "@/components/mobile/banner";
import { PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";

/**
 * Figma "Change password" (995:7360) and its wrong-current-password state
 * (995:7404), which adds an alert banner and an inline field error.
 */
export function ChangePasswordScreen({
  state = "default",
}: {
  readonly state?: "default" | "wrong-current";
}) {
  const t = useTranslations("changePassword");
  const c = useTranslations("common");
  const isWrong = state === "wrong-current";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/settings" label={c("back")} />
      <ScreenBody>
        <ScreenHeading title={t("title")} />

        {isWrong ? (
          <AlertBanner
            body={t("wrongCurrentBody")}
            icon={Lock}
            title={t("wrongCurrentTitle")}
          />
        ) : null}

        {/* Figma "Form Fields": 16px top padding, 16px between fields. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4">
          <Field
            defaultValue={isWrong ? "password" : undefined}
            error={isWrong ? t("wrongCurrentFieldError") : undefined}
            id="current-password"
            invalid={isWrong}
            label={t("currentLabel")}
            placeholder={t("currentPlaceholder")}
            type="password"
          />
          <Field
            id="new-password"
            label={t("newLabel")}
            placeholder={t("newPlaceholder")}
            type="password"
          />
          <Field
            id="confirm-password"
            label={t("confirmLabel")}
            placeholder={t("confirmPlaceholder")}
            type="password"
          />
        </div>

        {/* Figma "Requirements": card with a 12/18 caption and 14/20 check rows. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4">
          <InfoCard caption={t("requirementsTitle")}>
            <InfoRow icon={CircleCheck}>{t("requirement1")}</InfoRow>
            <InfoRow icon={CircleCheck}>
              {isWrong ? t("requirement2Short") : t("requirement2")}
            </InfoRow>
            <InfoRow icon={CircleCheck}>{t("requirement3")}</InfoRow>
            <InfoRow icon={CircleCheck}>{t("requirement4")}</InfoRow>
          </InfoCard>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/settings/updated">{t("submit")}</PrimaryButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
