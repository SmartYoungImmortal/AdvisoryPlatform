import Link from "next/link";
import { Eye, Lock, Mail } from "lucide-react";
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

/** Figma "Consent Checkbox" — 16px box holding a 14px 4px-radius square. */
function ConsentCheckbox({ invalid = false }: { readonly invalid?: boolean }) {
  return (
    <span className="relative block size-4 shrink-0">
      <span
        className={`absolute top-px left-px size-[14px] rounded-[4px] border bg-card ${
          invalid ? "border-destructive" : "border-border"
        }`}
      />
    </span>
  );
}

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
      <StatusBar />
      <ScreenTopBar href="/login" label={c("back")} />
      <ScreenBody>
        {/* Figma "Heading": 16px top / 8px bottom padding, 10px gap. */}
        <ScreenHeading
          className="gap-[10px] pt-4"
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
              trailing={
                <button aria-label={t("passwordLabel")} type="button">
                  <Eye className="size-4" />
                </button>
              }
              type="password"
            />
            {invalid ? (
              <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-destructive">
                {t("passwordError")}
              </p>
            ) : null}
            {inUse ? (
              <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
                {t("hintCompact")}
              </p>
            ) : (
              <div className="font-thai w-full text-[14px] leading-[20px] font-normal whitespace-pre-wrap text-muted-foreground">
                <p className="leading-[20px]">{invalid ? t("hintRange1") : t("hint1")}</p>
                <p className="leading-[20px]">{t("hint2")}</p>
                <p className="leading-[20px]">{t("hint3")}</p>
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
            trailing={
              <button aria-label={t("confirmLabel")} type="button">
                <Eye className="size-4" />
              </button>
            }
            type="password"
          />
        </div>

        {/* Figma "PDPA Consent": 20px top padding, 10px gap, 12/18 copy. */}
        <div className="flex w-full shrink-0 items-start gap-[10px] px-6 pt-5">
          <ConsentCheckbox invalid={invalid} />
          <p className="font-thai min-w-px flex-1 text-[12px] leading-[18px] font-normal text-muted-foreground">
            {t("consentPrefix")}
            <span className="text-brand-image">{t("consentTerms")}</span>
            {t("consentAnd")}
            <span className="text-brand-image">{t("consentPrivacy")}</span>
            {t("consentSuffix")}
          </p>
        </div>
        {invalid ? (
          <div className="flex w-full shrink-0 items-start px-6 pt-1">
            <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-destructive">
              {t("consentError")}
            </p>
          </div>
        ) : null}

        <ScreenSpacer />
        {/* Figma "Actions": 8px padding, 14px gap above the sign-in link. */}
        <ScreenActions className="gap-[14px]">
          <PrimaryButton href="/pdpa">{t("submit")}</PrimaryButton>
          {inUse ? <NeutralButton href="/login">{t("signInWithEmail")}</NeutralButton> : null}
          <p className="font-thai w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
            {t("haveAccount")}
            <Link className="text-brand-image" href="/login">
              {t("signIn")}
            </Link>
          </p>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
