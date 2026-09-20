"use client";

import { useSyncExternalStore } from "react";

import {
  isAdminRole,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
} from "@/lib/api/auth";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { getOwnProfile, updateOwnProfile } from "@/lib/api/resources";
import type { ApiOwnProfile } from "@/lib/api/types";
import type { Account, Role } from "@/lib/mock-db/types";

/**
 * Who is signed in, against the real API.
 *
 * This is a facade: the endpoints live in `lib/api/auth`, the envelope and the
 * cookie live in `lib/api/client`, and what the 16 screens that import this file
 * see is the same handful of names they saw when the session was a row in
 * localStorage. What changed underneath is the one thing a facade cannot hide:
 * **reading the session is now a round trip**, so `useSession` starts at
 * `loading` on every page view and a caller that treats `loading` as
 * `anonymous` will flash a signed-out screen at a signed-in reader.
 *
 * ## Why the account is read from `/api/v1/users/me` and not from `get-session`
 *
 * Two reasons, both proved against the running API rather than reasoned from the
 * docs.
 *
 * The first is that `/api/auth/*` is **not** wrapped in the Nest envelope — the
 * better-auth handler is mounted as Express middleware, so its responses never
 * reach `TransformInterceptor`. `lib/api/client`'s `unwrap` returns
 * `envelope.data`, which for a raw better-auth body is `undefined`; and
 * `get-session` signed out answers a literal `null` body, where reading `.data`
 * throws outright. So `signIn`, `signUp` and `getSession` resolve to `undefined`
 * (or reject with a `TypeError`) on the paths that *succeed*. Their failure path
 * is fine — a better-auth error body is `{message, code}`, and `message` is
 * exactly what `ApiError` wants. This file therefore uses those three calls for
 * their side effect and their error, and never for their value.
 *
 * The second reason is the one that would have been a silent bug. better-auth's
 * `user.role` is the admin plugin's own column, and it is **not** the app's
 * role: `araya.s@advisory.demo`, a seeded advisor, comes back from sign-in as
 * `role: "advisee"`, while `GET /api/v1/users/me` answers
 * `roles: ["ADVISEE", "ADVISOR"]`. Routing on the sign-in body would have sent
 * every advisor to the advisee's home. `/users/me` is the app's own resolver and
 * is the only answer to "what may this person do"; it is also properly
 * enveloped, and it answers 401 rather than a null body when nobody is signed
 * in, which is a far better signal to build a three-state session on.
 */

/**
 * Kept because it is exported, and for nothing else.
 *
 * Locking an account after five wrong passwords was a mock-database behaviour:
 * the store owned `failedLogins` and could count. better-auth has no lockout and
 * publishes no remaining-attempts figure, so nothing here can honestly say "two
 * tries left" — and a number invented on the client is worse than no number. The
 * login screen shows the API's own sentence instead.
 */
export const MAX_FAILED_LOGINS = 5;

export type Session =
  | { readonly status: "loading" }
  | { readonly status: "anonymous" }
  | { readonly status: "authenticated"; readonly account: Account };

const LOADING: Session = { status: "loading" };
const ANONYMOUS: Session = { status: "anonymous" };

/* ------------------------------------------------------------------ mapping */

/**
 * `roles` is a list, and roles nest: every account carries `ADVISEE`, an advisor
 * carries `ADVISOR` on top of it and an admin carries `ADMIN`. The screens ask
 * one question — which home, which tab set, which guard — so the list collapses
 * to the most privileged member, admin first.
 *
 * `isAdminRole` takes the comma-joined form because that is the shape
 * better-auth's own column uses; joining here is what lets the two spellings
 * (`"admin"` and `["ADVISEE","ADMIN"]`) go through one predicate.
 */
function principalRole(roles: readonly string[]): Role {
  const held = roles.map((role) => role.toLowerCase());
  if (isAdminRole(held.join(","))) return "admin";
  if (held.includes("advisor")) return "advisor";
  return "advisee";
}

