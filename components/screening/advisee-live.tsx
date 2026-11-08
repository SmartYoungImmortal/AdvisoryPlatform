"use client";

import {
  Check,
  ChevronLeft,
  CircleCheckBig,
  Clock,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { liveServiceHref } from "@/components/bookings/booking-flow";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { PILL_LG, SHEET_W } from "@/components/payment/invoice-screens";
import { PaidFrame } from "@/components/payment/payment-result-screens";
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
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DESK_BONE } from "@/components/work/desk-parts";
import { getAdvisor, getService } from "@/lib/api/resources";
import type { ApiPublicAdvisor } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The advisee's screening pages, connected to the API: the questions to answer
 * before booking a service, then where the request stands (sent, accepted or
 * declined). The service comes from `?serviceId=`.
 *
 * They use the paid booking page's layout (`PaidFrame`): the account frame, and
 * from `lg` the page's words and buttons on the left with a card on the right,
 * here the advisor and the request's steps. A phone reads it top to bottom.
 *
 * Each page checks the request's current status and redirects to the right
 * page if needed, for example after an old link or pressing back once the
 * advisor has decided.
 */

interface ScreeningContext {
  readonly screening: ApiServiceScreening;
  readonly serviceName: string;
  /** Null when the advisor's profile is not public. */
  readonly advisor: ApiPublicAdvisor | null;
}

/** Loads the screening data, the service and its advisor, in one cached request. */
function useScreeningContext(serviceId: string) {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<ScreeningContext> => {
      const [screening, service] = await Promise.all([
        getServiceScreening(serviceId, signal),
        getService(serviceId, signal),
      ]);
      let advisor: ApiPublicAdvisor | null = null;
      try {
        advisor = await getAdvisor(service.advisorId, signal);
      } catch {
        // If the advisor's profile is not public there is no name; show the page
        // without it instead of failing.
      }
      return { screening, serviceName: service.name, advisor };
    },
    [serviceId],
  );
  return useResource(screeningKeys.service(serviceId), fetcher);
}

/** Redirects to the page that matches the request's status. */
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
    // A declined or expired request can be answered again on the questions page.
    if (allowAnswering && status !== "PENDING" && status !== "ACCEPTED") return;
    const target = adviseeScreeningPath(serviceId, context.screening.request);
    if (!target.startsWith(`${pathname.replace(/\/$/, "")}?`)) {
      router.replace(target);
    }
  }, [allowAnswering, context, pathname, router, serviceId]);
}

/* ------------------------------------------------------------------- pieces */

/**
 * The left column's head: an optional mark, the title, and the lines under it.
 * Centred on a phone like the paid booking page's, except a form's (`back`),
 * which reads from the left with the way back above its title.
 */
function Head({
  mark,
  back,
  title,
  children,
}: {
  readonly mark?: { readonly icon: LucideIcon; readonly tone: string };
  readonly back?: ReactNode;
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col lg:items-start lg:self-end lg:text-left",
        back ? "items-start" : "items-center text-center",
      )}
    >
      {back}
      {mark ? (
        <span className={cn("mb-4 flex size-14 items-center justify-center rounded-full lg:mb-6 lg:size-20", mark.tone)}>
          <mark.icon aria-hidden className="size-7 lg:size-10" strokeWidth={2} />
        </span>
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-hero-ink lg:text-frame-title">{title}</h1>
      {children}
    </header>
  );
}

