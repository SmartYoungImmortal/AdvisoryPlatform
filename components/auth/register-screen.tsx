"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

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
import { isEmail, passwordProblems, register } from "@/lib/session";
import { cn } from "@/lib/utils";

type Errors = Partial<
  Record<"displayName" | "fullName" | "email" | "password" | "confirm" | "consent", string>
>;

/**
 * Figma "Register (Light)" (995:4344) plus the email-in-use (995:4383) and
 * validation-error (995:4424) states.
 *
 * Submitting creates an advisee in the mock database, signs them in and moves on
 * to the PDPA step. `state` prefills a frame's values and errors so its route
 * still opens on the drawing.
 */
export function RegisterScreen({
  state = "default",
}: {
  readonly state?: "default" | "email-in-use" | "validation-errors";
}) {
  const t = useTranslations("register");
  const c = useTranslations("common");
  const router = useRouter();
  const inUsePreset = state === "email-in-use";
  const invalidPreset = state === "validation-errors";

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inUsePreset ? "araya.s@kmitl.ac.th" : "");
  const [password, setPassword] = useState(invalidPreset ? "abcd" : "");
  const [confirm, setConfirm] = useState(invalidPreset ? "abcdefgh" : "");
  const [consent, setConsent] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [errors, setErrors] = useState<Errors>(() => {
    if (inUsePreset) return { email: t("emailInUse") };
    if (invalidPreset) {
      return {
        password: t("passwordError"),
        confirm: t("confirmError"),
        consent: t("consentError"),
      };
    }
    return {};
  });
  const inUse = errors.email === t("emailInUse");

  function clear(key: keyof Errors) {
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = passwordProblems(password);
    const next: Errors = {};
    if (!displayName.trim()) next.displayName = t("requiredError");
    if (!fullName.trim()) next.fullName = t("requiredError");
    if (!isEmail(email)) next.email = t("emailError");
    if (problems.length || problems.symbol || problems.digit) {
      next.password = t("passwordError");
    }
    if (confirm !== password) next.confirm = t("confirmError");
    if (!consent) next.consent = t("consentError");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const result = register({
      name: displayName,
      fullName,
      email,
      phone: "",
      password,
    });
    if (!result.ok) {
      setErrors({ email: t("emailInUse") });
      return;
    }
    router.push("/pdpa");
  }

  const reveal = (
    <RevealPasswordButton
      label={t("passwordLabel")}
      onToggle={() => setRevealed((value) => !value)}
      revealed={revealed}
    />
  );

  return (
    <MobileScreen>
      <ScreenTopBar href="/login" label={c("back")} />
      <ScreenBody>
        <form className="flex w-full flex-1 flex-col items-center" noValidate onSubmit={submit}>
          {/* Figma "Heading": 16px top / 8px bottom padding, 10px gap. */}
          <ScreenHeading
            className="gap-2.5 pt-4"
            subtitle={t("subtitle")}
            title={t("title")}
          />

          {/* Figma "Form Fields": 16px top padding, 16px between fields. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-4">
            <Field
              autoComplete="nickname"
              error={errors.displayName}
              id="register-display-name"
              invalid={Boolean(errors.displayName)}
              label={t("displayNameLabel")}
              onChange={(event) => {
                setDisplayName(event.target.value);
                clear("displayName");
              }}
              placeholder={t("displayNamePlaceholder")}
              value={displayName}
            />
            <Field
              autoComplete="name"
              error={errors.fullName}
              id="register-full-name"
              invalid={Boolean(errors.fullName)}
              label={t("fullNameLabel")}
              onChange={(event) => {
                setFullName(event.target.value);
                clear("fullName");
              }}
              placeholder={t("fullNamePlaceholder")}
              value={fullName}
            />
            <Field
              autoComplete="email"
              error={errors.email}
              icon={Mail}
              id="register-email"
              invalid={Boolean(errors.email)}
              label={t("emailLabel")}
              latin
              onChange={(event) => {
                setEmail(event.target.value);
                clear("email");
              }}
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
            />
            {/* Password field: Figma stacks the rule list 4px under the input. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-1">
              <Field
                autoComplete="new-password"
                icon={Lock}
                id="register-password"
                invalid={Boolean(errors.password)}
                label={t("passwordLabel")}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clear("password");
                }}
                placeholder={t("passwordPlaceholder")}
                trailing={reveal}
                type={revealed ? "text" : "password"}
                value={password}
              />
              {errors.password ? (
                <p className="w-full text-xs font-normal text-destructive">
                  {errors.password}
                </p>
              ) : null}
              {inUse ? (
                <p className="w-full text-sm font-normal text-muted-foreground">
                  {t("hintCompact")}
                </p>
              ) : (
                <PasswordRules password={password} ranged={invalidPreset} />
              )}
            </div>
            <Field
              autoComplete="new-password"
              error={errors.confirm}
              icon={Lock}
              id="register-confirm"
              invalid={Boolean(errors.confirm)}
              label={t("confirmLabel")}
              onChange={(event) => {
                setConfirm(event.target.value);
                clear("confirm");
              }}
              placeholder={t("confirmPlaceholder")}
              type={revealed ? "text" : "password"}
              value={confirm}
            />
          </div>

          {/* Figma "PDPA Consent": 20px top padding, 10px gap, 12/18 copy. The copy
              is a <label>, so tapping the sentence toggles the box. */}
          <div className="flex w-full shrink-0 items-start gap-2.5 px-6 pt-5">
            <Checkbox
              aria-invalid={Boolean(errors.consent) || undefined}
              checked={consent}
              className="mt-px size-3.5 bg-card"
              id="register-consent"
              onCheckedChange={(checked) => {
                setConsent(checked);
                clear("consent");
              }}
            />
            <label
              className="min-w-px flex-1 text-xs font-normal text-muted-foreground"
              htmlFor="register-consent"
            >
              {t("consentPrefix")}
              <Link className="text-brand-image" href="/terms">
                {t("consentTerms")}
              </Link>
              {t("consentAnd")}
              <Link className="text-brand-image" href="/terms">
                {t("consentPrivacy")}
              </Link>
              {t("consentSuffix")}
            </label>
          </div>
          {errors.consent ? (
            <div className="flex w-full shrink-0 items-start px-6 pt-1">
              <p className="w-full text-xs font-normal text-destructive" role="alert">
                {errors.consent}
              </p>
            </div>
          ) : null}

          <ScreenSpacer />
          {/* Figma "Actions": 8px padding, 14px gap above the sign-in link. */}
          <ScreenActions className="gap-3.5">
            <PrimaryButton type="submit">{t("submit")}</PrimaryButton>
            {inUse ? <NeutralButton href="/login">{t("signInWithEmail")}</NeutralButton> : null}
            <p className="w-full text-center text-sm font-normal text-muted-foreground">
              {t("haveAccount")}
              <Link className="text-brand-image" href="/login">
                {t("signIn")}
              </Link>
            </p>
          </ScreenActions>
        </form>
      </ScreenBody>
    </MobileScreen>
  );
}

/** The frame's three rule lines; each turns to success ink once it holds. */
function PasswordRules({
  password,
  ranged,
}: {
  readonly password: string;
  readonly ranged: boolean;
}) {
  const t = useTranslations("register");
  const problems = passwordProblems(password);
  const started = password.length > 0;
  const tone = (failing: boolean) =>
    cn(started && !failing && "text-success");

  return (
    <div className="w-full text-sm font-normal whitespace-pre-wrap text-muted-foreground">
      <p className={tone(problems.length)}>{ranged ? t("hintRange1") : t("hint1")}</p>
      <p className={tone(problems.symbol)}>{t("hint2")}</p>
      <p className={tone(problems.digit)}>{t("hint3")}</p>
    </div>
  );
}
