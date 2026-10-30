"use client";

import { useSearchParams } from "next/navigation";

import { getSession, type AuthSession } from "@/lib/api/auth";
import { useResource, type Resource } from "@/lib/api/use-resource";

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

/** A page's tab, from `?tab=`; anything it does not know is the first one. */
export function usePageTab<Tab extends string>(tabs: readonly [Tab, ...Tab[]]): Tab {
  const raw = useSearchParams().get("tab");
  return tabs.find((tab) => tab === raw) ?? tabs[0];
}
