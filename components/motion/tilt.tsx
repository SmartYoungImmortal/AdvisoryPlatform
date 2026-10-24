"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * The ring's pointer tilt, for one card: the face turns towards the cursor
 * about the screen's own axes, eased so it trails the hand (`HeroShapes` drives
 * the ring with the same 0.8s `quickTo`).
 *
 * The wrapper is the still hit area and only the face inside it turns. When the
 * hovered box itself moved, a cursor resting near its edge fell off and back on
 * every frame and the card shook; the hero met the same thing with its hover
 * scale (`.hero-card-face`).
 *
 * `--tilt-x` / `--tilt-y` (-1 → 1, 0 at rest) are written on the wrapper too,
 * so layers inside can move by their own depth, e.g.
 * `translate: calc(var(--tilt-x, 0) * -6px) calc(var(--tilt-y, 0) * -6px)`.
 * Desktop mouse only: there is no hovering cursor on touch.
 */
export function Tilt({
  children,
  className,
  faceClassName,
  max = 6,
}: {
  readonly children: ReactNode;
  /** The still wrapper: size and place it here. */
  readonly className?: string;
  /** The face that turns, which fills the wrapper by default. */
  readonly faceClassName?: string;
  /** The largest turn each way, in degrees. */
  readonly max?: number;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      const inner = face.current;
      if (!el || !inner) return;

      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(inner, { transformPerspective: 900 });
          gsap.set(el, { "--tilt-x": 0, "--tilt-y": 0 });
          const ease = { duration: 0.8, ease: "power3.out" };
          const toRotateX = gsap.quickTo(inner, "rotationX", ease);
          const toRotateY = gsap.quickTo(inner, "rotationY", ease);
          const toX = gsap.quickTo(el, "--tilt-x", ease);
          const toY = gsap.quickTo(el, "--tilt-y", ease);

          const move = (event: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const px = ((event.clientX - r.left) / r.width) * 2 - 1;
            const py = ((event.clientY - r.top) / r.height) * 2 - 1;
            toRotateY(px * max);
            toRotateX(-py * max);
            toX(px);
            toY(py);
          };
          const rest = () => {
            toRotateX(0);
            toRotateY(0);
            toX(0);
            toY(0);
          };

          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", rest);
          return () => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", rest);
          };
        },
      );

      return () => mm.revert();
    },
    { scope, dependencies: [max] },
  );

  return (
    <div className={className} ref={scope}>
      <div className={cn("h-full", faceClassName)} ref={face}>
        {children}
      </div>
    </div>
  );
}
