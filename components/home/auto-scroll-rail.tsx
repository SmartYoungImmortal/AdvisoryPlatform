"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * The space between items, and the same space again before the clone, so the
 * seam where the loop restarts is the same width as every other gap.
 */
const GAPS = {
  sm: { row: "gap-2", seam: "ml-2" },
  lg: { row: "gap-3 lg:gap-5", seam: "ml-3 lg:ml-5" },
} as const;

/**
 * A horizontal rail that drifts on its own, yields the moment the user touches
 * it or points at it, and picks the drift back up once they stop.
 *
 * The loop is seamless because the row is rendered twice: scrolling from 0 to the
 * width of one copy lands on a pixel-identical frame, so the reset back to 0 has
 * nothing to see. The clone is `aria-hidden` and `inert`, so the duplicate cards
 * are invisible to assistive tech and unreachable by Tab — a screen reader and a
 * keyboard user each meet the list once.
 *
 * Half the time the copy is what is on screen, so a rail of links passes its
 * own `clone`: the same cards with their links taken out of the tab order,
 * which a pointer can still press where an `inert` copy would ignore it.
 *
 * It only moves while it is on screen: a drift nobody can see is a tween
 * running every frame for nothing.
 *
 * Nothing here runs under `prefers-reduced-motion`: the rail stays a plain
 * scroller, which is the whole feature for anyone who asked not to be moved.
 */
export function AutoScrollRail({
  children,
  clone,
  className,
  label,
  gap = "sm",
  /** Pixels per second. */
  speed = 22,
  /** How long the rail waits after the last interaction before drifting again. */
  resumeDelay = 2.5,
}: {
  readonly children: ReactNode;
  /** The second copy, with every link at `tabIndex={-1}`; `children` made inert when omitted. */
  readonly clone?: ReactNode;
  readonly className?: string;
  /** What the rail holds, for the keyboard stop it is. */
  readonly label?: string;
  readonly gap?: keyof typeof GAPS;
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
          paused: true,
          // `scrollLeft` is read once per tween, so a repeat has to start over
          // from the top rather than continue from wherever it finished.
          onRepeat: () => el.scrollTo({ left: 0 }),
        });

        let visible = false;
        let held = false;
        let pointing = false;
        let idle: ReturnType<typeof setTimeout> | undefined;

        // Resynced to wherever the reader left the rail, so it carries on from
        // there instead of jumping back to where the drift had got to.
        const sync = () => {
          if (visible && !held) {
            drift.progress((el.scrollLeft % lap()) / lap()).play();
          } else {
            drift.pause();
          }
        };

        const resumeLater = () => {
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => {
            held = false;
            sync();
          }, resumeDelay * 1000);
        };

        // Any gesture hands control over; the drift only comes back after
        // `resumeDelay` of quiet, and not while a pointer still rests on it.
        const yield_ = contextSafe(() => {
          held = true;
          sync();
          if (pointing) clearTimeout(idle);
          else resumeLater();
        });

        // A pointer resting on a card holds the rail still so the card can be
        // pressed, until it leaves.
        const enter = contextSafe(() => {
          pointing = true;
          yield_();
        });
        const leave = contextSafe(() => {
          pointing = false;
          resumeLater();
        });

        const seen = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        });
        seen.observe(el);

        const events = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
        for (const type of events) {
          el.addEventListener(type, yield_, { passive: true });
        }
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);

        return () => {
          if (idle) clearTimeout(idle);
          seen.disconnect();
          for (const type of events) el.removeEventListener(type, yield_);
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
        };
      });

      return () => mm.revert();
    },
    { scope: rail },
  );

  return (
    <div
      aria-label={label}
      className={cn("w-full overflow-x-auto", className)}
      ref={rail}
      // The rail scrolls itself, so it is a scrollable region a keyboard user can
      // reach and read; without a name it is an unlabelled tab stop.
      role="group"
      // A scrollable region must be reachable by keyboard (axe's
      // scrollable-region-focusable; WCAG 2.1.1), so this tab stop is deliberate.
      tabIndex={0} // NOSONAR: S6845 conflicts with the keyboard-access rule above
    >
      {/* Stretched, so a card whose title runs to two lines does not stand
          taller than its neighbours. */}
      <div className="flex w-max items-stretch" ref={track}>
        <div className={cn("flex shrink-0 items-stretch", GAPS[gap].row)}>{children}</div>
        {clone ? (
          <div aria-hidden className={cn("flex shrink-0 items-stretch", GAPS[gap].row, GAPS[gap].seam)}>
            {clone}
          </div>
        ) : (
          <div aria-hidden className={cn("flex shrink-0 items-stretch", GAPS[gap].row, GAPS[gap].seam)} inert>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
