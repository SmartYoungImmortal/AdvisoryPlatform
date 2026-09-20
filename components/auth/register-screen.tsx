"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
import { AlertBanner } from "@/components/mobile/banner";
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
import { Surface } from "@/components/mobile/surface";
import { isEmail, passwordProblems, register, roleHome } from "@/lib/session";
import { cn } from "@/lib/utils";

type Errors = Partial<
  Record<"displayName" | "fullName" | "email" | "password" | "confirm" | "consent", string>
>;

/**
 * Figma "Register (Light)" (995:4344) plus the email-in-use (995:4383) and
 * validation-error (995:4424) states.
 *
 * Submitting creates the account through the API, which signs it in on the same
 * call, and lands it on the advisee's home. `state` prefills a frame's values and
 * errors so its route still opens on the drawing.
 *
 * ## What the API validates that this form cannot
 *
 * The rule list under the password is still checked here, because a form should
 * not need a round trip to say "add a digit". better-auth checks again and has
 * rules of its own, so a refusal it makes that this form did not predict — a
 * password it reads as too short, a required field the plugin wants — surfaces as
 * a banner carrying **its** sentence rather than as an invented field error. The
 * one refusal the frame already draws is the taken email (a 422), which stays on
 * the email field where it was designed.
 */
export function RegisterScreen({
  state = "default",
}: {
  readonly state?: "default" | "email-in-use" | "validation-errors";
}) {
  const t = useTranslations("register");
  const s = useTranslations("errorStates");
  const c = useTranslations("common");
  const router = useRouter();
  const inUsePreset = state === "email-in-use";
  const invalidPreset = state === "validation-errors";

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inUsePreset ? "araya.s@advisory.demo" : "");
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
  /** A refusal that belongs to no single field: the API's own, or no API at all. */
  const [trouble, setTrouble] = useState<
    { readonly kind: "rejected" | "unreachable"; readonly detail: string | null } | null
  >(null);
  const [busy, setBusy] = useState(false);

  function clear(key: keyof Errors) {
    setErrors((current) => ({ ...current, [key]: undefined }));
    setTrouble(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
    setTrouble(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const result = await register({
      name: displayName,
      fullName,
      email,
      phone: "",
      password,
    });
    if (!result.ok) {
      setBusy(false);
      if (result.reason === "email-in-use") {
        setErrors({ email: t("emailInUse") });
        return;
      }
      setTrouble({ kind: result.reason, detail: result.message ?? null });
      return;
    }
    // Into the app, not onto the privacy policy. The consent this form needs is
    // the checkbox above, which already blocks submission until it is ticked;
    // routing a new account to a document to press "accept" a second time
    // recorded nothing and read as a step that could be failed.
    //
    // Still busy on the way out: the account exists and the session is live, so
    // re-enabling the form would only offer to create it a second time.
    router.push(roleHome(result.account.role));
  }

  const reveal = (
    <RevealPasswordButton
      label={t("passwordLabel")}
      onToggle={() => setRevealed((value) => !value)}
      revealed={revealed}
    />
  );

  return (
    // Figma "Desktop / Register (Light)" (1787:23891) — the same form as the
    // auth card, under the guest nav. See `components/auth/auth-chrome`.
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/login" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <form
          className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          {/* Figma "Heading": 16px top / 8px bottom padding, 10px gap. */}
          <ScreenHeading
            className="gap-2.5 pt-4"
            subtitle={t("subtitle")}
            title={t("title")}
          />

          {/* The frame draws no banner here, because the only failure it knew
              about was the taken email and that one lives on the field. A refusal
              that belongs to no field needs somewhere to be said. */}
          {trouble?.kind === "rejected" ? (
            <AlertBanner
              body={trouble.detail ?? s("serverBody")}
              icon={TriangleAlert}
              title={s("serverTitle")}
            />
          ) : null}
          {trouble?.kind === "unreachable" ? (
            <AlertBanner body={s("offlineBody")} icon={WifiOff} title={s("offlineTitle")} />
          ) : null}

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
                <p className="w-full text-xs font-normal text-muted-foreground">
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
              is a <label>, so tapping the sentence toggles the box.

              The consent is the one gate between a filled form and an account,
              and as a bare line of 12px grey under five fields it read as a
              footnote. It sits in a well: the group is one object, the white
              checkbox has a ground to sit on, and the error state rings it. */}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-5">
            <Surface
              className={cn(
                "flex w-full items-start gap-2.5 p-3",
                errors.consent && "ring-1 ring-destructive ring-inset",
              )}
              tier="well"
            >
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
            </Surface>
            {errors.consent ? (
              <p className="w-full pt-1 text-xs font-normal text-destructive" role="alert">
                {errors.consent}
              </p>
            ) : null}
          </div>

          <ScreenSpacer className="lg:hidden" />
          {/* Figma "Actions": 8px padding, 14px gap above the sign-in link. The
              448 card keeps the column at every width — see `LoginScreen`. */}
          <ScreenActions className="gap-3.5" stacked>
            {/* Busy is the frame's own label at 40%: there is no "creating…"
                string to swap in, and `aria-busy` states it without one. */}
            <PrimaryButton
              aria-busy={busy || undefined}
              block
              className="disabled:opacity-40"
              disabled={busy}
              type="submit"
            >
              {t("submit")}
            </PrimaryButton>
            {inUse ? (
              <NeutralButton block href="/login">
                {t("signInWithEmail")}
              </NeutralButton>
            ) : null}
            <p className="w-full text-center text-sm font-normal text-muted-foreground">
              {t("haveAccount")}
              <Link className="text-brand-image" href="/login">
                {t("signIn")}
              </Link>
            </p>
          </ScreenActions>
        </form>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * The frame's three rule lines; each turns to success ink once it holds.
 *
 * They are helper copy, so they sit at 12/18 rather than sharing the 14px of the
 * field label above them — the rule list was competing with the label it
 * qualified. The bullet is part of each string (" · อย่างน้อย 8 ตัวอักษร"),
 * which is what `whitespace-pre-wrap` is preserving.
 */
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
    <div className="w-full text-xs font-normal whitespace-pre-wrap text-muted-foreground">
      <p className={tone(problems.length)}>{ranged ? t("hintRange1") : t("hint1")}</p>
      <p className={tone(problems.symbol)}>{t("hint2")}</p>
      <p className={tone(problems.digit)}>{t("hint3")}</p>
    </div>
  );
}
