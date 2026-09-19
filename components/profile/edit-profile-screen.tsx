import Image from "next/image";
import { BellOff, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { arayaS as araya } from "@/lib/assets/r2";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  ACCOUNT_FORM_PANEL,
  ACCOUNT_HEADING,
  ACCOUNT_NAV,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * Figma "Advisee profile - Edit" (995:7152) plus the save-failed (995:7586) and
 * photo-rejected (995:7541) states, which insert an alert banner above the avatar.
 *
 * Figma "Desktop / Advisee profile - Edit (Light)" (1787:25320) and the same two
 * states (1787:25944, 1787:26037) hold the form in an 800px panel: the avatar
 * block turns the corner into its own column beside the fields, the banner
 * spans both, and the actions come off the bottom edge into a right-aligned
 * row under them.
 */
export function EditProfileScreen({
  state = "default",
}: {
  readonly state?: "default" | "save-failed" | "photo-rejected";
}) {
  const t = useTranslations("profileEdit");
  const c = useTranslations("common");
  const hasBanner = state !== "default";

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
            subtitle={t("subtitle")}
            title={t("title")}
          />
        </div>

        {/* Figma "Form Band" — the panel the whole form moves into at 1440. */}
        <div className={cn("flex w-full flex-1 flex-col items-center", ACCOUNT_FORM_PANEL)}>
          {state === "save-failed" ? (
            <AlertBanner
              body={t("saveFailedBody")}
              className="lg:px-0 lg:pt-0"
              icon={BellOff}
              title={t("saveFailedTitle")}
            />
          ) : null}
          {state === "photo-rejected" ? (
            <AlertBanner
              body={t("photoRejectedBody")}
              className="lg:px-0 lg:pt-0"
              icon={TriangleAlert}
              title={t("photoRejectedTitle")}
            />
          ) : null}

          {/* The phone stacks the portrait over the fields; the frame stands it
              beside them in a 180px column, which is what lets the two name
              rows and the locked address read as one form rather than three. */}
          <div
            className={cn(
              "flex w-full shrink-0 flex-col items-center lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start lg:gap-8",
              hasBanner && "lg:pt-6",
            )}
          >
            {/* Figma "Avatar Edit": 96px avatar, 12px gap, auto-width neutral button. */}
            <div className="flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-2 lg:px-0 lg:pt-0">
              <Image
                alt=""
                className="size-24 shrink-0 rounded-full object-cover"
                height={96}
                src={araya}
                width={96}
              />
              <NeutralButton className="w-auto">{t("changePhoto")}</NeutralButton>
            </div>

            <div className="flex w-full shrink-0 flex-col items-start">
              {/* Figma "Form Fields": 20px top padding, 16px between fields. */}
              <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-5 lg:px-0 lg:pt-0">
                <Field
                  id="display-name"
                  label={t("displayNameLabel")}
                  placeholder={t("displayNamePlaceholder")}
                />
                <Field
                  id="full-name"
                  label={t("fullNameLabel")}
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>

              {/* Figma "Email Locked": read-only card, then a 12/18 muted note. */}
              <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-4 lg:px-0">
                {/* The read-only card is the page surface on the phone; inside
                    the panel it would vanish into it, so it takes the muted
                    tint the frame gives it there. */}
                <div className="flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-xl bg-card p-3.5 lg:bg-muted/50">
                  <Lock className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                    <p className="w-full text-xs font-normal text-muted-foreground">
                      {c("email")}
                    </p>
                    <p className="font-latin w-full text-sm font-medium text-foreground">
                      {c("emailValue")}
                    </p>
                  </div>
                </div>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("emailNote")}
                </p>
              </div>
            </div>
          </div>

          {/* The phone frame pins its actions to the bottom edge; the panel is
              only as tall as its content, so the spacer goes with the frame and
              the stack turns into Figma's right-aligned row. */}
          <ScreenSpacer className={cn(hasBanner && "min-h-11.5", "lg:hidden")} />
          <ScreenActions className="lg:flex-row-reverse lg:justify-start lg:px-0 lg:pt-8 lg:pb-0">
            <PrimaryButton className="lg:w-auto" href="/profile">
              {state === "save-failed" ? t("retry") : t("save")}
            </PrimaryButton>
            <NeutralButton className="lg:w-auto" href="/profile">
              {c("cancel")}
            </NeutralButton>
          </ScreenActions>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
