/**
 * The screening half of the API — `AdvisoryPlatformAPI/src/modules/screening`.
 *
 * Kept beside the screens, the way `components/chat/chat-data.ts` and
 * `components/reviews/reviews-data.ts` keep theirs: `lib/api/resources.ts` is
 * shared, and every export here is written to be moved there verbatim.
 *
 * ## The rules the API enforces, which the screens lean on
 *
 * - A service has 1–5 questions, each required or optional; answers are text up
 *   to 1,000 characters. Optional questions are answered by leaving them out.
 * - One **pending** request per advisee and service. After a decline the advisee
 *   may apply again; an acceptance lasts until the advisor replaces the questions,
 *   which turns it `EXPIRED`.
 * - Slots and booking already refuse without an `ACCEPTED` request.
 *
 * ## Errors are shown in Thai, never as the API's sentence
 *
 * The API's `message` is English and written for developers. A screen picks its
 * Thai copy from the HTTP status and what it was doing — see `screeningErrorKey`.
 */

import { api, ApiError, ApiUnreachableError, type Paginated } from "@/lib/api/client";

export const SCREENING_MAX_QUESTIONS = 5;
export const SCREENING_QUESTION_MAX_LENGTH = 500;
export const SCREENING_ANSWER_MAX_LENGTH = 1_000;
export const SCREENING_DECLINE_MESSAGE_MAX_LENGTH = 1_000;

/* -------------------------------------------------------------------- shapes */

export type ScreeningStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

/** `ScreeningQuestionResponseDto` */
export interface ApiScreeningQuestion {
  readonly id: string;
  readonly question: string;
  readonly isRequired: boolean;
  readonly displayOrder: number;
}

/** `ScreeningRequestResponseDto` — the advisee's own view of a request. */
export interface ApiScreeningRequest {
  readonly id: string;
  readonly serviceId: string;
  readonly status: ScreeningStatus;
  /** The advisor's optional decline message. */
  readonly decisionReason: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
}

/** `ServiceScreeningResponseDto` — everything the advisee's screens need. */
export interface ApiServiceScreening {
  readonly serviceId: string;
  readonly screeningRequired: boolean;
  readonly questions: readonly ApiScreeningQuestion[];
  /** The caller's latest request for this service, or null if they never applied. */
  readonly request: ApiScreeningRequest | null;
}

/** `AdvisorScreeningRequestResponseDto` — one row of the advisor's list. */
export interface ApiAdvisorScreeningRequest {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly adviseeId: string;
  readonly adviseeDisplayName: string;
  readonly status: ScreeningStatus;
  readonly decisionReason: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
  /** Null until the advisor first opens the request — the unread dot. */
  readonly viewedAt: string | null;
}

/** `AdvisorScreeningRequestDetailResponseDto` */
export interface ApiAdvisorScreeningRequestDetail extends ApiAdvisorScreeningRequest {
  readonly answers: readonly {
    readonly questionId: string;
    /** The question as worded when it was answered. */
    readonly questionText: string;
    readonly answer: string;
  }[];
}

/* ------------------------------------------------------------------ advisee */

/** `GET /services/:serviceId/screening` — signed in. 404 for an unpublished service. */
export function getServiceScreening(
  serviceId: string,
  signal?: AbortSignal,
): Promise<ApiServiceScreening> {
  return api.get(`services/${serviceId}/screening`, { signal });
}

/** `POST /services/:serviceId/screening-requests` — 409 while one is pending or accepted. */
export function submitScreeningAnswers(
  serviceId: string,
  answers: readonly { readonly questionId: string; readonly answer: string }[],
  signal?: AbortSignal,
): Promise<ApiScreeningRequest> {
  return api.post(`services/${serviceId}/screening-requests`, {
    body: { answers },
    signal,
  });
}

/* ------------------------------------------------------------------ advisor */

/** `GET /advisors/me/services/:serviceId/screening-questions` — own services only. */
export function listScreeningQuestions(
  serviceId: string,
  signal?: AbortSignal,
): Promise<readonly ApiScreeningQuestion[]> {
  return api.get(`advisors/me/services/${serviceId}/screening-questions`, { signal });
}

/**
 * `PUT /advisors/me/services/:serviceId/screening-questions` — replaces the whole
 * ordered list (1–5). Earlier acceptances on this service expire.
 */
