/**
 * One function per API route this app uses, and nothing else.
 *
 * Call sites never build a path or a query string; they call a named function, so
 * a route that moves is renamed in one file. Everything here returns the API's own
 * shape from `./types` — mapping those onto the shapes the screens want is a
 * separate step, and it belongs next to the screens, not here.
 *
 * ## What the API does not offer yet
 *
 * There is **no public advisor endpoint**. `advisors` has only `me` routes (own
 * profile) plus `:advisorId/reviews`, so nothing can list advisors or fetch one
 * advisor's public profile by id. The home page's advisor rail, the search
 * results' advisor names and the public advisor profile all need it. Until it
 * exists, an advisor's identity can only be inferred from a service's
 * `advisorId` and from review rows, and neither carries a name or an avatar.
 *
 * Also absent, and consumed by the admin console: accounts, identity
 * verification, refunds, reports, off-platform flags, payouts and the audit log.
 */

import { api, type Paginated } from "@/lib/api/client";
import type {
  ApiAvatarUrl,
  ApiBooking,
  ApiBookingInput,
  ApiCheckoutInput,
  ApiNamedRecord,
  ApiOwnProfile,
  ApiPageQuery,
  ApiPublicAdvisor,
  ApiPublicAdvisorQuery,
  ApiPublicService,
  ApiPublicServiceQuery,
  ApiRatingSummary,
  ApiRefundCase,
  ApiRefundCaseInput,
  ApiReview,
  ApiReviewInput,
  ApiSlot,
  ApiSlotQuery,
} from "@/lib/api/types";

/* ---------------------------------------------------------------- catalogue */

