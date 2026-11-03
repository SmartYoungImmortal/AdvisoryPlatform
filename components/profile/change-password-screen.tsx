"use client";

import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AUTH_LINK } from "@/components/auth/auth-split";
import { Field } from "@/components/mobile/field";
import { ACCOUNT_FORM_ACTIONS, ACCOUNT_FORM_CANCEL, ACCOUNT_FORM_CLASS, ACCOUNT_FORM_SUBMIT, AccountFormPage } from "@/components/profile/account-form-page";
import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import { SETTINGS_DIALOG_STACK, SettingsDialog, settingsStackPill } from "@/components/profile/settings-dialog";
import { useAccount } from "@/components/session/account-bits";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/api/account";
import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** The rules a new password answers to, as the API checks them; the hint under the field names them. */
function passwordRules(next: string, current: string): readonly boolean[] {
  return [
    next.length >= 8 && next.length <= 64,
    /[^A-Za-z0-9]/.test(next),
    /\d/.test(next),
    next.length > 0 && next !== current,
  ];
}

/** Full-page password form; email reset continues through the settings recovery steps. */
function ChangePasswordForm({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  const [step, setStep] = useState<"change" | "reset" | "sent">("change");

  if (step === "change") return <ChangeStep onForgot={() => setStep("reset")} state={state} />;
  return <AccountSettingsScreen overlay={<ResetStep onBack={() => setStep("change")} onSent={() => setStep("sent")} sent={step === "sent"} />} />;
}

/** Sending the reset link from inside the settings, then saying it went. */
function ResetStep({
  sent,
  onBack,
  onSent,
}: {
  readonly sent: boolean;
  readonly onBack: () => void;
  readonly onSent: () => void;
}) {
  const t = useTranslations("changePassword");
  const c = useTranslations("common");
  const email = useAccount()?.email ?? null;
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    if (!email || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await requestPasswordReset({ email, redirectTo: new URL("/reset-password", window.location.origin).toString() });
      onSent();
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <SettingsDialog description={t("resetSentBody", { email: email ?? "" })} icon={MailCheck} title={t("resetSentTitle")}>
        <div className={cn(SETTINGS_DIALOG_STACK, "mt-0")}>
          <Button className={settingsStackPill("solid")} nativeButton={false} render={<Link href="/settings" />}>
            {t("resetDone")}
          </Button>
        </div>
      </SettingsDialog>
    );
  }

  return (
    <SettingsDialog description={t("resetBody", { email: email ?? "" })} icon={KeyRound} title={t("resetTitle")}>
      {failed ? (
        <p className="text-xs text-destructive" role="alert">
          {t("resetFailed")}
        </p>
      ) : null}
      <div className={cn(SETTINGS_DIALOG_STACK, !failed && "mt-0")}>
        <Button className={settingsStackPill("solid")} disabled={!email || sending} onClick={() => void send()} type="button">
          {t("resetSend")}
        </Button>
        <Button className={settingsStackPill("soft")} disabled={sending} onClick={onBack} type="button" variant="ghost">
          {c("back")}
        </Button>
      </div>
    </SettingsDialog>
  );
}

function ChangeStep({
  state,
  onForgot,
}: {
  readonly state: "default" | "wrong-current";
  readonly onForgot: () => void;
}) {
  const t = useTranslations("changePassword");
  const c = useTranslations("common");
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [problem, setProblem] = useState<"wrong-current" | "invalid" | "request-failed" | null>(
    state === "wrong-current" ? "wrong-current" : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const isWrong = problem === "wrong-current";
  const rules = passwordRules(newPassword, currentPassword);
  // The capsule stays greyed until the three fields can be sent, as changing
  // the email's does until there is an address.
  const ready = currentPassword.length > 0 && rules.every(Boolean) && newPassword === confirmPassword;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!ready) {
      setProblem("invalid");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.push("/settings/updated");
    } catch (error) {
      setProblem(error instanceof ApiError && error.code === "INVALID_PASSWORD" ? "wrong-current" : "request-failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountFormPage title={t("title")}>
      <form aria-label={t("title")} className={ACCOUNT_FORM_CLASS} onSubmit={submit}>
        <fieldset className="contents" disabled={submitting}>
          {isWrong ? <div className="flex items-start gap-3 rounded-xl border border-destructive bg-card px-3.25 py-2.75" role="alert">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/figma/account-forms/lock.svg" width={18} height={18} />
            <div className="flex flex-col gap-0.5"><p className="text-sm font-medium">{t("wrongCurrentTitle")}</p><p className="text-xs text-muted-foreground">{t("wrongCurrentRetry")}</p></div>
          </div> : null}
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="flex w-full flex-col gap-4">
              <Field
                autoComplete="current-password"
                error={isWrong ? t("wrongCurrentFieldError") : undefined}
                id="current-password"
                type="password"
                invalid={isWrong}
                label={t("currentLabel")}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setProblem(null);
                }}
                placeholder={t("currentPlaceholder")}
                value={currentPassword}
              />
              <Field
                autoComplete="new-password"
                id="new-password"
                type="password"
                label={t("newLabel")}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setProblem(null);
                }}
                placeholder={t("newPlaceholder")}
                value={newPassword}
              />
              <Field
                autoComplete="new-password"
                id="confirm-password"
                type="password"
                label={t("confirmLabel")}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setProblem(null);
                }}
                placeholder={t("confirmPlaceholder")}
                value={confirmPassword}
              />
            </div>
            <div className="flex flex-col gap-2.5 rounded-xl bg-card p-3.5 lg:border lg:border-border lg:bg-muted lg:p-3.25">
              <p className="text-xs text-muted-foreground">{t("requirementsTitle")}</p>
              <ul className="flex flex-col gap-2">
                {[t("requirement1"), t("requirement2"), t("requirement3"), t("requirement4")].map((text) => <li key={text} className="flex items-start gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="mt-0.5 shrink-0" src="/figma/account-forms/circle-check.svg" width={14} height={14} />
                  <span>{text}</span>
                </li>)}
              </ul>
            </div>
          </div>

          {problem === "invalid" || problem === "request-failed" ? (
            // The fields' own error size: it is about them.
            <p className="mt-3 text-xs text-destructive" role="alert">
              {t(problem === "invalid" ? "invalid" : "requestFailed")}
            </p>
          ) : null}

          <div className={ACCOUNT_FORM_ACTIONS}>
            <p className="text-center text-xs text-muted-foreground lg:mr-auto lg:text-left">
              {t("forgotPrompt")}{" "}
              <Button className={cn(AUTH_LINK, "h-auto p-0 text-xs")} onClick={onForgot} type="button" variant="link">{t("forgotAction")}</Button>
            </p>
            <Button className={ACCOUNT_FORM_SUBMIT} disabled={!ready || submitting} type="submit">
              {t("submit")}
            </Button>
            <Button className={ACCOUNT_FORM_CANCEL} nativeButton={false} render={<Link href="/settings" />} variant="outline">
              {c("cancel")}
            </Button>
          </div>

        </fieldset>
      </form>
    </AccountFormPage>
  );
}

/** `/settings/password`: a responsive password form backed by the current account. */
export function ChangePasswordScreen({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  return <ChangePasswordForm state={state} />;
}
