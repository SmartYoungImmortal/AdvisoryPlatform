"use client";

import { useCallback } from "react";

import { hasRole, useOwnProfile } from "@/components/profile/profile-data";
import { listAllAdvisorBookings, type AdvisorBooking } from "@/lib/api/advisor-bookings";
import { countPendingScreeningRequests, listMyPayouts, type ApiPayout } from "@/lib/api/advisor-work";
import type { Paginated } from "@/lib/api/client";
import { getAdvisorRatingSummary } from "@/lib/api/resources";
import type { ApiOwnProfile, ApiRatingSummary } from "@/lib/api/types";
import { useResource, type Resource } from "@/lib/api/use-resource";

/**
 * What the work desk and the advisor's profile read, each under the cache key
 * the other screens already use for the same route, so moving between them
 * does not ask again: the bookings under the calendar's key, the rating under
 * the public profile's.
 */

/** The signed-in account's id when it is an advisor; `null` for anyone else, `undefined` until known. */
export function useOwnAdvisorId(): string | null | undefined {
  const profile = useOwnProfile();
  if (!profile.data) return profile.error ? null : undefined;
  return hasRole(profile.data, "advisor") ? profile.data.id : null;
}

export function useRatingSummary(advisorId: string): Resource<ApiRatingSummary> {
  const fetcher = useCallback((signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal), [advisorId]);
  return useResource<ApiRatingSummary>(`advisors/${advisorId}/reviews/summary`, fetcher);
}

/** Every booking made with the advisor, all pages: the calendar's read. */
export function useAdvisorBookings(profile: ApiOwnProfile): Resource<AdvisorBooking[]> {
  const fetcher = useCallback((signal: AbortSignal) => listAllAdvisorBookings(signal), []);
  return useResource<AdvisorBooking[]>(`advisors/${profile.id}/bookings/all`, fetcher);
}

export function usePendingScreening(): Resource<number> {
  const fetcher = useCallback((signal: AbortSignal) => countPendingScreeningRequests(signal), []);
  return useResource<number>("advisors/me/screening-requests?status=PENDING", fetcher);
}

export function usePayouts(): Resource<Paginated<ApiPayout>> {
  const fetcher = useCallback((signal: AbortSignal) => listMyPayouts(signal), []);
  return useResource<Paginated<ApiPayout>>("advisors/me/payouts", fetcher);
}
