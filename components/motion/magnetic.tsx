"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * A call to action that leans towards the cursor while it is over it and
 * settles back when it leaves: the button answering the hand before the click.
 * For the one primary action of a block, not for every link.
 *
 * The wrapper is the still hit area and only the face inside moves, for the
 * same reason as `Tilt`: a hit area that moves under a resting cursor shakes.
 * Desktop mouse only.
 */
export function Magnetic({
  children,
  className,
  faceClassName,
  strength = 0.25,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly faceClassName?: string;
  /** The share of the cursor's offset from the centre the face follows. */
  readonly strength?: number;
}) {
  const scope = useRef<HTMLSpanElement>(null);
  const face = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      const inner = face.current;
      if (!el || !inner) return;

      const mm = gsap.matchMedia();
      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const ease = { duration: 0.5, ease: "power3.out" };
          const toX = gsap.quickTo(inner, "x", ease);
          const toY = gsap.quickTo(inner, "y", ease);

          const move = (event: PointerEvent) => {
            const r = el.getBoundingClientRect();
            toX((event.clientX - (r.left + r.width / 2)) * strength);
            toY((event.clientY - (r.top + r.height / 2)) * strength);
          };
          const rest = () => {
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
    { scope, dependencies: [strength] },
  );

  return (
    <span className={cn("inline-flex", className)} ref={scope}>
      <span className={cn("inline-flex", faceClassName)} ref={face}>
        {children}
      </span>
    </span>
  );
}