/**
 * The API's own profile, in the vocabulary the screens already speak.
 *
 * `Account` is a mock-database type and stays one on purpose: sixteen files read
 * `session.account.name`, `.role`, `.avatar`, `.stats` today, and swapping the
 * shape underneath them is a separate change from swapping the source. Four of
 * its fields have no answer on this endpoint, and each is wrong in a way worth
 * stating rather than hiding:
 *
 * - `password` is empty and always will be. It was plain text in a fixture.
 * - `phone` is empty: the API neither returns nor accepts one on this route.
 * - `avatar` is `null` because `AvatarKey` is a union of five bundled portraits
 *   and `avatarKey` is an arbitrary storage key. Rendering it needs
 *   `GET /users/me/avatar`, which presigns it; until a screen asks for that, the
 *   initials fallback is the honest answer rather than someone else's photo.
 * - `advisor` is `null`: the advisor profile, level and rating live behind
 *   `/advisors/me`, not here. `AccountLevelBadge` shows its `none` state, which
 *   is the same thing an unverified advisor sees.
 *
 * `status` is `active` because a banned account cannot reach this code at all —
 * better-auth refuses the sign-in — and `failedLogins`/`lastLoginAt` are figures
 * the API does not keep.
 */
function toAccount(profile: ApiOwnProfile): Account {
  return {
    id: profile.id,
    name: profile.displayName,
    fullName: profile.fullName ?? profile.displayName,
    email: profile.email,
    password: "",
    phone: "",
    role: principalRole(profile.roles),
    status: "active",
    avatar: null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastLoginAt: null,
    failedLogins: 0,
    suspension: null,
    advisor: null,
    stats: { sessions: 0, bookings: 0, reviews: 0 },
  };
}

/* -------------------------------------------------------------------- store */

let session: Session = LOADING;
let started = false;
const listeners = new Set<() => void>();

function publish(next: Session): void {
  session = next;
  for (const listener of listeners) listener();
}

function snapshot(): Session {
  return session;
}

/**
 * `/users/me`, turned into a session. Any failure is anonymity: a 401 is the
 * ordinary signed-out answer, and an unreachable API is indistinguishable from
 * it as far as a screen is concerned — there is nobody to show. A sign-in
 * attempt reports the difference, because there the reader is owed a reason.
 */
async function readSession(): Promise<Session> {
  try {
    return { status: "authenticated", account: toAccount(await getOwnProfile()) };
  } catch {
    return ANONYMOUS;
  }
}

/**
 * Started from `subscribe`, i.e. from an effect, and never from `snapshot` —
 * `useSyncExternalStore` calls the snapshot during render, where a fetch would
 * be a side effect in the render pass. Resolving through a promise even in the
 * not-configured case keeps the first notification on a microtask, so no
 * listener is ever called synchronously inside `subscribe`.
 */
function load(): void {
  if (started) return;
  started = true;
  void (isApiConfigured ? readSession() : Promise.resolve(ANONYMOUS)).then(publish);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `loading` until `/users/me` answers — on the static render, through hydration,
 * and for as long as the request takes.
 *
 * This used to be a synchronous localStorage read, so `loading` existed only
 * until hydration and every consumer could treat it as "not signed in yet,
 * about to be correct in a millisecond". It cannot be treated that way now.
 */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, snapshot, () => LOADING);
}

/**
 * The signed-in account right now, outside React.
 *
 * Reads the cache; it does not fetch. Before the first `useSession` has settled
 * this answers `null`, which is the same answer it gives for a signed-out
 * visitor — so it is a convenience for code that already knows a session
 * exists, not a way to ask whether one does.
 */
export function currentAccount(): Account | null {
  return session.status === "authenticated" ? session.account : null;
}

/** Where each role lands after signing in. */
export function roleHome(role: Role): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "advisor") return "/work";
  return "/";
}

