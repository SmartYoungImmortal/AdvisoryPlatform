"use client";

import { useEffect, useRef } from "react";
import type Hls from "hls.js";

import { cn } from "@/lib/utils";

/**
 * The `light` subpath ships no type declarations, but it is the same API surface
 * as the main build, so it is loaded through the full build's types.
 */
async function loadHls(): Promise<typeof Hls> {
  // @ts-expect-error — see above: `hls.js/light` has no bundled .d.ts.
  const { default: Light } = (await import("hls.js/light")) as { default: typeof Hls };
  return Light;
}

/**
 * Muted, looping background video for a full-bleed banner.
 *
 * Safari plays HLS natively; every other engine needs hls.js, which is loaded
 * lazily so the ~100kB parser never lands in the initial bundle. The `light`
 * build drops subtitles, alternate audio tracks and DRM — none of which a silent
 * banner clip uses.
 *
 * The poster carries the first frame, so the hero is never a black rectangle
 * while the first segment downloads. Readers who ask for reduced motion keep the
 * poster and no video is fetched at all.
 */
export function HlsVideo({
  src,
  poster,
  className,
}: {
  readonly src: string;
  readonly poster: string;
  readonly className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Safari / iOS: the element handles the playlist itself.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let cancelled = false;
    let instance: Hls | null = null;

    void loadHls().then((Constructor) => {
      if (cancelled || !Constructor.isSupported()) return;
      // A banner only ever plays forward, so a short forward buffer is plenty and
      // keeps the clip from pulling more of the ladder down on a metered connection.
      const hls = new Constructor({ maxBufferLength: 6, maxMaxBufferLength: 15 });
      instance = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
    });

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [src]);

  return (
    <video
      aria-hidden
      autoPlay
      className={cn("size-full object-cover", className)}
      loop
      muted
      playsInline
      poster={poster}
      preload="none"
      ref={videoRef}
       tabIndex={-1}
    />
  );
}
