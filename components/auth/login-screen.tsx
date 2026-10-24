"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Lock, TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
import { roleHome, safeNext, signIn } from "@/lib/session";
import { cn } from "@/lib/utils";

type Failure =
  | "locked"
  | "invalid"
  | "suspended"
  | "required"
  | "failed"
  | "unreachable"
  /** A provider the API has not been given credentials for. */
  | "providerOff";

type Step = "email" | "password";

/**
 * The legal line's tags, at module level so they are not redefined on every
 * render of the screen.
 */
const LEGAL_TAGS = {
  br: () => <br />,
  terms: (chunks: ReactNode) => (
    <Link className={AUTH_LINK} href="/terms">
      {chunks}
    </Link>
  ),
  privacy: (chunks: ReactNode) => (
    <Link className={AUTH_LINK} href="/privacy-policy">
      {chunks}
    </Link>
  ),
};

/** The shape every `?next=` is read in, at the moment it is needed. */
function nextPath(): string | null {
  return new URLSearchParams(window.location.search).get("next");
}

/**
 * The sign-in page. fastwork's (`fastwork.com/login`) taught the method:
 * one narrow column that asks one thing at a time, every sign-in route side
 * by side, the legal line under them. The look is the home page's own, in
 * `AuthSplit`, which `RegisterScreen` shares.
 *
 * Two steps, not fastwork's three. The first carries the providers and,
 * under an "or", the email field itself, so email is one press shorter than
 * a "continue with email" button that only opens the field. The second is
 * the password, with the email it belongs to and a way to change it.
 *
 * Kept from the Figma frame (995:4174) and its two state routes
 * (account-locked 995:4207, wrong-password 995:4246): every failure banner,
 * "forgot password" and the way to sign up. The state routes open on the
 * first step with their banner.
 *
 * ## What the failure banner says
 *
 * better-auth has no lockout and publishes no attempts figure, so the banner
 * carries **the API's own sentence** as its body, and the title follows what
 * the API actually said: a 401 keeps "wrong email or password", a 403 is a
 * suspension, anything else is the generic `errorStates` pair. A request that
 * never arrived says so outright, rather than sending someone to reset a
 * password that was never the problem.
 */
