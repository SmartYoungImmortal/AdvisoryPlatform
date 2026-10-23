"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { getSession, type AuthSession } from "@/lib/api/auth";
import { useResource, type Resource } from "@/lib/api/use-resource";
import { useDatabase } from "@/lib/mock-db/store";
import type { Account } from "@/lib/mock-db/types";
import { useSession } from "@/lib/session";

/**
 * The signed-in admin's id, for the screens still writing to `lib/mock-db`.
 *
 * API-backed screens do not need this and must not pass it: the API records the
 * acting admin from the session cookie, so a ruling has no actor parameter.
 */
export function useActorId(): string {
  const session = useSession();
  return session.status === "authenticated" ? session.account.id : "admin";
}

/**
 * The better-auth session, read once and cached for the tab.
 *
 * The console needs it for exactly one thing the API cannot answer in advance:
 * whether the account on screen is the admin's own, so the suspend button can be
 * disabled rather than letting the API refuse it with a 400. Everything else
 * relies on the cookie travelling with the request.
 */
export function useAdminSession(): Resource<AuthSession | null> {
  return useResource("auth/get-session", getSession);
}

/** The signed-in admin's own user id, or `undefined` until the session lands. */
export function useAdminUserId(): string | undefined {
  return useAdminSession().data?.user.id;
}

/** `?id=` on a detail route. The export cannot prerender records made at runtime. */
export function useRecordId(): string {
  return useSearchParams().get("id") ?? "";
}

/** Accounts by id, for tables that name people. */
export function useAccountLookup(): (id: string) => Account | undefined {
  const accounts = useDatabase((db) => db.accounts);
  const map = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  return useCallback((id: string) => map.get(id), [map]);
}
