"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Lock, Mail, TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
import { BrandLockup } from "@/components/auth/brand-lockup";
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
import { DemoAccounts } from "@/components/session/demo-accounts";
import { roleHome, safeNext, signIn } from "@/lib/session";
import { cn } from "@/lib/utils";

type Failure = "locked" | "invalid" | "suspended" | "required" | "failed" | "unreachable";

/**
 * Figma "Login (Light)" (995:4174) plus the account-locked (995:4207) and
 * wrong-password (995:4246) states, which slot an alert banner under the heading.
 *
 * The form signs in against the real API. `state` only seeds the banner so the
 * two state routes still open on their frames; typing clears it.
 *
 * ## What the failure banner says now, and why it stopped counting
 *
 * The wrong-password banner used to be able to say "two tries left": the mock
 * database owned the counter that locked an account on the fifth miss.
 * better-auth has no lockout and publishes no attempts figure, so that sentence
 * cannot be told truthfully any more — `loginErrors.wrongRemaining` is no longer
 * used by anything. In its place the banner carries **the API's own sentence** as
 * its body, and the title follows what the API actually said: a 401 keeps the
 * frame's "wrong email or password", a 403 is a suspension, and anything else is
 * the generic `errorStates` pair rather than a claim about the password. A
 * request that never arrived says so outright — the alternative sends someone to
 * reset a password that was never the problem.
 */
export function LoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "account-locked" | "wrong-password";
}) {
  const t = useTranslations("login");
  const e = useTranslations("loginErrors");
  const s = useTranslations("errorStates");
  const c = useTranslations("common");
  const router = useRouter();
  const preset = state !== "default";

  const [email, setEmail] = useState(preset ? "araya.s@advisory.demo" : "");
  const [password, setPassword] = useState(preset ? "password" : "");
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

  /**
   * Also the demo list's handler, which is why the credentials are arguments
   * rather than read from state: `setEmail` has not landed yet at the moment a
   * tap on a seeded account wants to submit it.
   */
  async function attempt(withEmail: string, withPassword: string) {
    if (busy) return;
    if (!withEmail.trim() || !withPassword) {
      setFailure("required");
      return;
    }
    setBusy(true);
    const result = await signIn(withEmail, withPassword);
    if (result.ok) {
      // Read at submit time rather than through `useSearchParams`, which would
      // need a Suspense boundary and leave the exported HTML empty.
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNext(next) ?? roleHome(result.account.role));
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void attempt(email, password);
  }

  const locked = failure === "locked";

  return (
    // Figma "Desktop / Login (Light)" (1787:23715) keeps every part of the phone
    // frame and re-seats it: the guest nav above, the same form as a 448px card
    // centred in the page, the legal footer below.
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <form
          className={cn(
            "flex w-full flex-1 flex-col items-center lg:mx-auto",
            AUTH_CARD,
          )}
          noValidate
          onSubmit={submit}
        >
          {/* The desktop nav already carries the lockup. */}
          <BrandLockup className="lg:hidden" />
          {/* Figma "Heading": 24px top / 8px bottom padding and a 6px gap. */}
          <ScreenHeading
            className="gap-1.5 pt-6"
            subtitle={t("subtitle")}
            title={t("title")}
          />

          {locked ? (
            <AlertBanner body={e("lockedBody")} icon={Lock} title={e("lockedTitle")} />
          ) : null}
          {failure === "invalid" ? (
            <AlertBanner
              body={detail ?? e("wrongBody")}
              icon={TriangleAlert}
              title={e("wrongTitle")}
            />
          ) : null}
          {failure === "suspended" ? (
            <AlertBanner
              body={detail ?? e("suspendedBody")}
              icon={Ban}
              title={e("suspendedTitle")}
            />
          ) : null}
          {failure === "failed" ? (
            <AlertBanner
              body={detail ?? s("serverBody")}
              icon={TriangleAlert}
              title={s("serverTitle")}
            />
          ) : null}
          {failure === "unreachable" ? (
            <AlertBanner body={s("offlineBody")} icon={WifiOff} title={s("offlineTitle")} />
          ) : null}
          {failure === "required" ? (
            <AlertBanner
              body={e("requiredBody")}
              icon={TriangleAlert}
              title={e("requiredTitle")}
            />
          ) : null}

          {/* Figma "Form Fields": 16px top padding, 16px between rows. */}
          <div className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-4">
            <Field
              autoComplete="email"
              icon={Mail}
              id="login-email"
              invalid={failure === "invalid" || failure === "required"}
              label={t("emailLabel")}
              latin
              onChange={(event) => {
                setEmail(event.target.value);
                clearFailure();
              }}
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
            />
            <Field
              autoComplete="current-password"
              icon={Lock}
              id="login-password"
              invalid={failure === "invalid" || failure === "required"}
              label={t("passwordLabel")}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFailure();
              }}
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
            {/* Figma "Forgot Password Row": right-aligned 32px link target. */}
            <div className="flex w-full shrink-0 items-center justify-end overflow-clip">
              <Link
                className="flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-primary"
                href="/forgot-password"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          </div>

          {/* The phone frame pins its actions to the bottom edge; the card is
              only as tall as its content, so the spacer goes with the frame. */}
          <ScreenSpacer className="lg:hidden" />
          {/* Figma "Actions": 24px top / 32px bottom padding, 12px gap.
              `stacked` + `block`: inside a 448 card the two actions stay the
              column the frame draws, rather than becoming the right-aligned row
              `ScreenActions` gives a full-width page. */}
          <ScreenActions className="pt-6 pb-8" stacked>
            {/* Translucent while the round trip is out, which is the whole of
                the busy state: the label is the one the frame draws and there is
                no "signing in…" string to swap it for. `aria-busy` is what says
                so to a reader who is not looking at the opacity. */}
            <PrimaryButton
              aria-busy={busy || undefined}
              block
              className="disabled:opacity-40"
              disabled={locked || busy}
              type="submit"
            >
              {t("signIn")}
            </PrimaryButton>
            <NeutralButton block href="/register">
              {t("signUp")}
            </NeutralButton>
            <DemoAccounts
              className="mt-3"
              onPick={(account) => {
                setEmail(account.email);
                setPassword(account.password);
                clearFailure();
                // One tap, all the way through: the credentials are passed as
                // arguments because the two setters above have not landed yet.
                void attempt(account.email, account.password);
              }}
            />
          </ScreenActions>
        </form>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
