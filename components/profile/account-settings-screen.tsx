import { CircleCheckBig, Lock, Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SuccessBanner } from "@/components/mobile/banner";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  SettingsCard,
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/mobile/settings-list";
import { StatusBar } from "@/components/mobile/status-bar";

/**
 * Figma "Account settings" (995:7046) and its updated state (995:7095), which adds
 * a success banner, a verification note and a reworded subtitle.
 */
export function AccountSettingsScreen({
  state = "default",
}: {
  readonly state?: "default" | "updated";
}) {
  const t = useTranslations("accountSettings");
  const c = useTranslations("common");
  const isUpdated = state === "updated";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          subtitle={isUpdated ? t("subtitleUpdated") : t("subtitle")}
          title={t("title")}
        />

        {isUpdated ? (
          <SuccessBanner
            body={t("updatedBody")}
            icon={CircleCheckBig}
            title={t("updatedTitle")}
          />
        ) : null}

        <SettingsSection label={t("signInLabel")}>
          <SettingsCard>
            {/* No Figma frame for the change-email screen yet, so this row is inert. */}
            <SettingsRow icon={Mail} label={c("email")} value={c("emailValue")} />
            <SettingsDivider />
            <SettingsRow href="/settings/password" icon={Lock} label={t("password")} />
          </SettingsCard>
          {isUpdated ? (
            <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
              {t("verifyNote")}
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection>
          <SettingsCard>
            {/* Figma paints the danger row's glyph and label destructive; the
                chevron stays muted like every other row. */}
            <SettingsRow
              href="/settings/delete"
              icon={Trash2}
              iconClassName="text-destructive"
              label={t("deleteAccount")}
              labelClassName="text-destructive"
            />
          </SettingsCard>
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {t("deleteNote")}
          </p>
        </SettingsSection>

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
