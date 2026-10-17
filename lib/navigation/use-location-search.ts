"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getSearch(): string {
  return window.location.search;
}

function getServerSearch(): string {
  return "";
}

/** Read the current query string without suspending a static-exported route. */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, getSearch, getServerSearch);
}
