"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useRef } from "react";

import { ASK, ASK_ASCENT, ASK_DESCENT, ASK_UNITS } from "@/components/home/hand-questions";
import { heroTrack } from "@/components/home/hold";
import { onFirstView, scrollerOf } from "@/components/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type Ask = keyof typeof ASK;

const em = (units: number) => `${units / ASK_UNITS}em`;

/** How long the pen takes over a whole question, however many letters it has. */
const WRITE = 0.85;

/**
 * A chapter's question, in the visitor's own hand: the hero's Sriracha, the
 * face its promise is written in, against the type every answer is set in.
 *
 * Each word is its Sriracha outlines (`hand-questions.ts`), so the pen can
 * trace them: every glyph's outline is drawn in, one letter after another,
 * and the ink floods in behind it, as the `/search` heading writes its word.
 * Words are separate boxes with real spaces between them, so a question wraps
 * like text on a narrow screen.
 *
 * The question writes itself the first time its chapter is seen. The first
 * chapter's (`onHold`) is written by the scroll instead, on `lg`, while the
 * hero's ring flies apart above it. Without motion it is simply there, inked.
 * The words are hidden from assistive tech; the heading reads the plain text.
 */
export function HandQuestion({
  ask,
  className,
  onHold = false,
}: {
  readonly ask: Ask;
  readonly className?: string;
  /** Write it with the hero's scroll-out rather than on first sight (`lg` only). */
  readonly onHold?: boolean;
}) {
  const t = useTranslations("home");
  const locale = useLocale() === "en" ? "en" : "th";
  const words = ASK[ask][locale];
  const root = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const paths = Array.from(el.querySelectorAll<SVGPathElement>("path"));
      if (paths.length === 0) return;
      const stagger = Math.min(0.05, WRITE / paths.length);

      const onSight = () => {
        gsap.set(paths, { strokeDashoffset: 1, fillOpacity: 0 });
        return onFirstView(el, () => {
          gsap
            .timeline()
            .to(paths, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out", stagger })
            .to(paths, { fillOpacity: 1, duration: 0.35, ease: "power1.out", stagger }, 0.4);
        });
      };

      const mm = gsap.matchMedia();
      if (onHold) {
        mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
          const track = heroTrack();
          if (!track) return;
          // Positions are fractions of the hold. The block only becomes
          // visible late in it (`HeroShapes` fades it in on `power4.in`), so
          // the pen moves through the last half and the ink lands as it ends.
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: track,
              scroller: scrollerOf(track),
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
          const each = 0.3 / paths.length;
          timeline
            .fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", duration: 0.12, stagger: each }, 0.5)
            .fromTo(paths, { fillOpacity: 0 }, { fillOpacity: 1, ease: "none", duration: 0.08, stagger: each }, 0.62)
            .set({}, {}, 1);
        });
        mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", onSight);
      } else {
        mm.add("(prefers-reduced-motion: no-preference)", onSight);
      }
      return () => mm.revert();
    },
    { scope: root, dependencies: [ask, locale, onHold], revertOnUpdate: true },
  );

  return (
    <h2 className={cn("font-hand leading-snug", className)} ref={root}>
      <span className="sr-only">{t(ask)}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <Fragment key={word.text + i}>
            {i > 0 ? " " : null}
            {/* No text inside, so its baseline is its bottom edge: the word's
                own baseline (y = 0) is placed there. */}
            <span className="relative inline-block h-[1em]" style={{ width: em(word.advance) }}>
              <svg
                className="absolute left-0 overflow-visible"
                style={{ bottom: em(-ASK_DESCENT), height: em(ASK_ASCENT + ASK_DESCENT), width: em(word.advance) }}
                viewBox={`0 ${-ASK_ASCENT} ${word.advance} ${ASK_ASCENT + ASK_DESCENT}`}
              >
                {word.glyphs.map((d) => (
                  <path
                    d={d}
                    fill="currentColor"
                    key={d}
                    pathLength={1}
                    stroke="currentColor"
                    strokeDasharray="1 1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // Thin: the stroke stays on top of the ink once a word is
                    // written, so anything wider thickens Sriracha's own face.
                    strokeWidth={1.5}
                  />
                ))}
              </svg>
            </span>
          </Fragment>
        ))}
      </span>
    </h2>
  );
}
