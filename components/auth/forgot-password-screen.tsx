import { Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

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

/** Figma "Forgot password (Light)" — 995:4148. */
export function ForgotPasswordScreen() {
  const t = useTranslations("forgotPassword");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/login" label={c("back")} />
      <ScreenBody>
        {/* Figma "Heading": 112px block — 16px top, 40px title, 8px gap, 40px subtitle. */}
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("subtitle")}
          title={t("title")}
        />
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4">
          <Field
            icon={Mail}
            id="forgot-email"
            label={t("emailLabel")}
            latin
            placeholder={t("emailPlaceholder")}
            type="email"
          />
        </div>
        <ScreenSpacer />
        {/* Figma "Actions": 8px padding, 12px gap; the primary CTA starts disabled. */}
        <ScreenActions>
          <PrimaryButton href="/reset-sent">{t("submit")}</PrimaryButton>
          <NeutralButton href="/login">{t("backToSignIn")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Reset link sent (Light)" — 995:4500. */
export function ResetLinkSentScreen() {
  const t = useTranslations("resetSent");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/forgot-password" label={c("back")} />
      <ScreenBody>
        {/* Figma "Hero": 96px badge inset 56px from the top, then the 30/40 text block. */}
        <div className="flex w-full shrink-0 flex-col items-center pt-14">
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-muted">
            <MailCheck className="size-10 text-primary" />
          </span>
          <div className="flex w-full shrink-0 flex-col items-center gap-[10px] overflow-clip px-6 pt-[18px] text-center">
            <p className="font-thai w-full text-[24px] leading-[30px] font-semibold text-foreground">
              {t("title")}
            </p>
            <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Figma "Sent To": card with a 16px mail glyph and a label/value stack. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
          <div className="flex w-full shrink-0 items-center gap-[10px] overflow-clip rounded-[14px] bg-card p-[14px]">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
              <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
                {t("sentToLabel")}
              </p>
              <p className="font-latin w-full text-[14px] leading-[20px] font-medium text-foreground">
                {t("sentToValue")}
              </p>
            </div>
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/login">{t("backToSignIn")}</PrimaryButton>
          <NeutralButton href="/reset-sent">{t("resend")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
