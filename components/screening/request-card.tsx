"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";

import { authPill } from "@/components/auth/auth-split";
import { BoneLine, useShortFailure } from "@/components/screening/advisor-parts";
import {
  acceptScreeningRequest,
  getScreeningRequest,
  screeningErrorKey,
  screeningKeys,
  type ApiAdvisorScreeningRequest,
  type ScreeningErrorKey,
} from "@/components/screening/screening-data";
import { Button } from "@/components/ui/button";
import { DESK_PILL } from "@/components/work/desk-page";
import { DESK_BONE } from "@/components/work/desk-parts";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The requests still waiting on the advisor, each a card that holds enough
 * to answer it where it stands: who over which service and when it came,
 * the first two of their answers, and the way to accept, decline or read
 * the rest on the review page.
 */

/** The requests' address; with `?decline=` it opens that request's decline popup over the list. */
export const REQUESTS_HREF = "/screening/requests";

/** The query parameter that holds the request being declined. */
export const DECLINE_PARAM = "decline";

/** How many answers a card shows before saying how many more there are. */
const PREVIEW_ANSWERS = 2;

/** One column until `lg`, then two side by side. */
const GRID = "grid gap-3 lg:grid-cols-2 lg:gap-4";

/** A card: on a hairline, nothing tinted inside it. */
const CARD = "flex min-w-0 flex-col rounded-2xl border border-border p-4 lg:p-5";

/** The answers' part, ruled off from the head, a hairline between each. */
const ANSWERS = "mt-3 flex flex-col divide-y divide-border border-t border-border lg:mt-4";

/** One answer: its question over what they wrote. */
const ANSWER = "flex min-w-0 flex-col gap-1 py-3 lg:py-3.5";

/** "ดูทั้งหมด": the desk's text link, as tall as the capsules beside it. */
const SEE_ALL =
  "ml-auto inline-flex h-10 items-center rounded-md text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-12 lg:text-frame-meta";

/** The waiting requests as cards, in the order the API lists them (newest first). */
export function RequestCards({
  requests,
  unread,
  elapsed,
  onDecided,
  className,
}: {
  readonly requests: readonly ApiAdvisorScreeningRequest[];
  /** The ones unread when the page first had them, which keep their dot while it stays open. */
  readonly unread: ReadonlySet<string> | null;
  readonly elapsed: (iso: string) => string;
  /** Hears a request as the API answered it once it is accepted. */
  readonly onDecided: (request: ApiAdvisorScreeningRequest) => void;
  readonly className?: string;
}) {
  return (
    <ul className={cn(GRID, className)}>
      {requests.map((request) => (
        <RequestCard
          elapsed={elapsed}
          key={request.id}
          onDecided={onDecided}
          request={request}
          unread={!request.viewedAt || (unread?.has(request.id) ?? false)}
        />
      ))}
    </ul>
  );
}

/**
 * One waiting request: the initial in a soft circle, who (with a dot while
 * it is unread) over which service, and at the right when it came; then
 * their first answers; then "รับคำขอ" in ink, "ปฏิเสธ" on a hairline (the
 * page's decline popup) and the way to every answer, with the one line a
 * failed acceptance says under them.
 */
