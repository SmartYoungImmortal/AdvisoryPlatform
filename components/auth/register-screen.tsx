"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import {
  AUTH_LINK,
  AuthHeading,
  AuthSplit,
  SocialButtons,
  authPill,
  type SocialFailure,
} from "@/components/auth/auth-split";
import { AlertBanner } from "@/components/mobile/banner";
import { Field, RevealPasswordButton } from "@/components/mobile/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isEmail, passwordProblems, register } from "@/lib/session";
import { cn } from "@/lib/utils";

type Errors = Partial<
  Record<"displayName" | "fullName" | "email" | "password" | "confirm" | "consent", string>
>;

/** A refusal that belongs to no single field. */
type Trouble =
  | { readonly kind: "rejected" | "unreachable"; readonly detail: string | null }
  /** A social provider the API has not been given credentials for. */
  | { readonly kind: "off"; readonly detail: string };

/**
 * The sign-up page, in the sign-in page's frame (`AuthSplit`): the room
 * photograph on a desktop, the providers first, then under an "or" the form.
 * A provider signs up and signs in in one journey, so the same buttons serve.
 *
 * Kept from Figma "Register (Light)" (995:4344) and its email-in-use
 * (995:4383) and validation-error (995:4424) states: all five fields, the
 * password rules that turn green as they hold, the consent, and the way to
 * sign in. `state` seeds a frame's errors so its route still opens on it.
 *
 * Submitting creates the account through the API, which sends the
 * verification link, and moves on to "check your email".
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
  const l = useTranslations("login");
  const s = useTranslations("errorStates");
  const router = useRouter();
  const inUsePreset = state === "email-in-use";
  const invalidPreset = state === "validation-errors";

  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [busy, setBusy] = useState(false);

  function clear(key: keyof Errors) {
    setErrors((current) => ({ ...current, [key]: undefined }));
    setTrouble(null);
  }

  function onSocialFailure(social: SocialFailure | null) {
    if (!social) return setTrouble(null);
    if (social.kind === "off") setTrouble({ kind: "off", detail: social.provider });
    else if (social.kind === "unreachable") setTrouble({ kind: "unreachable", detail: null });
    else setTrouble({ kind: "rejected", detail: social.detail });
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
      callbackURL: new URL(
        `/email-verified?email=${encodeURIComponent(email.trim())}`,
        window.location.origin,
      ).toString(),
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
    // The account exists and the API sent its verification link. Keep the
    // entered address visible so the user can resend from the next screen.
    router.push(`/verification-sent?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <AuthSplit>
      <AuthHeading subtitle={t("subtitle")} title={t("titleShort")} withLogo />

      {/* `px-0 pt-0`: the banner's own inset is the phone page's gutter. */}
      {trouble?.kind === "off" ? (
        <AlertBanner
          className="px-0 pt-0"
          body={l("providerOffBody")}
          icon={TriangleAlert}
          title={l("providerOffTitle", { provider: trouble.detail })}
        />
      ) : null}
      {trouble?.kind === "rejected" ? (
        <AlertBanner
          className="px-0 pt-0"
          body={trouble.detail ?? s("serverBody")}
          icon={TriangleAlert}
          title={s("serverTitle")}
        />
      ) : null}
      {trouble?.kind === "unreachable" ? (
        <AlertBanner className="px-0 pt-0" body={s("offlineBody")} icon={WifiOff} title={s("offlineTitle")} />
      ) : null}

      <SocialButtons compact disabled={busy} divider={t("orEmail")} onFailure={onSocialFailure} />

      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void submit(event)}>
        {/* The two names side by side from the tablet up: they are one
            question ("who are you"), and five stacked fields read as a wall. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
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
            outline
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
            outline
            placeholder={t("fullNamePlaceholder")}
            value={fullName}
          />
        </div>
        <Field
          autoComplete="email"
          error={errors.email}
          id="register-email"
          invalid={Boolean(errors.email)}
          label={t("emailLabel")}
          latin
          onChange={(event) => {
            setEmail(event.target.value);
            clear("email");
          }}
          outline
          placeholder={t("emailPlaceholder")}
          type="email"
          value={email}
        />
        {/* The rule list sits 4px under the password, as the frame drew it. */}
        <div className="flex w-full flex-col gap-1">
          <Field
            autoComplete="new-password"
            id="register-password"
            invalid={Boolean(errors.password)}
            label={t("passwordLabel")}
            onChange={(event) => {
              setPassword(event.target.value);
              clear("password");
            }}
            outline
            placeholder={t("passwordPlaceholder")}
            trailing={
              <RevealPasswordButton
                label={t("passwordLabel")}
                onToggle={() => setRevealed((value) => !value)}
                revealed={revealed}
              />
            }
            type={revealed ? "text" : "password"}
            value={password}
          />
          {errors.password ? (
            <p className="w-full text-xs font-normal text-destructive">{errors.password}</p>
          ) : null}
          {inUse ? (
            <p className="w-full text-xs font-normal text-muted-foreground">{t("hintCompact")}</p>
          ) : (
            <PasswordRules password={password} ranged={invalidPreset} />
          )}
        </div>
        <Field
          autoComplete="new-password"
          error={errors.confirm}
          id="register-confirm"
          invalid={Boolean(errors.confirm)}
          label={t("confirmLabel")}
          onChange={(event) => {
            setConfirm(event.target.value);
            clear("confirm");
          }}
          outline
          placeholder={t("confirmPlaceholder")}
          type={revealed ? "text" : "password"}
          value={confirm}
        />

        {/* The consent is the one gate between a filled form and an
            account. The copy is a <label>, so tapping the sentence toggles
            the box; the error rings the row. */}
        <div className="flex flex-col gap-1">
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-xl p-1",
              errors.consent && "ring-1 ring-destructive",
            )}
          >
            <Checkbox
              aria-invalid={Boolean(errors.consent) || undefined}
              checked={consent}
              className="mt-0.5"
              id="register-consent"
              onCheckedChange={(checked) => {
                setConsent(checked);
                clear("consent");
              }}
            />
            <label
              className="min-w-px flex-1 text-xs leading-5 text-muted-foreground"
              htmlFor="register-consent"
            >
              {t("consentPrefix")}{" "}
              <Link className={AUTH_LINK} href="/terms">
                {t("consentTerms")}
              </Link>
              {t("consentAnd")}{" "}
              <Link className={AUTH_LINK} href="/privacy-policy">
                {t("consentPrivacy")}
              </Link>
              {t("consentSuffix")}
            </label>
          </div>
          {errors.consent ? (
            <p className="text-xs font-normal text-destructive" role="alert">
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {/* `aria-busy` says the round trip is out to a reader who is not
              looking at the button. */}
          <Button aria-busy={busy || undefined} className={authPill(true)} disabled={busy} type="submit">
            {t("submit")}
          </Button>
          {inUse ? (
            <Button className={authPill()} nativeButton={false} render={<Link href="/login" />} variant="outline">
              {t("signInWithEmail")}
            </Button>
          ) : null}
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}
        <Link className={AUTH_LINK} href="/login">
          {t("signIn")}
        </Link>
      </p>
    </AuthSplit>
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
  const tone = (failing: boolean) => cn(started && !failing && "text-success");

  return (
    <div className="w-full text-xs font-normal whitespace-pre-wrap text-muted-foreground">
      <p className={tone(problems.length)}>{ranged ? t("hintRange1") : t("hint1")}</p>
      <p className={tone(problems.symbol)}>{t("hint2")}</p>
      <p className={tone(problems.digit)}>{t("hint3")}</p>
    </div>
  );
}
