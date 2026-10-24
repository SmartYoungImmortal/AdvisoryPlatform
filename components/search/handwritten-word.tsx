"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "next-intl";
import { useRef } from "react";

import { HAND_ASCENT, HAND_DESCENT, HAND_WORDS } from "@/components/search/hand-words";

gsap.registerPlugin(useGSAP);

const em = (units: number) => `${units / 1000}em`;

/**
 * The heading's last word, in quotes, written out by hand and then swapped for
 * the same word in another language every few seconds.
 *
 * Each word is its Sriracha outlines as SVG paths (`hand-words.ts`), so the
 * pen can trace them: every glyph's outline is drawn in as a stroke, one letter
 * after another, and the ink floods in behind it; leaving, the ink drains and
 * the stroke runs off the end. The box between the quotes eases to each word's
 * width as it is written, so the quotes stay against the letters.
 *
 * The page's own language goes first, so the heading reads as a sentence before
 * the loop starts. Without motion the first word just stays, already inked. The
 * whole span is `aria-hidden`: the heading carries the plain title for screen
 * readers.
 */
export function HandwrittenWord() {
  const locale = useLocale();
  // Remounted on a language switch: the words reorder, and a timeline built for
  // the old order left two of them drawn over each other.
  return <WordLoop key={locale} locale={locale} />;
}

function WordLoop({ locale }: { readonly locale: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const start = Math.max(0, HAND_WORDS.findIndex((w) => w.lang === locale));
  const words = [...HAND_WORDS.slice(start), ...HAND_WORDS.slice(0, start)];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const svgs = gsap.utils.toArray<SVGSVGElement>("[data-word]", root.current);
        const glyphs = svgs.map((svg) => svg.querySelectorAll("path"));
        gsap.set(glyphs.slice(1), { fillOpacity: 0, strokeDashoffset: 1 });

        const loop = gsap.timeline({ repeat: -1, delay: 2.4 });
        svgs.forEach((svg, i) => {
          const n = (i + 1) % svgs.length;
          loop
            // The ink drains, then the outline runs off the end of the pen.
            .to(glyphs[i], { fillOpacity: 0, duration: 0.25, ease: "power1.in" })
            .to(glyphs[i], { strokeDashoffset: -1, duration: 0.45, ease: "power1.in", stagger: 0.03 }, "<0.1")
            .set(svg, { autoAlpha: 0 })
            .set(svgs[n], { autoAlpha: 1 })
            .to(box.current, { width: em(words[n].advance), duration: 0.6, ease: "power2.inOut" }, "-=0.15")
            // Written in: each letter's outline, then its ink, a beat apart.
            .to(glyphs[n], { strokeDashoffset: 0, duration: 0.7, ease: "power2.out", stagger: 0.08 }, "<")
            .to(glyphs[n], { fillOpacity: 1, duration: 0.35, ease: "power1.out", stagger: 0.08 }, "<0.45")
            .to({}, { duration: 2.4 });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <span aria-hidden className="inline-flex items-baseline font-hand" ref={root}>
      <span>“</span>
      {/* No text inside, so its baseline is its bottom edge: each word's own
          baseline (y = 0) is placed there. */}
      <span className="relative inline-block h-[1em]" ref={box} style={{ width: em(words[0].advance) }}>
        {words.map((word, i) => (
          <svg
            className={i === 0 ? "absolute left-0 overflow-visible" : "invisible absolute left-0 overflow-visible"}
            data-word
            key={word.lang}
            style={{
              bottom: em(-HAND_DESCENT),
              height: em(HAND_ASCENT + HAND_DESCENT),
              width: em(word.advance),
            }}
            viewBox={`0 ${-HAND_ASCENT} ${word.advance} ${HAND_ASCENT + HAND_DESCENT}`}
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
                // Thin: the stroke sits on top of the ink once a word is
                // written, so anything wider thickens the face past Sriracha's own.
                strokeWidth={6}
              />
            ))}
          </svg>
        ))}
      </span>
      <span>”</span>
    </span>
  );
}
