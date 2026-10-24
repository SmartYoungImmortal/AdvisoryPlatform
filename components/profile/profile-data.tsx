"use client";

import { useCallback } from "react";

import { BOOKING_BUCKET } from "@/components/bookings/booking-flow";
import { api, ApiError, type Paginated } from "@/lib/api/client";
import { getOwnAvatarUrl, getOwnProfile, listAdvisors, listMyBookings } from "@/lib/api/resources";
import type { ApiAvatarUrl, ApiBooking, ApiOwnProfile, ApiPublicAdvisor } from "@/lib/api/types";
import { useResource, type Resource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * The signed-in account, read from `GET /users/me`.
 *
 * `getOwnProfile`, `getOwnAvatarUrl` and `updateOwnProfile` already live in
 * `lib/api/resources.ts`; what is here is the two things that do not — the avatar
 * upload, and the hooks and the portrait the profile screens share.
 *
 * ## Two things the API's own shape forces
 *
 * `avatarKey` is a storage key, not a URL, and nothing can render it. The only
 * way to a picture is `GET /users/me/avatar`, which answers a **presigned URL
 * that expires in five minutes** — so it is read as its own resource rather than
 * cached alongside the profile.
 *
 * That route answers **404 "Avatar not found"** for an account with no avatar,
 * which is the ordinary case and not a failure: the seeded demo accounts all have
 * `avatarKey: null`. `useOwnAvatarUrl` turns that one status into `null` so the
 * portrait falls back to initials instead of a screen full of error card.
 *
 * ## `roles` is uppercase here and lowercase elsewhere
 *
 * `UserOwnProfileResponseDto` answers `roles: ["ADVISEE"]` — an array, upper
 * case. better-auth's own session answers `role: "advisee"` — a string, lower
 * case. `hasRole` compares case-insensitively for that reason; anything that
 * tests a role with `===` will be right on one route and wrong on the other.
 */

/** `POST /users/me/avatar` — multipart, field name `file`. A write. */
export function uploadOwnAvatar(
  file: File,
  signal?: AbortSignal,
): Promise<{ readonly avatarKey: string | null }> {
  const body = new FormData();
  body.append("file", file);
  return api.post("users/me/avatar", { body, signal });
}

/**
 * `MAX_AVATAR_BYTES` and `AVATAR_EXTENSIONS` — users/avatar.constants.ts. The API
 * accepts JPEG, PNG and WebP up to 5 MB and rejects everything else by name.
 */
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** True when this profile holds `role`, whichever case the route spelled it in. */
export function hasRole(profile: ApiOwnProfile | undefined, role: string): boolean {
  const want = role.toLowerCase();
  return (profile?.roles ?? []).some((held) => held.toLowerCase() === want);
}

/** `GET /users/me`. One cache key, so every screen that asks shares one request. */
export function useOwnProfile(): Resource<ApiOwnProfile> {
  return useResource<ApiOwnProfile>("users/me", getOwnProfile);
}

/**
 * `GET /users/me/avatar`, with 404 read as "there isn't one".
 *
 * Everything else — 401, an unreachable API, storage being down — stays an error,
 * because those are states the reader should be told about.
 */
export function useOwnAvatarUrl(): Resource<ApiAvatarUrl | null> {
  const fetcher = useCallback(async (signal: AbortSignal) => {
    try {
      return await getOwnAvatarUrl(signal);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) return null;
      throw cause;
    }
  }, []);
  return useResource<ApiAvatarUrl | null>("users/me/avatar", fetcher);
}

/** One booking, with what the live catalogue and the advisor list say about it. */
export type BookingEntry = {
  readonly booking: ApiBooking;
  /** The service as `/search` lists it (cover, price, rating); absent once unlisted. */
  readonly service: LiveService | undefined;
  readonly advisor: ApiPublicAdvisor | undefined;
};

