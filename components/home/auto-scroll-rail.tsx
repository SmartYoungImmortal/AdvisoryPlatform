"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * A horizontal rail that drifts on its own, yields the moment the user touches it,
 * and picks the drift back up once they stop.
 *
 * The loop is seamless because the row is rendered twice: scrolling from 0 to the
 * width of one copy lands on a pixel-identical frame, so the reset back to 0 has
 * nothing to see. The clone is `aria-hidden` and `inert`, so the duplicate cards
 * are invisible to assistive tech and unreachable by Tab — a screen reader and a
 * keyboard user each meet the list once.
 *
 * Nothing here runs under `prefers-reduced-motion`: the rail stays a plain
 * scroller, which is the whole feature for anyone who asked not to be moved.
 */
export function AutoScrollRail({
  children,
  className,
  /** Pixels per second. */
  speed = 22,
  /** How long the rail waits after the last interaction before drifting again. */
  resumeDelay = 2.5,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly speed?: number;
  readonly resumeDelay?: number;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const el = rail.current;
      const inner = track.current;
      if (!el || !inner || !contextSafe) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // One copy's width, which is also the point where the loop repeats.
        const lap = () => inner.scrollWidth / 2;
        if (lap() <= 0) return;

        const drift = gsap.to(el, {
          scrollLeft: lap,
          duration: () => lap() / speed,
          ease: "none",
          repeat: -1,
          // `scrollLeft` is read once per tween, so a repeat has to start over
          // from the top rather than continue from wherever it finished.
          onRepeat: () => el.scrollTo({ left: 0 }),
        });

        let idle: ReturnType<typeof setTimeout> | undefined;

        // Any user gesture hands control over; the drift only comes back after
        // `resumeDelay` of quiet, resynced to wherever they left the rail.
        const yield_ = contextSafe(() => {
          drift.pause();
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => {
            const progress = (el.scrollLeft % lap()) / lap();
            drift.progress(progress).play();
          }, resumeDelay * 1000);
        });

        const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
        for (const type of events) {
          el.addEventListener(type, yield_, { passive: true });
        }

        return () => {
          if (idle) clearTimeout(idle);
          for (const type of events) el.removeEventListener(type, yield_);
        };
      });

      return () => mm.revert();
    },
    { scope: rail },
  );

  return (
    <div
      className={cn("w-full overflow-x-auto", className)}
      ref={rail}
      // The rail scrolls itself, so it is a scrollable region a keyboard user can
      // reach and read; without a name it is an unlabelled tab stop.
      role="group"
      tabIndex={0}
    >
      <div className="flex w-max items-start" ref={track}>
        <div className="flex shrink-0 items-start gap-2">{children}</div>
        <div aria-hidden className="pointer-events-none ml-2 flex shrink-0 items-start gap-2" inert>
          {children}
        </div>
      </div>
    </div>
  );
}
