"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useId, useState, type MouseEvent, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { asUuid, useMountTime } from "@/components/bookings/booking-flow";
import { useDesktop } from "@/components/chat/chat-hooks";
import { useElapsedLabel } from "@/components/mobile/live-state";
import { StatusToast, useStatusToast } from "@/components/mobile/toast";
import { DeclineScreeningDialog } from "@/components/screening/decline-dialog";
import {
  BoneLine,
  useScreeningDecision,
  useScreeningRequest,
  useShortFailure,
  type DecisionFailure,
  type ScreeningOutcome,
} from "@/components/screening/inbox-parts";
import { ScreeningErrorNotice } from "@/components/screening/live-parts";
import {
  listScreeningRequests,
  screeningErrorKey,
  screeningKeys,
  type ApiAdvisorScreeningRequest,
  type ApiAdvisorScreeningRequestDetail,
  type ScreeningStatus,
} from "@/components/screening/screening-data";
import { Button } from "@/components/ui/button";
import { DESK_PILL } from "@/components/work/desk-page";
import { DESK_BONE, DeskEmpty, DeskFilter } from "@/components/work/desk-parts";
import { usePendingScreening } from "@/components/work/work-data";
import { WorkFrame } from "@/components/work/work-frame";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/screening/requests`, the advisor's requests as an inbox. From `lg` two
 * panes under the desk's band: the list at the left (its name, the
 * capsules, a row for each request), and the one selected open beside it —
 * who sent it, what they answered, and the two answers to it while it waits.
 * Selecting a row opens it in place and writes `?requestId=` into the
 * address, so a reload or a shared link opens the same one. On a phone it is
 * the list alone, and a row is the way to its review page
 * (`/screening/review?requestId=`).
 *
 * The decline popup's open state is the address too (`&decline=1`), as the
 * review page's own route is: the popup closes back to the request's address.
 */

/** Which of the requests the list shows: the capsules' three. */
type Shown = "pending" | "answered" | "all";

/** A row's word for where its request stands, and its ink: waiting in ink, accepted green, declined red, expired grey. */
const STATUS_WORD: Record<
  ScreeningStatus,
  { readonly key: "inboxPending" | "inboxAccepted" | "inboxDeclined" | "statusExpired"; readonly ink: string }
> = {
  PENDING: { key: "inboxPending", ink: "text-foreground" },
  ACCEPTED: { key: "inboxAccepted", ink: "text-success" },
  DECLINED: { key: "inboxDeclined", ink: "text-destructive" },
  EXPIRED: { key: "statusExpired", ink: "text-muted-foreground" },
};

/**
 * The two panes from `lg`, edge to edge between the menu's rule and the
 * panel's right edge (the frame pads its column 48 a side; the panes take it
 * back) and from the band to the panel's foot: `basis-0` with `min-h-0`, so
 * the column's height sets theirs rather than the list's length, and each
 * pane scrolls on its own. On a phone it is the page's own flow.
 */
const PANES = "flex min-w-0 flex-col lg:-mx-12 lg:min-h-0 lg:grow lg:basis-0 lg:flex-row lg:overflow-hidden";

/** The list's pane: the whole width on a phone; from `lg` 420 wide, ruled off from the request beside it. */
const LIST_PANE = "flex min-w-0 flex-col lg:min-h-0 lg:w-105 lg:shrink-0 lg:border-r lg:border-border";

/** The open request's pane, the rest of the width from `lg`; never drawn on a phone. */
const OPEN_PANE = "hidden lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col";

/** A pane's own scroller from `lg`; `data-lenis-prevent` on it keeps the page's smooth scroll from taking the wheel. */
const PANE_SCROLL = "lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain";

/** The open request's inset from `lg`, every line of it. */
const INSET = "lg:px-12";

/** The list's inset from `lg`, capsules and rows alike: half the open pane's, so the three capsules fit its 420. */
const LIST_INSET = "lg:px-6";

/** The form's first letter in its circle; a name with none shows the circle bare. */
function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? "";
}

/** A plain left click, the only one the list takes over from the browser (a new tab keeps the address). */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

/**
 * The desk's frame with the requests' place marked, its band naming the
 * place. `flush` while the panes are up: they run down to the panel's foot.
 */
function InboxFrame({
  flush,
  overlay,
  children,
}: {
  readonly flush: boolean;
  readonly overlay?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("work");
  return (
    <WorkFrame flushFoot={flush} overlay={overlay} place="requests" title={t("tab.requests")}>
      {children}
    </WorkFrame>
  );
}

/**
 * The page reads its address with `useSearchParams` under a `Suspense`, so
 * the prerendered page is the frame with the inbox's skeleton.
 */
export function LiveScreeningRequests() {
  return (
    <Suspense
      fallback={
        <InboxFrame flush>
          <InboxSkeleton />
        </InboxFrame>
      }
    >
      <RequestsInbox />
    </Suspense>
  );
}

function RequestsInbox() {
  const t = useTranslations("screening");
  const w = useTranslations("workDesk");
  const short = useShortFailure();
  const params = useSearchParams();
  const desktop = useDesktop();
  const status = useStatusToast();
  const now = useMountTime();
  const elapsed = useElapsedLabel(now);
  const waitingCount = usePendingScreening();
  const requests = useResource(
    screeningKeys.requests,
    useCallback((signal: AbortSignal) => listScreeningRequests({ limit: 100 }, signal), []),
  );
  // Read again after an answer, the list stays as it was until the new one lands.
  const list = useLastAnswer(requests);
  const [landing, setLanding] = useState<{ readonly shown: Shown; readonly newest: string | null } | null>(null);
  const [chosen, setChosen] = useState<Shown | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  // The first answer decides where the page opens, once: on the requests
  // waiting with the newest of them open when there are any, else on all of
  // them. Kept, so answering one neither moves the capsule nor opens another.
  if (list && landing === null) {
    const newest = list.items.find((request) => request.status === "PENDING");
    setLanding({ shown: newest ? "pending" : "all", newest: newest?.id ?? null });
  }
  const shown = chosen ?? landing?.shown ?? "all";

  const asked = asUuid(params.get("requestId"));
  // Only a desktop opens one: a request read beside the list counts as viewed.
  const selected = desktop ? (asked ?? landing?.newest ?? null) : null;
  const declining = asked !== undefined && params.has("decline");

  // Read fresh the next time the page opens: what was opened here is viewed
  // now, and new requests may have come in meanwhile.
  useEffect(() => () => invalidate(`${screeningKeys.requests}#`), []);

  // An opened request is read at once, though the list's copy still says unread.
  const markSeen = useCallback(
    (requestId: string) => setSeen((was) => (was.has(requestId) ? was : new Set(was).add(requestId))),
    [],
  );

  const select = (requestId: string) => window.history.replaceState(null, "", `?requestId=${requestId}`);

  // What an answer made out of date, read again in place: the list (every
  // language of it, and the setup page's accepted ones), the request itself
  // (its pane reads it again), and the desk's count of requests waiting, so
  // the menu's badge follows. The decline popup closes back to the request.
  const refresh = (requestId: string) => {
    invalidate(`${screeningKeys.requests}#`);
    invalidate(`${screeningKeys.requests}?`);
    invalidate(`${screeningKeys.request(requestId)}#`);
    invalidate("advisors/me/screening-requests");
    requests.reload();
    waitingCount.reload();
    if (declining) window.history.replaceState(null, "", `?requestId=${requestId}`);
  };
  const decided = (requestId: string, name: string, outcome: ScreeningOutcome) => {
    refresh(requestId);
    status.show(outcome === "accepted" ? t("inboxAcceptedToast", { name }) : t("inboxDeclinedToast", { name }), true);
  };
  const failed = (requestId: string, failure: DecisionFailure) => {
    if (failure.key === "errorAlreadyDecided") {
      refresh(requestId);
      status.show(short(failure.key), false);
    } else if (failure.on === "accepted") {
      status.show(short(failure.key), false);
    }
    // A decline that failed says why in its popup, which stays open.
  };

  let body: ReactNode;
  let flush = true;
  if (!list && requests.loading) {
    body = <InboxSkeleton />;
  } else if (!list) {
    flush = false;
    body = (
      <div className="mt-5 lg:mt-8">
        <ScreeningErrorNotice errorKey={screeningErrorKey(requests.error)} onRetry={requests.reload} />
      </div>
    );
  } else if (list.items.length === 0) {
    flush = false;
    body = <DeskEmpty body={t("requestsEmptyBody")} icon={Inbox} title={t("requestsEmptyTitle")} />;
  } else {
    const waiting = list.items.filter((request) => request.status === "PENDING");
    const answered = list.items.filter((request) => request.status !== "PENDING");
    let rows = list.items;
    if (shown === "pending") rows = waiting;
    if (shown === "answered") rows = answered;

    let open: ReactNode;
    if (!desktop) {
      // Until the screen is known to be a desktop; hidden on a phone.
      open = <PaneSkeleton announce={false} />;
    } else if (selected) {
      open = (
        <RequestPane
          declining={declining}
          key={selected}
          onDecided={decided}
          onFailed={failed}
          onViewed={markSeen}
          requestId={selected}
        />
      );
    } else {
      open = (
        <div className={cn(OPEN_PANE, "lg:items-center lg:justify-center", INSET)}>
          <p className="text-center text-sm text-muted-foreground lg:text-frame-meta">{t("inboxPick")}</p>
        </div>
      );
    }

    body = (
      <div className={PANES}>
        <div className={LIST_PANE}>
          {/* The band names the page, so the list opens on its capsules. */}
          <div className={cn("lg:shrink-0 lg:pt-6 lg:[&>fieldset]:mt-0", LIST_INSET)}>
            <DeskFilter
              label={t("requestsTitle")}
              onChange={setChosen}
              options={[
                { key: "pending", label: t("inboxPending"), note: waiting.length },
                { key: "answered", label: t("answered"), note: answered.length },
                { key: "all", label: w("filterAll"), note: list.items.length },
              ]}
              value={shown}
            />
          </div>
          <div className={cn("mt-3 lg:mt-0 lg:pt-2 lg:pb-8", LIST_INSET, PANE_SCROLL)} data-lenis-prevent>
            {rows.length === 0 ? (
              <p className="pt-8 text-sm text-muted-foreground lg:pt-12 lg:text-frame-body">{w("filteredEmpty")}</p>
            ) : (
              <ul className="flex flex-col">
                {rows.map((request) => (
                  <RequestRow
                    active={request.id === selected}
                    desktop={desktop}
                    key={request.id}
                    onSelect={select}
                    request={request}
                    time={elapsed(request.createdAt)}
                    unread={request.viewedAt === null && !seen.has(request.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
        {open}
      </div>
    );
  }

  return (
    <InboxFrame
      flush={flush}
      overlay={
        <StatusToast dismiss={status.dismiss} leaving={status.leaving} paused={status.paused} setPaused={status.setPaused} toast={status.toast} />
      }
    >
      {body}
    </InboxFrame>
  );
}

/**
 * One request in the list: the form's first letter in a soft circle, who
 * sent it (heavier while unread) with when at the right, and under them the
 * service and where it stands. On a desktop it opens beside the list; on a
 * phone it is the way to its review page.
 */
function RequestRow({
  request,
  active,
  unread,
  time,
  desktop,
  onSelect,
}: {
  readonly request: ApiAdvisorScreeningRequest;
  readonly active: boolean;
  readonly unread: boolean;
  readonly time: string;
  readonly desktop: boolean;
  readonly onSelect: (requestId: string) => void;
}) {
  const t = useTranslations("screening");
  const word = STATUS_WORD[request.status];

  return (
    <li>
      <Link
        aria-current={active ? "true" : undefined}
        className={cn(
          "-mx-3 flex items-center gap-3 rounded-xl px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:py-4",
          active ? "bg-muted" : "hover:bg-muted/60",
        )}
        href={desktop ? `/screening/requests?requestId=${request.id}` : `/screening/review?requestId=${request.id}`}
        onClick={
          desktop
            ? (event) => {
                if (!isPlainClick(event)) return;
                event.preventDefault();
                onSelect(request.id);
              }
            : undefined
        }
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium text-foreground lg:size-12 lg:text-frame-body"
        >
          {initialOf(request.adviseeDisplayName)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-sm text-foreground lg:text-frame-body", unread ? "font-semibold" : "font-medium")}>
              {request.adviseeDisplayName}
            </span>
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label">{time}</span>
          </span>
          <span className="flex min-w-0 items-baseline gap-1.5 text-xs lg:text-frame-meta">
            <span className="min-w-0 truncate text-muted-foreground">{request.serviceName}</span>
            <span aria-hidden className="shrink-0 text-muted-foreground">
              ·
            </span>
            <span className={cn("shrink-0 whitespace-nowrap", word.ink)}>{t(word.key)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/** A date as the pane writes it: the day and the month, the year only when it is not this one, and the time when asked. */
function useDateLabel(): (iso: string, clock?: boolean) => string {
  const format = useFormatter();
  const now = useMountTime();
  const thisYear = new Date(now).getFullYear();
  return (iso, clock = false) => {
    const at = new Date(iso);
    return format.dateTime(at, {
      day: "numeric",
      month: "short",
      ...(at.getFullYear() === thisYear ? {} : { year: "numeric" as const }),
      ...(clock ? { hour: "2-digit" as const, minute: "2-digit" as const, hourCycle: "h23" as const } : {}),
    });
  };
}

/** How an answered request was answered, in one line: when, and a decline's message after it. */
function useStandingLine(): (request: ApiAdvisorScreeningRequestDetail) => string {
  const t = useTranslations("screening");
  const date = useDateLabel();
  return (request) => {
    const on = request.decidedAt ? date(request.decidedAt) : null;
    if (request.status === "DECLINED") {
      const line = on ? t("inboxDeclinedOn", { date: on }) : t("inboxDeclined");
      return request.decisionReason ? `${line} · ${request.decisionReason}` : line;
    }
    const accepted = on ? t("inboxAcceptedOn", { date: on }) : t("inboxAccepted");
    // An acceptance the service's new questions expired: when it was accepted, then that it no longer holds.
    return request.status === "EXPIRED" ? `${accepted} · ${t("statusExpired")}` : accepted;
  };
}

/**
 * The selected request beside the list: who sent it (the letter's circle,
 * the name, the service and when it was sent), a hairline, then each question
 * small and grey over what they wrote, on hairlines. At the pane's foot the
 * two answers while it waits — the decline asks first, in its popup — or the
 * one line saying how it was answered.
 */
function RequestPane({
  requestId,
  declining,
  onViewed,
  onDecided,
  onFailed,
}: {
  readonly requestId: string;
  readonly declining: boolean;
  readonly onViewed: (requestId: string) => void;
  readonly onDecided: (requestId: string, name: string, outcome: ScreeningOutcome) => void;
  readonly onFailed: (requestId: string, failure: DecisionFailure) => void;
}) {
  const t = useTranslations("screening");
  const short = useShortFailure();
  const date = useDateLabel();
  const standing = useStandingLine();
  const headingId = useId();
  const request = useScreeningRequest(requestId);
  // Read again after an answer, the pane keeps the request until the new one lands.
  const data = useLastAnswer(request);

  // Reading it marked it as viewed: the list's row stops saying unread.
  const loaded = request.data !== undefined;
  useEffect(() => {
    if (loaded) onViewed(requestId);
  }, [loaded, onViewed, requestId]);

  const decision = useScreeningDecision(requestId, {
    onDecided: (outcome) => {
      request.reload();
      onDecided(requestId, data?.adviseeDisplayName ?? "", outcome);
    },
    onFailed: (failure) => {
      // Answered elsewhere meanwhile: read it again, so the pane shows how.
      if (failure.key === "errorAlreadyDecided") request.reload();
      onFailed(requestId, failure);
    },
  });

  if (!data) {
    if (request.loading) return <PaneSkeleton />;
    return (
      <div className={cn(OPEN_PANE, INSET, "lg:pt-8")}>
        <ScreeningErrorNotice errorKey={screeningErrorKey(request.error)} onRetry={request.reload} />
      </div>
    );
  }

  const pending = data.status === "PENDING";

  return (
    <section aria-labelledby={headingId} className={OPEN_PANE}>
      <div className={cn("lg:pt-8 lg:pb-8", INSET, PANE_SCROLL)} data-lenis-prevent>
        <header className="flex items-center gap-4 border-b border-border pb-8 lg:gap-5">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-medium text-foreground lg:size-16 lg:text-frame-heading"
          >
            {initialOf(data.adviseeDisplayName)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl font-semibold break-words text-foreground lg:text-frame-figure" id={headingId}>
              {data.adviseeDisplayName}
            </h2>
            <p className="text-sm text-muted-foreground lg:text-frame-meta">
              {t("reviewSubtitleLive", { service: data.serviceName, sent: t("sentOn", { date: date(data.createdAt, true) }) })}
            </p>
          </div>
        </header>

        {data.answers.length > 0 ? (
          <dl className="flex flex-col divide-y divide-border">
            {data.answers.map((answer) => (
              <div className="flex min-w-0 flex-col gap-1.5 py-5 lg:py-6" key={answer.questionId}>
                <dt className="text-xs text-muted-foreground lg:text-frame-label">{answer.questionText}</dt>
                <dd className="text-sm break-words whitespace-pre-wrap text-foreground lg:text-frame-body">{answer.answer}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="py-5 text-sm text-muted-foreground lg:py-6 lg:text-frame-meta">{t("answersEmpty")}</p>
        )}
      </div>

      {pending ? (
        <div className={cn("flex shrink-0 flex-wrap justify-end gap-3 lg:py-6", INSET)}>
          <Button
            className={cn(authPill(false), DESK_PILL)}
            disabled={decision.busy}
            onClick={() => window.history.pushState(null, "", `?requestId=${requestId}&decline=1`)}
            type="button"
            variant="outline"
          >
            {t("decline")}
          </Button>
          <Button
            aria-busy={decision.working === "accepted" || undefined}
            className={cn(authPill(true), DESK_PILL)}
            disabled={decision.busy}
            onClick={() => void decision.accept()}
            type="button"
          >
            {decision.working === "accepted" ? t("accepting") : t("accept")}
          </Button>
        </div>
      ) : (
        <p className={cn("shrink-0 text-sm break-words text-muted-foreground lg:py-6 lg:text-frame-meta", INSET)}>
          {standing(data)}
        </p>
      )}

      {declining && pending ? (
        <DeclineScreeningDialog
          busy={decision.busy}
          cancelHref={`/screening/requests?requestId=${requestId}`}
          error={decision.failure?.on === "declined" ? short(decision.failure.key) : null}
          name={data.adviseeDisplayName}
          onConfirm={(message) => void decision.decline(message)}
        />
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- skeleton */

/** Capsule widths for the three capsules, each its label and count: waiting, answered, all. */
const CAPSULE_BONES = ["w-20 lg:w-24", "w-24 lg:w-28", "w-22 lg:w-26"] as const;

/**
 * The page's own shape while the list is read, line for line: the list's
 * name, the capsules and five rows at the left, and from `lg` the open
 * request's skeleton beside them.
 */
function InboxSkeleton() {
  const w = useTranslations("workDesk");
  return (
    <div aria-busy className={PANES}>
      <span className="sr-only">{w("loading")}</span>
      <div aria-hidden className={LIST_PANE}>
        <div className={cn("mt-5 flex gap-2 lg:mt-0 lg:shrink-0 lg:gap-3 lg:pt-6", LIST_INSET)}>
          {CAPSULE_BONES.map((width) => (
            <span className={cn(DESK_BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
          ))}
        </div>
        <ul className={cn("mt-3 flex flex-col lg:mt-0 lg:pt-2", LIST_INSET)}>
          {[0, 1, 2, 3, 4].map((row) => (
            <li className="-mx-3 flex items-center gap-3 px-3 py-3 lg:py-4" key={row}>
              <span className={cn(DESK_BONE, "size-10 shrink-0 rounded-full lg:size-12")} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-2">
                  <BoneLine bone="h-3.5 w-1/2 lg:h-4.5" text="min-w-0 flex-1 text-sm lg:text-frame-body" />
                  <BoneLine bone="h-3 w-10 lg:h-3.5 lg:w-12" text="shrink-0 text-xs lg:text-frame-label" />
                </span>
                <BoneLine bone="h-3 w-2/3 lg:h-4" text="text-xs lg:text-frame-meta" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PaneSkeleton announce={false} />
    </div>
  );
}

/**
 * The open request's shape while it is read: the circle with the name and
 * the service's line, three questions on hairlines, and the two pills at the
 * pane's foot (most requests opened are still waiting).
 */
function PaneSkeleton({ announce = true }: { readonly announce?: boolean }) {
  const w = useTranslations("workDesk");
  return (
    <div aria-busy={announce || undefined} className={OPEN_PANE}>
      {announce ? <span className="sr-only">{w("loading")}</span> : null}
      <div aria-hidden className={cn("lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pt-8 lg:pb-8", INSET)}>
        <div className="flex items-center gap-4 border-b border-border pb-8 lg:gap-5">
          <span className={cn(DESK_BONE, "size-14 shrink-0 rounded-full lg:size-16")} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <BoneLine bone="h-5 w-40 lg:h-5.5 lg:w-48" text="text-xl lg:text-frame-figure" />
            <BoneLine bone="h-3.5 w-56 lg:h-4 lg:w-72" text="text-sm lg:text-frame-meta" />
          </div>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div className="flex flex-col gap-1.5 py-5 lg:py-6" key={row}>
              <BoneLine bone="h-3 w-2/5 lg:h-3.5" text="text-xs lg:text-frame-label" />
              <BoneLine bone="h-3.5 w-3/4 lg:h-4.5" text="text-sm lg:text-frame-body" />
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className={cn("flex shrink-0 justify-end gap-3 lg:py-6", INSET)}>
        <span className={cn(DESK_BONE, "h-10 w-24 rounded-full lg:h-12 lg:w-28")} />
        <span className={cn(DESK_BONE, "h-10 w-28 rounded-full lg:h-12 lg:w-32")} />
      </div>
    </div>
  );
}
