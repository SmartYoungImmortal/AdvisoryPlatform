import {
  BookOpen,
  Check,
  CircleCheckBig,
  Clock,
  Hourglass,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Textarea } from "@/components/ui/textarea";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import {
  Card,
  CardDivider,
  DetailRow,
  FootNote,
  StackRow,
  StatusHero,
} from "@/components/screening/parts";

/** Figma "Advisee - Screening questions (Light)" — 995:11631. */
export function ScreeningQuestionsScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href="/matching/results" label={c("back")} />
      <ScreenBody>
        {/* Figma "Stage Header": 8px top padding, 10px gap, 20px subtitle. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-2">
          <h1 className="w-full text-heading font-semibold text-foreground">
            {t("answerTitle")}
          </h1>
          <p className="w-full text-sm font-normal text-muted-foreground">
            {t("answerSubtitle")}
          </p>
        </div>

        {/* Figma "Form Fields": 8px top padding, 16px between rows. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          <Field id="screen-q1" label={t("answerQ1")} placeholder={t("answerPlaceholder")} />
          <Field id="screen-q2" label={t("answerQ2")} placeholder={t("answerPlaceholder")} />
          <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
            <label
              className="w-full text-sm font-medium text-foreground"
              htmlFor="screen-q3"
            >
              {t("answerQ3")}
            </label>
            <Textarea
              className="h-21 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
              id="screen-q3"
              placeholder={t("answerLongPlaceholder")}
            />
          </div>
        </div>

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton href="/screening/submitted">{t("submitAnswers")}</PrimaryButton>
        </div>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisee - Screening submitted (Light)" — 995:11668. */
export function ScreeningSubmittedScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href="/screening/questions" label={c("back")} />
      <ScreenBody>
        <StatusHero
          badgeClassName="bg-primary/10"
          icon={Hourglass}
          iconClassName="text-primary"
          subtitle={t("submittedSubtitle")}
          title={t("submittedTitle")}
        />

        {/* Figma "Status Card": two completed steps and one in-progress step. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <DetailRow icon={Check} label={t("step1")} value={t("done")} />
            <DetailRow icon={Check} label={t("step2")} value={t("done")} />
            <DetailRow
              icon={Hourglass}
              label={t("step3")}
              value={t("waiting")}
              valueClassName="text-primary"
            />
          </div>
        </div>

        <ScreenSpacer />
        <ScreenActions className="gap-3.5">
          <PrimaryButton href="/profile">{t("backHome")}</PrimaryButton>
          <p className="w-full text-center text-sm font-normal text-muted-foreground">
            {t("browseOthers")}
          </p>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisee - Screening accepted (Light)" — 995:11708. */
export function ScreeningAcceptedScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <ScreenTopBar href="/screening/submitted" label={c("back")} />
      <ScreenBody>
        <StatusHero
          badgeClassName="bg-success-surface"
          icon={CircleCheckBig}
          iconClassName="text-foreground"
          subtitle={t("acceptedSubtitle")}
          title={t("acceptedTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5">
            <DetailRow icon={UserRound} label={t("advisorLabel")} value={t("advisorValue")} />
            <DetailRow icon={BookOpen} label={t("topicLabel")} value={t("topicValue")} />
            <DetailRow icon={Clock} label={t("trialLabel")} value={t("trialValue")} />
          </div>
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
    <MobileScreen>
      <ScreenTopBar href="/screening/submitted" label={c("back")} />
      <ScreenBody>
        <StatusHero
          icon={Clock}
          subtitle={t("declinedSubtitle")}
          title={t("declinedTitle")}
        />

        {/* Figma "Advisor Note": a quoted message from the advisor. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip rounded-xl bg-card p-3.5">
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-xs font-normal text-muted-foreground">
                {t("advisorMessageLabel")}
              </p>
              <p className="w-full text-sm font-normal text-foreground">
                {t("advisorMessage")}
              </p>
            </div>
          </div>
        </div>

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
    <MobileScreen>
      <ScreenTopBar href="/screening/accepted" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("trialSubtitle")}
          title={t("trialTitle")}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <StackRow body={t("trialVideoBody")} icon={Video} title={t("trialVideoTitle")} />
            <CardDivider />
            <StackRow
              body={t("trialAskBody")}
              icon={MessageSquare}
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
