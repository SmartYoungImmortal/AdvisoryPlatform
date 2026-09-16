"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP);

/**
 * Staggers its own children up on first paint.
 *
 * `display: contents` so the wrapper adds a DOM node without adding a box — the
 * blocks stay direct flex items of the column that lays them out. Targets are the
 * live children rather than a selector, so nothing outside this subtree can be
 * caught by it.
 *
 * `useGSAP` runs in a layout effect, so `from()` applies its start state before
 * the browser paints and the page never flashes in at full opacity first. If the
 * script never runs — reduced motion, a slow connection, JS off — the markup is
 * already in its finished state and simply stays there.
 */
export function HomeIntro({ children }: { readonly children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const blocks = Array.from(scope.current?.children ?? []);
      if (blocks.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(blocks, {
          autoAlpha: 0,
          y: 14,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.06,
          // Transforms and the visibility flip are undone at the end so the
          // blocks are left exactly as the CSS describes them.
          clearProps: "transform,visibility,opacity",
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div className="contents" ref={scope}>
      {children}
    </div>
  );
}
