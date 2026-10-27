"use client";

import { useCallback, useEffect, useState } from "react";

import { type PushState, readPushState } from "@/lib/push/web-push";

/**
 * The state last read or set on this page load. A screen that mounts again (the settings page
 * under each of its dialogs' routes) starts from it instead of from nothing, so its switch does not
 * show off and then flick on while the browser is asked again. `null` on a fresh load, as the
 * server-side render has it, so hydration matches.
 */
let lastKnown: PushState | null = null;

/**
 * The browser's push state, `null` until it has been read (it is asynchronous, and the server-side
 * render cannot know it). Reads again when the person changes the permission in the browser's own
 * settings while the page is open.
 */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(lastKnown);
  // Every change is also kept for the next mount (`lastKnown`).
  const remember = useCallback((next: PushState | null) => {
    lastKnown = next;
    setState(next);
  }, []);

  const refresh = useCallback(() => {
    void readPushState().then(remember);
  }, [remember]);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    const onChange = () => refresh();
    // Read once on mount, then follow the permission.
    void readPushState().then(remember);
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((next) => {
        status = next;
        next.addEventListener("change", onChange);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", onChange);
  }, [refresh, remember]);

  return [state, remember] as const;
}