/** `GET /services` — public, paginated, filterable. */
export function listServices(
  query: ApiPublicServiceQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiPublicService>> {
  return api.get("services", { query: { ...query }, signal });
}

/** `GET /services/:serviceId` — public. */
export function getService(
  serviceId: string,
  signal?: AbortSignal,
): Promise<ApiPublicService> {
  return api.get(`services/${serviceId}`, { signal });
}

/**
 * `GET /services/:serviceId/slots` — the bookable windows in a date range.
 *
 * Both bounds are required and are plain dates, not timestamps; the API resolves
 * them against the advisor's availability rules.
 */
export function listServiceSlots(
  serviceId: string,
  range: ApiSlotQuery,
  signal?: AbortSignal,
): Promise<readonly ApiSlot[]> {
  return api.get(`services/${serviceId}/slots`, { query: { ...range }, signal });
}

/** `GET /service-categories` — public. */
export function listServiceCategories(
  signal?: AbortSignal,
): Promise<Paginated<ApiNamedRecord>> {
  return api.get("service-categories", { signal });
}

/** `GET /skills` — public. */
export function listSkills(signal?: AbortSignal): Promise<Paginated<ApiNamedRecord>> {
  return api.get("skills", { signal });
}

/* ----------------------------------------------------------------- advisors */

/**
 * `GET /advisors` — public, paginated.
 *
 * Discoverable means: has a profile, has an active unbanned account, and has at
 * least one published service. An advisor missing any of those is absent from
 * this list and 404s on the detail route, so a service whose advisor has been
 * suspended will not find a name here — see `listServices`'s callers.
 */
export function listAdvisors(
  query: ApiPublicAdvisorQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiPublicAdvisor>> {
  return api.get("advisors", { query: { ...query }, signal });
}

/** `GET /advisors/:advisorId` — public. 404s for an advisor who is not listed. */
export function getAdvisor(
  advisorId: string,
  signal?: AbortSignal,
): Promise<ApiPublicAdvisor> {
  return api.get(`advisors/${advisorId}`, { signal });
}

/* ------------------------------------------------------------------ reviews */

/** `GET /advisors/:advisorId/reviews` — public, paginated. */
export function listAdvisorReviews(
  advisorId: string,
  query: { readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiReview>> {
  return api.get(`advisors/${advisorId}/reviews`, { query: { ...query }, signal });
}

/**
 * `GET /advisors/:advisorId/reviews/summary` — public.
 *
 * The average and the five-bar histogram in one call, which is what a profile
 * header needs; counting it from a page of reviews would only ever describe that
 * page.
 */
export function getAdvisorRatingSummary(
  advisorId: string,
  signal?: AbortSignal,
): Promise<ApiRatingSummary> {
  return api.get(`advisors/${advisorId}/reviews/summary`, { signal });
}

/* --------------------------------------------------------------------- user */

/** `GET /users/me` — requires a session. */
export function getOwnProfile(signal?: AbortSignal): Promise<ApiOwnProfile> {
  return api.get("users/me", { signal });
}

/**
 * `GET /users/me/avatar` — a presigned URL for the stored avatar.
 *
 * `avatarKey` on a profile is a storage key and is not fetchable on its own; this
 * is the only way to render it. It expires, so it is fetched when needed rather
 * than cached with the profile.
 */
export function getOwnAvatarUrl(signal?: AbortSignal): Promise<ApiAvatarUrl> {
  return api.get("users/me/avatar", { signal });
}

/** `PATCH /users/me` — requires a session. */
export function updateOwnProfile(
  changes: {
    readonly displayName?: string;
    readonly fullName?: string;
    readonly timezone?: string;
  },
  signal?: AbortSignal,
): Promise<ApiOwnProfile> {
  return api.patch("users/me", { body: changes, signal });
}

/* ----------------------------------------------------------------- bookings */

/** `GET /bookings/me` — the signed-in advisee's own bookings. */
export function listOwnBookings(
  query: { readonly page?: number; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<Paginated<unknown>> {
  return api.get("bookings/me", { query: { ...query }, signal });
}

/**
 * `POST /bookings` — create one.
 *
 * The API takes a per-advisor advisory lock while it writes, which is why its
 * connection string must use Supabase's session pooler on 5432 and not the
 * transaction pooler on 6543. Nothing here can compensate for that being wrong.
 */
export function createBooking(
  input: {
    readonly serviceId: string;
    /** ISO 8601, and must be the start of a slot the slots endpoint returned. */
    readonly startTime: string;
  },
  signal?: AbortSignal,
): Promise<unknown> {
  return api.post("bookings", { body: input, signal });
}

/* ---------------------------------------------- bookings, with the DTO named */

/**
 * `GET /bookings/me` and `POST /bookings`, typed.
 *
 * `listOwnBookings` and `createBooking` above answer `unknown`, which is the one
 * shape a screen cannot render — they were written before `ApiBooking` existed.
 * These are the same two routes with the DTO named, added rather than tightened
 * in place. Once nothing calls the `unknown` pair, delete it and keep these.
 */
export function listMyBookings(
  query: ApiPageQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiBooking>> {
  return api.get("bookings/me", { query: { ...query }, signal });
}

/** `GET /bookings/:bookingId` — the advisee's own, or the advisor's on it. */
export function getBooking(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ApiBooking> {
  return api.get(`bookings/${bookingId}`, { signal });
}

/**
 * `POST /bookings` — hold a slot.
 *
 * Answers `PENDING_PAYMENT`: the range is blocked and nothing has been charged.
 * `startTime` must be a slot start `listServiceSlots` returned for this service,
 * to the millisecond — the API resolves it against the advisor's availability and
 * answers 400 for anything else. A slot another advisee took first comes back as
 * 409 with the API's own sentence.
 */
export function bookSlot(
  input: ApiBookingInput,
  signal?: AbortSignal,
): Promise<ApiBooking> {
  return api.post("bookings", { body: input, signal });
}

/**
 * `POST /bookings/:bookingId/cancel` — the advisee's own cancellation.
 *
 * Only `PENDING_PAYMENT` and `BOOKED` can be cancelled; anything else answers 409
 * naming the two states, which is a sentence worth showing as it stands. Whether
 * the time goes back to other advisees depends on the advisor's minimum notice,
 * and shows up as `blocksAvailability` on the row this returns.
 */
export function cancelBooking(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ApiBooking> {
  return api.post(`bookings/${bookingId}/cancel`, { signal });
}

/**
 * `POST /bookings/:bookingId/reschedule` — move it to another slot.
 *
 * **It answers a booking with a different `id`.** The API cancels the row it was
 * given and writes a new appointment at the new time, so a caller that keeps the
 * id it sent is holding a `CANCELLED` row. Verified live: rescheduling
 * `b5e023b0…` returned `b4fab5a7…`, and cancelling the original then failed with
 * "Booking cannot become CANCELLED unless it is PENDING_PAYMENT or BOOKED".
 */
export function rescheduleBooking(
  bookingId: string,
  /** ISO 8601, and a slot start the slots route returned. */
  startTime: string,
  signal?: AbortSignal,
): Promise<ApiBooking> {
  return api.post(`bookings/${bookingId}/reschedule`, {
    body: { startTime },
    signal,
  });
}

/* ------------------------------------------------------------- own reviews */

/**
 * `GET /bookings/:bookingId/review` — the review of one consultation.
 *
 * A review has no id of its own: the appointment's id is the review's, which is
 * why this is a subresource. **404 is the ordinary answer** for a consultation
 * nobody has reviewed, so a caller treats it as "none yet" and not as a failure.
 */
export function getBookingReview(
  bookingId: string,
  signal?: AbortSignal,
): Promise<ApiReview> {
  return api.get(`bookings/${bookingId}/review`, { signal });
}

/**
 * `POST /bookings/:bookingId/review` — leave one, once.
 *
 * 409 for a consultation that is not `COMPLETED` ("A consultation can only be
 * reviewed once it is completed") and for one already reviewed. Use `putBookingReview`
 * to change an existing one.
 */
export function createBookingReview(
  bookingId: string,
  input: ApiReviewInput,
  signal?: AbortSignal,
): Promise<ApiReview> {
  return api.post(`bookings/${bookingId}/review`, { body: input, signal });
}

/** `PUT /bookings/:bookingId/review` — replace the stars and the comment. */
export function putBookingReview(
  bookingId: string,
  input: ApiReviewInput,
  signal?: AbortSignal,
): Promise<ApiReview> {
  return api.put(`bookings/${bookingId}/review`, { body: input, signal });
}

/* ------------------------------------------------------------------ refunds */

/**
 * `POST /refunds` — dispute an invoice you paid.
 *
 * Gated on the `refund:submitSelf` permission, and the invoice's ownership is
 * resolved through its appointment rather than trusted from the body.
 *
 * Unreachable from this app today, and not because of the permission: the id it
 * needs belongs to `service_invoices`, and **no advisee-facing route returns an
 * invoice**. `GET /refunds/me` hands back an `invoiceId` on a case that already
 * exists, which is the wrong direction. Wiring a refund button needs a
 * `GET /invoices/me` first.
 */
export function openRefundCase(
  input: ApiRefundCaseInput,
  signal?: AbortSignal,
): Promise<ApiRefundCase> {
  return api.post("refunds", { body: input, signal });
}

/** `GET /refunds/me` — the cases this advisee opened. `refund:readSelf`. */
export function listMyRefundCases(
  query: ApiPageQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<ApiRefundCase>> {
  return api.get("refunds/me", { query: { ...query }, signal });
}

/* ------------------------------------------------------------------ payment */

/**
 * `POST /payment/checkout` — recorded here, callable by nothing.
 *
 * Three separate reasons, all on the API's side, and all worth writing down so
 * the next person does not rediscover them one at a time:
 *
 * 1. It answers **303 with a `Location`** to the provider's 3-D Secure page
 *    (`res.redirect(HttpStatus.SEE_OTHER, …)`). `lib/api/client.ts` uses fetch's
 *    default `redirect: "follow"`, so the browser would chase that hop into an
 *    origin with no CORS headers and the call would surface as
 *    `ApiUnreachableError`. A redirect is a browser navigation, not a fetch.
 * 2. `cardToken` must be an Omise token minted client-side by Omise's own
 *    script. Nothing in this app loads it, so the value cannot be produced.
 * 3. `PaymentService.checkout` still reads `@/mock/services` and
 *    `@/mock/invoices` and charges the mock price. It writes no appointment and
 *    no `service_invoices` row, so nothing downstream — the invoice screens, a
 *    refund case — would have anything to read afterwards.
 *
 * Until (1) becomes a JSON body carrying the redirect URL and (3) writes a real
 * invoice, the booking flow stops at `PENDING_PAYMENT`, which is what
 * `POST /bookings` honestly leaves behind.
 */
export function startCheckout(
  input: ApiCheckoutInput,
  signal?: AbortSignal,
): Promise<never> {
  return api.post("payment/checkout", { body: input, signal });
}

/** `GET /health` — unprefixed by nothing: it is `/api/v1/health` like the rest. */
export function getHealth(signal?: AbortSignal): Promise<{
  readonly status: "ok";
  readonly uptimeSeconds: number;
  readonly databaseLatencyMs: number;
}> {
  return api.get("health", { signal });
}
