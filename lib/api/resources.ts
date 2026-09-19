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
  ApiNamedRecord,
  ApiOwnProfile,
  ApiPublicService,
  ApiPublicServiceQuery,
  ApiRatingSummary,
  ApiReview,
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

/** `GET /health` — unprefixed by nothing: it is `/api/v1/health` like the rest. */
export function getHealth(signal?: AbortSignal): Promise<{
  readonly status: "ok";
  readonly uptimeSeconds: number;
  readonly databaseLatencyMs: number;
}> {
  return api.get("health", { signal });
}