/** The left column's second row: what to do next, under the head. */
function Next({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 lg:max-w-110 lg:self-start lg:gap-3">{children}</div>;
}

/** A capsule to another page: black for the way on, outlined for the quieter one. */
function PillLink({ href, primary, children }: { readonly href: string; readonly primary?: boolean; readonly children: ReactNode }) {
  return (
    <Button
      className={cn(authPill(primary ?? false), "md:h-11 md:text-sm", PILL_LG)}
      nativeButton={false}
      render={<Link href={href} />}
      variant={primary ? "default" : "outline"}
    >
      {children}
    </Button>
  );
}

type StepState = "done" | "waiting" | "accepted" | "declined";

/**
 * The card on the right: who the request is with and for which service, and,
 * once it is sent, its three steps with where the last one stands.
 */
function RequestCard({
  context,
  last,
}: {
  readonly context: ScreeningContext;
  /** The advisor's step; leave it out before anything is sent. */
  readonly last?: Exclude<StepState, "done">;
}) {
  const t = useTranslations("screening");
  const name = context.advisor?.displayName ?? "";
  const steps: readonly { readonly label: string; readonly state: StepState }[] = last
    ? [
        { label: t("step1"), state: "done" },
        { label: t("step2"), state: "done" },
        // Once the advisor has decided, the last step says they replied, not that they are still reviewing.
        { label: last === "waiting" ? t("step3") : t("step3Replied"), state: last },
      ]
    : [];
  const word: Record<StepState, { readonly text: string; readonly ink: string; readonly icon: LucideIcon }> = {
    done: { text: t("done"), ink: "text-success", icon: Check },
    waiting: { text: t("waiting"), ink: "text-warning", icon: Hourglass },
    accepted: { text: t("inboxAccepted"), ink: "text-success", icon: Check },
    declined: { text: t("inboxDeclined"), ink: "text-muted-foreground", icon: Clock },
  };

  return (
    <section
      aria-label={t("advisorLabel")}
      className={cn(
        "flex w-full flex-col rounded-card border border-hero-card-border bg-card p-5 shadow-hero-card lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:p-8",
        // Beside a status, the card sits in the middle of the head and the buttons;
        // beside the questions it stays at the top instead of growing as tall as the form.
        last ? "lg:self-center" : "lg:self-start",
        SHEET_W,
      )}
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <PersonAvatar advisor={context.advisor} known size={48} />
        <div className="flex min-w-0 flex-col">
          <p className="text-xs text-muted-foreground lg:text-frame-label">{t("advisorLabel")}</p>
          <p className="truncate text-base font-semibold text-foreground lg:text-frame-body">{name}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-4 lg:mt-6 lg:pt-6">
        <p className="text-xs text-muted-foreground lg:text-frame-label">{t("topicLabel")}</p>
        <p className="text-sm break-words text-foreground lg:text-frame-body">{context.serviceName}</p>
      </div>
      {steps.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:mt-6 lg:gap-4 lg:pt-6">
          {steps.map((step) => {
            const shown = word[step.state];
            return (
              <li className="flex items-center gap-3 text-sm lg:text-frame-meta" key={step.label}>
                <shown.icon aria-hidden className={cn("size-4 shrink-0 lg:size-5", shown.ink)} />
                <span className="min-w-0 flex-1 text-foreground">{step.label}</span>
                <span className={cn("shrink-0 font-medium", shown.ink)}>{shown.text}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

/** A page's own shape while its data loads: the head, the card, the two capsules. */
function ScreeningSkeleton({ mark }: { readonly mark: boolean }) {
  const t = useTranslations("screening");
  return (
    <PaidFrame busy>
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden className="flex flex-col items-center gap-3 lg:items-start lg:self-end lg:gap-4">
        {mark ? <span className={cn(DESK_BONE, "size-14 rounded-full lg:size-20")} /> : null}
        <span className={cn(DESK_BONE, "h-8 w-48 rounded-md lg:h-12 lg:w-80")} />
        <span className={cn(DESK_BONE, "h-4 w-64 rounded-md lg:h-5 lg:w-96")} />
      </div>
      <div
        aria-hidden
        className={cn("h-64 w-full rounded-card border border-hero-card-border lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-96", SHEET_W)}
      />
      <div aria-hidden className="flex flex-col gap-2.5 lg:max-w-110 lg:self-start lg:gap-3">
        <span className={cn(DESK_BONE, "h-12 w-full rounded-full lg:h-14")} />
        <span className={cn(DESK_BONE, "h-12 w-full rounded-full lg:h-14")} />
      </div>
    </PaidFrame>
  );
}

/** The data could not be read: the API's card with a retry, across both columns. */
function LoadFailed({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  const e = useTranslations("errorStates");
  return (
    <PaidFrame>
      <ApiErrorCard className="lg:col-span-2" error={error} onRetry={onRetry} title={e("serverTitle")} />
    </PaidFrame>
  );
}

/* ---------------------------------------------------------------- questions */

/**
 * `/screening/questions?serviceId=`: the service's questions to answer before
 * booking it. Without a service (an old or hand-typed link) there is nothing
 * to answer, and the page says it was not found.
 */
export function LiveScreeningQuestions({ serviceId }: { readonly serviceId: string | undefined }) {
  const e = useTranslations("errorStates");
  const t = useTranslations("screening");
  if (serviceId) return <QuestionsForm key={serviceId} serviceId={serviceId} />;
  return (
    <PaidFrame>
      <Head title={e("notFoundTitle")}>
        <p className="mt-2 text-sm text-muted-foreground lg:mt-3 lg:text-frame-body">{e("notFoundBody")}</p>
      </Head>
      <Next>
        <PillLink href="/search" primary>
          {t("findOthers")}
        </PillLink>
      </Next>
    </PaidFrame>
  );
}

/** The questions page while its address is read, before it knows which service it is for. */
export function ScreeningQuestionsLoading() {
  return <ScreeningSkeleton mark={false} />;
}

/** A small link back to the service, above the title. */
function BackToService({ serviceId }: { readonly serviceId: string }) {
  const c = useTranslations("common");
  return (
    <Link
      className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground lg:mb-6 lg:text-frame-meta"
      href={liveServiceHref(serviceId)}
    >
      <ChevronLeft aria-hidden className="size-4 lg:size-5" />
      {c("back")}
    </Link>
  );
}

function QuestionsForm({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("screening");
  const router = useRouter();
  const context = useScreeningContext(serviceId);
  useScreeningRedirect(serviceId, context.data, true);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<ScreeningErrorKey | null>(null);

  if (context.loading) return <ScreeningSkeleton mark={false} />;
  if (context.error || !context.data) {
    return <LoadFailed error={context.error ?? new Error(t("errorNotAvailable"))} onRetry={context.reload} />;
  }

  const data = context.data;
  const questions = data.screening.questions;
  const missingRequired = questions.some((question) => question.isRequired && !answers[question.id]?.trim());

  const submit = async () => {
    setSending(true);
    setFailure(null);
    try {
      await submitScreeningAnswers(
        serviceId,
        questions
          .filter((question) => answers[question.id]?.trim())
          .map((question) => ({ questionId: question.id, answer: answers[question.id].trim() })),
      );
      invalidate(screeningKeys.service(serviceId));
      router.push(`/screening/submitted?serviceId=${serviceId}`);
    } catch (cause) {
      setFailure(screeningErrorKey(cause, { badRequest: "errorInvalidAnswers", conflict: "errorAlreadyPending" }));
      setSending(false);
    }
  };

  // The service needs screening but has no questions yet (for example, it was
  // just created): keep the title so the reader knows where they are, and say why.
  const open = data.screening.screeningRequired && questions.length > 0;

  return (
    <PaidFrame>
      <Head back={<BackToService serviceId={serviceId} />} title={t("answerTitle")}>
        <p className="mt-2 text-sm text-muted-foreground lg:mt-3 lg:text-frame-body">
          {open
            ? t("answerSubtitleLive", { name: data.advisor?.displayName ?? "", count: questions.length })
            : t("errorNotAvailable")}
        </p>
      </Head>
      <RequestCard context={data} />
      <div className="flex flex-col lg:max-w-160 lg:self-start">
        {open ? (
          <form
            className="flex flex-col gap-5 lg:gap-7"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {questions.map((question, index) => {
              const id = `screen-${question.id}`;
              return (
                <div className="flex flex-col gap-2" key={question.id}>
                  <label className="text-sm font-medium text-foreground lg:text-frame-body" htmlFor={id}>
                    {t("answerLabelLive", { number: index + 1, question: question.question })}
                    {question.isRequired ? null : (
                      <span className="font-normal text-muted-foreground"> {t("optionalSuffix")}</span>
                    )}
                  </label>
                  {/* 16px text so an iPhone does not zoom in on the field. */}
                  <Textarea
                    className="min-h-24 resize-none rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none field-sizing-content md:text-base lg:min-h-32 lg:px-5 lg:py-4 lg:text-frame-body"
                    disabled={sending}
                    id={id}
                    maxLength={SCREENING_ANSWER_MAX_LENGTH}
                    onChange={(event) => setAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
                    placeholder={t("answerPlaceholder")}
                    required={question.isRequired}
                    value={answers[question.id] ?? ""}
                  />
                </div>
              );
            })}
            {failure ? (
              <p className="text-sm text-destructive lg:text-frame-meta" role="alert">
                {t(failure === "offline" || failure === "notFound" || failure === "server" ? "errorNotAvailable" : failure)}
              </p>
            ) : null}
            <Button
              aria-busy={sending || undefined}
              className={cn(authPill(true), "md:h-11 md:text-sm lg:self-start", PILL_LG)}
              disabled={sending || missingRequired}
              type="submit"
            >
              {t("submitAnswers")}
            </Button>
          </form>
        ) : null}
      </div>
    </PaidFrame>
  );
}

/* ----------------------------------------------------------------- outcomes */

/**
 * `/screening/submitted`, `/accepted` and `/declined` (`?serviceId=`): where
 * the request stands. One component shows the right one for the request's
 * status; the card on the right has the advisor and the request's steps.
 */
export function LiveScreeningOutcome({
  serviceId,
  outcome,
}: {
  readonly serviceId: string;
  readonly outcome: "submitted" | "accepted" | "declined";
}) {
  const t = useTranslations("screening");
  const context = useScreeningContext(serviceId);
  useScreeningRedirect(serviceId, context.data);

  if (context.loading) return <ScreeningSkeleton mark />;
  if (context.error || !context.data) {
    return <LoadFailed error={context.error ?? new Error(t("errorNotAvailable"))} onRetry={context.reload} />;
  }

  const data = context.data;
  const name = data.advisor?.displayName ?? "";
  const lead = "mt-2 text-sm text-muted-foreground lg:mt-3 lg:text-frame-body";

  if (outcome === "submitted") {
    return (
      <PaidFrame>
        <Head mark={{ icon: Hourglass, tone: "bg-warning/10 text-warning" }} title={t("submittedTitle")}>
          <p className={lead}>{t("submittedSubtitleLive", { name })}</p>
        </Head>
        <RequestCard context={data} last="waiting" />
        <Next>
          <PillLink href="/search" primary>
            {t("findOthers")}
          </PillLink>
          <PillLink href="/">{t("backHome")}</PillLink>
        </Next>
      </PaidFrame>
    );
  }

  if (outcome === "accepted") {
    // The free-trial button comes later with the Trial flow. For now the only
    // next step is booking a paid time on the service.
    return (
      <PaidFrame>
        <Head mark={{ icon: CircleCheckBig, tone: "bg-success/10 text-success" }} title={t("acceptedTitle")}>
          <p className={lead}>{t("acceptedSubtitleLive", { name })}</p>
        </Head>
        <RequestCard context={data} last="accepted" />
        <Next>
          <PillLink href={liveServiceHref(serviceId)} primary>
            {t("bookFull")}
          </PillLink>
          <PillLink href="/">{t("backHome")}</PillLink>
        </Next>
      </PaidFrame>
    );
  }

  // The advisor's decline message is optional; it is shown only when there is one.
  const message = data.screening.request?.decisionReason;
  return (
    <PaidFrame>
      <Head mark={{ icon: Clock, tone: "bg-muted text-muted-foreground" }} title={t("declinedTitle")}>
        <p className={lead}>{t("declinedSubtitle")}</p>
        {message ? (
          <blockquote className="mt-5 w-full border-l-2 border-border pl-4 text-left lg:mt-6 lg:pl-5">
            <p className="text-xs text-muted-foreground lg:text-frame-label">{t("advisorMessageLabel")}</p>
            <p className="mt-1 text-sm break-words whitespace-pre-wrap text-foreground lg:text-frame-body">{message}</p>
          </blockquote>
        ) : null}
      </Head>
      <RequestCard context={data} last="declined" />
      <Next>
        <PillLink href="/search" primary>
          {t("findOthers")}
        </PillLink>
        <PillLink href="/">{t("backHome")}</PillLink>
      </Next>
    </PaidFrame>
  );
}
