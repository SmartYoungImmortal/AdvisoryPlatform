import {
  ChevronRight,
  CircleHelp,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { AddRow } from "@/components/mobile/settings-list";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Card, FootNote, StackRow, TimeMeta } from "@/components/screening/parts";

/** Figma "Advisor - Screening setup (Light)" — 995:11456. */
export function ScreeningSetupScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("setupSubtitle")}
          title={t("setupTitle")}
        />

        {/* Figma "Questions": 20px top padding, a caption, 8px gap, card. The
            caption was a 12px muted line above a card of 14px rows — quieter
            than the content it introduces. It is a section head now. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-base font-semibold text-foreground lg:text-lg">
            {t("yourQuestions")}
          </p>
          <Card>
            <StackRow
              body={t("required")}
              icon={CircleHelp}
              title={t("q1")}
              trailing={<ChevronRight className="size-4 text-muted-foreground" />}
            />
            <StackRow
              body={t("required")}
              icon={CircleHelp}
              title={t("q2")}
              trailing={<ChevronRight className="size-4 text-muted-foreground" />}
            />
            <StackRow
              body={t("optional")}
              icon={CircleHelp}
              title={t("q3")}
              trailing={<ChevronRight className="size-4 text-muted-foreground" />}
            />
            {/* Figma "Add question": a 48px single-line row. */}
            <AddRow label={t("addQuestion")} />
          </Card>
        </div>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}

/** Figma "Advisor - Screening requests (Light)" — 995:11505. */
export function ScreeningRequestsScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/profile" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <ScreenHeading className="pt-4" title={t("requestsTitle")} />

        {/* The two groups had the same grey caption and identical rows, so
            nothing on the screen said which requests were still owed an answer.
            The heads state it, and the group's own colour carries it: amber
            chips and a pill on what is waiting, the outcome on what is done. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-base font-semibold text-foreground lg:text-lg">
            {t("pending")}
          </p>
          <Card>
            <StackRow
              body={t("req1Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req1Name")}
              trailing={<TimeMeta time={t("req1Time")} unread />}
            />
            <StackRow
              body={t("req2Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req2Name")}
              trailing={<TimeMeta time={t("req2Time")} unread />}
            />
            <StackRow
              body={t("req3Body")}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-warning/15 text-warning"
              title={t("req3Name")}
              trailing={<TimeMeta time={t("req3Time")} />}
            />
          </Card>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
          <p className="w-full text-base font-semibold text-foreground lg:text-lg">
            {t("answered")}
          </p>
          <Card>
            {/* These two rows' bodies already *are* the outcome — "รับคำขอแล้ว"
                and "ปฏิเสธคำขอ" — so the outcome moves into a pill and the body
                stops being a grey line that has to be read to be found. */}
            <StackRow
              body={<StatusPill tone="success">{t("req4Body")}</StatusPill>}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-success/12 text-success"
              title={t("req4Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
            <StackRow
              body={<StatusPill tone="danger">{t("req5Body")}</StatusPill>}
              href="/screening/review"
              icon={FileText}
              iconClassName="bg-destructive/10 text-destructive"
              title={t("req5Name")}
              trailing={<TimeMeta time={t("yesterday")} />}
            />
          </Card>
        </div>

        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * One screening answer, on the review screen — the question as the quiet label,
 * the answer as the thing being read.
 *
 * `StackRow` is the wrong way round for this one block: there the title is the
 * heading and the body is meta, and here the body *is* the content. So it is a
 * row of its own rather than a fourth flag on the shared one.
 */
function AnswerRow({
  question,
  answer,
}: {
  readonly question: string;
  readonly answer: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-surface">
        <CircleHelp aria-hidden className="size-4.5 text-primary" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-1">
        <p className="w-full text-xs font-normal text-muted-foreground">{question}</p>
        <p className="w-full text-sm font-normal text-foreground">{answer}</p>
      </div>
    </div>
  );
}

/** Figma "Advisor - Review answers (Light)" — 995:11572. */
export function ReviewAnswersScreen() {
  const t = useTranslations("screening");
  const c = useTranslations("common");

  return (
    // No desktop frame was drawn for this flow, so it follows the rule the
    // drawn ones set: the canvas opens up and the blocks hold a readable
    // column rather than a 448px strip stranded on a 1440 page.
    <MobileScreen wide>
      <ScreenTopBar href="/screening/requests" label={c("back")} />
      <ScreenBody className="lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]">
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("reviewSubtitle")}
          title={t("reviewTitle")}
        />

        {/* Figma "Info Card": each screening question with the advisee's answer.
            The answer is the reason this screen exists, so it stops being a 12px
            grey line under the question and becomes the row's body copy — read
            at the same size as the question, in the foreground ink. */}
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            <AnswerRow answer={t("a1")} question={t("q1")} />
            <AnswerRow answer={t("a2")} question={t("q2")} />
            <AnswerRow answer={t("a3")} question={t("q3")} />
          </Card>
        </div>

        <FootNote icon={ShieldCheck}>{t("reviewNote")}</FootNote>

        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/screening/requests">{t("accept")}</PrimaryButton>
          <NeutralButton href="/screening/requests">{t("decline")}</NeutralButton>
        </ScreenActions>
      </ScreenBody>
    </MobileScreen>
  );
}
