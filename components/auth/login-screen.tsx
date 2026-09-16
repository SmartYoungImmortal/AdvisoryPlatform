"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Lock, Mail, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

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

type Failure = "locked" | "invalid" | "suspended" | "required";

/**
 * Figma "Login (Light)" (995:4174) plus the account-locked (995:4207) and
 * wrong-password (995:4246) states, which slot an alert banner under the heading.
 *
 * The form signs in against the mock database. `state` only seeds the banner so
 * the two state routes still open on their frames; typing clears it.
 */
export function LoginScreen({
  state = "default",
}: {
  readonly state?: "default" | "account-locked" | "wrong-password";
}) {
  const t = useTranslations("login");
  const e = useTranslations("loginErrors");
  const c = useTranslations("common");
  const router = useRouter();
  const preset = state !== "default";

  const [email, setEmail] = useState(preset ? "araya.s@kmitl.ac.th" : "");
  const [password, setPassword] = useState(preset ? "password" : "");
  const [revealed, setRevealed] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(() => {
    if (state === "account-locked") return "locked";
    if (state === "wrong-password") return "invalid";
    return null;
  });
  const [remaining, setRemaining] = useState<number | null>(null);

  function clearFailure() {
    setFailure(null);
    setRemaining(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setFailure("required");
      return;
    }
    const result = signIn(email, password);
    if (result.ok) {
      // Read at submit time rather than through `useSearchParams`, which would
      // need a Suspense boundary and leave the exported HTML empty.
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNext(next) ?? roleHome(result.account.role));
      return;
    }
    // A signed-in-elsewhere role mismatch cannot happen here: this door takes all.
    setFailure(result.reason === "forbidden" ? "invalid" : result.reason);
    setRemaining(result.remaining ?? null);
  }

  const locked = failure === "locked";

  return (
    <MobileScreen>
      <ScreenTopBar href="/" label={c("back")} />
      <ScreenBody>
        <form className="flex w-full flex-1 flex-col items-center" noValidate onSubmit={submit}>
          <BrandLockup />
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
              body={
                remaining === null
                  ? e("wrongBody")
                  : e("wrongRemaining", { count: remaining })
              }
              icon={TriangleAlert}
              title={e("wrongTitle")}
            />
          ) : null}
          {failure === "suspended" ? (
            <AlertBanner body={e("suspendedBody")} icon={Ban} title={e("suspendedTitle")} />
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

          <ScreenSpacer />
          {/* Figma "Actions": 24px top / 32px bottom padding, 12px gap. */}
          <ScreenActions className="pt-6 pb-8">
            <PrimaryButton className="disabled:opacity-40" disabled={locked} type="submit">
              {t("signIn")}
            </PrimaryButton>
            <NeutralButton href="/register">{t("signUp")}</NeutralButton>
            <DemoAccounts
              className="mt-3"
              onPick={(account) => {
                setEmail(account.email);
                setPassword(account.password);
                clearFailure();
              }}
            />
          </ScreenActions>
        </form>
      </ScreenBody>
    </MobileScreen>
  );
}
