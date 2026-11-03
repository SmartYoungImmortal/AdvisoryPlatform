"use client";

import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { Field } from "@/components/mobile/field";
import { ACCOUNT_FORM_ACTIONS, ACCOUNT_FORM_CANCEL, ACCOUNT_FORM_CLASS, ACCOUNT_FORM_SUBMIT, AccountFormPage } from "@/components/profile/account-form-page";
import { AccountSettingsScreen } from "@/components/profile/account-settings-screen";
import { SETTINGS_DIALOG_STACK, SettingsDialog, settingsStackPill } from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/session/account-bits";
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

/** Full-page email form. Both mailboxes must confirm before the address changes. */
function ChangeEmailForm({ state = "default" }: { readonly state?: "default" | "in-use" }) {
  const t = useTranslations("changeEmail");
  const c = useTranslations("common");
  const router = useRouter();
  const account = useAccount();
  const seeded = state === "in-use";

  const [email, setEmail] = useState(seeded ? t("inUseValue") : "");
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(seeded ? "in-use" : null);

  const currentEmail = account?.email ?? "";
  const inUse = problem === "in-use";

  let emailError: string | undefined;
  if (inUse) emailError = t("inUseFieldError");
  else if (problem === "invalid-email") emailError = t("invalidEmail");
  else if (problem === "same-email") emailError = t("sameEmail");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || submitting) return;
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
    } catch {
      setProblem("request-failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountFormPage description={t("subtitle")} title={t("title")}>
      <form aria-label={t("title")} className={ACCOUNT_FORM_CLASS} noValidate onSubmit={submit}>
        <fieldset className="contents" disabled={!account || submitting}>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="order-2 lg:order-1">
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
            <div className="order-1 flex items-center gap-2.5 rounded-xl bg-card p-3.5 lg:order-2 lg:rounded-none lg:bg-transparent lg:px-3.5 lg:py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="shrink-0" src="/figma/account-forms/mail.svg" width={16} height={16} />
              <div className="flex min-w-0 flex-col gap-0.5"><span className="text-xs text-muted-foreground">{t("currentLabel")}</span><span className="truncate font-latin text-sm font-medium">{currentEmail}</span></div>
            </div>
          </div>
          {/* A taken address is said under its field; a request that did not
              go through, here, where the reader is about to press again. */}
          {problem === "request-failed" ? (
            <p className="mt-3 text-xs text-destructive md:text-sm" role="alert">
              {t("requestFailed")}
            </p>
          ) : null}

          <div className={ACCOUNT_FORM_ACTIONS}>
            <Button className={ACCOUNT_FORM_SUBMIT} disabled={!email.trim() || submitting} type="submit">
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

/** `/settings/email`: a responsive email form backed by the current account. */
export function ChangeEmailScreen({ state = "default" }: { readonly state?: "default" | "in-use" }) {
  return <ChangeEmailForm state={state} />;
}

/** `/settings/email/verify`: the settings, with the waiting-for-the-link note over them. */
export function VerifyEmailScreen() {
  return <AccountSettingsScreen overlay={<VerifyEmailNote />} />;
}
