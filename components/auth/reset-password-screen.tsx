"use client";

import { BadgeCheck, TriangleAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { AuthHeading, AuthMark, AuthSplit, authPill } from "@/components/auth/auth-split";
import { AlertBanner } from "@/components/mobile/banner";
import { Field, RevealPasswordButton } from "@/components/mobile/field";
import { Button } from "@/components/ui/button";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";
import { resetPassword } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";
import { passwordProblems } from "@/lib/session";

type Stage = "form" | "done" | "expired";
type Failure = "rejected" | "unreachable";

/**
 * `/reset-password?token=`: where the emailed link lands, in the sign-in
 * pages' frame (`AuthSplit`) like the request that sent it
 * (`/forgot-password`). Two fields under one hint, the capsule grey until
 * they can be sent; then the password changed, or a link that no longer
 * works and the way to another.
 */
export function ResetPasswordScreen() {
  const search = useLocationSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [stage, setStage] = useState<Stage>("form");

  if (stage === "done") return <ResetDone />;
  if (stage === "expired") return <LinkExpired />;
  return <ResetForm onDone={() => setStage("done")} onExpired={() => setStage("expired")} token={token} />;
}

function ResetForm({
  token,
  onDone,
  onExpired,
}: {
  readonly token: string;
  readonly onDone: () => void;
  readonly onExpired: () => void;
}) {
  const t = useTranslations("resetPassword");
  const flow = useTranslations("authEmailFlow");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const problems = passwordProblems(password);
  const strong = !problems.length && !problems.symbol && !problems.digit;
  // Said once the second field is as long as the first, not at its first letter.
  const mismatch = confirm.length > 0 && confirm.length >= password.length && confirm !== password;
  // Grey until both fields can be sent, as on the settings' password popup.
  const ready = strong && confirm === password;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    // Opened without the emailed link's token, there is nothing to reset with.
    if (!token) {
      onExpired();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await resetPassword({ token, newPassword: password });
      onDone();
    } catch (error) {
      setBusy(false);
      if (error instanceof ApiError && error.code === "INVALID_TOKEN") onExpired();
      else setFailure(error instanceof ApiUnreachableError ? "unreachable" : "rejected");
    }
  }

  return (
    <AuthSplit>
      <form className="flex flex-col gap-5 md:gap-6" noValidate onSubmit={(event) => void submit(event)}>
        <AuthHeading subtitle={t("subtitle")} title={t("title")} />
        {failure ? (
          // `px-0 pt-0`: the banner's own inset is the phone page's gutter.
          <AlertBanner
            body={failure === "unreachable" ? flow("offline") : t("passwordError")}
            className="px-0 pt-0"
            icon={failure === "unreachable" ? WifiOff : TriangleAlert}
            title={flow("errorTitle")}
          />
        ) : null}
        <Field
          autoComplete="new-password"
          // The page exists to take this one answer.
          autoFocus
          hint={t("hint")}
          id="reset-password"
          label={t("passwordLabel")}
          onChange={(event) => {
            setPassword(event.target.value);
            setFailure(null);
          }}
          outline
          placeholder={t("passwordPlaceholder")}
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
          error={mismatch ? t("mismatch") : undefined}
          id="reset-password-confirm"
          invalid={mismatch}
          label={t("confirmLabel")}
          onChange={(event) => {
            setConfirm(event.target.value);
            setFailure(null);
          }}
          outline
          placeholder={t("confirmPlaceholder")}
          type={revealed ? "text" : "password"}
          value={confirm}
        />
        <div className="flex flex-col gap-2">
          <Button aria-busy={busy || undefined} className={authPill(true)} disabled={busy || !ready} type="submit">
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

/** The new password is set: the one way on is signing in with it. */
function ResetDone() {
  const t = useTranslations("resetPassword");
  return (
    <AuthSplit>
      <AuthMark>
        <BadgeCheck aria-hidden className="size-6 text-primary" />
      </AuthMark>
      <AuthHeading centred subtitle={t("successBody")} title={t("successTitle")} />
      <Button className={authPill(true)} nativeButton={false} render={<Link href="/login" />}>
        {t("backToSignIn")}
      </Button>
    </AuthSplit>
  );
}

/** The link has expired or was used: a new one from `/forgot-password`, or back to signing in. */
function LinkExpired() {
  const t = useTranslations("resetPassword");
  return (
    <AuthSplit>
      <AuthMark>
        <TriangleAlert aria-hidden className="size-6 text-foreground" />
      </AuthMark>
      <AuthHeading centred subtitle={t("expired")} title={t("expiredTitle")} />
      <div className="flex flex-col gap-2">
        <Button className={authPill(true)} nativeButton={false} render={<Link href="/forgot-password" />}>
          {t("requestAnother")}
        </Button>
        <Button className={authPill()} nativeButton={false} render={<Link href="/login" />} variant="outline">
          {t("backToSignIn")}
        </Button>
      </div>
    </AuthSplit>
  );
}
