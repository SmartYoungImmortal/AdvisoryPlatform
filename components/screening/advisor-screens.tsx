import {
  ChevronRight,
  CircleHelp,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { AddRow } from "@/components/mobile/settings-list";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import {
  Card,
  CardDivider,
  FootNote,
  StackRow,
  TimeMeta,
} from "@/components/screening/parts";

/** Figma "Advisor - Screening setup (Light)" — 995:11456. */
export function ScreeningSetupScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("setupSubtitle")}
          title={t("setupTitle")}
        />

        {/* Figma "Questions": 20px top padding, 18px caption, 8px gap, card. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("yourQuestions")}
          </p>
          <Card>
            <StackRow
              body={t("required")}
              centerIcon
              icon={CircleHelp}
              title={t("q1")}
              trailing={<ChevronRight className="mt-2.5 size-4 text-muted-foreground" />}
            />
            <CardDivider />
            <StackRow
              body={t("required")}
              centerIcon
              icon={CircleHelp}
              title={t("q2")}
              trailing={<ChevronRight className="mt-2.5 size-4 text-muted-foreground" />}
            />
            <CardDivider />
            <StackRow
              body={t("optional")}
              centerIcon
              icon={CircleHelp}
              title={t("q3")}
              trailing={<ChevronRight className="mt-2.5 size-4 text-muted-foreground" />}
            />
            <CardDivider />
            {/* Figma "Add question": a 48px single-line row. */}
            <AddRow label={t("addQuestion")} />
          </Card>
        </div>

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor - Screening requests (Light)" — 995:11505. */
export function ScreeningRequestsScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody>
        <ScreenHeading className="pt-4" title={t("requestsTitle")} />

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("pending")}
          </p>
          <Card>
            <StackRow
              body={t("req1Body")}
              centerIcon
              icon={FileText}
              href="/screening/review"
              title={t("req1Name")}
              trailing={<TimeMeta time={t("req1Time")} unread />}
            />
            <CardDivider />
            <StackRow
              body={t("req2Body")}
              centerIcon
              icon={FileText}
              href="/screening/review"
              title={t("req2Name")}
              trailing={<TimeMeta time={t("req2Time")} unread />}
            />
            <CardDivider />
            <StackRow
              body={t("req3Body")}
              centerIcon
              icon={FileText}
              href="/screening/review"
              title={t("req3Name")}
              trailing={<TimeMeta time={t("req3Time")} />}
            />
          </Card>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-xs font-normal text-muted-foreground">
            {t("answered")}
          </p>
          <Card>
            <StackRow
              body={t("req4Body")}
              centerIcon
              icon={FileText}
              href="/screening/review"
              title={t("req4Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
            <CardDivider />
            <StackRow
              body={t("req5Body")}
              centerIcon
              icon={FileText}
              href="/screening/review"
              title={t("req5Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
          </Card>
        </div>

        <ScreenSpacer />
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}

/** Figma "Advisor - Review answers (Light)" — 995:11572. */
export function ReviewAnswersScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      <StatusBar />
      <ScreenTopBar href="/screening/requests" label={c("back")} />
      <ScreenBody>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("reviewSubtitle")}
          title={t("reviewTitle")}
        />

        {/* Figma "Info Card": each screening question with the advisee's answer. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <StackRow body={t("a1")} icon={CircleHelp} title={t("q1")} />
            <CardDivider />
            <StackRow body={t("a2")} icon={CircleHelp} title={t("q2")} />
            <CardDivider />
            <StackRow body={t("a3")} icon={CircleHelp} title={t("q3")} />
          </Card>
        </div>

        <FootNote icon={ShieldCheck}>{t("reviewNote")}</FootNote>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/screening/requests">{t("accept")}</PrimaryButton>
          <NeutralButton href="/screening/requests">{t("decline")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
  );
}
