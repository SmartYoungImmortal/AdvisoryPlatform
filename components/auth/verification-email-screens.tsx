"use client";

import { BadgeCheck, MailCheck, TriangleAlert, WifiOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AuthHeading, AuthMark, AuthSplit, authPill } from "@/components/auth/auth-split";
import { AlertBanner } from "@/components/mobile/banner";
import { Button } from "@/components/ui/button";
import { ApiUnreachableError } from "@/lib/api/client";
import { sendVerificationEmail } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";

type Failure = "rejected" | "unreachable";

function verificationCallback(email: string): string {
  const callback = new URL("/email-verified", window.location.origin);
  callback.searchParams.set("email", email);
  return callback.toString();
}

/**
 * The address, on the muted step, so a typo is caught here and not after a
 * wait. Centred below `lg` with the mark and heading above it.
 */
function SentTo({ email }: { readonly email: string }) {
  const t = useTranslations("verificationEmail");
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-muted px-4 py-3.5 text-center lg:items-start lg:text-left">
      <span className="text-xs text-muted-foreground">{t("sentToLabel")}</span>
      <span className="max-w-full truncate font-latin text-sm font-medium text-foreground">{email}</span>
    </div>
  );
}

/**
 * After signing up: where the link went, a way to send it again, and the way
 * on. Laid out like `/register` and `/forgot-password` (`AuthSplit`), so the
 * three steps of an account read as one flow.
 */
export function VerificationEmailSentScreen() {
  const t = useTranslations("verificationEmail");
  const flow = useTranslations("authEmailFlow");
  const search = useLocationSearch();
  const email = new URLSearchParams(search).get("email") ?? "";
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  async function resend() {
    if (!email || busy) return;
    setBusy(true);
    setFailure(null);
    setResent(false);
    try {
      await sendVerificationEmail({ email, callbackURL: verificationCallback(email) });
      setResent(true);
    } catch (error) {
      setFailure(error instanceof ApiUnreachableError ? "unreachable" : "rejected");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <AuthMark>
        <MailCheck aria-hidden className="size-6 text-foreground" />
      </AuthMark>
      <AuthHeading centred subtitle={t("sentBody")} title={t("sentTitle")} />

      {email ? <SentTo email={email} /> : null}

      {resent ? (
        <p aria-live="polite" className="text-center text-sm text-muted-foreground lg:text-left">
          {t("resent")}
        </p>
      ) : null}
      {failure ? (
        <AlertBanner
          body={failure === "unreachable" ? flow("offline") : flow("requestFailed")}
          className="px-0 pt-0"
          icon={failure === "unreachable" ? WifiOff : TriangleAlert}
          title={flow("errorTitle")}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          aria-busy={busy || undefined}
          className={authPill(true)}
          disabled={!email || busy}
          onClick={() => void resend()}
          type="button"
        >
          {busy ? flow("sending") : t("resend")}
        </Button>
        <Button className={authPill()} nativeButton={false} render={<Link href="/" />} variant="outline">
          {t("continue")}
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">{t("spamHint")}</p>
    </AuthSplit>
  );
}

/** Where the link lands: verified, or a link that has expired and a way to get another. */
export function EmailVerifiedScreen() {
  const t = useTranslations("verificationEmail");
  const search = useLocationSearch();
  const query = new URLSearchParams(search);
  const email = query.get("email") ?? "";
  const expired = query.has("error");

  return (
    <AuthSplit>
      <AuthMark>
        {expired ? (
          <TriangleAlert aria-hidden className="size-6 text-foreground" />
        ) : (
          <BadgeCheck aria-hidden className="size-6 text-primary" />
        )}
      </AuthMark>
      <AuthHeading
        centred
        subtitle={expired ? t("expiredBody") : t("verifiedBody")}
        title={expired ? t("expiredTitle") : t("verifiedTitle")}
      />

      {email ? <SentTo email={email} /> : null}

      <div className="flex flex-col gap-2">
        {expired ? (
          <Button
            className={authPill(true)}
            nativeButton={false}
            render={<Link href={`/verification-sent?email=${encodeURIComponent(email)}`} />}
          >
            {t("resendLink")}
          </Button>
        ) : null}
        <Button
          className={authPill(!expired)}
          nativeButton={false}
          render={<Link href="/" />}
          variant={expired ? "outline" : "default"}
        >
          {t("continue")}
        </Button>
      </div>
    </AuthSplit>
  );
}
