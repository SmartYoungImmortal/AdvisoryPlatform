"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/** Where the inertia applies: a desktop pointer, with motion allowed. Touch keeps its own. */
const SMOOTH_QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/**
 * Inertial scrolling for the page's scroller on desktop: the wheel and the
 * trackpad glide and ease to a stop instead of stepping. Lenis drives
 * `scrollTop` itself, so native `scroll` events still fire and everything that
 * listens to this element — `TopBar`'s frosting sentinel, the GSAP scroll
 * triggers — keeps working unchanged.
 *
 * The element's height never changes (it is the flex region between the bars),
 * so Lenis's own resize watch would never see the content grow; each child is
 * watched instead, and re-watched when the children change.
 */
function useSmoothScroll(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const media = window.matchMedia(SMOOTH_QUERY);
    let lenis: Lenis | null = null;
    let sizes: ResizeObserver | null = null;
    let children: MutationObserver | null = null;
    let tick: ((time: number) => void) | null = null;

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      sizes?.disconnect();
      children?.disconnect();
      lenis?.destroy();
      lenis = null;
    };

    const start = () => {
      if (lenis || !media.matches) return;
      const instance = new Lenis({
        wrapper,
        content: wrapper,
        // Stepped by GSAP's ticker below, not a loop of its own: two rAF loops
        // moved the page and the scroll-linked hero a frame apart, which read
        // as the scroll catching.
        autoRaf: false,
        // In-page links glide too, clear of the bar floating over the top.
        anchors: { offset: -96 },
        // How much of the remaining distance each frame covers: lower glides
        // longer. 0.08 felt sluggish; 0.12 keeps the glide but keeps up.
        lerp: 0.12,
      });
      lenis = instance;
      instance.on("scroll", ScrollTrigger.update);
      tick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tick);
      sizes = new ResizeObserver(() => instance.resize());
      const watch = () => {
        sizes?.disconnect();
        for (const child of wrapper.children) sizes?.observe(child);
      };
      watch();
      children = new MutationObserver(watch);
      children.observe(wrapper, { childList: true });
    };

    const onChange = () => (media.matches ? start() : stop());
    start();
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      stop();
    };
  }, [ref]);
}

/**
 * The region between the status bar and the tab bar / home indicator. Content that
 * outgrows the 874px frame scrolls here instead of pushing the chrome off-screen.
 */
export function ScreenBody({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSmoothScroll(ref);
  return (
    <div
      // Named so a sticky child can resolve its scroll container — the landing bar
      // observes this element rather than the window.
      data-slot="screen-body"
      className={cn(
        "flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto",
        className,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
}