function RequestCard({
  request,
  unread,
  elapsed,
  onDecided,
}: {
  readonly request: ApiAdvisorScreeningRequest;
  readonly unread: boolean;
  readonly elapsed: (iso: string) => string;
  readonly onDecided: (request: ApiAdvisorScreeningRequest) => void;
}) {
  const t = useTranslations("screening");
  const short = useShortFailure();
  const nameId = useId();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ScreeningErrorKey | null>(null);

  const accept = async () => {
    setBusy(true);
    setFailure(null);
    try {
      // The names stay the list's, should the API's answer leave one out.
      onDecided({ ...request, ...(await acceptScreeningRequest(request.id)) });
    } catch (cause) {
      setFailure(screeningErrorKey(cause, { conflict: "errorAlreadyDecided" }));
      setBusy(false);
    }
  };

  return (
    <li className="flex min-w-0">
      <article aria-labelledby={nameId} className={cn(CARD, "w-full")}>
        <div className="flex items-start gap-3 lg:gap-4">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground lg:size-12 lg:text-frame-body"
          >
            {request.adviseeDisplayName.trim().slice(0, 1)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground lg:text-frame-body">
              <span className="truncate" id={nameId}>
                {request.adviseeDisplayName}
              </span>
              {unread ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-hero-action" /> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground lg:text-frame-meta">{request.serviceName}</p>
          </div>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label">
            {elapsed(request.createdAt)}
          </span>
        </div>

        <RequestAnswers requestId={request.id} />

        <div className="mt-auto flex flex-col gap-2 pt-3 lg:pt-4">
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <Button
              aria-busy={busy || undefined}
              className={cn(authPill(true), DESK_PILL)}
              disabled={busy}
              onClick={() => void accept()}
              type="button"
            >
              {busy ? t("accepting") : t("accept")}
            </Button>
            <Button
              className={cn(authPill(false), DESK_PILL)}
              disabled={busy}
              nativeButton={busy}
              render={busy ? undefined : <Link href={`${REQUESTS_HREF}?${DECLINE_PARAM}=${request.id}`} scroll={false} />}
              variant="outline"
            >
              {t("decline")}
            </Button>
            <Link className={SEE_ALL} href={`/screening/review?requestId=${request.id}`}>
              {t("seeAllAnswers")}
            </Link>
          </div>
          {failure ? (
            <p className="text-xs text-destructive lg:text-frame-meta" role="alert">
              {short(failure)}
            </p>
          ) : null}
        </div>
      </article>
    </li>
  );
}

/**
 * A card's first answers, on hairlines under its head: each the question
 * small and grey over what they wrote, two lines at most, then how many
 * more the review page holds. Read with the review page's own call and key,
 * so opening the request from its card shows it at once.
 */
function RequestAnswers({ requestId }: { readonly requestId: string }) {
  const t = useTranslations("screening");
  const e = useTranslations("errorStates");
  const detail = useResource(
    screeningKeys.request(requestId),
    useCallback((signal: AbortSignal) => getScreeningRequest(requestId, signal), [requestId]),
  );

  if (detail.loading) return <AnswerBones />;
  if (!detail.data) {
    return (
      <div className={ANSWERS}>
        <p className="py-3 text-xs text-muted-foreground lg:py-3.5 lg:text-frame-label">
          {t("answersLoadFailed")}{" "}
          <Button
            className="h-auto p-0 text-xs font-medium text-foreground underline underline-offset-4 hover:bg-transparent hover:text-foreground lg:text-frame-label"
            onClick={detail.reload}
            type="button"
            variant="ghost"
          >
            {e("retry")}
          </Button>
        </p>
      </div>
    );
  }

  const { answers } = detail.data;
  if (answers.length === 0) {
    return (
      <div className={ANSWERS}>
        <p className="py-3 text-sm text-muted-foreground lg:py-3.5 lg:text-frame-meta">{t("answersEmpty")}</p>
      </div>
    );
  }
  const more = answers.length - PREVIEW_ANSWERS;
  return (
    <>
      <dl className={ANSWERS}>
        {answers.slice(0, PREVIEW_ANSWERS).map((answer) => (
          <div className={ANSWER} key={answer.questionId}>
            <dt className="text-xs break-words text-muted-foreground lg:text-frame-label">{answer.questionText}</dt>
            <dd className="line-clamp-2 text-sm break-words text-foreground lg:text-frame-meta">{answer.answer}</dd>
          </div>
        ))}
      </dl>
      {/* Its line is held even when there is nothing more, as the bones hold
          it, so a card never grows when its answers land. */}
      <p aria-hidden={more > 0 ? undefined : true} className="h-lh text-xs text-muted-foreground lg:text-frame-label">
        {more > 0 ? t("moreAnswers", { count: more }) : null}
      </p>
    </>
  );
}

/**
 * The answers' shape while they are read: two, on the same hairlines, each
 * its question's line over the answer's two (one from `lg`, where the card
 * is wide enough for most answers on one).
 */
function AnswerBones() {
  return (
    <>
      <div aria-hidden className={ANSWERS}>
        {[0, 1].map((row) => (
          <div className={ANSWER} key={row}>
            <BoneLine bone="h-3 w-1/2 lg:h-3.5" text="text-xs lg:text-frame-label" />
            <BoneLine bone="h-3.5 w-11/12 lg:h-4" text="text-sm lg:text-frame-meta" />
            <BoneLine bone="h-3.5 w-3/5" text="text-sm lg:hidden" />
          </div>
        ))}
      </div>
      {/* The line under them that says how many more there are. */}
      <span aria-hidden className="block h-lh text-xs lg:text-frame-label" />
    </>
  );
}

/**
 * The requests page's own shape while its list is read, line for line: the
 * capsules' row (waiting, answered, all), then two cards — side by side
 * from `lg` — each its head, two answers on hairlines and its capsules with
 * the link after them.
 */
export function RequestsSkeleton({ label }: { readonly label: string }) {
  return (
    <div aria-busy className="flex w-full flex-col">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="mt-5 flex gap-2 lg:mt-8 lg:gap-3">
        {["w-21 lg:w-26", "w-24 lg:w-28", "w-22 lg:w-27"].map((width) => (
          <span className={cn(DESK_BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
        ))}
      </div>
      <ul aria-hidden className={cn(GRID, "mt-5 lg:mt-8")}>
        {[0, 1].map((card) => (
          <li className={CARD} key={card}>
            <div className="flex items-start gap-3 lg:gap-4">
              <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                <BoneLine bone="h-3.5 w-2/5 lg:h-4.5" text="text-sm lg:text-frame-body" />
                <BoneLine bone="h-3 w-1/3 lg:h-4" text="text-xs lg:text-frame-meta" />
              </span>
              <BoneLine bone="h-3 w-12 lg:h-3.5 lg:w-14" text="shrink-0 text-xs lg:text-frame-label" />
            </div>
            <AnswerBones />
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 lg:gap-3 lg:pt-4">
              <span className={cn(DESK_BONE, "h-10 w-20 rounded-full lg:h-12 lg:w-28")} />
              <span className={cn(DESK_BONE, "h-10 w-18 rounded-full lg:h-12 lg:w-26")} />
              <span className="ml-auto flex h-10 items-center lg:h-12">
                <span className={cn(DESK_BONE, "h-3.5 w-14 rounded lg:h-4 lg:w-16")} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
