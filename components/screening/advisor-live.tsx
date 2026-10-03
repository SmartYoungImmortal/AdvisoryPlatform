"use client";

import { Check, CircleHelp, FileText, Inbox, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMountTime } from "@/components/bookings/booking-flow";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenActions,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { DeclineScreeningDialog } from "@/components/screening/decline-dialog";
import {
  ScreeningErrorNotice,
  ScreeningLoading,
  useElapsedLabel,
  useSentLabel,
} from "@/components/screening/live-parts";
import { Card, FootNote, StackRow, TimeMeta } from "@/components/screening/parts";
import {
  acceptScreeningRequest,
  declineScreeningRequest,
  getScreeningRequest,
  listScreeningQuestions,
  listScreeningRequests,
  replaceScreeningQuestions,
  SCREENING_MAX_QUESTIONS,
  SCREENING_QUESTION_MAX_LENGTH,
  screeningErrorKey,
  screeningKeys,
  type ApiAdvisorScreeningRequest,
  type ApiScreeningQuestion,
  type ScreeningErrorKey,
} from "@/components/screening/screening-data";
import { invalidate, useResource } from "@/lib/api/use-resource";

/**
 * The advisor's screening screens, read from and written to the API. Same frames
 * as `advisor-screens.tsx`, which stays the fixture the `/screens` index shows.
 */

const COLUMN = "lg:[&>*]:mx-auto lg:[&>*]:w-full lg:[&>*]:max-w-[720px]";

/* ----------------------------------------------------------------- requests */

/** One row: the advisee, the service name under it, the time and the unread dot. */
function RequestRow({
  request,
  elapsed,
}: {
  readonly request: ApiAdvisorScreeningRequest;
  readonly elapsed: (iso: string) => string;
}) {
  const t = useTranslations("screening");
  const href = `/screening/review?requestId=${request.id}`;

  if (request.status === "PENDING") {
    return (
      <StackRow
        body={request.serviceName}
        href={href}
        icon={FileText}
        iconClassName="bg-warning/15 text-warning"
        title={request.adviseeDisplayName}
        trailing={<TimeMeta time={elapsed(request.createdAt)} unread={!request.viewedAt} />}
      />
    );
  }

  const accepted = request.status === "ACCEPTED";
  const declined = request.status === "DECLINED";
  let body: ReactNode = request.serviceName;
  if (accepted) body = <StatusPill tone="success">{t("req4Body")}</StatusPill>;
  if (declined) body = <StatusPill tone="danger">{t("req5Body")}</StatusPill>;
  let iconClassName: string | undefined;
  if (accepted) iconClassName = "bg-success/12 text-success";
  if (declined) iconClassName = "bg-destructive/10 text-destructive";

  return (
    <StackRow
      body={body}
      href={href}
      icon={FileText}
      iconClassName={iconClassName}
      title={request.adviseeDisplayName}
      trailing={<TimeMeta time={elapsed(request.decidedAt ?? request.createdAt)} />}
    />
  );
}

/** Figma "Advisor - Screening requests (Light)" — 995:11505. */
export function LiveScreeningRequests() {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const now = useMountTime();
  const elapsed = useElapsedLabel(now);
  const requests = useResource(
    screeningKeys.requests,
    useCallback((signal: AbortSignal) => listScreeningRequests({ limit: 100 }, signal), []),
  );

  let body;
  if (requests.loading) {
    body = <ScreeningLoading />;
  } else if (requests.error || !requests.data) {
    body = (
      <ScreeningErrorNotice
        errorKey={screeningErrorKey(requests.error)}
        onRetry={requests.reload}
      />
    );
  } else if (requests.data.items.length === 0) {
    body = (
      <EmptyState body={t("requestsEmptyBody")} icon={Inbox} title={t("requestsEmptyTitle")} />
    );
  } else {
    const pending = requests.data.items.filter((request) => request.status === "PENDING");
    const answered = requests.data.items.filter((request) => request.status !== "PENDING");
    body = (
      <>
        {pending.length > 0 ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
            <p className="w-full text-base font-semibold text-foreground lg:text-lg">
              {t("pending")}
            </p>
            <Card>
              {pending.map((request) => (
                <RequestRow elapsed={elapsed} key={request.id} request={request} />
              ))}
            </Card>
          </div>
        ) : null}
        {answered.length > 0 ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
            <p className="w-full text-base font-semibold text-foreground lg:text-lg">
              {t("answered")}
            </p>
            <Card>
              {answered.map((request) => (
                <RequestRow elapsed={elapsed} key={request.id} request={request} />
              ))}
            </Card>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/work" label={c("back")} />
      <ScreenBody className={COLUMN}>
        <ScreenHeading className="pt-4" title={t("requestsTitle")} />
        {body}
        <ScreenSpacer />
      </ScreenBody>
    </MobileScreen>
  );
}

/* ------------------------------------------------------------------- review */

/** One answer: the question as the quiet label, the answer as the thing read. */
function AnswerRow({ question, answer }: { readonly question: string; readonly answer: string }) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-surface">
        <CircleHelp aria-hidden className="size-4.5 text-primary" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-1">
        <p className="w-full text-xs font-normal text-muted-foreground">{question}</p>
        <p className="w-full text-sm font-normal whitespace-pre-line text-foreground">{answer}</p>
      </div>
    </div>
  );
}

