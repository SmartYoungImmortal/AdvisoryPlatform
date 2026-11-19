/**
 * API calls for the free trial (`AdvisoryPlatformAPI/src/modules/trials`).
 *
 * Kept next to the screens, like `components/screening/screening-data.ts`.
 *
 * Rules the API enforces:
 * - The advisee asks from the service's page. The ask opens their chat room
 *   with the advisor (or joins the one they already have for this service),
 *   and shows there as a card. The advisor grants or declines it from the card.
 * - One ask per advisee and service, whatever the answer (a second is 409). A
 *   declined advisee can still book a paid session.
 * - Screening does not gate a trial.
 * - A granted trial books once, free (`trialBookingId` names that booking). A
 *   cancelled trial booking gives the trial back.
 */

import { api } from "@/lib/api/client";

export const TRIAL_DECLINE_MESSAGE_MAX_LENGTH = 1_000;

/* -------------------------------------------------------------------- shapes */

export type TrialStatus = "PENDING" | "GRANTED" | "DECLINED";

/** `TrialRequestResponseDto`: one request, as its card shows it to either side. */
export interface ApiTrialRequest {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly adviseeId: string;
  readonly advisorId: string;
  readonly chatRoomId: string;
  /** The service's trial length now; null if it stopped offering one. */
  readonly trialDurationMinutes: number | null;
  /** The booking a granted trial became, unless it was cancelled. */
  readonly trialBookingId: string | null;
  readonly status: TrialStatus;
  /** The advisor's optional message with a decline. */
  readonly decisionReason: string | null;
  readonly createdAt: string;
  readonly decidedAt: string | null;
}

/** `ServiceTrialResponseDto`: a service's trial as the signed-in advisee sees it. */
export interface ApiServiceTrial {
  readonly serviceId: string;
  readonly trialEnabled: boolean;
  readonly trialDurationMinutes: number | null;
  /** The caller's request for it, or null before they ask. */
  readonly request: ApiTrialRequest | null;
}

/* ------------------------------------------------------------------ advisee */

/** `GET /services/:serviceId/trial`: needs sign-in; 404 if the service is not published. */
export function getServiceTrial(serviceId: string, signal?: AbortSignal): Promise<ApiServiceTrial> {
  return api.get(`services/${serviceId}/trial`, { signal });
}

/** `POST /services/:serviceId/trial-requests`: 409 if they asked before, 400 if there is no trial. */
export function requestTrial(serviceId: string, signal?: AbortSignal): Promise<ApiTrialRequest> {
  return api.post(`services/${serviceId}/trial-requests`, { signal });
}

/* ---------------------------------------------------------------- chat room */

/** `GET /chat/rooms/:chatRoomId/trial-requests`: the room's cards, oldest first; members only. */
export function listRoomTrials(chatRoomId: string, signal?: AbortSignal): Promise<readonly ApiTrialRequest[]> {
  return api.get(`chat/rooms/${chatRoomId}/trial-requests`, { signal });
}

/* ------------------------------------------------------------------ advisor */

/** `POST /advisors/me/trial-requests/:id/grant`: 409 if it was already decided. */
export function grantTrial(requestId: string, signal?: AbortSignal): Promise<ApiTrialRequest> {
  return api.post(`advisors/me/trial-requests/${requestId}/grant`, { signal });
}

/** `POST …/:id/decline`: the message is optional; an empty one is not sent. */
export function declineTrial(requestId: string, message: string, signal?: AbortSignal): Promise<ApiTrialRequest> {
  const trimmed = message.trim();
  return api.post(`advisors/me/trial-requests/${requestId}/decline`, {
    body: trimmed ? { message: trimmed } : {},
    signal,
  });
}

/** Cache keys, so a change can clear exactly the data it made out of date. */
export const trialKeys = {
  service: (serviceId: string) => `trials/service/${serviceId}`,
  room: (chatRoomId: string) => `trials/room/${chatRoomId}`,
} as const;

/**
 * The room's cards, each in its newest state: the list read from the API,
 * with any card that changed since (a live `chat:trial`, or the advisor's own
 * answer) put in its place, and any new one added. Oldest first.
 */
export function mergeTrials(
  listed: readonly ApiTrialRequest[],
  changed: readonly ApiTrialRequest[],
): readonly ApiTrialRequest[] {
  const byId = new Map(listed.map((request) => [request.id, request]));
  for (const request of changed) byId.set(request.id, request);
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
}