export type BookingHistory = {
  readonly bookings: Resource<Paginated<ApiBooking>>;
  /** Open and still ahead of the clock, soonest first. */
  readonly upcoming: readonly BookingEntry[];
  /** Completed, missed or cancelled, newest first. */
  readonly past: readonly BookingEntry[];
  /** Completed only, newest first. */
  readonly completed: readonly BookingEntry[];
  /** The categories of what was booked, most booked first. */
  readonly categories: readonly string[];
};

/**
 * The account's bookings from `GET /bookings/me`, joined by id to the live
 * catalogue (the same lists `/search` reads, so the covers and prices match)
 * and to the advisor list. The profile and its edit page both read it; the
 * cache keys are shared, so the second one asks for nothing.
 *
 * 100 is the most one page holds. The API answers oldest first, so an
 * account past a hundred bookings would see its first hundred here.
 */
export function useBookingHistory(now: number): BookingHistory {
  const bookings = useResource<Paginated<ApiBooking>>(
    "bookings/me?limit=100",
    useCallback((signal: AbortSignal) => listMyBookings({ limit: 100 }, signal), []),
  );
  const catalogue = useLiveCatalogue();
  // The catalogue's own key, so this is a read of the list it already asked for.
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    useCallback((signal: AbortSignal) => listAdvisors({ limit: 100 }, signal), []),
  );

  const serviceById = new Map(catalogue.items.map((item) => [item.id, item]));
  const advisorById = new Map((advisors.data?.items ?? []).map((item) => [item.id, item]));
  const entries = (bookings.data?.items ?? []).map((booking) => ({
    booking,
    service: serviceById.get(booking.serviceId),
    advisor: advisorById.get(booking.advisorId),
  }));
  const at = (entry: BookingEntry) => Date.parse(entry.booking.startTime);

  // A held slot whose time has passed is neither coming nor done, so it is in
  // neither list, and the count of what is coming never disagrees with the list.
  const upcoming = entries
    .filter((entry) => BOOKING_BUCKET[entry.booking.state] === "upcoming" && at(entry) > now)
    .toSorted((a, b) => at(a) - at(b));
  const past = entries
    .filter((entry) => BOOKING_BUCKET[entry.booking.state] !== "upcoming")
    .toSorted((a, b) => at(b) - at(a));
  const completed = past.filter((entry) => entry.booking.state === "COMPLETED");

  const tally = new Map<string, number>();
  for (const { service } of entries) {
    if (service?.category) tally.set(service.category, (tally.get(service.category) ?? 0) + 1);
  }
  const categories = [...tally.entries()].toSorted((a, b) => b[1] - a[1]).map(([name]) => name);

  return { bookings, upcoming, past, completed, categories };
}

/** The first letter of the display name, which is all an initial can honestly be. */
function initial(profile: ApiOwnProfile | undefined): string {
  return profile?.displayName.trim().slice(0, 1) ?? "";
}

/**
 * The account's own portrait: the presigned photograph where there is one, the
 * display name's initial on the muted step where there is not.
 *
 * `next/image` is configured `unoptimized` and its `remotePatterns` list only the
 * R2 assets bucket, so a presigned URL from the API's own storage cannot go
 * through it — hence a plain `<img>`, which is also the right call for a URL that
 * expires before any cache would help.
 */
export function OwnAvatar({
  size,
  className,
  fluid = false,
}: {
  /** The intrinsic size, and the drawn size unless `fluid`. */
  readonly size: number;
  readonly className?: string;
  /**
   * Drawn at whatever size `className` gives it, for a portrait that changes
   * size with the breakpoint: an inline size would beat any class.
   */
  readonly fluid?: boolean;
}) {
  const profile = useOwnProfile();
  const avatar = useOwnAvatarUrl();
  const box = fluid ? undefined : { width: size, height: size };

  if (avatar.data) {
    return (
      /* A presigned URL from the API's own storage, valid for five minutes.
         `next/image` validates every remote src against `remotePatterns` in
         next.config.ts — which lists the R2 assets bucket and nothing else — so
         it would throw on this host, and there is nothing for it to optimise on a
         URL that expires before a cache would help. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
        height={size}
        src={avatar.data.url}
        style={box}
        width={size}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
      style={box}
    >
      {initial(profile.data)}
    </span>
  );
}
