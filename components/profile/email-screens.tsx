"use client";

import { useRouter } from "next/navigation";
import { Mail, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog } from "@/components/profile/settings-dialog";
import { useAccount } from "@/components/session/account-bits";
import { ApiError } from "@/lib/api/client";
import { requestEmailChange } from "@/lib/api/account";
import { isEmail } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Figma "Current Card" (995:7305) and "Still Card" (995:7787) — a read-only row:
 * a 16px mail glyph, then a 12/18 muted caption over the 14/20 medium address.
 * The auth frames draw the same block as "Sent To", see `ResetLinkSentScreen`.
 * On the dialog's white it takes the muted tint, so it reads as a value rather
 * than another field.
 */
function EmailCard({
  caption,
  value,
  className,
}: {
  readonly caption: ReactNode;
  readonly value: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full shrink-0 items-center gap-2.5 overflow-clip rounded-card bg-muted/50 p-3.5", className)}>
      <Mail className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-xs font-normal text-muted-foreground">{caption}</p>
        <p className="font-latin w-full text-sm font-medium break-all text-foreground">{value}</p>
      </div>
    </div>
  );
}

/** What stopped the form, at most one at a time. */
type Problem = "in-use" | "invalid-email" | "same-email" | "request-failed";

/**
 * The pending address `ChangeEmailForm` hands on, read straight off the URL.
 *
 * It is a browser value, so it is subscribed to rather than copied into state
 * in an effect: the static render and the hydration pass both see `null` — the
 * frame's fixture stands in there — and React re-reads it once on the client.
 * Nothing mutates it without a navigation, which remounts the screen, so the
 * subscription is empty.
 */
const subscribeNever = () => () => {};
const readPendingEmail = () => new URLSearchParams(window.location.search).get("to");
const noPendingEmail = () => null;

/**
 * Figma "Change email" (995:7287) and its already-in-use state (995:7320),
 * which adds an alert banner and an inline error under the address field.
 *
 * A dialog over the settings (`SettingsDialog`): the address the account has
 * now, then the new one, then the request. The API sends a confirmation link
 * to the current address and then a verification link to the new address;
 * the address changes only after both links are opened. `state` only seeds
 * the in-use visual state.
 */
function ChangeEmailForm({ state = "default" }: { readonly state?: "default" | "in-use" }) {
  const t = useTranslations("changeEmail");
  const c = useTranslations("common");
  const router = useRouter();
  const account = useAccount();
  const seeded = state === "in-use";

  const [email, setEmail] = useState(seeded ? t("inUseValue") : "");
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(seeded ? "in-use" : null);

  const currentEmail = account?.email ?? c("emailValue");
  const inUse = problem === "in-use";

  let emailError: string | undefined;
  if (inUse) emailError = t("inUseFieldError");
  else if (problem === "invalid-email") emailError = t("invalidEmail");
  else if (problem === "same-email") emailError = t("sameEmail");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (!isEmail(next)) {
      setProblem("invalid-email");
      return;
    }
    if (next === currentEmail.toLowerCase()) {
      setProblem("same-email");
      return;
    }
    try {
      setSubmitting(true);
      await requestEmailChange(next, `/settings/email/verify?to=${encodeURIComponent(next)}`);
      router.push(`/settings/email/verify?to=${encodeURIComponent(next)}`);
    } catch (error) {
      if (error instanceof ApiError && [400, 409].includes(error.status)) {
        setProblem("in-use");
      } else {
        setProblem("request-failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsDialog description={t("subtitle")} title={t("title")}>
      <form className="flex w-full flex-col" noValidate onSubmit={submit}>
        {inUse || problem === "request-failed" ? (
          <AlertBanner
            body={inUse ? t("inUseBody", { email: email.trim() || t("inUseValue") }) : t("requestFailed")}
            className="mb-4 px-0 pt-0"
            icon={Mail}
            title={inUse ? t("inUseTitle") : t("requestFailedTitle")}
          />
        ) : null}

        <EmailCard caption={t("currentLabel")} value={currentEmail} />

        <div className="mt-4 flex w-full flex-col">
          <Field
            autoComplete="email"
            error={emailError}
            id="new-email"
            invalid={emailError !== undefined}
            label={t("newLabel")}
            latin
            onChange={(event) => {
              setEmail(event.target.value);
              setProblem(null);
            }}
            placeholder={t("newPlaceholder")}
            type="email"
            value={email}
          />
        </div>

        <div className={SETTINGS_DIALOG_ACTIONS}>
          <PrimaryButton className="disabled:opacity-40 lg:w-auto" disabled={!email.trim() || submitting} type="submit">
            {t("submit")}
          </PrimaryButton>
          <NeutralButton className="lg:w-auto" href="/settings">
            {c("cancel")}
          </NeutralButton>
        </div>
      </form>
    </SettingsDialog>
  );
}

/**
 * Figma "Verify email" (995:7766) — where the change lands once the link is on
 * its way: the badge, where the link went, the address the session still
 * answers to, then back to the settings or send the link again.
 *
 * The pending address rides the query string rather than a store: nothing is
 * written until the link is opened. Until it is read — the static render, and
 * a visitor who opened this route directly — the frame's own fixture stands
 * in, the way `account-bits` treats every other value a static frame draws.
 */
function VerifyEmailNote() {
  const t = useTranslations("verifyEmail");
  const c = useTranslations("common");
  const account = useAccount();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<"sent" | "failed" | null>(null);

  const pending = useSyncExternalStore(subscribeNever, readPendingEmail, noPendingEmail);
  const email = pending ?? t("pendingFallback");

  async function resend() {
    if (!pending) return;
    setResending(true);
    setResendStatus(null);
    try {
      await requestEmailChange(pending, `/settings/email/verify?to=${encodeURIComponent(pending)}`);
      setResendStatus("sent");
    } catch {
      setResendStatus("failed");
    } finally {
      setResending(false);
    }
  }

  return (
    <SettingsDialog description={t("subtitle", { email })} title={t("title")}>
      <div className="flex w-full flex-col">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted lg:size-16">
          <MailCheck aria-hidden className="size-6 text-primary lg:size-7" />
        </span>
        <EmailCard caption={t("stillLabel")} className="mt-5" value={account?.email ?? c("emailValue")} />
        {resendStatus ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {resendStatus === "sent" ? t("resent") : t("resendFailed")}
          </p>
        ) : null}
        <div className={SETTINGS_DIALOG_ACTIONS}>
          <PrimaryButton className="lg:w-auto" href="/settings">
            {t("backToSettings")}
          </PrimaryButton>
          <NeutralButton className="lg:w-auto" disabled={!pending || resending} onClick={resend} type="button">
            {t("resend")}
          </NeutralButton>
        </div>
      </div>
    </SettingsDialog>
  );
}

/** `/settings/email`: the settings, with the change-email dialog over them. */
export function ChangeEmailScreen({ state = "default" }: { readonly state?: "default" | "in-use" }) {
  return <AccountSettingsScreen overlay={<ChangeEmailForm state={state} />} />;
}

/** `/settings/email/verify`: the settings, with the waiting-for-the-link note over them. */
export function VerifyEmailScreen() {
  return <AccountSettingsScreen overlay={<VerifyEmailNote />} />;
}
