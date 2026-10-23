"use client";

import { MailCheck, TriangleAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { AuthHeading, AuthSplit, authPill } from "@/components/auth/auth-split";
import { AlertBanner } from "@/components/mobile/banner";
import { Field } from "@/components/mobile/field";
import { Button } from "@/components/ui/button";
import { ApiUnreachableError } from "@/lib/api/client";
import { requestPasswordReset } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";

type Failure = "rejected" | "unreachable";

function failureKind(error: unknown): Failure {
  return error instanceof ApiUnreachableError ? "unreachable" : "rejected";
}

function resetUrl(): string {
  return new URL("/reset-password", window.location.origin).toString();
}

/** The request failed, said once for both screens. */
function FailureBanner({ failure }: { readonly failure: Failure }) {
  const flow = useTranslations("authEmailFlow");
  return (
    // `px-0 pt-0`: the banner's own inset is the phone page's gutter.
    <AlertBanner
      body={failure === "unreachable" ? flow("offline") : flow("requestFailed")}
      className="px-0 pt-0"
      icon={failure === "unreachable" ? WifiOff : TriangleAlert}
      title={flow("errorTitle")}
    />
  );
}

/**
 * Figma "Forgot password (Light)", in the sign-in pages' frame (`AuthSplit`):
 * one field, one action, and the way back. Submits a reset request to
 * better-auth and moves on to "check your email".
 */
export function ForgotPasswordScreen() {
  const t = useTranslations("forgotPassword");
  const flow = useTranslations("authEmailFlow");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !email.trim()) return;
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
    <AuthSplit>
      <form className="flex flex-col gap-5 md:gap-6" noValidate onSubmit={(event) => void submit(event)}>
        <AuthHeading subtitle={t("subtitle")} title={t("title")} />
        {failure ? <FailureBanner failure={failure} /> : null}
        <Field
          autoComplete="email"
          // The page exists to take this one answer.
          autoFocus
          id="forgot-email"
          label={t("emailLabel")}
          latin
          onChange={(event) => {
            setEmail(event.target.value);
            setFailure(null);
          }}
          outline
          placeholder={t("emailPlaceholder")}
          type="email"
          value={email}
        />
        <div className="flex flex-col gap-2">
          {/* Grey until there is an address to send to. */}
          <Button
            aria-busy={busy || undefined}
            className={authPill(true)}
            disabled={busy || !email.trim()}
            type="submit"
          >
            {busy ? flow("sending") : t("submit")}
          </Button>
          <Button className={authPill()} nativeButton={false} render={<Link href="/login" />} variant="outline">
            {t("backToSignIn")}
          </Button>
        </div>
      </form>
    </AuthSplit>
  );
}

/**
 * Figma "Reset link sent (Light)": where the link went, a way to send it
 * again, and the way back to signing in.
 */
export function ResetLinkSentScreen() {
  const t = useTranslations("resetSent");
  const flow = useTranslations("authEmailFlow");
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
    <AuthSplit>
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MailCheck aria-hidden className="size-6 text-foreground" />
      </span>
      <AuthHeading subtitle={t("subtitle")} title={t("title")} />

      {/* Where it went, so a mistyped address is caught here rather than
          after a wait for an email that will never come. */}
      <div className="flex flex-col gap-0.5 rounded-2xl bg-muted px-4 py-3.5">
        <span className="text-xs text-muted-foreground">{t("sentToLabel")}</span>
        <span className="truncate font-latin text-sm font-medium text-foreground">
          {email || t("sentToValue")}
        </span>
      </div>

      {sentAgain ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {flow("resent")}
        </p>
      ) : null}
      {failure ? <FailureBanner failure={failure} /> : null}

      <div className="flex flex-col gap-2">
        <Button className={authPill(true)} nativeButton={false} render={<Link href="/login" />}>
          {t("backToSignIn")}
        </Button>
        <Button
          aria-busy={busy || undefined}
          className={authPill()}
          disabled={!email || busy}
          onClick={() => void resend()}
          type="button"
          variant="outline"
        >
          {busy ? flow("sending") : t("resend")}
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">{t("spamHint")}</p>
    </AuthSplit>
  );
}
