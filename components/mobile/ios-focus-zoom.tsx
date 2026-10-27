"use client";

import { useEffect } from "react";

/**
 * iOS zooms the page into a field set under 16px when it takes the focus, and
 * leaves it zoomed. `maximum-scale=1` stops that one zoom, so a compact form
 * (the settings' dialogs on a phone) can set its fields smaller. Safari has
 * ignored the value for the reader's own pinch since iOS 10, so they can still
 * zoom the page.
 *
 * Added on iOS only, after the page loads: on other browsers the same value
 * takes the pinch away, and none of them zooms into a field to begin with.
 */
export function IosFocusZoom() {
  useEffect(() => {
    const agent = navigator.userAgent;
    // iPadOS reports itself as a Mac; its touch points give it away.
    const ios = /iPad|iPhone|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
    if (!ios) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta || meta.content.includes("maximum-scale")) return;
    meta.content = `${meta.content}, maximum-scale=1`;
  }, []);

  return null;
}