/**
 * A `?next=` value is only followed when it is a path on this site, so a crafted
 * link cannot bounce a fresh session somewhere else.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

/* ---------------------------------------------------------------- signing in */

export type SignInResult =
  | { readonly ok: true; readonly account: Account }
  | {
      readonly ok: false;
      /**
       * One reason per sentence a screen can honestly say, and no more.
       *
       * - `invalid` — the API's 401. It answers `"Invalid email or password"`
       *   for a wrong password and for an email it has never seen alike, which
       *   is what the auth frames asked for anyway.
       * - `suspended` — its 403. In a browser this can only be a banned
       *   account: an untrusted origin has no `Access-Control-Allow-Origin` on
       *   the response, so CORS rejects it before any status is readable and it
       *   arrives as `unreachable` instead.
       * - `failed` — any other status. A 500 is not a wrong password, and
       *   saying so sends people to reset a password that was fine.
       * - `unreachable` — the request never arrived: offline, DNS, CORS, or a
       *   build made without `NEXT_PUBLIC_API_URL`.
       * - `forbidden` — the right password at the wrong door. Decided here, not
       *   by the API; see `options.allow`.
       * - `locked` — never produced. There is no lockout (see
       *   `MAX_FAILED_LOGINS`); it stays in the union because the locked frame
       *   still opens on its own route and maps copy off this name.
       */
      readonly reason:
        | "invalid"
        | "locked"
        | "suspended"
        | "forbidden"
        | "failed"
        | "unreachable";
      /** The API's own sentence, when the API answered. Safe to show. */
      readonly message?: string;
    };

function rejected(cause: unknown): SignInResult {
  if (!(cause instanceof ApiError)) return { ok: false, reason: "unreachable" };
  const reason =
    cause.status === 401 ? "invalid" : cause.status === 403 ? "suspended" : "failed";
  return { ok: false, reason, message: cause.message };
}

/**
 * Sign in, then read who that turned out to be.
 *
 * Two calls, not one, and both are necessary: the POST is what sets the cookie,
 * and `/users/me` is the only endpoint that knows the app's roles. The cookie is
 * in place by the time the POST resolves, so the profile read is authenticated
 * without anything being threaded through by hand.
 *
 * `options.allow` is the admin console's door. The API has no notion of a
 * role-restricted sign-in, so the session really is created and then thrown away
 * again — the `signOut` is not decoration. Anything else would leave a
 * non-admin holding a valid cookie because they typed their own password into
 * the wrong form.
 */
export async function signIn(
  email: string,
  password: string,
  options: { readonly allow?: readonly Role[] } = {},
): Promise<SignInResult> {
  try {
    await authSignIn({ email: email.trim(), password });
  } catch (cause) {
    return rejected(cause);
  }

  let account: Account;
  try {
    account = toAccount(await getOwnProfile());
  } catch (cause) {
    // Signed in, but we cannot say as whom. Reported rather than guessed: a
    // session whose role is unknown must not be allowed to pick a home route.
    await signOut();
    return rejected(cause);
  }

  if (options.allow && !options.allow.includes(account.role)) {
    await signOut();
    return { ok: false, reason: "forbidden" };
  }

  publish({ status: "authenticated", account });
  return { ok: true, account };
}

/**
 * Drop the session here first, then ask the API to drop its cookie.
 *
 * That order is deliberate. Callers navigate away the moment this is called —
 * `components/profile/log-out-dialog` does a full `window.location.replace` —
 * and a navigation cancels an in-flight request, so the local half has to have
 * happened already. The POST is still awaited for callers that can wait.
 */
export async function signOut(): Promise<void> {
  publish(ANONYMOUS);
  try {
    await authSignOut();
  } catch {
    // The cookie may outlive this tab's idea of the session. Nothing a screen
    // can do about it, and the next `/users/me` is the authority either way.
  }
}

