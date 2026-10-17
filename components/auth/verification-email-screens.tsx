"use client";

import { BadgeCheck, Mail, TriangleAlert, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AUTH_CARD, AuthFooter, AuthTopNav } from "@/components/auth/auth-chrome";
import { AlertBanner } from "@/components/mobile/banner";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
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
import { sendVerificationEmail } from "@/lib/api/auth";
import { useLocationSearch } from "@/lib/navigation/use-location-search";
import { cn } from "@/lib/utils";

type Failure = "rejected" | "unreachable";

function verificationCallback(email: string): string {
  const callback = new URL("/email-verified", window.location.origin);
  callback.searchParams.set("email", email);
  return callback.toString();
}

export function VerificationEmailSentScreen() {
  const t = useTranslations("verificationEmail");
  const flow = useTranslations("authEmailFlow");
  const c = useTranslations("common");
  const router = useRouter();
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
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
          <ScreenHeading className="gap-2 pt-4" subtitle={t("sentBody")} title={t("sentTitle")} />
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-6">
            <Surface className="flex w-full items-center gap-2.5 p-3.5" tier="well">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-px flex-1 overflow-clip">
                <p className="text-xs text-muted-foreground">{t("sentToLabel")}</p>
                <p className="font-latin truncate text-sm font-medium text-foreground">{email}</p>
              </div>
            </Surface>
          </div>
          {resent ? <p className="px-6 pt-4 text-sm text-muted-foreground">{t("resent")}</p> : null}
          {failure ? (
            <AlertBanner
              body={failure === "unreachable" ? flow("offline") : flow("requestFailed")}
              icon={failure === "unreachable" ? WifiOff : TriangleAlert}
              title={flow("errorTitle")}
            />
          ) : null}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions stacked>
            <PrimaryButton block disabled={!email || busy} onClick={() => void resend()} type="button">
              {busy ? flow("sending") : t("resend")}
            </PrimaryButton>
            <NeutralButton block onClick={() => router.push("/")} type="button">
              {t("continue")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}

export function EmailVerifiedScreen() {
  const t = useTranslations("verificationEmail");
  const flow = useTranslations("authEmailFlow");
  const c = useTranslations("common");
  const search = useLocationSearch();
  const query = new URLSearchParams(search);
  const email = query.get("email") ?? "";
  const expired = query.has("error");

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody className="lg:items-stretch lg:justify-center">
        <AuthTopNav />
        <div className={cn("flex w-full flex-1 flex-col items-center lg:mx-auto", AUTH_CARD)}>
          <div className="flex w-full shrink-0 flex-col items-center pt-14">
            <span className="flex size-24 items-center justify-center rounded-full bg-accent-surface">
              <BadgeCheck className="size-10 text-primary" />
            </span>
            <ScreenHeading
              className="gap-2 pt-4 text-center"
              subtitle={expired ? t("expiredBody") : t("verifiedBody")}
              title={expired ? t("expiredTitle") : t("verifiedTitle")}
            />
          </div>
          {email ? <p className="px-6 pt-4 text-sm text-muted-foreground">{email}</p> : null}
          {expired ? (
            <AlertBanner body={t("expiredBody")} icon={TriangleAlert} title={flow("errorTitle")} />
          ) : null}
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions stacked>
            {expired ? (
              <PrimaryButton
                block
                href={`/verification-sent?email=${encodeURIComponent(email)}`}
              >
                {t("resend")}
              </PrimaryButton>
            ) : null}
            <NeutralButton block href="/">
              {t("continue")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <AuthFooter className="lg:mt-auto" />
      </ScreenBody>
    </MobileScreen>
  );
}
