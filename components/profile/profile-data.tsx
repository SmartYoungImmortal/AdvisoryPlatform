"use client";

import { useCallback } from "react";

import { api, ApiError, type Paginated } from "@/lib/api/client";
import { getOwnAvatarUrl, getOwnProfile, listMyBookings } from "@/lib/api/resources";
import type { ApiAvatarUrl, ApiBooking, ApiOwnProfile } from "@/lib/api/types";
import { useResource, type Resource } from "@/lib/api/use-resource";
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

/**
 * How many bookings this account has, from `GET /bookings/me`.
 *
 * The one real figure of the profile card's three. The API counts nothing about an
 * account — there is no sessions total and no reviews total anywhere in it — but a
 * paginated body carries `total`, so asking for a single row answers the count
 * without fetching the list. `limit: 1` is the whole point: this is a counter, and
 * the page of bookings belongs to `/bookings`.
 *
 * `undefined` while it loads or if it fails, so a caller falls back to the frame's
 * fixture rather than showing a confident zero for a number it does not have.
 */
export function useOwnBookingCount(): number | undefined {
  const fetcher = useCallback(
    (signal: AbortSignal) => listMyBookings({ limit: 1 }, signal),
    [],
  );
  const bookings = useResource<Paginated<ApiBooking>>("bookings/me?limit=1", fetcher);
  return bookings.data?.total;
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
}: {
  readonly size: number;
  readonly className?: string;
}) {
  const profile = useOwnProfile();
  const avatar = useOwnAvatarUrl();
  const box = { width: size, height: size };

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
