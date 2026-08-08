import Image from "next/image";
import { BellOff, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import araya from "@/assets/avatars/araya-s.png";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
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
 * Figma "Advisee profile - Edit" (995:7152) plus the save-failed (995:7586) and
 * photo-rejected (995:7541) states, which insert an alert banner above the avatar.
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
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading subtitle={t("subtitle")} title={t("title")} />

        {state === "save-failed" ? (
          <AlertBanner
            body={t("saveFailedBody")}
            icon={BellOff}
            title={t("saveFailedTitle")}
          />
        ) : null}
        {state === "photo-rejected" ? (
          <AlertBanner
            body={t("photoRejectedBody")}
            icon={TriangleAlert}
            title={t("photoRejectedTitle")}
          />
        ) : null}

        {/* Figma "Avatar Edit": 96px avatar, 12px gap, auto-width neutral button. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-3 px-6 pt-2">
          <Image
            alt=""
            className="size-24 shrink-0 rounded-full object-cover"
            height={96}
            src={araya}
            width={96}
          />
          <NeutralButton className="w-auto">{t("changePhoto")}</NeutralButton>
        </div>

        {/* Figma "Form Fields": 20px top padding, 16px between fields. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-5">
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
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-4">
          <div className="flex w-full shrink-0 items-center gap-[10px] overflow-clip rounded-[14px] bg-card p-[14px]">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
              <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
                {c("email")}
              </p>
              <p className="font-latin w-full text-[14px] leading-[20px] font-medium text-foreground">
                {c("emailValue")}
              </p>
            </div>
          </div>
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {t("emailNote")}
          </p>
        </div>

        <ScreenSpacer className={hasBanner ? "min-h-[46px]" : undefined} />
        <ScreenActions>
          <PrimaryButton href="/profile">
            {state === "save-failed" ? t("retry") : t("save")}
          </PrimaryButton>
          <NeutralButton href="/profile">{c("cancel")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
