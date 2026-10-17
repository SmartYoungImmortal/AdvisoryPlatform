"use client";

import { Lock, TriangleAlert, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

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
import { ApiUnreachableError } from "@/lib/api/client";
import { resetPassword } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";
import { passwordProblems } from "@/lib/session";
import { cn } from "@/lib/utils";

type Failure = "invalid-link" | "rejected" | "unreachable";

export function ResetPasswordScreen() {
  const t = useTranslations("resetPassword");
  const flow = useTranslations("authEmailFlow");
  const c = useTranslations("common");
  const search = useLocationSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) {
      if (!token) setFailure("invalid-link");
      return;
    }
    const problems = passwordProblems(password);
    if (problems.length || problems.symbol || problems.digit) {
      setFailure("rejected");
      return;
    }
    if (password !== confirm) {
      setFailure("rejected");
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      await resetPassword({ token, newPassword: password });
      setComplete(true);
    } catch (error) {
      setFailure(error instanceof ApiUnreachableError ? "unreachable" : "invalid-link");
    } finally {
      setBusy(false);
    }
  }

  const alert = failure ? (
    <AlertBanner
      body={
        failure === "unreachable"
          ? flow("offline")
          : failure === "invalid-link"
            ? t("expired")
            : t("passwordError")
      }
      icon={failure === "unreachable" ? WifiOff : TriangleAlert}
      title={flow("errorTitle")}
    />
  ) : null;

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/login" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        {complete ? (
          <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
            <ScreenHeading className="gap-2 pt-4" subtitle={t("successBody")} title={t("successTitle")} />
            <ScreenSpacer className="lg:hidden" />
            <ScreenActions stacked>
              <PrimaryButton block href="/login">{t("backToSignIn")}</PrimaryButton>
            </ScreenActions>
          </div>
        ) : (
          <form
            className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}
            onSubmit={(event) => void submit(event)}
          >
            <ScreenHeading className="gap-2 pt-4" subtitle={t("subtitle")} title={t("title")} />
            {alert}
            <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4">
              <Field
                autoComplete="new-password"
                icon={Lock}
                id="reset-password"
                label={t("passwordLabel")}
                onChange={(event) => setPassword(event.target.value)}
                required
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
              <Field
                autoComplete="new-password"
                icon={Lock}
                id="reset-password-confirm"
                label={t("confirmLabel")}
                onChange={(event) => setConfirm(event.target.value)}
                required
                type={revealed ? "text" : "password"}
                value={confirm}
              />
            </div>
            <ScreenSpacer className="lg:hidden" />
            <ScreenActions stacked>
              <PrimaryButton block disabled={busy} type="submit">
                {busy ? flow("sending") : t("submit")}
              </PrimaryButton>
              <NeutralButton block href="/forgot-password">
                {t("requestAnother")}
              </NeutralButton>
            </ScreenActions>
          </form>
        )}
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
