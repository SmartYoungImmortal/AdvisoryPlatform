/**
 * better-auth, over its own REST endpoints.
 *
 * No client library. better-auth ships `createAuthClient`, and adding it would be
 * a dependency for four POSTs and a GET whose shapes are already known — every
 * response below was read off the running API, not out of documentation. The one
 * thing that genuinely matters is the cookie, and `lib/api/client` already sends
 * it on every request.
 *
 * ## Where these live
 *
 * `/api/auth/*`, **outside** the `/api/v1` prefix — `app.factory.ts` excludes
 * `api/auth/(.*)` from `setGlobalPrefix`. Hence `unprefixed: true` on each call;
 * getting that wrong produces a 404 that looks like a missing endpoint.
 *
 * ## The cookie, and the one thing that will break in production
 *
 * Signing in sets a session cookie, and from then on every call in this app is
 * authenticated by the browser without the app holding a token. That is why the
 * screens do not need to thread a session through: `credentials: "include"` is on
 * the client, so `GET /bookings/me` simply works once someone has signed in.
 *
 * The cookie is `SameSite=Lax`. Across two registrable domains — a frontend on
 * `*.workers.dev` and an API elsewhere — the browser will not attach it, so
 * sign-in appears to succeed and every request after it is anonymous.
 * `docs/DEPLOY.md:102-110` in the API repo states this. It works on localhost
 * because both sides share a registrable domain; it needs `app.<domain>` and
 * `api.<domain>`, or a proxy on the frontend's own origin, before a deployment.
 */

import { api } from "@/lib/api/client";

/**
 * better-auth's mount point, spelled out on every call.
 *
 * `unprefixed: true` only removes the client's `/api/v1`; it does not add anything
 * in its place. These paths were written as bare `sign-in/email`, which resolved to
 * `<host>/sign-in/email` and answered "Cannot POST /sign-in/email" from Nest's
 * router — every sign-in, from both doors, failed before better-auth saw it. The
 * curl tests that proved the flow typed the full path by hand, so they never went
 * through this file.
 */
const AUTH = "api/auth";

/**
 * The user as better-auth returns it.
 *
 * `name` rather than `displayName`: better-auth's TypeScript surface always calls
 * it `name`, and `auth.config.ts`'s `user.fields.name` only remaps which column it
 * reads. `role` is lowercase here (`"advisee"`), while `GET /api/v1/users/me`
 * returns `roles: ["ADVISEE"]` — two spellings of the same fact, from the plugin
 * and from the app's own resolver. Compare case-insensitively.
 */
export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image: string | null;
  readonly role: string | null;
  readonly banned: boolean;
  readonly banReason: string | null;
  readonly fullName: string;
  readonly avatarKey: string | null;
  readonly timezone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /api/auth/get-session` — `null` when there is no session. */
export interface AuthSession {
  readonly session: {
    readonly id: string;
    readonly token: string;
    readonly userId: string;
    readonly expiresAt: string;
  };
  readonly user: AuthUser;
}

/** `POST /api/auth/sign-in/email`. */
export interface SignInResponse {
  readonly redirect: boolean;
  readonly token: string;
  readonly user: AuthUser;
}

export function signIn(
  credentials: { readonly email: string; readonly password: string },
  signal?: AbortSignal,
): Promise<SignInResponse> {
  return api.post(`${AUTH}/sign-in/email`, {
    body: credentials,
    signal,
    unprefixed: true,
  });
}

/**
 * `POST /api/auth/sign-up/email`.
 *
 * `fullName` and `timezone` are required additional fields — `auth.config.ts`
 * declares `fullName` as `required: true`, so a sign-up without it is rejected by
 * better-auth rather than by our own validation.
 */
export function signUp(
  input: {
    readonly email: string;
    readonly password: string;
    /** The display name. better-auth calls this field `name`. */
    readonly name: string;
    readonly fullName: string;
    readonly timezone?: string;
  },
  signal?: AbortSignal,
): Promise<SignInResponse> {
  return api.post(`${AUTH}/sign-up/email`, {
    body: { timezone: "Asia/Bangkok", ...input },
    signal,
    unprefixed: true,
  });
}

export function signOut(signal?: AbortSignal): Promise<unknown> {
  return api.post(`${AUTH}/sign-out`, { signal, unprefixed: true });
}

/**
 * `GET /api/auth/get-session`.
 *
 * Answers 200 with `null` rather than 401 when nobody is signed in, so a caller
 * must check the body and not only the status. That is why this returns
 * `AuthSession | null` instead of throwing.
 */
export function getSession(signal?: AbortSignal): Promise<AuthSession | null> {
  return api.get(`${AUTH}/get-session`, { signal, unprefixed: true });
}

/**
 * `GET /api/auth/ok` — the liveness probe the Cloud Run workflow uses.
 *
 * Deliberately does not touch the database, so it answers whether the process
 * booted and nothing more. For "can this container serve a request", use
 * `getHealth` in `./resources`, which takes a connection and runs a statement.
 */
export function authOk(signal?: AbortSignal): Promise<unknown> {
  return api.get(`${AUTH}/ok`, { signal, unprefixed: true });
}

/** Whether a better-auth role string names an admin, either spelling. */
export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase().split(",").includes("admin");
}
