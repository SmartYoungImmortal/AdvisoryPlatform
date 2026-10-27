"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode, type RefObject } from "react";

import { SETTLE } from "@/components/motion/ease";
import { onFirstView } from "@/components/motion/view";

gsap.registerPlugin(useGSAP);

type RiseTag = "div" | "section" | "header" | "article" | "ul" | "ol" | "li" | "p" | "span";

/**
 * A block coming into focus as it reaches the reader: up from below and out of
 * a blur, the hero's dissolve run backwards (`HeroShapes` blurs the band out as
 * it leaves). Once, and never again on the way back up.
 *
 * `stagger` animates the wrapper's own children one after another instead of
 * the wrapper, so a grid reads as its items arriving rather than as one slab.
 * Live children, not a selector, so nothing deeper in the subtree is caught.
 *
 * Every tween lives inside `prefers-reduced-motion: no-preference`; without it,
 * or without JavaScript, the markup is simply in its finished state.
 */
export function Rise({
  children,
  className,
  as = "div",
  stagger = false,
  delay = 0,
  y = 28,
  blur = 10,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: RiseTag;
  readonly stagger?: boolean;
  /** Seconds, for the second of two blocks that should follow the first. */
  readonly delay?: number;
  /** How far below its place it starts, in px. */
  readonly y?: number;
  /** How blurred it starts, in px; 0 for a plain rise. */
  readonly blur?: number;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;
      const targets = stagger ? Array.from(el.children) : [el];
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // On before the first paint (`useGSAP` is a layout effect), so a block
        // below the fold never shows and then hides.
        gsap.set(targets, { autoAlpha: 0, y, filter: blur ? `blur(${blur}px)` : "none" });
        return onFirstView(el, () => {
          gsap.to(targets, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: SETTLE,
            delay,
            stagger: stagger ? 0.08 : 0,
            // Left exactly as the CSS describes it, so no stale transform or
            // filter is carried into a hover or a later layout pass.
            clearProps: "transform,filter,opacity,visibility",
          });
        });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [stagger, delay, y, blur] },
  );

  // Typed as a `div` only so one ref fits every tag; React renders `as` itself.
  const Tag = as as "div";
  return (
    <Tag className={className} ref={scope as RefObject<HTMLDivElement | null>}>
      {children}
    </Tag>
  );
}
