"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useDatabase } from "@/lib/mock-db/store";
import type { Account } from "@/lib/mock-db/types";
import { useSession } from "@/lib/session";

/** The signed-in admin's id — who every console decision is recorded against. */
export function useActorId(): string {
  const session = useSession();
  return session.status === "authenticated" ? session.account.id : "admin";
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