export function replaceScreeningQuestions(
  serviceId: string,
  questions: readonly { readonly question: string; readonly isRequired: boolean }[],
  signal?: AbortSignal,
): Promise<readonly ApiScreeningQuestion[]> {
  return api.put(`advisors/me/services/${serviceId}/screening-questions`, {
    body: { questions },
    signal,
  });
}

/** `GET /advisors/me/screening-requests` — newest first, across every own service. */
export function listScreeningRequests(
  query: { readonly status?: ScreeningStatus; readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiAdvisorScreeningRequest>> {
  return api.get("advisors/me/screening-requests", { query: { ...query }, signal });
}

/** `GET /advisors/me/screening-requests/:id` — opening it clears the unread dot. */
export function getScreeningRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<ApiAdvisorScreeningRequestDetail> {
  return api.get(`advisors/me/screening-requests/${requestId}`, { signal });
}

/** `POST …/:id/accept` — 409 if it was already decided. */
export function acceptScreeningRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<ApiAdvisorScreeningRequest> {
  return api.post(`advisors/me/screening-requests/${requestId}/accept`, { signal });
}

/** `POST …/:id/decline` — the message is optional; an empty one is not sent. */
export function declineScreeningRequest(
  requestId: string,
  message: string,
  signal?: AbortSignal,
): Promise<ApiAdvisorScreeningRequest> {
  const trimmed = message.trim();
  return api.post(`advisors/me/screening-requests/${requestId}/decline`, {
    body: trimmed ? { message: trimmed } : {},
    signal,
  });
}

/** Cache keys, so a write can drop exactly the reads it made stale. */
export const screeningKeys = {
  service: (serviceId: string) => `screening/service/${serviceId}`,
  questions: (serviceId: string) => `screening/questions/${serviceId}`,
  requests: "screening/requests",
  request: (requestId: string) => `screening/requests/${requestId}`,
} as const;

/* ------------------------------------------------------------------ routing */

/** Which advisee screen a request's state belongs on. */
export function adviseeScreeningPath(
  serviceId: string,
  request: ApiScreeningRequest | null,
): string {
  const query = `?serviceId=${serviceId}`;
  switch (request?.status) {
    case "PENDING":
      return `/screening/submitted${query}`;
    case "ACCEPTED":
      return `/screening/accepted${query}`;
    case "DECLINED":
      return `/screening/declined${query}`;
    default:
      // Never applied, or the acceptance expired: answer (again).
      return `/screening/questions${query}`;
  }
}

/* --------------------------------------------------------------------- copy */

/**
 * "10 นาที", "2 ชม.", "เมื่อวาน" — the shape the requests list draws — as a key
 * and a count for the screen to translate. Older than yesterday is a date.
 */
export function elapsedKey(
  iso: string,
  now: number,
):
  | { readonly key: "justNow" | "yesterday" }
  | { readonly key: "minutesAgo" | "hoursAgo"; readonly count: number }
  | { readonly key: "date"; readonly date: Date } {
  const date = new Date(iso);
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return { key: "justNow" };
  if (minutes < 60) return { key: "minutesAgo", count: minutes };
  if (minutes < 24 * 60) return { key: "hoursAgo", count: Math.floor(minutes / 60) };
  if (minutes < 48 * 60) return { key: "yesterday" };
  return { key: "date", date };
}

export type ScreeningErrorKey =
  | "offline"
  | "notFound"
  | "server"
  | "errorAlreadyPending"
  | "errorAlreadyAccepted"
  | "errorAlreadyDecided"
  | "errorInvalidAnswers"
  | "errorNotAvailable";

/**
 * Which Thai message an error deserves. The caller says what a 400 and a 409
 * mean where it is, because the same status means different things on
 * different screens.
 */
export function screeningErrorKey(
  error: unknown,
  meaning: {
    readonly badRequest?: ScreeningErrorKey;
    readonly conflict?: ScreeningErrorKey;
  } = {},
): ScreeningErrorKey {
  if (error instanceof ApiUnreachableError) return "offline";
  if (error instanceof ApiError) {
    if (error.status === 404) return "notFound";
    if (error.status === 400 && meaning.badRequest) return meaning.badRequest;
    if (error.status === 409 && meaning.conflict) return meaning.conflict;
  }
  return "server";
}
