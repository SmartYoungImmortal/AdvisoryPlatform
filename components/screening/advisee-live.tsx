"use client";

import {
  BookOpen,
  Check,
  CircleCheckBig,
  Clock,
  Hourglass,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { liveServiceHref } from "@/components/bookings/booking-flow";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import {
  ScreeningErrorNotice,
  ScreeningLoading,
} from "@/components/screening/live-parts";
import { DetailRow, StatusHero } from "@/components/screening/parts";
import {
  adviseeScreeningPath,
  getServiceScreening,
  SCREENING_ANSWER_MAX_LENGTH,
  screeningErrorKey,
  screeningKeys,
  submitScreeningAnswers,
  type ApiServiceScreening,
  type ScreeningErrorKey,
} from "@/components/screening/screening-data";
import { getAdvisor, getService } from "@/lib/api/resources";
import { invalidate, useResource } from "@/lib/api/use-resource";

/**
 * The advisee's screening screens, read from and written to the API. Same frames
 * as `advisee-screens.tsx` — that file stays the fixture the `/screens` index
 * shows — with the advisor, the service and the questions taken from the
 * service in `?serviceId=`.
 *
 * Which of the four screens is right is the request's own state, so each one
 * sends the reader to the right one if they land on another (a stale link, the
 * back button after the advisor decided).
 */

const COLUMN = "lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]";

interface ScreeningContext {
  readonly screening: ApiServiceScreening;
  readonly serviceName: string;
  readonly advisorName: string;
}

/** The screening state plus the two names the copy needs, in one cached read. */
function useScreeningContext(serviceId: string) {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<ScreeningContext> => {
      const [screening, service] = await Promise.all([
        getServiceScreening(serviceId, signal),
        getService(serviceId, signal),
      ]);
      let advisorName = "";
      try {
        advisorName = (await getAdvisor(service.advisorId, signal)).displayName;
      } catch {
        // An advisor who is not discoverable has no public name; the copy reads
        // without one rather than the screen failing.
      }
      return { screening, serviceName: service.name, advisorName };
    },
    [serviceId],
  );
  return useResource(screeningKeys.service(serviceId), fetcher);
}

/** Replaces the URL when the request belongs on a different screen. */
function useScreeningRedirect(
  serviceId: string,
  context: ScreeningContext | undefined,
  allowAnswering = false,
) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!context) return;
    const status = context.screening.request?.status;
    // The questions screen is where a declined or expired advisee applies again.
    if (allowAnswering && status !== "PENDING" && status !== "ACCEPTED") return;
    const target = adviseeScreeningPath(serviceId, context.screening.request);
    if (!target.startsWith(`${pathname.replace(/\/$/, "")}?`)) {
      router.replace(target);
    }
  }, [allowAnswering, context, pathname, router, serviceId]);
}

/* ---------------------------------------------------------------- questions */