/**
 * Figma "Advisor - Review answers (Light)" — 995:11572 — and, with `declining`,
 * the decline dialog over it (2077:20179).
 */
export function LiveReviewAnswers({
  requestId,
  declining = false,
}: {
  readonly requestId: string;
  readonly declining?: boolean;
}) {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const e = useTranslations("errorStates");
  const router = useRouter();
  const now = useMountTime();
  const sent = useSentLabel(now);
  const request = useResource(
    screeningKeys.request(requestId),
    useCallback((signal: AbortSignal) => getScreeningRequest(requestId, signal), [requestId]),
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ScreeningErrorKey | null>(null);

  // Opening the request is what marks it viewed, so the list's dot is stale now.
  const loaded = request.data !== undefined;
  useEffect(() => {
    if (loaded) invalidate(screeningKeys.requests);
  }, [loaded]);

  const decided = () => {
    invalidate(screeningKeys.requests);
    invalidate(screeningKeys.request(requestId));
    router.push("/screening/requests");
  };
  const fail = (cause: unknown) => {
    setFailure(screeningErrorKey(cause, { conflict: "errorAlreadyDecided" }));
    setBusy(false);
  };

  const accept = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await acceptScreeningRequest(requestId);
      decided();
    } catch (cause) {
      fail(cause);
    }
  };

  const decline = async (message: string) => {
    setBusy(true);
    setFailure(null);
    try {
      await declineScreeningRequest(requestId, message);
      decided();
    } catch (cause) {
      fail(cause);
    }
  };

  const reviewHref = `/screening/review?requestId=${requestId}`;
  // The dialog has room for one line, so an error there is its short form.
  let dialogError: string | null = null;
  if (failure === "errorAlreadyDecided") dialogError = t("errorAlreadyDecided");
  else if (failure === "offline") dialogError = e("offlineBody");
  else if (failure) dialogError = e("serverBody");
  let body;
  if (request.loading) {
    body = <ScreeningLoading />;
  } else if (request.error || !request.data) {
    body = (
      <ScreeningErrorNotice errorKey={screeningErrorKey(request.error)} onRetry={request.reload} />
    );
  } else {
    const data = request.data;
    const pending = data.status === "PENDING";
    body = (
      <>
        <ScreenHeading
          className="gap-2 pt-4"
          subtitle={t("reviewSubtitleLive", {
            service: data.serviceName,
            sent: sent(data.createdAt),
          })}
          title={t("reviewTitleLive", { name: data.adviseeDisplayName })}
        />

        <div className="flex w-full shrink-0 flex-col items-start px-6 pt-3">
          <Card>
            {data.answers.map((answer) => (
              <AnswerRow answer={answer.answer} key={answer.questionId} question={answer.questionText} />
            ))}
          </Card>
        </div>

        <FootNote icon={ShieldCheck}>{t("reviewNote")}</FootNote>
        {failure && !declining ? <ScreeningErrorNotice errorKey={failure} /> : null}

        <ScreenSpacer />
        {pending ? (
          <ScreenActions>
            <PrimaryButton disabled={busy} onClick={() => void accept()}>
              {t("accept")}
            </PrimaryButton>
            <NeutralButton href={`/screening/review/decline?requestId=${requestId}`}>
              {t("decline")}
            </NeutralButton>
          </ScreenActions>
        ) : (
          <ScreenActions>
            <StatusPill tone={data.status === "ACCEPTED" ? "success" : "danger"}>
              {data.status === "ACCEPTED" ? t("req4Body") : t("req5Body")}
            </StatusPill>
          </ScreenActions>
        )}

        {declining && pending ? (
          <DeclineScreeningDialog
            busy={busy}
            cancelHref={reviewHref}
            error={dialogError}
            name={data.adviseeDisplayName}
            onConfirm={(message) => void decline(message)}
          />
        ) : null}
      </>
    );
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/screening/requests" label={c("back")} />
      <ScreenBody className={COLUMN}>{body}</ScreenBody>
    </MobileScreen>
  );
}

/* -------------------------------------------------------------------- setup */

interface DraftQuestion {
  readonly key: string;
  readonly question: string;
  readonly isRequired: boolean;
}

/**
 * Figma "Advisor - Screening setup (Light)" — 995:11456 — editable.
 *
 * The frame draws the question list and an "add question" row but no editing
 * screen, so each row edits in place with the kit's input and switch: the
 * question, whether it is required, and a remove button. Saving replaces the whole
 * list (1–5 questions); the API expires earlier acceptances when it does.
 */
