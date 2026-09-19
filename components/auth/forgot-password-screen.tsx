import { Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
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
import { Surface } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";

/** Figma "Forgot password (Light)" — 995:4148. */
export function ForgotPasswordScreen() {
  const t = useTranslations("forgotPassword");
  const c = useTranslations("common");

  return (
    // Figma "Desktop / Forgot password (Light)" (1787:23853) — the phone frame's
    // own blocks inside the shared auth card. See `components/auth/auth-chrome`.
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/login" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
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
          <ScreenSpacer className="lg:hidden" />
          {/* Figma "Actions": 8px padding, 12px gap; the primary CTA starts
              disabled. `stacked` + `block` keeps the frame's column inside the
              448 card — see `LoginScreen`. */}
          <ScreenActions stacked>
            <PrimaryButton block href="/reset-sent">
              {t("submit")}
            </PrimaryButton>
            <NeutralButton block href="/login">
              {t("backToSignIn")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Reset link sent (Light)" — 995:4500. */
export function ResetLinkSentScreen() {
  const t = useTranslations("resetSent");
  const c = useTranslations("common");

  return (
    // Figma "Desktop / Reset link sent (Light)" (1787:24050).
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/forgot-password" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
        {/* Figma "Hero": 96px badge inset 56px from the top, then the 30/40 text
            block. The badge takes the accent ground rather than the grey one: a
            blue glyph in a grey circle was the only thing on the screen with a
            colour, and it read as a disabled state. */}
        <div className="flex w-full shrink-0 flex-col items-center pt-14">
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-accent-surface">
            <MailCheck className="size-10 text-primary" />
          </span>
          <div className="flex w-full shrink-0 flex-col items-center gap-2.5 overflow-clip px-6 pt-4.5 text-center">
            <p className="w-full text-2xl leading-7.5 font-semibold text-foreground">
              {t("title")}
            </p>
            <p className="w-full text-sm font-normal text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Figma "Sent To": card with a 16px mail glyph and a label/value stack.
            It was `bg-card` on the card surface, i.e. invisible; as the one fact
            the screen states it belongs in a well under the copy above it. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
          <Surface className="flex w-full items-center gap-2.5 p-3.5" tier="well">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("sentToLabel")}
              </p>
              <p className="font-latin w-full truncate text-sm font-medium text-foreground">
                {t("sentToValue")}
              </p>
            </div>
          </Surface>
        </div>

        <ScreenSpacer className="lg:hidden" />
        <ScreenActions stacked>
          <PrimaryButton block href="/login">
            {t("backToSignIn")}
          </PrimaryButton>
          <NeutralButton block href="/reset-sent">
            {t("resend")}
          </NeutralButton>
        </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
