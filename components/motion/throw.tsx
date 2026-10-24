"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode, type RefObject } from "react";

import { THROW } from "@/components/motion/ease";
import { onFirstView } from "@/components/motion/view";

gsap.registerPlugin(useGSAP);

/** Where in the container the children are thrown from, as fractions of its box. */
const ORIGIN = {
  center: [0.5, 0.5],
  top: [0.5, 0],
  bottom: [0.5, 1],
  left: [0, 0.5],
  right: [1, 0.5],
} as const;

export type ThrowOrigin = keyof typeof ORIGIN;

type ThrowTag = "div" | "section" | "ul" | "ol";

/**
 * The hero's entrance, for a group: every child starts at one point of the
 * container and is thrown out to its own place on the ring's overshoot curve,
 * growing and coming out of a blur on the way (`animate-hero-pop` in
 * `app/globals.css`, where the twelve cards leave the centre of the ring).
 * The nearest children leave first, so it reads as one burst.
 *
 * The offsets are measured when the group first comes into view rather than on
 * mount, so late fonts and photographs have already settled the layout. They
 * are percentages of each child's own size, which keeps the throw the same
 * length inside a CSS-zoomed band (the home sections are zoomed to a 1710
 * frame) as outside one: a `px` translate inside a zoomed box is zoomed too.
 */
export function Throw({
  children,
  className,
  as = "div",
  origin = "center",
  pull = 0.7,
  delay = 0,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: ThrowTag;
  readonly origin?: ThrowOrigin;
  /** How much of the way back to the origin each child starts, 0 → 1. */
  readonly pull?: number;
  /** Seconds before the burst. */
  readonly delay?: number;
}) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;
      const items = Array.from(el.children) as HTMLElement[];
      if (items.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Only hidden until the burst: nothing here depends on layout yet.
        gsap.set(items, { autoAlpha: 0 });
        return onFirstView(el, () => {
          const box = el.getBoundingClientRect();
          const [fx, fy] = ORIGIN[origin];
          const ox = box.left + box.width * fx;
          const oy = box.top + box.height * fy;

          const starts = items.map((item) => {
            const r = item.getBoundingClientRect();
            const dx = ox - (r.left + r.width / 2);
            const dy = oy - (r.top + r.height / 2);
            return {
              item,
              distance: Math.hypot(dx, dy),
              xPercent: r.width ? (dx / r.width) * 100 * pull : 0,
              yPercent: r.height ? (dy / r.height) * 100 * pull : 0,
              // Leaning the way it travels, like a card coming off the ring.
              rotation: box.width ? gsap.utils.clamp(-8, 8, (-dx / box.width) * 16) : 0,
            };
          });

          const timeline = gsap.timeline({ delay });
          [...starts]
            .sort((a, b) => a.distance - b.distance)
            .forEach(({ item, xPercent, yPercent, rotation }, order) => {
              const at = order * 0.06;
              timeline
                .fromTo(
                  item,
                  { xPercent, yPercent, rotation, scale: 0.4 },
                  {
                    xPercent: 0,
                    yPercent: 0,
                    rotation: 0,
                    scale: 1,
                    duration: 1,
                    ease: THROW,
                    clearProps: "transform",
                  },
                  at,
                )
                // Invisible for the first stretch of the flight, as the ring's
                // cards are until 60% of `hero-pop-out`, so the throw is seen
                // landing rather than starting.
                .fromTo(
                  item,
                  { autoAlpha: 0, filter: "blur(8px)" },
                  {
                    autoAlpha: 1,
                    filter: "blur(0px)",
                    duration: 0.45,
                    ease: "power2.out",
                    clearProps: "filter,opacity,visibility",
                  },
                  at + 0.12,
                );
            });
        });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [origin, pull, delay] },
  );

  // Typed as a `div` only so one ref fits every tag; React renders `as` itself.
  const Tag = as as "div";
  return (
    <Tag className={className} ref={scope as RefObject<HTMLDivElement | null>}>
      {children}
    </Tag>
  );
}