export function LiveScreeningSetup({ serviceId }: { readonly serviceId: string }) {
  const c = useTranslations("common");
  const questions = useResource(
    screeningKeys.questions(serviceId),
    useCallback((signal: AbortSignal) => listScreeningQuestions(serviceId, signal), [serviceId]),
  );

  // The editor holds what was saved while it is open; the cached list is only
  // dropped on the way out, so the next visit reads fresh without the screen
  // reloading (and losing its "saved" line) under the advisor's hands.
  useEffect(() => () => invalidate(screeningKeys.questions(serviceId)), [serviceId]);

  let body;
  if (questions.loading) {
    body = <ScreeningLoading />;
  } else if (questions.error || !questions.data) {
    body = (
      <ScreeningErrorNotice errorKey={screeningErrorKey(questions.error)} onRetry={questions.reload} />
    );
  } else {
    body = <SetupEditor initial={questions.data} serviceId={serviceId} />;
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar href="/advisor/services" label={c("back")} />
      <ScreenBody className={COLUMN}>{body}</ScreenBody>
    </MobileScreen>
  );
}

function SetupEditor({
  serviceId,
  initial,
}: {
  readonly serviceId: string;
  readonly initial: readonly ApiScreeningQuestion[];
}) {
  const t = useTranslations("screening");
  const [drafts, setDrafts] = useState<DraftQuestion[]>(() =>
    initial.map((question) => ({
      key: question.id,
      question: question.question,
      isRequired: question.isRequired,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<ScreeningErrorKey | null>(null);

  const update = (key: string, change: Partial<DraftQuestion>) => {
    setSaved(false);
    setDrafts((previous) =>
      previous.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)),
    );
  };
  const add = () => {
    setSaved(false);
    setDrafts((previous) => [
      ...previous,
      { key: crypto.randomUUID(), question: "", isRequired: true },
    ]);
  };
  const remove = (key: string) => {
    setSaved(false);
    setDrafts((previous) => previous.filter((draft) => draft.key !== key));
  };

  const canSave =
    drafts.length > 0 && drafts.every((draft) => draft.question.trim().length > 0);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const stored = await replaceScreeningQuestions(
        serviceId,
        drafts.map((draft) => ({ question: draft.question.trim(), isRequired: draft.isRequired })),
      );
      setDrafts(
        stored.map((question) => ({
          key: question.id,
          question: question.question,
          isRequired: question.isRequired,
        })),
      );
      setSaved(true);
    } catch (cause) {
      setFailure(screeningErrorKey(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScreenHeading
        className="gap-2 pt-4"
        subtitle={t("setupSubtitle")}
        title={t("setupTitle")}
      />

      <div className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5">
        <p className="w-full text-base font-semibold text-foreground lg:text-lg">
          {t("yourQuestions")}
        </p>
        <Card>
          {drafts.map((draft, index) => (
            <div className="flex w-full shrink-0 flex-col gap-2 p-3.5" key={draft.key}>
              <div className="flex w-full items-center gap-2">
                <Input
                  aria-label={t("answerLabelLive", { number: index + 1, question: t("questionPlaceholder") })}
                  className="h-9 flex-1 bg-muted text-sm shadow-none"
                  disabled={saving}
                  maxLength={SCREENING_QUESTION_MAX_LENGTH}
                  onChange={(event) => update(draft.key, { question: event.target.value })}
                  placeholder={t("questionPlaceholder")}
                  value={draft.question}
                />
                <Button
                  aria-label={t("removeQuestion")}
                  disabled={saving}
                  onClick={() => remove(draft.key)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 aria-hidden className="size-4 text-muted-foreground" />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={draft.isRequired}
                  disabled={saving}
                  onCheckedChange={(checked) => update(draft.key, { isRequired: checked })}
                />
                {t("requiredToggle")}
              </label>
            </div>
          ))}
          {drafts.length < SCREENING_MAX_QUESTIONS ? (
            <button
              className="flex w-full items-center gap-3 p-3.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
              disabled={saving}
              onClick={add}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              {t("addQuestion")}
            </button>
          ) : null}
        </Card>
        {/* The saved confirmation sits with the questions it confirms, not in the
            action row — there it pushed the save button sideways. */}
        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-xs text-muted-foreground">
            {t("questionLimit", { max: SCREENING_MAX_QUESTIONS })}
          </p>
          {saved ? (
            <p className="flex items-center gap-1 text-xs font-medium text-success" role="status">
              <Check aria-hidden className="size-3.5" />
              {t("questionsSaved")}
            </p>
          ) : null}
        </div>
      </div>

      {failure ? <ScreeningErrorNotice errorKey={failure} /> : null}

      <ScreenSpacer />
      <ScreenActions>
        <PrimaryButton disabled={saving || !canSave} onClick={() => void save()}>
          {t("saveQuestions")}
        </PrimaryButton>
      </ScreenActions>
    </>
  );
}
