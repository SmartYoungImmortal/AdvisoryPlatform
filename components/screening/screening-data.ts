/**
 * API calls for screening (`AdvisoryPlatformAPI/src/modules/screening`).
 *
 * Kept next to the screens, like `components/chat/chat-data.ts` and
 * `components/reviews/reviews-data.ts`, so it can be moved into the shared
 * `lib/api/resources.ts` later without changes.
 *
 * Rules the API enforces:
 * - A service has 1–5 questions, each required or optional. Answers are text, up to
 *   1,000 characters. Optional questions are skipped by leaving them out.
 * - One pending request per advisee and service. After a decline the advisee can
 *   apply again. An acceptance stays valid until the advisor replaces the
 *   questions, which makes it `EXPIRED`.
 * - Time slots and booking need an `ACCEPTED` request.
 *
 * Errors are shown in Thai. The API's `message` is English and meant for
 * developers, so each screen picks Thai text from the HTTP status (see
 * `screeningErrorKey`).
 */

import { loadErrorKind } from "@/components/mobile/live-state";
import { api, ApiError, type Paginated } from "@/lib/api/client";

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

/** `ScreeningRequestResponseDto`: the advisee's own request. */
export interface ApiScreeningRequest {
  readonly id: string;
  readonly serviceId: string;
  readonly status: ScreeningStatus;
  /** The advisor's optional decline message. */
  readonly decisionReason: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
}

/** `ServiceScreeningResponseDto`: everything the advisee's screens need. */
export interface ApiServiceScreening {
  readonly serviceId: string;
  readonly screeningRequired: boolean;
  readonly questions: readonly ApiScreeningQuestion[];
  /** The caller's latest request for this service, or null if they never applied. */
  readonly request: ApiScreeningRequest | null;
}

/** `AdvisorScreeningRequestResponseDto`: one row of the advisor's list. */
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
  /** Null until the advisor first opens the request (shows the unread dot). */
  readonly viewedAt: string | null;
}

/** `AdvisorScreeningRequestDetailResponseDto` */
export interface ApiAdvisorScreeningRequestDetail extends ApiAdvisorScreeningRequest {
  readonly answers: readonly {
    readonly questionId: string;
    /** The question text at the time it was answered. */
    readonly questionText: string;
    readonly answer: string;
  }[];
}

/* ------------------------------------------------------------------ advisee */

/**
 * `GET /services/:serviceId/screening`: needs sign-in. Returns 404 if the service
 * is not published.
 */
export function getServiceScreening(
  serviceId: string,
  signal?: AbortSignal,
): Promise<ApiServiceScreening> {
  return api.get(`services/${serviceId}/screening`, { signal });
}

/**
 * `POST /services/:serviceId/screening-requests`: returns 409 if a request is
 * already pending or accepted.
 */
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

/**
 * `GET /advisors/me/services/:serviceId/screening-questions`: your own services
 * only.
 */
export function listScreeningQuestions(
  serviceId: string,
  signal?: AbortSignal,
): Promise<readonly ApiScreeningQuestion[]> {
  return api.get(`advisors/me/services/${serviceId}/screening-questions`, { signal });
}

/**
 * `PUT /advisors/me/services/:serviceId/screening-questions`: replaces the whole
 * ordered list (1–5 questions). Earlier acceptances for this service expire.
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

/**
 * `GET /advisors/me/screening-requests`: newest first, across all your services.
 */
export function listScreeningRequests(
  query: { readonly status?: ScreeningStatus; readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiAdvisorScreeningRequest>> {
  return api.get("advisors/me/screening-requests", { query: { ...query }, signal });
}

/**
 * `GET /advisors/me/screening-requests/:id`: opening a request removes its unread
 * dot.
 */
export function getScreeningRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<ApiAdvisorScreeningRequestDetail> {
  return api.get(`advisors/me/screening-requests/${requestId}`, { signal });
}

/** `POST …/:id/accept`: returns 409 if it was already decided. */
export function acceptScreeningRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<ApiAdvisorScreeningRequest> {
  return api.post(`advisors/me/screening-requests/${requestId}/accept`, { signal });
}

/** `POST …/:id/decline`: the message is optional; an empty message is not sent. */
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

/** Cache keys, so a change can clear exactly the data it made out of date. */
export const screeningKeys = {
  service: (serviceId: string) => `screening/service/${serviceId}`,
  questions: (serviceId: string) => `screening/questions/${serviceId}`,
  requests: "screening/requests",
  request: (requestId: string) => `screening/requests/${requestId}`,
} as const;

/* ------------------------------------------------------------------ routing */

/** The advisee screen that matches the request's status. */
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
      // Never applied, or the acceptance expired: show the questions.
      return `/screening/questions${query}`;
  }
}

/* --------------------------------------------------------------------- copy */

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
 * Picks the Thai error message key. The caller says what 400 and 409 mean on its
 * screen, because the same status means different things on different screens.
 */
export function screeningErrorKey(
  error: unknown,
  meaning: {
    readonly badRequest?: ScreeningErrorKey;
    readonly conflict?: ScreeningErrorKey;
  } = {},
): ScreeningErrorKey {
  if (error instanceof ApiError) {
    if (error.status === 400 && meaning.badRequest) return meaning.badRequest;
    if (error.status === 409 && meaning.conflict) return meaning.conflict;
  }
  return loadErrorKind(error);
}
