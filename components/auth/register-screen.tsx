import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field, RevealPasswordButton } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";

/**
 * Figma "Register (Light)" (995:4344) plus the email-in-use (995:4383) and
 * validation-error (995:4424) states.
 */
export function RegisterScreen({
  state = "default",
}: {
  readonly state?: "default" | "email-in-use" | "validation-errors";
}) {
  const t = useTranslations("register");
  const c = useTranslations("common");
  const inUse = state === "email-in-use";
  const invalid = state === "validation-errors";

  return (
    <MobileScreen>
      <ScreenTopBar href="/login" label={c("back")} />
      <ScreenBody>
        {/* Figma "Heading": 16px top / 8px bottom padding, 10px gap. */}
        <ScreenHeading
          className="gap-2.5 pt-4"
          subtitle={t("subtitle")}
          title={t("title")}
        />

        {/* Figma "Form Fields": 16px top padding, 16px between fields. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-4">
          <Field
            id="register-display-name"
            label={t("displayNameLabel")}
            placeholder={t("displayNamePlaceholder")}
          />
          <Field
            id="register-full-name"
            label={t("fullNameLabel")}
            placeholder={t("fullNamePlaceholder")}
          />
          <Field
            defaultValue={inUse ? "araya.s@kmitl.ac.th" : undefined}
            error={inUse ? t("emailInUse") : undefined}
            icon={Mail}
            id="register-email"
            invalid={inUse}
            label={t("emailLabel")}
            latin
            placeholder={t("emailPlaceholder")}
            type="email"
          />
          {/* Password field: Figma stacks the rule list 4px under the input. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-1">
            <Field
              defaultValue={invalid ? "abcd" : undefined}
              icon={Lock}
              id="register-password"
              invalid={invalid}
              label={t("passwordLabel")}
              placeholder={t("passwordPlaceholder")}
              trailing={<RevealPasswordButton label={t("passwordLabel")} />}
              type="password"
            />
            {invalid ? (
              <p className="w-full text-xs font-normal text-destructive">
                {t("passwordError")}
              </p>
            ) : null}
            {inUse ? (
              <p className="w-full text-sm font-normal text-muted-foreground">
                {t("hintCompact")}
              </p>
            ) : (
              <div className="w-full text-sm font-normal whitespace-pre-wrap text-muted-foreground">
                <p>{invalid ? t("hintRange1") : t("hint1")}</p>
                <p>{t("hint2")}</p>
                <p>{t("hint3")}</p>
              </div>
            )}
          </div>
          <Field
            defaultValue={invalid ? "abcdefgh" : undefined}
            error={invalid ? t("confirmError") : undefined}
            icon={Lock}
            id="register-confirm"
            invalid={invalid}
            label={t("confirmLabel")}
            placeholder={t("confirmPlaceholder")}
            trailing={<RevealPasswordButton label={t("confirmLabel")} />}
            type="password"
          />
        </div>

        {/* Figma "PDPA Consent": 20px top padding, 10px gap, 12/18 copy. The copy is
            a <label>, so tapping the sentence toggles the box — the previous pair of
            decorative <span>s could not be focused, checked or read out at all. */}
        <div className="flex w-full shrink-0 items-start gap-2.5 px-6 pt-5">
          <Checkbox
            aria-invalid={invalid || undefined}
            className="mt-px size-3.5 bg-card"
            id="register-consent"
          />
          <label
            className="min-w-px flex-1 text-xs font-normal text-muted-foreground"
            htmlFor="register-consent"
          >
            {t("consentPrefix")}
            <span className="text-brand-image">{t("consentTerms")}</span>
            {t("consentAnd")}
            <span className="text-brand-image">{t("consentPrivacy")}</span>
            {t("consentSuffix")}
          </label>
        </div>
        {invalid ? (
          <div className="flex w-full shrink-0 items-start px-6 pt-1">
            <p className="w-full text-xs font-normal text-destructive" role="alert">
              {t("consentError")}
            </p>
          </div>
        ) : null}

        <ScreenSpacer />
        {/* Figma "Actions": 8px padding, 14px gap above the sign-in link. */}
        <ScreenActions className="gap-3.5">
          <PrimaryButton href="/pdpa">{t("submit")}</PrimaryButton>
          {inUse ? <NeutralButton href="/login">{t("signInWithEmail")}</NeutralButton> : null}
          <p className="w-full text-center text-sm font-normal text-muted-foreground">
            {t("haveAccount")}
            <Link className="text-brand-image" href="/login">
              {t("signIn")}
            </Link>
          </p>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
