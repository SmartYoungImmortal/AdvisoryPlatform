/**
 * The two review routes `lib/api/resources.ts` does not have yet.
 *
 * The advisee half — `GET|POST|PUT /bookings/:bookingId/review` — is already
 * there as `getBookingReview`, `createBookingReview` and `putBookingReview`, and
 * so is the public pair, `listAdvisorReviews` and `getAdvisorRatingSummary`. What
 * is missing is the advisor's own side: the list of reviews written about them,
 * and the reply. Both belong in `lib/api/resources.ts` and are written to be
 * moved there verbatim.
 */

import { api, type Paginated } from "@/lib/api/client";
import type { ApiReview } from "@/lib/api/types";

/**
 * `GET /advisors/me/reviews` — every review of the signed-in advisor's own
 * consultations, offset-paginated.
 *
 * Declared before `:advisorId` inside one controller on purpose, so `me` cannot
 * be captured by the UUID pipe. An **advisee** calling it gets an empty page
 * rather than a 403 — verified live — so an empty list here means "none", never
 * "not allowed".
 */
export function listOwnAdvisorReviews(
  query: { readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiReview>> {
  return api.get("advisors/me/reviews", { query: { ...query }, signal });
}

/**
 * `PATCH /advisors/me/reviews/:bookingId/reply` — write or rewrite the reply.
 *
 * A write. The booking's id addresses the review, because a review has no id of
 * its own. `@MinLength(1)` after `@Trim`, so a blank body is a 400 rather than a
 * stored empty reply: clearing one is not a case this route serves.
 */
export function replyToReview(
  bookingId: string,
  reply: string,
  signal?: AbortSignal,
): Promise<ApiReview> {
  return api.patch(`advisors/me/reviews/${bookingId}/reply`, {
    body: { reply },
    signal,
  });
}

/**
 * `REVIEW_TEXT_MAX_LENGTH` — reviews/reviews.constants.ts. The comment and the
 * reply share the chat message's 4,000, rather than inventing a second number.
 */
export const REVIEW_TEXT_MAX_LENGTH = 4_000;

export const REVIEW_STARS_MIN = 1;
export const REVIEW_STARS_MAX = 5;

/* ---------------------------------------------------------------------- copy */

/**
 * The shape of a `useTranslations` result this file needs.
 *
 * Method shorthand, not function properties: `globals.ts` augments next-intl's
 * `AppConfig` with the catalogue, so the real `t.has` is typed to the keys the
 * catalogue *has*, and under `strictFunctionTypes` a property-style
 * `(key: string) => boolean` would refuse it.
 */
type Translator = {
  has(key: string): boolean;
  raw(key: string): unknown;
};

/**
 * A string that belongs in `messages/th.json` and is not there yet: the key wins
 * the moment it exists, with no edit here.
 *
 * The twin of `pendingCopy` in `components/chat/chat-data.ts`, duplicated rather
 * than imported across two component directories that have no business depending
 * on each other. Both want to be one helper in a shared i18n module — that is a
 * file neither of these owns, so it is named here instead of reached for.
 */
export function pendingCopy(t: Translator, key: string, fallback: string): string {
  return t.has(key) ? String(t.raw(key)) : fallback;
}

/** Every `reviews.*` key these screens ask for and `messages/th.json` lacks. */
export const PENDING_REVIEW_COPY = {
  submitReview: "ส่งรีวิว",
  noBookingTitle: "ไม่มีการปรึกษาที่จะรีวิว",
  noBookingBody: "เปิดหน้านี้จากรายการจองที่จบแล้ว ระบบจะรู้ว่าคุณกำลังรีวิวครั้งไหน",
} as const;
