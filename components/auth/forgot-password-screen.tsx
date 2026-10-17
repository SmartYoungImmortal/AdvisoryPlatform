"use client";

import { Mail, MailCheck, TriangleAlert, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
import { AlertBanner } from "@/components/mobile/banner";
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
import { ApiUnreachableError } from "@/lib/api/client";
import { requestPasswordReset } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";
import { cn } from "@/lib/utils";

type Failure = "rejected" | "unreachable";

function failureKind(error: unknown): Failure {
  return error instanceof ApiUnreachableError ? "unreachable" : "rejected";
}

function resetUrl(): string {
  return new URL("/reset-password", window.location.origin).toString();
}

/** Figma "Forgot password (Light)" — submits a reset request to Better Auth. */
export function ForgotPasswordScreen() {
  const t = useTranslations("forgotPassword");
  const flow = useTranslations("authEmailFlow");
  const c = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await requestPasswordReset({ email: email.trim(), redirectTo: resetUrl() });
      router.push(`/reset-sent?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      setBusy(false);
      setFailure(failureKind(error));
    }
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/login" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <form
          className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}
          onSubmit={(event) => void submit(event)}
        >
          <ScreenHeading className="gap-2 pt-4" subtitle={t("subtitle")} title={t("title")} />
          {failure ? (
            <AlertBanner
              body={failure === "unreachable" ? flow("offline") : flow("requestFailed")}
              icon={failure === "unreachable" ? WifiOff : TriangleAlert}
              title={flow("errorTitle")}
            />
          ) : null}
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-4">
            <Field
              autoComplete="email"
              icon={Mail}
              id="forgot-email"
              label={t("emailLabel")}
              latin
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              type="email"
              value={email}
            />
          </div>
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions stacked>
            <PrimaryButton block disabled={busy} type="submit">
              {busy ? flow("sending") : t("submit")}
            </PrimaryButton>
            <NeutralButton block href="/login">
              {t("backToSignIn")}
            </NeutralButton>
          </ScreenActions>
        </form>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Reset link sent (Light)" — displays and can resend to the submitted address. */
export function ResetLinkSentScreen() {
  const t = useTranslations("resetSent");
  const flow = useTranslations("authEmailFlow");
  const c = useTranslations("common");
  const search = useLocationSearch();
  const email = new URLSearchParams(search).get("email") ?? "";
  const [busy, setBusy] = useState(false);
  const [sentAgain, setSentAgain] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function resend() {
    if (!email || busy) return;
    setBusy(true);
    setFailure(null);
    setSentAgain(false);
    try {
      await requestPasswordReset({ email, redirectTo: resetUrl() });
      setSentAgain(true);
    } catch (error) {
      setFailure(failureKind(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/forgot-password" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
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
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
            <Surface className="flex w-full items-center gap-2.5 p-3.5" tier="well">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("sentToLabel")}
                </p>
                <p className="font-latin w-full truncate text-sm font-medium text-foreground">
                  {email || t("sentToValue")}
                </p>
              </div>
            </Surface>
          </div>
          {sentAgain ? (
            <p className="px-6 pt-4 text-sm text-muted-foreground">{flow("resent")}</p>
          ) : null}
          {failure ? (
            <AlertBanner
              body={failure === "unreachable" ? flow("offline") : flow("requestFailed")}
              icon={failure === "unreachable" ? WifiOff : TriangleAlert}
              title={flow("errorTitle")}
            />
          ) : null}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions stacked>
            <PrimaryButton block href="/login">
              {t("backToSignIn")}
            </PrimaryButton>
            <NeutralButton
              block
              disabled={!email || busy}
              onClick={() => void resend()}
              type="button"
            >
              {busy ? flow("sending") : t("resend")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