export function LoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "account-locked" | "wrong-password";
}) {
  const t = useTranslations("login");
  const e = useTranslations("loginErrors");
  const s = useTranslations("errorStates");
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(() => {
    if (state === "account-locked") return "locked";
    if (state === "wrong-password") return "invalid";
    return null;
  });
  /** The API's own words, when it gave any. Shown as the banner's body. */
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearFailure() {
    setFailure(null);
    setDetail(null);
  }

  function go(to: Step) {
    clearFailure();
    setStep(to);
  }

  async function attempt(withEmail: string, withPassword: string) {
    if (busy) return;
    if (!withEmail.trim() || !withPassword) {
      setFailure("required");
      return;
    }
    setBusy(true);
    const result = await signIn(withEmail, withPassword);
    if (result.ok) {
      router.replace(safeNext(nextPath()) ?? roleHome(result.account.role));
      // Deliberately still busy: the redirect is in flight and re-enabling the
      // form would invite a second sign-in against a session that now exists.
      return;
    }
    setBusy(false);
    // A role mismatch cannot happen here — this door takes every role — so
    // `forbidden` falls back to the credentials banner rather than inventing copy.
    setFailure(result.reason === "forbidden" ? "invalid" : result.reason);
    setDetail(result.message ?? null);
  }

  function onSocialFailure(social: SocialFailure | null) {
    if (!social) return clearFailure();
    if (social.kind === "off") {
      setFailure("providerOff");
      setDetail(social.provider);
    } else if (social.kind === "unreachable") {
      setFailure("unreachable");
    } else {
      setFailure("failed");
      setDetail(social.detail);
    }
  }

  // Back from a provider that refused or was cancelled: better-auth returns
  // to `errorCallbackURL` (this page) with `?error=<code>`. Read once, after
  // hydration, because the exported HTML cannot know the query.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (!code) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-off read of the URL after hydration
    setFailure("failed");
    setDetail(code);
  }, []);

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setFailure("required");
      return;
    }
    go("password");
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void attempt(email, password);
  }

  const locked = failure === "locked";

  // `px-0 pt-0`: the banner's own inset is the phone page's 24px gutter, and
  // inside the column it left the banner narrower than the field.
  const banners: ReactNode = (
    <>
      {locked ? <AlertBanner className="px-0 pt-0" body={e("lockedBody")} icon={Lock} title={e("lockedTitle")} /> : null}
      {failure === "invalid" ? (
        <AlertBanner className="px-0 pt-0" body={detail ?? e("wrongBody")} icon={TriangleAlert} title={e("wrongTitle")} />
      ) : null}
      {failure === "suspended" ? (
        <AlertBanner className="px-0 pt-0" body={detail ?? e("suspendedBody")} icon={Ban} title={e("suspendedTitle")} />
      ) : null}
      {failure === "providerOff" ? (
        <AlertBanner
          className="px-0 pt-0"
          body={t("providerOffBody")}
          icon={TriangleAlert}
          title={t("providerOffTitle", { provider: detail ?? "" })}
        />
      ) : null}
      {failure === "failed" ? (
        <AlertBanner className="px-0 pt-0" body={detail ?? s("serverBody")} icon={TriangleAlert} title={s("serverTitle")} />
      ) : null}
      {failure === "unreachable" ? (
        <AlertBanner className="px-0 pt-0" body={s("offlineBody")} icon={WifiOff} title={s("offlineTitle")} />
      ) : null}
      {failure === "required" ? (
        <AlertBanner className="px-0 pt-0" body={e("requiredBody")} icon={TriangleAlert} title={e("requiredTitle")} />
      ) : null}
    </>
  );

  return (
    <AuthSplit>
      {step === "email" ? (
        <>
          <AuthHeading subtitle={t("welcomeSubtitle")} title={t("welcome")} withLogo />
          {banners}
          <SocialButtons disabled={busy} onFailure={onSocialFailure} />
          <form className="flex flex-col gap-3" noValidate onSubmit={submitEmail}>
            <Field
              autoComplete="email"
              id="login-email"
              invalid={failure === "required"}
              label={t("emailLabel")}
              latin
              onChange={(event) => {
                setEmail(event.target.value);
                clearFailure();
              }}
              outline
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
            />
            {/* Grey until there is something to send. */}
            <Button className={authPill(true)} disabled={!email.trim()} type="submit">
              {t("continue")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link className={AUTH_LINK} href="/register">
              {t("signUp")}
            </Link>
          </p>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            {t.rich("legal", LEGAL_TAGS)}
          </p>
        </>
      ) : (
        <form className="flex flex-col gap-5 md:gap-6" noValidate onSubmit={submitPassword}>
          <AuthHeading
            // Which account this password is for, and the way to change it.
            subtitle={
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-latin">{email}</span>
                <Button
                  className={cn("h-auto shrink-0 p-0 text-sm", AUTH_LINK)}
                  onClick={() => go("email")}
                  type="button"
                  variant="link"
                >
                  {t("change")}
                </Button>
              </span>
            }
            title={t("passwordTitle")}
          />
          {banners}
          <div className="flex flex-col gap-2">
            <Field
              autoComplete="current-password"
              // The step exists to take this one answer.
              autoFocus
              id="login-password"
              invalid={failure === "invalid" || failure === "required"}
              label={t("passwordLabel")}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFailure();
              }}
              outline
              placeholder={t("passwordPlaceholder")}
              trailing={
                <RevealPasswordButton
                  label={t("showPassword")}
                  onToggle={() => setRevealed((value) => !value)}
                  revealed={revealed}
                />
              }
              type={revealed ? "text" : "password"}
              value={password}
            />
            <Link className={cn("self-end py-1 text-sm", AUTH_LINK)} href="/forgot-password">
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {/* `aria-busy` says the round trip is out to a reader who is not
                looking at the button. */}
            <Button
              aria-busy={busy || undefined}
              className={authPill(true)}
              disabled={locked || busy || !password}
              type="submit"
            >
              {t("signIn")}
            </Button>
            <Button className={authPill()} onClick={() => go("email")} type="button" variant="outline">
              {t("back")}
            </Button>
          </div>
        </form>
      )}
    </AuthSplit>
  );
}
