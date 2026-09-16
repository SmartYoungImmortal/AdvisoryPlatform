"use client";

import { Check, CircleAlert, CircleCheckBig, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { formatDate } from "@/lib/mock-db/format";
import { useDatabase } from "@/lib/mock-db/store";
import { advisorLevelTitles } from "@/lib/mock-db/types";
import { useSession } from "@/lib/session";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StepRow } from "@/components/onboarding/parts";
import { StatusHero } from "@/components/screening/parts";

/** The signed-in account's most recent advisor application. */
function useLatestApplication() {
  const session = useSession();
  const accountId = session.status === "authenticated" ? session.account.id : null;
  return useDatabase((db) =>
    accountId ? db.identityRequests.find((r) => r.accountId === accountId) : undefined,
  );
}

/** Figma "Thank You (Light)" — 995:6579. */
export function OnboardingThankYouScreen() {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const application = useLatestApplication();

  return (
    <MobileScreen>
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
          {application
            ? t("thanksMetaAt", { date: formatDate(application.submittedAt) })
            : t("thanksMeta")}
        </p>
        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/advisor-onboarding/pending">{t("seeStatus")}</PrimaryButton>
          <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * Figma "Verification Pending" (995:6703) and "Verification Failed" (995:6658) —
 * the same step list with different statuses, plus a reviewer note when failed.
 *
 * With an application on file the screen shows its real outcome — including an
 * approval, which the frames never drew — and `state` only decides the static
 * frame a visitor without one sees.
 */
export function VerificationStatusScreen({
  state,
}: {
  readonly state: "pending" | "failed";
}) {
  const t = useTranslations("advisorOnboarding");
  const c = useTranslations("common");
  const session = useSession();
  const application = useLatestApplication();
  const outcome = application
    ? application.status === "submitted"
      ? "pending"
      : application.status === "rejected"
        ? "failed"
        : "approved"
    : state;
  const failed = outcome === "failed";

  if (outcome === "approved") {
    const advisor = session.status === "authenticated" ? session.account.advisor : null;
    return (
      <MobileScreen>
        <ScreenTopBar href="/profile" label={c("back")} />
        <ScreenBody>
          <StatusHero
            badgeClassName="bg-success-surface"
            icon={CircleCheckBig}
            iconClassName="text-foreground"
            subtitle={
              advisor
                ? t("approvedSubtitle", {
                    level: advisor.level,
                    title: advisorLevelTitles[advisor.level],
                  })
                : t("approvedSubtitleShort")
            }
            title={t("approvedTitle")}
          />
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
            <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
              <StepRow icon={Check} label={t("stepPersonal")} status={t("statusApproved")} />
              <StepRow icon={Check} label={t("stepDocument")} status={t("statusApproved")} />
              <StepRow icon={Check} label={t("stepSkills")} status={t("statusApproved")} />
              <StepRow icon={Check} label={t("stepTeamReview")} status={t("statusApproved")} />
            </div>
          </div>
          <ScreenSpacer />
          <ScreenActions>
            <PrimaryButton href="/advisor/services/new">{t("createService")}</PrimaryButton>
            <NeutralButton href="/work">{t("goToWork")}</NeutralButton>
          </ScreenActions>
        </ScreenBody>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen>
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
                  {application?.decision?.note ?? t("reviewerReason")}
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
    </MobileScreen>
  );
}
