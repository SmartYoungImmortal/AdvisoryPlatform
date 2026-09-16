import { useSyncExternalStore } from "react";

import {
  getDatabase,
  newId,
  nowIso,
  subscribeDatabase,
  updateDatabase,
} from "@/lib/mock-db/store";
import type { Account, Role } from "@/lib/mock-db/types";

/**
 * Who is signed in, against the mock database.
 *
 * The rules are the ones the auth frames draw: an unknown email and a wrong
 * password read the same to the user (995:4246), the fifth wrong password in a
 * row locks the account (995:4207), and a suspended account cannot sign in.
 * The session is only an account id in localStorage — the account itself is
 * always read fresh, so an admin suspending someone signs them out everywhere.
 */
const SESSION_KEY = "advisory:session";

/** Wrong passwords allowed before the account locks. */
export const MAX_FAILED_LOGINS = 5;

export type Session =
  | { readonly status: "loading" }
  | { readonly status: "anonymous" }
  | { readonly status: "authenticated"; readonly account: Account };

const LOADING: Session = { status: "loading" };
const ANONYMOUS: Session = { status: "anonymous" };

let sessionId: string | null | undefined;
const listeners = new Set<() => void>();

function readSessionId(): string | null {
  if (sessionId !== undefined) return sessionId;
  try {
    sessionId = window.localStorage.getItem(SESSION_KEY);
  } catch {
    sessionId = null;
  }
  return sessionId;
}

function writeSessionId(id: string | null): void {
  sessionId = id;
  try {
    if (id) window.localStorage.setItem(SESSION_KEY, id);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // The session still holds for this page view.
  }
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== SESSION_KEY) return;
  sessionId = event.newValue;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  const unsubscribeDatabase = subscribeDatabase(listener);
  return () => {
    listeners.delete(listener);
    unsubscribeDatabase();
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

let cached: { id: string | null; account: Account | undefined; session: Session } | null =
  null;

function snapshot(): Session {
  const id = readSessionId();
  const account = id ? getDatabase().accounts.find((a) => a.id === id) : undefined;
  if (cached && cached.id === id && cached.account === account) return cached.session;
  const session: Session =
    account && account.status === "active"
      ? { status: "authenticated", account }
      : ANONYMOUS;
  cached = { id, account, session };
  return session;
}

/** `loading` only during the static render and hydration — never after. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, snapshot, () => LOADING);
}

/** The signed-in account right now, outside React. */
export function currentAccount(): Account | null {
  const session = snapshot();
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

export type SignInResult =
  | { readonly ok: true; readonly account: Account }
  | {
      readonly ok: false;
      readonly reason: "invalid" | "locked" | "suspended" | "forbidden";
      /** Tries left before a lock, when the password was the problem. */
      readonly remaining?: number;
    };

export function signIn(
  email: string,
  password: string,
  options: { readonly allow?: readonly Role[] } = {},
): SignInResult {
  const normalized = email.trim().toLowerCase();
  const account = getDatabase().accounts.find(
    (a) => a.email.toLowerCase() === normalized,
  );
  if (!account) return { ok: false, reason: "invalid" };
  if (account.status === "locked") return { ok: false, reason: "locked" };
  if (account.status === "suspended") return { ok: false, reason: "suspended" };

  if (account.password !== password) {
    const failedLogins = account.failedLogins + 1;
    const locked = failedLogins >= MAX_FAILED_LOGINS;
    updateDatabase((db) => ({
      ...db,
      accounts: db.accounts.map((a) =>
        a.id === account.id
          ? { ...a, failedLogins, status: locked ? "locked" : a.status, updatedAt: nowIso() }
          : a,
      ),
    }));
    return locked
      ? { ok: false, reason: "locked" }
      : { ok: false, reason: "invalid", remaining: MAX_FAILED_LOGINS - failedLogins };
  }

  // The right password for the wrong door: say so, without counting it as a miss.
  if (options.allow && !options.allow.includes(account.role)) {
    return { ok: false, reason: "forbidden" };
  }

  const at = nowIso();
  const next = updateDatabase((db) => ({
    ...db,
    accounts: db.accounts.map((a) =>
      a.id === account.id ? { ...a, failedLogins: 0, lastLoginAt: at } : a,
    ),
  }));
  writeSessionId(account.id);
  return { ok: true, account: next.accounts.find((a) => a.id === account.id) ?? account };
}

export function signOut(): void {
  writeSessionId(null);
}

export type RegisterInput = {
  readonly name: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
};

export type RegisterResult =
  | { readonly ok: true; readonly account: Account }
  | { readonly ok: false; readonly reason: "email-in-use" };

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

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** A new advisee, signed in straight away — the PDPA step follows. */
export function register(input: RegisterInput): RegisterResult {
  const email = input.email.trim().toLowerCase();
  if (getDatabase().accounts.some((a) => a.email.toLowerCase() === email)) {
    return { ok: false, reason: "email-in-use" };
  }
  const at = nowIso();
  const account: Account = {
    id: newId("u"),
    name: input.name.trim(),
    fullName: input.fullName.trim() || input.name.trim(),
    email,
    password: input.password,
    phone: input.phone.trim(),
    role: "advisee",
    status: "active",
    avatar: null,
    createdAt: at,
    updatedAt: at,
    lastLoginAt: at,
    failedLogins: 0,
    suspension: null,
    advisor: null,
    stats: { sessions: 0, bookings: 0, reviews: 0 },
  };
  updateDatabase((db) => ({ ...db, accounts: [account, ...db.accounts] }));
  writeSessionId(account.id);
  return { ok: true, account };
}

/** Edit the signed-in account's own details. */
export function updateOwnAccount(
  patch: Partial<Pick<Account, "name" | "phone" | "email" | "password">>,
): void {
  const id = readSessionId();
  if (!id) return;
  updateDatabase((db) => ({
    ...db,
    accounts: db.accounts.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a,
    ),
  }));
}
