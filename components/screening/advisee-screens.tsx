"use client";

import {
  BookOpen,
  CircleCheckBig,
  Clock,
  Hourglass,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { AdvisorNote, SubmittedActions, SubmittedSteps } from "@/components/screening/advisee-parts";
import {
  Card,
  DetailRow,
  FootNote,
  StackRow,
  StatusHero,
} from "@/components/screening/parts";

/** Figma "Advisee - Screening submitted (Light)" — 995:11668. */
export function ScreeningSubmittedScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/screening/questions" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <StatusHero
          badgeClassName="bg-primary/10"
          icon={Hourglass}
          iconClassName="text-primary"
          subtitle={t("submittedSubtitle")}
          title={t("submittedTitle")}
        />

        <SubmittedSteps />

        <ScreenSpacer />
        <SubmittedActions homeHref="/profile" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisee - Screening accepted (Light)" — 995:11708. */
export function ScreeningAcceptedScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/screening/submitted" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <StatusHero
          badgeClassName="bg-success-surface"
          icon={CircleCheckBig}
          iconClassName="text-foreground"
          subtitle={t("acceptedSubtitle")}
          title={t("acceptedTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <Surface className="flex w-full shrink-0 flex-col items-start gap-3 p-3.5">
            <DetailRow icon={UserRound} label={t("advisorLabel")} value={t("advisorValue")} />
            <DetailRow icon={BookOpen} label={t("topicLabel")} value={t("topicValue")} />
            {/* The free trial is the offer on this screen, so the one row that
                states it takes the accent rather than sitting in the same ink as
                the advisor's name. */}
            <DetailRow
              icon={Clock}
              label={t("trialLabel")}
              value={<StatusPill tone="accent">{t("trialValue")}</StatusPill>}
            />
          </Surface>
        </div>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/screening/trial">{t("startTrial")}</PrimaryButton>
          <NeutralButton href="/checkout/card">{t("bookFull")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisee - Screening declined (Light)" — 995:11750. */
export function ScreeningDeclinedScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/screening/submitted" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <StatusHero
          icon={Clock}
          subtitle={t("declinedSubtitle")}
          title={t("declinedTitle")}
        />

        <AdvisorNote message={t("advisorMessage")} />

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/matching/results">{t("findOthers")}</PrimaryButton>
          <NeutralButton href="/profile">{t("backHome")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Trial consultation (Light)" — 995:11782. */
export function TrialConsultationScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/screening/accepted" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("trialSubtitle")}
          title={t("trialTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <StackRow
              body={t("trialVideoBody")}
              icon={Video}
              iconClassName="bg-accent-surface text-primary"
              title={t("trialVideoTitle")}
            />
            <StackRow
              body={t("trialAskBody")}
              icon={MessageSquare}
              iconClassName="bg-accent-surface text-primary"
              title={t("trialAskTitle")}
            />
          </Card>
        </div>

        <FootNote icon={ShieldCheck}>{t("trialNote")}</FootNote>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/chat/sarah-jenskins">{t("trialStart")}</PrimaryButton>
          <NeutralButton href="/profile">{t("trialLater")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
