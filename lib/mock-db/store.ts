import { useSyncExternalStore } from "react";

import { createSeed, SEED_VERSION } from "@/lib/mock-db/seed";
import type { AuditEntry, Database } from "@/lib/mock-db/types";

/**
 * The database lives in the viewer's localStorage, seeded on first read.
 *
 * The site is a static export with no server of its own, and the API is not
 * deployed yet, so this is what makes an approve button approve something: the
 * change is written here, every mounted screen re-renders from it, and it is
 * still there after a reload or in another tab. Nothing leaves the browser.
 *
 * Server renders (the static HTML) and the first client render read the seed, so
 * hydration always matches; `useSyncExternalStore` then swaps in the stored copy.
 */
const STORAGE_KEY = "advisory:mock-db";

const SEED = createSeed();

let current: Database | null = null;
const listeners = new Set<() => void>();

function load(): Database | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Database>;
    // An older seed is missing fields newer screens read; start over instead.
    return parsed.version === SEED_VERSION ? (parsed as Database) : null;
  } catch {
    return null;
  }
}

function persist(database: Database): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // Private mode or a full quota: the change still holds for this page view.
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function read(): Database {
  current ??= load() ?? SEED;
  return current;
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  current = load() ?? SEED;
  notify();
}

export function subscribeDatabase(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** The current database — the seed when there is no browser to read from. */
export function getDatabase(): Database {
  return typeof window === "undefined" ? SEED : read();
}

/**
 * Replace the database with what `recipe` returns. Recipes build new arrays and
 * records instead of mutating, so a screen holding the previous snapshot keeps a
 * consistent picture until it re-renders.
 */
export function updateDatabase(recipe: (database: Database) => Database): Database {
  const next = recipe(read());
  current = next;
  persist(next);
  notify();
  return next;
}

/** Throw away every change made in this browser and start from the seed. */
export function resetDatabase(): void {
  current = SEED;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored to remove.
  }
  notify();
}

/**
 * Read part of the database. `select` must return something that is already in
 * the database (a collection, a record) — a freshly built array would never
 * compare equal and re-render forever. Derive lists with `useMemo` on top.
 */
export function useDatabase<T>(select: (database: Database) => T): T {
  return useSyncExternalStore(
    subscribeDatabase,
    () => select(read()),
    () => select(SEED),
  );
}

/** Ids that sort after the seed's and do not collide within a session. */
let sequence = 0;
export function newId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}${sequence.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** A new audit row, newest first — what the console's activity panel lists. */
export function withAudit(
  database: Database,
  entry: Omit<AuditEntry, "id" | "at">,
): Database {
  return {
    ...database,
    audit: [{ id: newId("audit"), at: nowIso(), ...entry }, ...database.audit].slice(0, 200),
  };
}
