"use client";

import { KeyRound, LockKeyhole, MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type FormEvent } from "react";

import { AUTH_LINK } from "@/components/auth/auth-split";
import { Field, RevealPasswordButton } from "@/components/mobile/field";
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

/** A password field with the sign-in form's eye at its end, to read back what was typed. */
function PasswordField(props: Omit<ComponentProps<typeof Field>, "type" | "trailing" | "outline">) {
  const t = useTranslations("login");
  const [revealed, setRevealed] = useState(false);

  return (
    <Field
      {...props}
      outline
      trailing={
        <RevealPasswordButton
          label={t("showPassword")}
          onToggle={() => setRevealed((value) => !value)}
          revealed={revealed}
        />
      }
      type={revealed ? "text" : "password"}
    />
  );
}

/**
 * Figma "Change password" (995:7360) and its wrong-current-password state
 * (995:7404), which marks the current password's field.
 *
 * A dialog over the settings (`SettingsDialog`) rather than a page of its own:
 * three fields, the rules the new one answers to in one line under it, then
 * the change. A wrong current password stays in the dialog, said under its
 * field; a success goes to `/settings/updated`.
 *
 * A reader who does not know the current password takes the line under the
 * capsules: the same dialog turns to sending the reset link to the address
 * the account signs in with (`reset`), then says it went (`sent`). It never
 * leaves for the signed-out pages: the reader is signed in.
 */
function ChangePasswordForm({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  const [step, setStep] = useState<"change" | "reset" | "sent">("change");

  if (step === "change") return <ChangeStep onForgot={() => setStep("reset")} state={state} />;
  return <ResetStep onBack={() => setStep("change")} onSent={() => setStep("sent")} sent={step === "sent"} />;
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
    if (!email) return;
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
        <Button className={settingsStackPill("soft")} onClick={onBack} type="button" variant="ghost">
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
  const [problem, setProblem] = useState<"wrong-current" | "invalid" | null>(
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
    if (!ready) {
      setProblem("invalid");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.push("/settings/updated");
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 400 ? "wrong-current" : "invalid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsDialog description={t("subtitle")} icon={LockKeyhole} title={t("title")}>
      <form className="flex w-full flex-col" onSubmit={submit}>
        <div className="flex w-full flex-col gap-4 lg:gap-6">
          <PasswordField
            autoComplete="current-password"
            error={isWrong ? t("wrongCurrentFieldError") : undefined}
            id="current-password"
            invalid={isWrong}
            label={t("currentLabel")}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("currentPlaceholder")}
            value={currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            hint={t("newHint")}
            id="new-password"
            label={t("newLabel")}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("newPlaceholder")}
            value={newPassword}
          />
          <PasswordField
            autoComplete="new-password"
            id="confirm-password"
            label={t("confirmLabel")}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setProblem(null);
            }}
            placeholder={t("confirmPlaceholder")}
            value={confirmPassword}
          />
        </div>

        {problem === "invalid" ? (
          // The fields' own error size: it is about them.
          <p className="mt-3 text-xs text-destructive" role="alert">
            {t("invalid")}
          </p>
        ) : null}

        <div className={SETTINGS_DIALOG_STACK}>
          <Button className={settingsStackPill("solid")} disabled={!ready || submitting} type="submit">
            {t("submit")}
          </Button>
          <Button className={settingsStackPill("soft")} nativeButton={false} render={<Link href="/settings" />} variant="ghost">
            {c("cancel")}
          </Button>
        </div>

        {/* For a reader who does not know the password asked for first, a
            line under the answers, as the receipt's help line sits. */}
        <p className="mt-3 text-center text-fine text-muted-foreground md:mt-4 md:text-xs">
          {t("forgotPrompt")}{" "}
          <Button className={cn(AUTH_LINK, "h-auto p-0 text-fine md:text-xs")} onClick={onForgot} type="button" variant="link">
            {t("forgotAction")}
          </Button>
        </p>
      </form>
    </SettingsDialog>
  );
}

/** `/settings/password`: the settings, with the change-password dialog over them. */
export function ChangePasswordScreen({ state = "default" }: { readonly state?: "default" | "wrong-current" }) {
  return <AccountSettingsScreen overlay={<ChangePasswordForm state={state} />} />;
}
