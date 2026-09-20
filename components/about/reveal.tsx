"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The one reveal this page animates with, in four flavours.
 *
 * The reference (`buonogroup-fe/app/composables/useScrollAnimation.ts`) exposes
 * seven helpers — `fadeUp`, `fadeIn`, `slideFromLeft`, `slideFromRight`,
 * `zoomIn`, `staggerChildren`, `heroTimeline` — and its about page calls five of
 * them across eleven sections. The vocabulary is worth taking; seven entry
 * points for what is really one tween are not. What is left:
 *
 * - `from="up"` — a block arriving from below. Every band's heading and lead.
 * - `from="left"` / `from="right"` — the two halves of an alternating row, so the
 *   prose and its photograph enter from the sides they occupy. This is the one
 *   thing the reference does that genuinely sequences a narrative.
 * - `stagger` — the wrapper *is* the grid, and its own children come up one
 *   after another, so a grid of six reads as six things rather than one slab.
 * - `immediate` — no ScrollTrigger at all, for the hero: it is already on screen
 *   when the page loads, so a scroll trigger there either fires instantly or
 *   never fires, and both are worse than simply playing.
 *
 * Four things this deliberately does not do, all of them things the reference
 * does: it never pins (a pinned band on a phone is how a page stops scrolling),
 * it never scrubs, it never animates a layout property, and it never repeats.
 *
 * `zoomIn` is dropped as well. It tweens `scale` on a photograph, which on a
 * `object-cover` image means resampling every frame for an effect nobody reads
 * as motivated.
 */

/** How far a target travels, per direction. Transform only. */
const OFFSET = {
  up: { x: 0, y: 24 },
  left: { x: -24, y: 0 },
  right: { x: 24, y: 0 },
} as const;

export type RevealFrom = keyof typeof OFFSET;

export function Reveal({
  children,
  className,
  from = "up",
  stagger = false,
  immediate = false,
  delay = 0,
}: {
  readonly children: ReactNode;
  /** Classes for the wrapper, which is also the animated element or the grid. */
  readonly className?: string;
  readonly from?: RevealFrom;
  /** Animate the wrapper's own children in sequence instead of the wrapper. */
  readonly stagger?: boolean;
  /** Play on mount rather than on scroll — for anything above the fold. */
  readonly immediate?: boolean;
  /** Seconds, for the second half of a pair that should follow the first. */
  readonly delay?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;

      // Live children rather than a selector, so nothing deeper in the subtree
      // can be caught by a stagger meant for the row of cards — the same reason
      // `HomeIntro` targets `children`.
      const targets = stagger ? Array.from(el.children) : [el];
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();

      // Everything lives inside this query, so under `prefers-reduced-motion`
      // not one tween is created: the markup is already in its finished state
      // and simply stays there. `useGSAP` runs in a layout effect, so when the
      // tween *does* exist its `from()` start state lands before the browser
      // paints and the band never flashes in at full opacity first.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const { x, y } = OFFSET[from];

        gsap.from(targets, {
          autoAlpha: 0,
          x,
          y,
          delay,
          duration: 0.6,
          ease: "power2.out",
          stagger: stagger ? 0.08 : 0,
          // Undone at the end, so the band is left exactly as the CSS describes
          // it and nothing carries a stale transform into a later layout pass.
          clearProps: "transform,visibility,opacity",
          scrollTrigger: immediate
            ? undefined
            : {
                trigger: el,
                // The page scrolls inside `ScreenBody`, not the window — see
                // `MobileScreen`, which is `h-dvh overflow-hidden`. Without this
                // every trigger measures against a viewport that never moves,
                // so the reveals either all fire at once or never fire at all.
                // `TopBar` resolves its own scroller the same way.
                scroller: el.closest('[data-slot="screen-body"]') ?? undefined,
                // 85% of the way down the scroller, so a band has finished
                // arriving by the time it is in the middle of the screen being
                // read, rather than still moving under the reader's eye.
                start: "top 85%",
                // A reveal is a first impression; replaying it on the way back
                // up turns the page into a slideshow.
                once: true,
              },
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div className={className} ref={scope}>
      {children}
    </div>
  );
}
