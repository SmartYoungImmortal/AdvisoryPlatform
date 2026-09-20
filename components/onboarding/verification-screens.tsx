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
import { Surface, SurfaceList } from "@/components/mobile/surface";
import { SiteFooter } from "@/components/marketing/site-footer";
import { StepRow } from "@/components/onboarding/parts";
import { StatusHero } from "@/components/screening/parts";
import { TopBar } from "@/components/topbar";

/**
 * Figma "Card" (1787:25040) — the 560px panel the three outcome frames centre in
 * the page, 48px inset on the card surface. These frames carry no back bar: the
 * nav and the card's own actions are the only ways off them.
 *
 * It floats over the page ground between the nav and the footer, so it takes
 * `--shadow-panel` — a hairline alone left a 560px box that read as a hole cut in
 * the page rather than a card laid on it.
 */
const STATUS_CARD =
  "flex w-full flex-1 flex-col lg:my-24 lg:w-[560px] lg:flex-none lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:px-12 lg:pb-12 lg:shadow-panel";

/** Figma "Actions" — a 360px stack, centred in the card. */
const STATUS_ACTIONS = "lg:mx-auto lg:w-[360px] lg:px-0 lg:pt-8 lg:pb-0";
const STATUS_BUTTON = "lg:h-11";

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
    // Figma "Desktop / Thank You (Light)" (1787:24947) — the phone frame's whole
    // column, held as one 560px card under the app's nav.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className="lg:hidden" href="/advisor-onboarding/stage-3" label={c("back")} />
      <ScreenBody>
        <div className={STATUS_CARD}>
          {/* The lime badge held a near-black glyph, so the one success signal on
              the screen was carried by the circle alone. */}
          <StatusHero
            badgeClassName="bg-success-surface"
            icon={CircleCheckBig}
            iconClassName="text-success"
            subtitle={t("thanksSubtitle")}
            title={t("thanksTitle")}
          />
          <p className="w-full px-6 pt-3 text-center text-xs font-normal text-muted-foreground lg:px-0">
            {application
              ? t("thanksMetaAt", { date: formatDate(application.submittedAt) })
              : t("thanksMeta")}
          </p>
          <ScreenSpacer className="lg:hidden" />
          <ScreenActions className={STATUS_ACTIONS} stacked>
            <PrimaryButton block className={STATUS_BUTTON} href="/advisor-onboarding/pending">
              {t("seeStatus")}
            </PrimaryButton>
            <NeutralButton block className={STATUS_BUTTON} href="/profile">
              {t("backHome")}
            </NeutralButton>
          </ScreenActions>
        </div>
        <SiteFooter className="mt-auto hidden lg:flex" />
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
      <MobileScreen wide>
        <div className="hidden w-full lg:block">
          <TopBar unreadNotifications />
        </div>
        <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
        <ScreenBody>
          <div className={STATUS_CARD}>
            <StatusHero
              badgeClassName="bg-success-surface"
              icon={CircleCheckBig}
              iconClassName="text-success"
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
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8 lg:px-0">
              {/* Every step cleared, so every step says so in green — the list
                  used to be four grey lines reading "อนุมัติแล้ว". */}
              <SurfaceList className="lg:shadow-none">
                <StepRow
                  icon={Check}
                  label={t("stepPersonal")}
                  status={t("statusApproved")}
                  tone="success"
                />
                <StepRow
                  icon={Check}
                  label={t("stepDocument")}
                  status={t("statusApproved")}
                  tone="success"
                />
                <StepRow
                  icon={Check}
                  label={t("stepSkills")}
                  status={t("statusApproved")}
                  tone="success"
                />
                <StepRow
                  icon={Check}
                  label={t("stepTeamReview")}
                  status={t("statusApproved")}
                  tone="success"
                />
              </SurfaceList>
            </div>
            <ScreenSpacer className="lg:hidden" />
            <ScreenActions className={STATUS_ACTIONS} stacked>
              <PrimaryButton block className={STATUS_BUTTON} href="/advisor/services/new">
                {t("createService")}
              </PrimaryButton>
              <NeutralButton block className={STATUS_BUTTON} href="/work">
                {t("goToWork")}
              </NeutralButton>
            </ScreenActions>
          </div>
          <SiteFooter className="mt-auto hidden lg:flex" />
        </ScreenBody>
      </MobileScreen>
    );
  }

  return (
    // Figma "Desktop / Verification Pending" (1787:25016) and "… Failed"
    // (1787:25101) — the same 560px card, with the reviewer's note inside it.
    <MobileScreen wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className="lg:hidden" href="/advisor-onboarding/thank-you" label={c("back")} />
      <ScreenBody>
        <div className={STATUS_CARD}>
        {/* `--accent-surface` is the token for the accent as a *status* ground;
            `bg-primary/10` was the same idea mixed by hand. */}
        <StatusHero
          badgeClassName={failed ? "bg-destructive/10" : "bg-accent-surface"}
          icon={failed ? CircleAlert : Hourglass}
          iconClassName={failed ? "text-destructive" : "text-primary"}
          subtitle={failed ? t("failedSubtitle") : t("pendingSubtitle")}
          title={failed ? t("failedTitle") : t("pendingTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8 lg:px-0">
          {/* What passed is green, what is waiting is blue, what needs work is
              red — the whole point of the screen, and previously three shades of
              12px type. */}
          <SurfaceList className="lg:shadow-none">
            <StepRow
              icon={Check}
              label={t("stepPersonal")}
              status={failed ? t("statusApproved") : t("statusSubmitted")}
              tone={failed ? "success" : "muted"}
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
              tone={failed ? "success" : "muted"}
            />
            {failed ? null : (
              <StepRow
                icon={Hourglass}
                label={t("stepTeamReview")}
                status={t("statusReviewing")}
                tone="primary"
              />
            )}
          </SurfaceList>
        </div>

        {failed ? (
          /* Figma "Note": the reviewer's rejection reason. It keeps the
             destructive hairline and gains the tinted ground that goes with it,
             so the one block the applicant has to act on is not a white card
             among white cards. */
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3 lg:px-0">
            <Surface
              className="flex w-full items-start gap-2.5 border-destructive/50 bg-destructive/5 p-3.5"
              tier="flat"
            >
              <CircleAlert className="size-4 shrink-0 text-destructive" />
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="w-full text-xs font-medium text-destructive">
                  {t("reviewerNote")}
                </p>
                <p className="w-full text-sm font-normal text-foreground">
                  {application?.decision?.note ?? t("reviewerReason")}
                </p>
              </div>
            </Surface>
          </div>
        ) : null}

        <ScreenSpacer className="lg:hidden" />
        <ScreenActions className={STATUS_ACTIONS} stacked>
          {failed ? (
            <>
              <PrimaryButton block className={STATUS_BUTTON} href="/advisor-onboarding/stage-2">
                {t("resubmit")}
              </PrimaryButton>
              <NeutralButton block className={STATUS_BUTTON} href="/profile">
                {t("backHome")}
              </NeutralButton>
            </>
          ) : (
            <PrimaryButton block className={STATUS_BUTTON} href="/profile">
              {t("backHome")}
            </PrimaryButton>
          )}
        </ScreenActions>
        </div>
        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
