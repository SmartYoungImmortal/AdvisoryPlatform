"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

import { scrollerOf } from "@/components/motion/view";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * A slow vertical drift tied to the scroll, for a photograph that should sit a
 * layer deeper than the copy beside it: `distance` px below its place as it
 * enters the screen, the same above as it leaves.
 *
 * The wrapper is the trigger and never moves; only the layer inside does, so
 * the trigger is measured on a still box. Give the wrapper `overflow-hidden`
 * and the layer room to travel (e.g. `-my-12`) when it frames a photograph.
 *
 * Desktop only. On the home page, mind that ScrollTrigger measures a screen
 * high inside the blocks the hero holds still (see `onFirstView`): check the
 * drift there against the real positions.
 */
export function Parallax({
  children,
  className,
  layerClassName,
  distance = 48,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly layerClassName?: string;
  /** How far the layer travels each way, in px. */
  readonly distance?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      const inner = layer.current;
      if (!el || !inner) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          inner,
          { y: distance },
          {
            y: -distance,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              // The page scrolls inside `ScreenBody`, not the window.
              scroller: scrollerOf(el),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      return () => mm.revert();
    },
    { scope, dependencies: [distance] },
  );

  return (
    <div className={className} ref={scope}>
      <div className={cn("h-full", layerClassName)} ref={layer}>
        {children}
      </div>
    </div>
  );
}
