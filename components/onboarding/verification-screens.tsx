import { Check, CircleAlert, CircleCheckBig, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { StepRow } from "@/components/onboarding/parts";
import { StatusHero } from "@/components/screening/parts";

/** Figma "Thank You (Light)" — 995:6579. */
export function OnboardingThankYouScreen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor-onboarding/stage-3" label={c("back")} />
      <ScreenBody>
        <StatusHero
          badgeClassName="bg-success-surface"
          icon={CircleCheckBig}
          iconClassName="text-foreground"
          subtitle={t("thanksSubtitle")}
          title={t("thanksTitle")}
        />
        <p className="w-full px-6 pt-3 text-center text-xs font-normal text-muted-foreground">
          {t("thanksMeta")}
        </p>
        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/advisor-onboarding/pending">{t("seeStatus")}</PrimaryButton>
          <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/**
 * Figma "Verification Pending" (995:6703) and "Verification Failed" (995:6658) —
 * the same step list with different statuses, plus a reviewer note when failed.
 */
export function VerificationStatusScreen({
  state,
}: {
  readonly state: "pending" | "failed";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const failed = state === "failed";

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/advisor-onboarding/thank-you" label={c("back")} />
      <ScreenBody>
        <StatusHero
          badgeClassName={failed ? "bg-destructive/10" : "bg-primary/10"}
          icon={failed ? CircleAlert : Hourglass}
          iconClassName={failed ? "text-destructive" : "text-primary"}
          subtitle={failed ? t("failedSubtitle") : t("pendingSubtitle")}
          title={failed ? t("failedTitle") : t("pendingTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <StepRow
              icon={Check}
              label={t("stepPersonal")}
              status={failed ? t("statusApproved") : t("statusSubmitted")}
            />
            <StepRow
              icon={failed ? CircleAlert : Check}
              label={t("stepDocument")}
              status={failed ? t("statusNeedsFix") : t("statusSubmitted")}
              tone={failed ? "destructive" : "muted"}
            />
            <StepRow
              icon={Check}
              label={t("stepSkills")}
              status={failed ? t("statusApproved") : t("statusSubmitted")}
            />
            {failed ? null : (
              <StepRow
                icon={Hourglass}
                label={t("stepTeamReview")}
                status={t("statusReviewing")}
                tone="primary"
              />
            )}
          </div>
        </div>

        {failed ? (
          /* Figma "Note": the reviewer's rejection reason. */
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
            <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip rounded-xl border border-destructive bg-card p-3.5">
              <CircleAlert className="size-4 shrink-0 text-destructive" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="w-full text-xs font-normal text-destructive">
                  {t("reviewerNote")}
                </p>
                <p className="w-full text-sm font-normal text-foreground">
                  {t("reviewerReason")}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <ScreenSpacer />
        <ScreenActions>
          {failed ? (
            <>
              <PrimaryButton href="/advisor-onboarding/stage-2">{t("resubmit")}</PrimaryButton>
              <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
            </>
          ) : (
            <PrimaryButton href="/profile">{t("backHome")}</PrimaryButton>
          )}
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
