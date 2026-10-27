"use client";

import { Mail, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { Field } from "@/components/mobile/field";
import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import { PhoneShort, SETTINGS_DIALOG_STACK, SettingsDialog, settingsStackPill } from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/session/account-bits";
import { ApiError } from "@/lib/api/client";
import { requestEmailChange } from "@/lib/api/account";
import { isEmail } from "@/lib/session";
import { cn } from "@/lib/utils";

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
 * which says so under the address field.
 *
 * A dialog over the settings (`SettingsDialog`): the new address, then the
 * request. The API sends a confirmation link
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
    <SettingsDialog
      description={<PhoneShort full={t("subtitle")} short={t("subtitleShort")} />}
      icon={Mail}
      title={t("title")}
    >
      <form className="flex w-full flex-col" noValidate onSubmit={submit}>
        {/* The address the account has now is on the settings row behind;
            the dialog only asks for the new one. */}
        <div className="flex w-full flex-col">
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
            outline
            placeholder={t("newPlaceholder")}
            type="email"
            value={email}
          />
        </div>
        {/* A taken address is said under its field; a request that did not
            go through, here, where the reader is about to press again. */}
        {problem === "request-failed" ? (
          <p className="mt-3 text-xs text-destructive md:text-sm" role="alert">
            {t("requestFailed")}
          </p>
        ) : null}

        <div className={SETTINGS_DIALOG_STACK}>
          <Button className={settingsStackPill("solid")} disabled={!email.trim() || submitting} type="submit">
            {t("submit")}
          </Button>
          <Button className={settingsStackPill("soft")} nativeButton={false} render={<Link href="/settings" />} variant="ghost">
            {c("cancel")}
          </Button>
        </div>
      </form>
    </SettingsDialog>
  );
}

/**
 * Figma "Verify email" (995:7766) — where the change lands once the link is on
 * its way: where the link went, then back to the settings or send the link
 * again.
 *
 * The pending address rides the query string rather than a store: nothing is
 * written until the link is opened. Until it is read — the static render, and
 * a visitor who opened this route directly — the frame's own fixture stands
 * in, the way `account-bits` treats every other value a static frame draws.
 */
function VerifyEmailNote() {
  const t = useTranslations("verifyEmail");
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
    <SettingsDialog description={t("subtitle", { email })} icon={MailCheck} title={t("title")}>
      {/* Where the link went is the line under the title; the address the
          session still answers to is on the settings row behind. */}
      <div className="flex w-full flex-col">
        {resendStatus ? (
          <output className="block text-xs text-muted-foreground md:text-sm">
            {resendStatus === "sent" ? t("resent") : t("resendFailed")}
          </output>
        ) : null}
        <div className={cn(SETTINGS_DIALOG_STACK, !resendStatus && "mt-0")}>
          <Button className={settingsStackPill("solid")} nativeButton={false} render={<Link href="/settings" />}>
            {t("backToSettings")}
          </Button>
          <Button
            className={settingsStackPill("soft")}
            disabled={!pending || resending}
            onClick={resend}
            type="button"
            variant="ghost"
          >
            {t("resend")}
          </Button>
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
