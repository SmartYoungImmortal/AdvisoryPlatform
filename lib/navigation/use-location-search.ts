"use client";

import { useSyncExternalStore } from "react";

const HISTORY_WRITE = "advisory:historywrite";
const ANNOUNCING = Symbol.for("advisory.history-announces-writes");

/**
 * Back and forward fire `popstate`; nothing else that changes the URL does. A
 * `<Link>` or `router.push` to the same route with a new query re-renders the
 * page first and only then writes the URL, with `history.pushState` or
 * `replaceState` from an insertion effect (Next's `HistoryUpdater`), and so
 * does a page's own `history.pushState`. So both methods are wrapped, once
 * per tab, to announce each write. The announcement waits for a microtask:
 * React logs an error for any update scheduled inside an insertion effect.
 */
function announceHistoryWrites(): void {
  const history = window.history as History & { [ANNOUNCING]?: true };
  if (history[ANNOUNCING]) return;
  history[ANNOUNCING] = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const write = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      write.apply(this, args);
      queueMicrotask(() => window.dispatchEvent(new Event(HISTORY_WRITE)));
    };
  }
}

function subscribe(onChange: () => void): () => void {
  announceHistoryWrites();
  window.addEventListener("popstate", onChange);
  window.addEventListener(HISTORY_WRITE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(HISTORY_WRITE, onChange);
  };
}

function getSearch(): string {
  return window.location.search;
}

/** Hydration reads this too, so the first client pass matches the prerendered markup. */
function getServerSearch(): string {
  return "";
}

/** Read the current query string without suspending a static-exported route. */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, getSearch, getServerSearch);
}
