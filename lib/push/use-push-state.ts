"use client";

import { useCallback, useEffect, useState } from "react";

import { type PushState, readPushState } from "@/lib/push/web-push";

/**
 * The browser's push state, `null` until it has been read (it is asynchronous, and the server-side
 * render cannot know it). Reads again when the person changes the permission in the browser's own
 * settings while the page is open.
 */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);

  const refresh = useCallback(() => {
    void readPushState().then(setState);
  }, []);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    const onChange = () => refresh();
    // Read once on mount, then follow the permission.
    void readPushState().then(setState);
    navigator.permissions
      ?.query({ name: "notifications" })
      .then((next) => {
        status = next;
        next.addEventListener("change", onChange);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", onChange);
  }, [refresh]);

  return [state, setState] as const;
}
