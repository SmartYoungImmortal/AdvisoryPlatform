"use client";

import { CircleHelp, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { EntryDialog } from "@/components/advisor/edit-fields";
import { authPill } from "@/components/auth/auth-split";
import { useMountTime } from "@/components/bookings/booking-flow";
import { DeclineScreeningDialog } from "@/components/screening/decline-dialog";
import {
  BoneLine,
  useScreeningDecision,
  useScreeningRequest,
  useShortFailure,
} from "@/components/screening/inbox-parts";
import { ScreeningErrorNotice, useSentLabel } from "@/components/screening/live-parts";
import {
  listScreeningQuestions,
  listScreeningRequests,
  replaceScreeningQuestions,
  SCREENING_MAX_QUESTIONS,
  SCREENING_QUESTION_MAX_LENGTH,
  screeningErrorKey,
  screeningKeys,
  type ApiScreeningQuestion,
  type ScreeningStatus,
} from "@/components/screening/screening-data";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { DESK_BONE, DeskEmpty, DeskRow, DeskRowAction, DeskSection } from "@/components/work/desk-parts";
import {
  getMyAdvisorService,
  listMyAdvisorServices,
  type AdvisorService,
  type AdvisorServicesPage,
} from "@/lib/advisor-services/api";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The advisor's screening pages, on the desk's frame and the API: the
 * requests (a place of the desk, the inbox in `inbox-screen.tsx`), one
 * request's answers with the way to accept or decline it, and the questions
 * a service asks before it can be booked.
 */

/* ----------------------------------------------------------------- requests */

/** `/screening/requests`: the list beside the open request from `lg`, the list alone on a phone. */
export { LiveScreeningRequests } from "@/components/screening/inbox-screen";

/* ------------------------------------------------------------------- review */

/** A request's standing: the ink and dot its word wears, as the session page marks a booking's. */
const STANDING: Record<ScreeningStatus, { readonly ink: string; readonly dot: string }> = {
  PENDING: { ink: "text-warning", dot: "bg-warning" },
  ACCEPTED: { ink: "text-success", dot: "bg-success" },
  DECLINED: { ink: "text-destructive", dot: "bg-destructive" },
  EXPIRED: { ink: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

/** A part of the review page: its name small and grey, then what it holds — the session page's. */
function Part({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 lg:gap-4">
      <h2 className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{title}</h2>
      {children}
    </section>
  );
}

/**
 * `/screening/review?requestId=`: one request's answers, on the desk's frame
 * under the requests — first who sent it, large, with where it stands, the
 * service and when it came, and while it waits the two answers to it; then
 * each question with what they wrote, on hairlines, and once declined the
 * message that went with it. `declining` is
 * `/screening/review/decline`: the decline popup open over the page.
 */
export function LiveReviewAnswers({
  requestId,
  declining = false,
}: {
  readonly requestId: string | undefined;
  readonly declining?: boolean;
}) {
  const t = useTranslations("screening");
  if (!requestId) {
    return (
      <DeskPage backHref="/screening/requests" title={t("reviewPageTitle")}>
        <p className="mt-5 text-sm text-muted-foreground lg:mt-8 lg:text-frame-meta" role="alert">
          {t("missingRequest")}
        </p>
      </DeskPage>
    );
  }
  return <ReviewView declining={declining} key={requestId} requestId={requestId} />;
}

/** The review page while its address is read: the frame with the page's own skeleton. */
export function ReviewAnswersLoading() {
  const t = useTranslations("screening");
  return (
    <DeskPage backHref="/screening/requests" title={t("reviewPageTitle")}>
      <ReviewSkeleton />
    </DeskPage>
  );
}

function ReviewView({ requestId, declining }: { readonly requestId: string; readonly declining: boolean }) {
  const t = useTranslations("screening");
  const router = useRouter();
  const now = useMountTime();
  const sent = useSentLabel(now);
  const short = useShortFailure();
  const request = useScreeningRequest(requestId);

  // Opening the request marks it as viewed, so the cached list is now out of
  // date. Only the list (its key and the language suffix `useResource` adds):
  // this request's own entry stays, so the decline route opens over it
  // without reading it again.
  const loaded = request.data !== undefined;
  useEffect(() => {
    if (loaded) invalidate(`${screeningKeys.requests}#`);
  }, [loaded]);

  const { busy, failure, accept, decline } = useScreeningDecision(requestId, {
    onDecided: () => {
      invalidate(screeningKeys.requests);
      // The desk menu's count of requests still waiting.
      invalidate("advisors/me/screening-requests");
      router.push("/screening/requests");
    },
  });

  let body;
  if (request.loading) {
    body = <ReviewSkeleton />;
  } else if (request.error || !request.data) {
    body = (
      <div className="mt-5 lg:mt-8">
        <ScreeningErrorNotice errorKey={screeningErrorKey(request.error)} onRetry={request.reload} />
      </div>
    );
  } else {
    const data = request.data;
    const pending = data.status === "PENDING";
    const standing = STANDING[data.status];
    const standingLabel = {
      PENDING: t("pending"),
      ACCEPTED: t("req4Body"),
      DECLINED: t("req5Body"),
      EXPIRED: t("statusExpired"),
    }[data.status];
    const reviewHref = `/screening/review?requestId=${requestId}`;
    const declineHref = `/screening/review/decline?requestId=${requestId}`;

    body = (
      <div className="mt-5 flex w-full max-w-220 flex-col gap-8 lg:mt-8 lg:gap-10">
        {/* Who, where it stands, and the two answers: the reason to open this page. */}
        <section className="flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-end md:justify-between lg:pb-10">
          <div className="flex min-w-0 flex-col gap-2">
            <span className={cn("inline-flex w-fit items-center gap-2 text-sm font-medium lg:text-frame-meta", standing.ink)}>
              <span aria-hidden className={cn("size-2 rounded-full", standing.dot)} />
              {standingLabel}
            </span>
            <p className="font-hero text-title-compact tracking-tight break-words text-hero-ink lg:text-frame-title">
              {data.adviseeDisplayName}
            </p>
            <p className="text-base text-foreground lg:text-frame-body">
              {data.serviceName} <span className="text-muted-foreground">· {sent(data.createdAt)}</span>
            </p>
          </div>
          {pending ? (
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  className={cn(authPill(false), DESK_PILL)}
                  disabled={busy}
                  nativeButton={busy}
                  render={busy ? undefined : <Link href={declineHref} />}
                  variant="outline"
                >
                  {t("decline")}
                </Button>
                <Button
                  aria-busy={busy || undefined}
                  className={cn(authPill(true), DESK_PILL)}
                  disabled={busy}
                  onClick={() => void accept()}
                  type="button"
                >
                  {busy && !declining ? t("accepting") : t("accept")}
                </Button>
              </div>
              {failure && !declining ? (
                <p className="text-sm text-destructive lg:text-frame-meta" role="alert">
                  {short(failure.key)}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <Part title={t("answersTitle")}>
          {data.answers.length > 0 ? (
            <dl className="flex flex-col divide-y divide-border">
              {data.answers.map((answer) => (
                <div className="flex min-w-0 flex-col gap-1.5 py-4 first:pt-1 lg:py-5" key={answer.questionId}>
                  <dt className="text-sm text-muted-foreground lg:text-frame-meta">{answer.questionText}</dt>
                  <dd className="text-base break-words whitespace-pre-wrap text-foreground lg:text-frame-body">{answer.answer}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("answersEmpty")}</p>
          )}
        </Part>

        {data.status === "DECLINED" && data.decisionReason ? (
          <Part title={t("declineReasonTitle")}>
            <p className="text-base break-words whitespace-pre-wrap text-foreground lg:text-frame-body">{data.decisionReason}</p>
          </Part>
        ) : null}

        {declining && pending ? (
          <DeclineScreeningDialog
            busy={busy}
            cancelHref={reviewHref}
            error={failure ? short(failure.key) : null}
            name={data.adviseeDisplayName}
            onConfirm={(message) => void decline(message)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <DeskPage backHref="/screening/requests" title={t("reviewPageTitle")}>
      {body}
    </DeskPage>
  );
}

/**
 * The review page's own shape while the request is read, line for line: the
 * standing, the name at the hero's step and the service's line, the two
 * answers' capsules (most requests opened are still waiting), then the
 * answers' part with three questions on hairlines.
 */
function ReviewSkeleton() {
  const w = useTranslations("workDesk");
  return (
    <div aria-busy className="mt-5 flex w-full max-w-220 flex-col gap-8 lg:mt-8 lg:gap-10">
      <span className="sr-only">{w("loading")}</span>
      <div aria-hidden className="flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-end md:justify-between lg:pb-10">
        <div className="flex min-w-0 flex-col gap-2">
          <BoneLine bone="h-3.5 w-20 lg:h-4 lg:w-24" text="text-sm lg:text-frame-meta" />
          <BoneLine bone="h-6 w-44 lg:h-9 lg:w-72" text="font-hero text-title-compact lg:text-frame-title" />
          <BoneLine bone="h-4 w-56 lg:h-4.5 lg:w-80" text="text-base lg:text-frame-body" />
        </div>
        <div className="flex gap-2">
          <span className={cn(DESK_BONE, "h-10 w-24 rounded-full lg:h-12 lg:w-28")} />
          <span className={cn(DESK_BONE, "h-10 w-28 rounded-full lg:h-12 lg:w-32")} />
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-3 lg:gap-4">
        <BoneLine bone="h-3.5 w-14 lg:h-4 lg:w-16" text="text-sm lg:text-frame-meta" />
        <div className="flex flex-col divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div className="flex flex-col gap-1.5 py-4 first:pt-1 lg:py-5" key={row}>
              <BoneLine bone="h-3.5 w-2/5 lg:h-4" text="text-sm lg:text-frame-meta" />
              <BoneLine bone="h-4 w-3/4 lg:h-4.5" text="text-base lg:text-frame-body" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- setup */

type QuestionInput = { readonly question: string; readonly isRequired: boolean };

const toInput = (question: ApiScreeningQuestion): QuestionInput => ({
  question: question.question,
  isRequired: question.isRequired,
});

/** The services list's own key, so the two pages share one read. */
const SERVICES_KEY = "advisors/me/services?page=1&limit=100";

/**
 * `/screening/setup`: the questions a service asks before it can be booked,
 * on the desk's frame under the services. With `?serviceId=` it is that
 * service's questions (`QuestionsEditor`); without one — the link from a
 * service's booking rules, or the page opened on its own — it is the
 * advisor's services, the screened ones first, each the way into its own.
 */
export function LiveScreeningSetup({ serviceId }: { readonly serviceId: string | undefined }) {
  return serviceId ? <QuestionsEditor key={serviceId} serviceId={serviceId} /> : <ServicePicker />;
}

/** The setup page while its address is read: the frame with the rows' skeleton. */
export function ScreeningSetupLoading() {
  const t = useTranslations("screening");
  return (
    <DeskPage backHref="/advisor/services" title={t("setupTitle")}>
      <SetupSkeleton hint />
    </DeskPage>
  );
}

/** The advisor's services as the settings page's rows: each its name, whether it screens, and the way to its questions. */
function ServicePicker() {
  const t = useTranslations("screening");
  const services = useResource<AdvisorServicesPage>(
    SERVICES_KEY,
    useCallback((signal: AbortSignal) => listMyAdvisorServices(signal), []),
  );

  let body;
  if (services.loading) {
    body = <SetupSkeleton hint={false} />;
  } else if (services.error || !services.data) {
    body = (
      <div className="mt-5 lg:mt-8">
        <ScreeningErrorNotice errorKey={screeningErrorKey(services.error)} onRetry={services.reload} />
      </div>
    );
  } else if (services.data.items.length === 0) {
    body = (
      <DeskEmpty
        action={{ label: t("setupCreateService"), href: "/advisor/services/new" }}
        body={t("setupNoServicesBody")}
        icon={Package}
        title={t("setupNoServicesTitle")}
      />
    );
  } else {
    // The ones that already screen first: those are the questions an advisor comes back to.
    const rows = services.data.items.toSorted((a, b) => Number(b.screeningRequired) - Number(a.screeningRequired));
    body = (
      <div className="flex w-full max-w-220 flex-col">
        <DeskSection className="mt-5 lg:mt-8" id="screening-services" title={t("setupServicesTitle")}>
          <ul className="flex flex-col">
            {rows.map((service) => (
              <DeskRow
                detail={service.screeningRequired ? t("screeningOn") : t("screeningOff")}
                key={service.id}
                label={<span className="break-words">{service.name}</span>}
              >
                <DeskRowAction href={`/screening/setup?serviceId=${encodeURIComponent(service.id)}`}>{t("setupOpen")}</DeskRowAction>
              </DeskRow>
            ))}
          </ul>
        </DeskSection>
      </div>
    );
  }

  return (
    <DeskPage backHref="/advisor/services" title={t("setupTitle")}>
      {body}
    </DeskPage>
  );
}

/**
 * One service's questions, laid out as the settings page is: the service's
 * name as the part's, how many it asks of five (and that it does not screen
 * yet, when it does not) under it, then a row for each question — its words,
 * whether it must be answered, and "แก้ไข" — with the way to add one in the
 * band. Each change opens in a popup and saves on its own: the API takes the
 * whole list at once (`PUT …/screening-questions`), so the popup sends the
 * list with that one change in it.
 */
function QuestionsEditor({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("screening");
  const service = useResource<AdvisorService>(
    `advisors/me/services/${serviceId}`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(serviceId, signal), [serviceId]),
  );
  const questions = useResource(
    screeningKeys.questions(serviceId),
    useCallback((signal: AbortSignal) => listScreeningQuestions(serviceId, signal), [serviceId]),
  );
  // Replacing the questions expires every acceptance for this service, so the
  // popup says how many people that sends back to answering again.
  const accepted = useResource(
    `${screeningKeys.requests}?status=ACCEPTED`,
    useCallback((signal: AbortSignal) => listScreeningRequests({ status: "ACCEPTED", limit: 100 }, signal), []),
  );
  const [stored, setStored] = useState<readonly ApiScreeningQuestion[] | null>(null);
  const [editing, setEditing] = useState<{ readonly index: number | null } | null>(null);

  // The list the last save answered stays while the page is open, and the
  // cache is dropped on leaving, so the next visit reads it fresh.
  useEffect(() => () => invalidate(screeningKeys.questions(serviceId)), [serviceId]);

  const list = stored ?? questions.data;
  const acceptedHere = (accepted.data?.items ?? []).filter((request) => request.serviceId === serviceId).length;
  const full = (list?.length ?? 0) >= SCREENING_MAX_QUESTIONS;

  const save = async (next: readonly QuestionInput[]) => {
    setStored(await replaceScreeningQuestions(serviceId, next));
    // The acceptances it expired: the requests' lists and the count above.
    invalidate(screeningKeys.requests);
    accepted.reload();
  };

  let body;
  if ((service.loading && !service.data) || (questions.loading && !list)) {
    body = <SetupSkeleton hint />;
  } else if (!service.data || !list) {
    body = (
      <div className="mt-5 lg:mt-8">
        <ScreeningErrorNotice
          errorKey={screeningErrorKey(service.error ?? questions.error)}
          onRetry={() => {
            service.reload();
            questions.reload();
          }}
        />
      </div>
    );
  } else {
    const count = t("setupCount", { count: list.length, max: SCREENING_MAX_QUESTIONS });
    body = (
      <div className="flex w-full max-w-220 flex-col">
        <DeskSection
          className="mt-5 lg:mt-8"
          hint={service.data.screeningRequired ? count : `${count} · ${t("screeningOff")}`}
          id="screening-questions"
          title={service.data.name}
        >
          {list.length === 0 ? (
            <DeskEmpty body={t("setupEmptyBody")} icon={CircleHelp} title={t("setupEmptyTitle")} />
          ) : (
            <ul className="flex flex-col">
              {list.map((question, index) => (
                <DeskRow
                  detail={question.isRequired ? t("required") : t("optional")}
                  key={question.id}
                  label={<span className="break-words">{t("answerLabelLive", { number: index + 1, question: question.question })}</span>}
                >
                  <DeskRowAction onClick={() => setEditing({ index })}>{t("editQuestion")}</DeskRowAction>
                </DeskRow>
              ))}
            </ul>
          )}
        </DeskSection>
      </div>
    );
  }

  return (
    <DeskPage
      action={
        <Button className={cn(authPill(true), DESK_PILL)} disabled={!list || full} onClick={() => setEditing({ index: null })} type="button">
          <Plus aria-hidden />
          {t("addQuestion")}
        </Button>
      }
      backHref={`/advisor/services/manage?serviceId=${encodeURIComponent(serviceId)}`}
      title={t("setupTitle")}
    >
      {body}
      {editing && list ? (
        <QuestionDialog
          acceptedCount={acceptedHere}
          index={editing.index}
          onClose={() => setEditing(null)}
          onSave={save}
          questions={list}
        />
      ) : null}
    </DeskPage>
  );
}

/**
 * One question in a popup — the entry dialog the service editor's packages
 * open: its words, whether it must be answered, and, for one already there
 * while another stays, the way to remove it (the API keeps at least one).
 * Saving sends the whole list with this change and closes once it is stored.
 */
function QuestionDialog({
  questions,
  index,
  acceptedCount,
  onSave,
  onClose,
}: {
  readonly questions: readonly ApiScreeningQuestion[];
  /** The question being changed, or null for a new one at the end. */
  readonly index: number | null;
  readonly acceptedCount: number;
  readonly onSave: (next: readonly QuestionInput[]) => Promise<void>;
  readonly onClose: () => void;
}) {
  const t = useTranslations("screening");
  const short = useShortFailure();
  const current = index === null ? undefined : questions[index];
  const [text, setText] = useState(current?.question ?? "");
  const [required, setRequired] = useState(current?.isRequired ?? true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputs = questions.map(toInput);

  const send = (next: readonly QuestionInput[]) => {
    setBusy(true);
    setProblem(null);
    void onSave(next)
      .then(onClose)
      .catch((cause: unknown) => {
        setProblem(short(screeningErrorKey(cause)));
        setBusy(false);
      });
  };

  const submit = () => {
    const question = text.trim();
    if (!question) {
      setProblem(t("questionEmpty"));
      return;
    }
    const entry = { question, isRequired: required };
    send(index === null ? [...inputs, entry] : inputs.map((item, at) => (at === index ? entry : item)));
  };

  return (
    <EntryDialog
      aside={
        index !== null && questions.length > 1 ? (
          <Button
            className="h-11 px-0 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-destructive"
            disabled={busy}
            onClick={() => send(inputs.filter((_, at) => at !== index))}
            type="button"
            variant="ghost"
          >
            {t("removeQuestion")}
          </Button>
        ) : null
      }
      busy={busy}
      focusId="screening-question"
      onOpenChange={(open) => (open ? null : onClose())}
      onSubmit={submit}
      open
      problem={problem}
      submitLabel={t("saveQuestions")}
      title={index === null ? t("addQuestion") : t("editQuestionTitle")}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="screening-question">
          {t("questionLabel")}
        </label>
        <Textarea
          className="min-h-24 resize-none rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none field-sizing-content md:text-base"
          disabled={busy}
          id="screening-question"
          maxLength={SCREENING_QUESTION_MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("questionPlaceholder")}
          rows={3}
          value={text}
        />
      </div>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{t("requiredLabel")}</span>
        <Switch checked={required} disabled={busy} onCheckedChange={setRequired} />
      </label>
      {acceptedCount > 0 ? (
        <p className="text-sm text-muted-foreground">{t("setupExpiresNote", { count: acceptedCount })}</p>
      ) : null}
    </EntryDialog>
  );
}

/**
 * The setup page's own shape while it is read, line for line as `DeskSection`
 * and `DeskRow` draw it: the part's name (and the count under it, on a
 * service's questions), then three rows, each its two lines and the capsule.
 */
function SetupSkeleton({ hint }: { readonly hint: boolean }) {
  const w = useTranslations("workDesk");
  return (
    <div aria-busy className="flex w-full max-w-220 flex-col">
      <span className="sr-only">{w("loading")}</span>
      <div aria-hidden className="mt-5 flex flex-col lg:mt-8">
        <div className="flex min-h-11 items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <BoneLine bone="h-4 w-40 lg:h-4.5 lg:w-48" text="text-base lg:text-frame-body" />
            {hint ? <BoneLine bone="h-3 w-24 lg:h-4 lg:w-28" text="text-xs lg:text-frame-meta" /> : null}
          </div>
        </div>
        <ul className="flex flex-col">
          {[0, 1, 2].map((row) => (
            <li className="flex items-center gap-4 border-b border-border py-3 md:py-3.5 lg:gap-8 lg:py-5" key={row}>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                <BoneLine bone="h-3.5 w-3/5 lg:h-4.5" text="text-sm lg:text-frame-body" />
                <BoneLine bone="h-3 w-32 lg:h-4 lg:w-40" text="text-xs lg:text-frame-meta" />
              </span>
              <span className={cn(DESK_BONE, "h-8 w-16 shrink-0 rounded-full lg:h-11 lg:w-20")} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