/** Figma "Advisee - Screening questions (Light)" — 995:11631. */
export function LiveScreeningQuestions({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const router = useRouter();
  const context = useScreeningContext(serviceId);
  useScreeningRedirect(serviceId, context.data, true);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<ScreeningErrorKey | null>(null);

  const questions = context.data?.screening.questions ?? [];
  const missingRequired = questions.some(
    (question) => question.isRequired && !answers[question.id]?.trim(),
  );

  const submit = async () => {
    setSending(true);
    setFailure(null);
    try {
      await submitScreeningAnswers(
        serviceId,
        questions
          .filter((question) => answers[question.id]?.trim())
          .map((question) => ({
            questionId: question.id,
            answer: answers[question.id].trim(),
          })),
      );
      invalidate(screeningKeys.service(serviceId));
      router.push(`/screening/submitted?serviceId=${serviceId}`);
    } catch (cause) {
      setFailure(
        screeningErrorKey(cause, {
          badRequest: "errorInvalidAnswers",
          conflict: "errorAlreadyPending",
        }),
      );
      setSending(false);
    }
  };

  let body;
  if (context.loading) {
    body = <ScreeningLoading />;
  } else if (context.error || !context.data) {
    body = (
      <ScreeningErrorNotice
        errorKey={screeningErrorKey(context.error)}
        onRetry={context.reload}
      />
    );
  } else if (!context.data.screening.screeningRequired || questions.length === 0) {
    // A service that screens but has no questions yet (just created, say): keep the
    // screen's title so the reader knows where they are, then say why there is no form.
    body = (
      <>
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2">
          <h1 className="w-full text-heading font-semibold text-foreground">
            {t("answerTitle")}
          </h1>
        </div>
        <ScreeningErrorNotice errorKey="errorNotAvailable" />
      </>
    );
  } else {
    body = (
      <>
        {/* Figma "Stage Header": 8px top padding, 10px gap, 20px subtitle. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 pt-2">
          <h1 className="w-full text-heading font-semibold text-foreground">
            {t("answerTitle")}
          </h1>
          <p className="w-full text-sm font-normal text-muted-foreground">
            {t("answerSubtitleLive", {
              name: context.data.advisorName,
              count: questions.length,
            })}
          </p>
        </div>

        {/* Figma "Form Fields": 8px top padding, 16px between rows. Every answer
            is a textarea: the API has no short/long question type, and an answer
            may run to 1,000 characters. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-2">
          {questions.map((question, index) => {
            const id = `screen-${question.id}`;
            return (
              <div className="flex w-full shrink-0 flex-col items-start gap-1.5" key={question.id}>
                <label className="w-full text-sm font-medium text-foreground" htmlFor={id}>
                  {t("answerLabelLive", { number: index + 1, question: question.question })}
                  {question.isRequired ? null : (
                    <span className="font-normal text-muted-foreground"> {t("optionalSuffix")}</span>
                  )}
                </label>
                <Textarea
                  className="h-21 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
                  disabled={sending}
                  id={id}
                  maxLength={SCREENING_ANSWER_MAX_LENGTH}
                  onChange={(event) =>
                    setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))
                  }
                  placeholder={t("answerPlaceholder")}
                  required={question.isRequired}
                  value={answers[question.id] ?? ""}
                />
              </div>
            );
          })}
        </div>

        {failure ? <ScreeningErrorNotice errorKey={failure} /> : null}

        <ScreenSpacer />
        <div className="flex w-full shrink-0 flex-col items-center px-6 pb-2">
          <PrimaryButton disabled={sending || missingRequired} onClick={() => void submit()}>
            {t("submitAnswers")}
          </PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href={liveServiceHref(serviceId)} label={c("back")} />
      <ScreenBody className={COLUMN}>{body}</ScreenBody>
    </MobileScreen>
  );
}

/* ----------------------------------------------------------------- outcomes */

/**
 * Figma "Advisee - Screening submitted / accepted / declined (Light)" —
 * 995:11668, 995:11708, 995:11750 — one component, because which of the three
 * is the request's state.
 */
export function LiveScreeningOutcome({
  serviceId,
  outcome,
}: {
  readonly serviceId: string;
  readonly outcome: "submitted" | "accepted" | "declined";
}) {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const context = useScreeningContext(serviceId);
  useScreeningRedirect(serviceId, context.data);

  let body;
  if (context.loading) {
    body = <ScreeningLoading />;
  } else if (context.error || !context.data) {
    body = (
      <ScreeningErrorNotice
        errorKey={screeningErrorKey(context.error)}
        onRetry={context.reload}
      />
    );
  } else if (outcome === "submitted") {
    body = (
      <>
        <StatusHero
          badgeClassName="bg-primary/10"
          icon={Hourglass}
          iconClassName="text-primary"
          subtitle={t("submittedSubtitleLive", { name: context.data.advisorName })}
          title={t("submittedTitle")}
        />
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <Surface className="flex w-full shrink-0 flex-col items-start gap-3 p-3.5">
            <DetailRow
              icon={Check}
              label={t("step1")}
              value={<StatusPill tone="success">{t("done")}</StatusPill>}
            />
            <DetailRow
              icon={Check}
              label={t("step2")}
              value={<StatusPill tone="success">{t("done")}</StatusPill>}
            />
            <DetailRow
              icon={Hourglass}
              label={t("step3")}
              value={
                <StatusPill icon={Hourglass} tone="info">
                  {t("waiting")}
                </StatusPill>
              }
            />
          </Surface>
        </div>
        <ScreenSpacer />
        <ScreenActions className="gap-3.5">
          <PrimaryButton href="/">{t("backHome")}</PrimaryButton>
          <p className="w-full text-center text-sm font-normal text-muted-foreground">
            {t("browseOthers")}
          </p>
        </ScreenActions>
      </>
    );
  } else if (outcome === "accepted") {
    // The free-trial row and button wait for the Trial flow (decided 2026-10-03);
    // until then the one way forward is choosing a paid time on the service.
    body = (
      <>
        <StatusHero
          badgeClassName="bg-success-surface"
          icon={CircleCheckBig}
          iconClassName="text-foreground"
          subtitle={t("acceptedSubtitleLive", { name: context.data.advisorName })}
          title={t("acceptedTitle")}
        />
        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
          <Surface className="flex w-full shrink-0 flex-col items-start gap-3 p-3.5">
            <DetailRow icon={UserRound} label={t("advisorLabel")} value={context.data.advisorName} />
            <DetailRow icon={BookOpen} label={t("topicLabel")} value={context.data.serviceName} />
          </Surface>
        </div>
        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href={liveServiceHref(serviceId)}>{t("bookFull")}</PrimaryButton>
        </ScreenActions>
      </>
    );
  } else {
    const message = context.data.screening.request?.decisionReason;
    body = (
      <>
        <StatusHero
          icon={Clock}
          subtitle={t("declinedSubtitle")}
          title={t("declinedTitle")}
        />
        {/* Figma "Advisor Note" — only when the advisor wrote one (decided
            2026-10-03: the decline message is optional). */}
        {message ? (
          <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
            <Surface className="flex w-full shrink-0 items-start gap-3 p-3.5" tier="well">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
                <MessageSquare aria-hidden className="size-4.5 text-muted-foreground" />
              </span>
              <div className="flex min-w-px flex-1 flex-col items-start gap-1">
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("advisorMessageLabel")}
                </p>
                <p className="w-full text-sm font-normal whitespace-pre-line text-foreground">
                  {message}
                </p>
              </div>
            </Surface>
          </div>
        ) : null}
        <ScreenSpacer />
        <ScreenActions>
          <PrimaryButton href="/search">{t("findOthers")}</PrimaryButton>
          <NeutralButton href="/">{t("backHome")}</NeutralButton>
        </ScreenActions>
      </>
    );
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href={liveServiceHref(serviceId)} label={c("back")} />
      <ScreenBody className={COLUMN}>{body}</ScreenBody>
    </MobileScreen>
  );
}