/* ----------------------------------------------------------------- signing up */

export type RegisterInput = {
  readonly name: string;
  readonly fullName: string;
  readonly email: string;
  /** Dropped: `POST /sign-up/email` has nowhere to put it. */
  readonly phone: string;
  readonly password: string;
};

export type RegisterResult =
  | { readonly ok: true; readonly account: Account }
  | {
      readonly ok: false;
      /**
       * `email-in-use` is the API's 422 (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`),
       * which is the one failure the register frame draws its own state for.
       * `rejected` is anything else it refused — a password better-auth reads as
       * too short, a missing required field — and carries the API's sentence.
       */
      readonly reason: "email-in-use" | "rejected" | "unreachable";
      readonly message?: string;
    };

/** The register frame's rule list: 8–64 characters, a digit and a symbol. */
export function passwordProblems(password: string): {
  readonly length: boolean;
  readonly symbol: boolean;
  readonly digit: boolean;
} {
  return {
    length: password.length < 8 || password.length > 64,
    symbol: !/[^A-Za-z0-9]/.test(password),
    digit: !/\d/.test(password),
  };
}

/**
 * One `@` with something on both sides and a dot inside the domain. Written
 * without a regex: the pattern form backtracks badly on long hostile input.
 *
 * Client-side only, and deliberately kept after the move to the API: it decides
 * whether a form is worth submitting, and the API validates again regardless.
 */
export function isEmail(value: string): boolean {
  const email = value.trim();
  if (/\s/.test(email)) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

/**
 * A new advisee, signed in straight away.
 *
 * `name` and `fullName` are both sent because better-auth requires both:
 * `name` is its own base field (remapped onto our `displayName` column by
 * `auth.config.ts`), and `fullName` is declared as a required additional field,
 * so a sign-up missing it is refused by the plugin — `400 "fullName is
 * required"` — before any of our own validation runs.
 *
 * Sign-up signs the new account in, same as sign-in, so the profile read after
 * it is authenticated and the role comes from the same place as everywhere else
 * (it will be `advisee`: `defaultRole` in `auth.config.ts`).
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  try {
    await authSignUp({
      email: input.email.trim(),
      password: input.password,
      name: input.name.trim(),
      fullName: input.fullName.trim() || input.name.trim(),
    });
  } catch (cause) {
    if (cause instanceof ApiError) {
      return {
        ok: false,
        reason: cause.status === 422 ? "email-in-use" : "rejected",
        message: cause.message,
      };
    }
    return { ok: false, reason: "unreachable" };
  }

  try {
    const account = toAccount(await getOwnProfile());
    publish({ status: "authenticated", account });
    return { ok: true, account };
  } catch (cause) {
    // The account exists; only this tab's view of it is missing. Saying
    // "rejected" would be a lie, so the API's own sentence goes out with a
    // reason the screen shows as a retry rather than as a field error.
    return {
      ok: false,
      reason: cause instanceof ApiError ? "rejected" : "unreachable",
      message: cause instanceof ApiError ? cause.message : undefined,
    };
  }
}

/**
 * Edit the signed-in account's own details.
 *
 * Only the two names go through: `PATCH /users/me` takes `displayName`,
 * `fullName` and `timezone`, and nothing else on this patch has a home there.
 * An email change is a better-auth flow of its own (`change-email`, which this
 * API has not enabled) and a password change is `change-password`; both need
 * their own screen and their own verification, so silently dropping them here is
 * the honest failure rather than pretending the round trip saved them.
 */
export async function updateOwnAccount(
  patch: Partial<Pick<Account, "name" | "phone" | "email" | "password">>,
): Promise<void> {
  if (session.status !== "authenticated") return;
  if (patch.name === undefined) return;
  const account = toAccount(await updateOwnProfile({ displayName: patch.name.trim() }));
  publish({ status: "authenticated", account });
}
