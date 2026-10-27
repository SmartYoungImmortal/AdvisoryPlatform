"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiUnreachableError, isApiConfigured } from "@/lib/api/client";

/**
 * Read one API resource from a client component.
 *
 * Deliberately not a data-fetching library. Nothing in `package.json` provides
 * one, and adding TanStack Query or SWR to get three states and a cache is a
 * dependency decision that belongs to whoever owns the bundle, not to the first
 * screen that needs to fetch. This is the part of one that this app actually
 * uses: three states, a cache keyed by request, cancellation on unmount, and a
 * way to ask again.
 *
 * ## Why a cache at all
 *
 * The app is a static export, so every fetch happens in the browser after the
 * page has painted. Without a cache, walking from the home rail into a service
 * and back re-fetches the rail and the reader watches a skeleton they have
 * already seen. The cache is module-level, so it lives as long as the tab and
 * dies with a reload — the right lifetime for a catalogue and the wrong one for
 * anything a mutation changes, hence `invalidate`.
 *
 * ## Why the state is derived rather than stored
 *
 * Everything returned is read out of the cache during render. The effect only
 * starts the request and bumps a counter when it settles. Mirroring the cache
 * into three `useState`s meant writing state synchronously inside the effect for
 * the cache-hit and not-configured paths, which `react-hooks/set-state-in-effect`
 * rejects and which is a re-render the render pass could have avoided.
 *
 * ## What it does not do
 *
 * No retries, no polling, no background revalidation, no deduplication across
 * different keys that hit the same route. When a screen needs one of those, that
 * is the moment to justify the dependency rather than grow this.
 */

type Entry =
  | { readonly state: "loading" }
  | { readonly state: "ready"; readonly value: unknown }
  | { readonly state: "failed"; readonly error: Error };

const cache = new Map<string, Entry>();

/**
 * Every mounted reader of a key. Only the mount that starts a request drives
 * it; a second reader of the same key finds the entry `loading` and waits. It
 * has to be told when that request settles, or it renders `undefined` for as
 * long as it stays mounted: `/profile` asked for `users/me` twice (the screen
 * and `OwnAvatar`), and the screen never saw the answer.
 */
const readers = new Map<string, Set<() => void>>();

function settle(key: string): void {
  for (const notify of readers.get(key) ?? []) notify();
}

/** Drop cached entries so the next read goes to the API. */
export function invalidate(prefix?: string): void {
  if (prefix === undefined) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export type Resource<T> = {
  readonly data: T | undefined;
  readonly loading: boolean;
  /** `ApiError` (the API answered), `ApiUnreachableError` (it did not), or null. */
  readonly error: Error | null;
  /** Discard this key's cache entry and read again. */
  readonly reload: () => void;
};

/** The reason every read fails when the build had no API to point at. */
const NOT_CONFIGURED = new ApiUnreachableError(
  "NEXT_PUBLIC_API_URL was not set when this build was made",
);

/**
 * `key` identifies the request, not the route: include every parameter that
 * changes the answer, or two different queries will read each other's result.
 *
 * The reader's language is one of those parameters for every key (the API
 * answers translated content in it), so it is added here rather than by each
 * caller: switching language changes the key, and every mounted screen reads
 * its data again in the new language. It is a suffix, so `invalidate(prefix)`
 * still drops every language of a key.
 */
export function useResource<T>(
  requestKey: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
): Resource<T> {
  const key = `${requestKey}#${useLocale()}`;
  // A counter, not a mirror of the data. Bumping it re-runs the render, which
  // re-reads the cache; the cache is the single place the result lives.
  const [, setRevision] = useState(0);
  const rerender = useCallback(() => setRevision((value) => value + 1), []);
  const [reloadVersion, setReloadVersion] = useState(0);

  // The fetcher is a closure the caller rebuilds every render, so depending on it
  // would refetch forever; the key is the identity that matters. Kept in a ref,
  // and written in an effect rather than during render — `react-hooks/refs`
  // forbids the latter, and this effect is declared before the fetching one so
  // the current closure is in place before it runs.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Declared before the fetching effect, so a reader is listening before any
  // request it might share has had a chance to settle.
  useEffect(() => {
    const set = readers.get(key) ?? new Set<() => void>();
    readers.set(key, set);
    set.add(rerender);
    return () => {
      set.delete(rerender);
      if (set.size === 0) readers.delete(key);
    };
  }, [key, rerender]);

  const reload = useCallback(() => {
    cache.delete(key);
    setReloadVersion((value) => value + 1);
  }, [key]);

  useEffect(() => {
    if (!isApiConfigured) return;
    // A hit that is ready or failed is already the answer; a hit that is loading
    // belongs to a mount that has not settled yet and will bump its own revision.
    if (cache.has(key)) return;

    const controller = new AbortController();
    cache.set(key, { state: "loading" });

    void fetcherRef
      .current(controller.signal)
      .then((value) => {
        cache.set(key, { state: "ready", value });
      })
      .catch((cause: unknown) => {
        // An abort is this effect tearing down, not a failure to report. The
        // entry is dropped so the next mount starts a fresh request rather than
        // adopting a `loading` that nothing is driving.
        if (controller.signal.aborted) {
          cache.delete(key);
          return;
        }
        cache.set(key, {
          state: "failed",
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) settle(key);
      });

    return () => {
      controller.abort();
      if (cache.get(key)?.state === "loading") cache.delete(key);
    };
  }, [key, reloadVersion, rerender]);

  if (!isApiConfigured) {
    return { data: undefined, loading: false, error: NOT_CONFIGURED, reload };
  }

  const entry = cache.get(key);
  if (entry?.state === "ready") {
    return { data: entry.value as T, loading: false, error: null, reload };
  }
  if (entry?.state === "failed") {
    return { data: undefined, loading: false, error: entry.error, reload };
  }
  return { data: undefined, loading: true, error: null, reload };
}
