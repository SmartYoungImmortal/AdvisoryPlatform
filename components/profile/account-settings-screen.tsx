import { CircleCheckBig, Lock, Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SuccessBanner } from "@/components/mobile/banner";
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
import {
  ACCOUNT_COLUMN,
  ACCOUNT_HEADING,
  ACCOUNT_NAV,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Account settings" (995:7046) and its updated state (995:7095), which adds
 * a success banner, a verification note and a reworded subtitle.
 *
 * Figma "Desktop / Account settings (Light)" (1787:25407) and its updated state
 * (1787:25850) re-seat the same list: the app nav, a back bar and a white head
 * band above, then the rows in the 800px account column on the grey page.
 */
export function AccountSettingsScreen({
  state = "default",
}: {
  readonly state?: "default" | "updated";
}) {
  const t = useTranslations("accountSettings");
  const c = useTranslations("common");
  const isUpdated = state === "updated";
  // Figma opens the grey band 48px under the head band and keeps 32px between
  // the blocks in it; on the phone both are the section's own 20px.
  const first = cn(ACCOUNT_COLUMN, "lg:pt-12");
  const next = cn(ACCOUNT_COLUMN, "lg:pt-8");

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        <AccountBackBar href="/profile" label={c("back")} />

        {/* Figma "Head Band" — the title on the card surface, above the page. */}
        <div className="w-full shrink-0 lg:bg-card">
          <ScreenHeading
            className={ACCOUNT_HEADING}
            subtitle={isUpdated ? t("subtitleUpdated") : t("subtitle")}
            title={t("title")}
          />
        </div>

        {isUpdated ? (
          <SuccessBanner
            body={t("updatedBody")}
            className={first}
            icon={CircleCheckBig}
            title={t("updatedTitle")}
          />
        ) : null}

        <SettingsSection className={isUpdated ? next : first} label={t("signInLabel")}>
          <SettingsCard>
            <SettingsRow
              href="/settings/email"
              icon={Mail}
              label={c("email")}
              value={c("emailValue")}
            />
            <SettingsDivider />
            <SettingsRow href="/settings/password" icon={Lock} label={t("password")} />
          </SettingsCard>
          {isUpdated ? (
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("verifyNote")}
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection className={next}>
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
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("deleteNote")}
          </p>
        </SettingsSection>

        {/* On the phone this is the slack under a short list; at 1440 it is the
            96px the frame leaves between the last row and the footer, and the
            push that keeps that footer on the bottom edge of a tall viewport. */}
        <ScreenSpacer className="lg:min-h-24" />
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
