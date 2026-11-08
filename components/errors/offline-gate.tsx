"use client";

import { useSyncExternalStore } from "react";

import { ErrorStateScreen } from "@/components/errors/error-state-screen";

function subscribe(onChange: () => void): () => void {
  globalThis.addEventListener("online", onChange);
  globalThis.addEventListener("offline", onChange);
  return () => {
    globalThis.removeEventListener("online", onChange);
    globalThis.removeEventListener("offline", onChange);
  };
}

/** Online on the server and while hydrating, so the first paint matches. */
const isOnline = () => navigator.onLine;
const assumeOnline = () => true;

/**
 * The connection going: the site's offline screen over whatever page was
 * open, for as long as the browser says it has none, and gone by itself the
 * moment it comes back. It is already in the page, so it needs nothing from
 * the network to show. "Try again" reloads once the browser is online again,
 * and does nothing while it is not (a reload would only bring the browser's
 * own offline page).
 */
export function OfflineGate() {
  const online = useSyncExternalStore(subscribe, isOnline, assumeOnline);
  if (online) return null;
  return (
    <div className="fixed inset-0 z-[100] flex bg-card">
      <ErrorStateScreen
        kind="no-connection"
        onRetry={() => {
          if (navigator.onLine) globalThis.location.reload();
        }}
      />
    </div>
  );
}
