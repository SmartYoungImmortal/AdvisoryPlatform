"use client";

import { CircleCheckBig, Globe, Lock, LogOut, Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AccountShell, DESKTOP_TYPE_LIFT } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { Button } from "@/components/ui/button";
import { useAppLocale } from "@/lib/i18n/locale-provider";
import { SuccessBanner } from "@/components/mobile/banner";
import { MobileScreen, ScreenBody, ScreenSpacer, ScreenTopBar } from "@/components/mobile/screen";
import {
  SettingsCard,
  SettingsDivider,
  SettingsRow,
  SettingsSection,
} from "@/components/mobile/settings-list";
import { PushToggle } from "@/components/notifications/push-toggle";
import { useOwnProfile } from "@/components/profile/profile-data";
import { cn } from "@/lib/utils";

/**
 * The language, as two pressed-or-not choices on a muted track: the switch
 * the app frame's rail used to carry, now that the settings hold it.
 */
function LanguageRow() {
  const t = useTranslations("appRail");
  const { locale, setLocale } = useAppLocale();
  const option = (value: "th" | "en", label: string) => (
    <Button
      aria-pressed={locale === value}
      className={cn(
        // `!` over the type lift's 48px buttons: these sit inside a row.
        "h-9! rounded-full px-4! text-sm font-medium lg:h-10! lg:text-frame-meta",
        value === "en" && "font-latin",
        locale === value
          ? "bg-card text-foreground shadow-hero-card hover:bg-card hover:text-foreground"
          : "text-muted-foreground hover:bg-transparent hover:text-foreground",
      )}
      onClick={() => setLocale(value)}
      type="button"
      variant="ghost"
    >
      {label}
    </Button>
  );
  return (
    <div className="flex items-center gap-3 p-3.5">
      <Globe aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground" id="settings-language">
        {t("language")}
      </span>
      {/* `<fieldset>`: a group by its own semantics; `border-0` keeps the capsule as it was. */}
      <fieldset aria-labelledby="settings-language" className="flex min-w-0 items-center gap-1 rounded-full border-0 bg-muted p-1">
        {option("th", t("languageTh"))}
        {option("en", t("languageEn"))}
      </fieldset>
    </div>
  );
}

/**
 * Figma "Account settings" (995:7046) and its updated state (995:7095), which adds
 * a success banner, a verification note and a reworded subtitle.
 *
 * From `lg` it sits in the app frame (`AppFrame`): the rail is the way to the
 * rest of the account, so there is no top bar and no back bar, and the rows
 * keep a 720px measure at the left of the panel. Logging out lives here, as
 * the list's last row; it opens the existing confirm (`/settings/logout`),
 * which draws this page under its dialog (`overlay`).
 */
export function AccountSettingsScreen({
  state = "default",
  overlay,
}: {
  readonly state?: "default" | "updated";
  /** The log-out route renders this page under its dialog. */
  readonly overlay?: ReactNode;
}) {
  const t = useTranslations("accountSettings");
  const c = useTranslations("common");
  const nav = useTranslations("accountNav");
  const profile = useOwnProfile();
  const isUpdated = state === "updated";
  // A reading measure at the left of the panel; 32px between blocks there,
  // the section's own 20px on the phone.
  const column = "lg:max-w-180 lg:px-0";
  const first = cn(column, "lg:pt-8");
  const next = cn(column, "lg:pt-8");

  return (
    <MobileScreen wide="md">
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <AppFrame active="settings">
        <ScreenBody className="lg:bg-card">
          <AccountShell active="settings">
            <div className={cn("contents", DESKTOP_TYPE_LIFT)}>
              {/* The phone's 28px title, and from `lg` the page headline in the
                  hero's Kanit, as the other framed pages set theirs. */}
              <div className="flex w-full shrink-0 flex-col gap-2 px-6 pt-4 pb-2 lg:gap-1.5 lg:p-0">
                <h1 className="text-heading font-semibold text-foreground lg:font-hero lg:text-frame-title lg:font-normal lg:tracking-tight lg:text-hero-ink">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isUpdated ? t("subtitleUpdated") : t("subtitle")}
                </p>
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
                    // The account's own address. It read the frame's fixture, which
                    // named another person on every account.
                    value={profile.data?.email ?? null}
                  />
                  <SettingsDivider />
                  <SettingsRow href="/settings/password" icon={Lock} label={t("password")} />
                </SettingsCard>
                {isUpdated ? (
                  <p className="w-full text-xs font-normal text-muted-foreground">{t("verifyNote")}</p>
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
                <p className="w-full text-xs font-normal text-muted-foreground">{t("deleteNote")}</p>
              </SettingsSection>

              {/* The language, which the rail no longer carries: the same two
                  choices it offered, switched in place. */}
              <SettingsSection className={next}>
                <SettingsCard>
                  <PushToggle layout="row" />
                  <SettingsDivider />
                  <LanguageRow />
                </SettingsCard>
              </SettingsSection>

              {/* Leaving ends the list, apart from everything above it; the row
                  opens the confirm rather than signing out on one press. */}
              <SettingsSection className={next}>
                <SettingsCard>
                  <SettingsRow href="/settings/logout" icon={LogOut} label={nav("logOut")} />
                </SettingsCard>
              </SettingsSection>

              {/* The slack under a short list on the phone. */}
              <ScreenSpacer className="lg:hidden" />
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
      {overlay}
    </MobileScreen>
  );
}
