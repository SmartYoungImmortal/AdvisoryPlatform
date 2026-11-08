"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { FRAME } from "@/components/home/section-parts";
import { Rise } from "@/components/motion";
import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/** Where the list is two columns: the desktop and a landscape tablet. */
const TWO_COLUMNS = "(min-width: 1024px) and (orientation: landscape)";
const REDUCED = "(prefers-reduced-motion: reduce)";

/** Open and close, both ways. */
const FAQ_MS = 150;

/** The answer coming in: unclipped from the top down as it fades up. */
const REVEAL: Keyframe[] = [
  { opacity: 0, clipPath: "inset(0 0 100% 0)" },
  { opacity: 1, clipPath: "inset(0 0 0 0)" },
];

/**
 * The questions people ask before their first booking: all fourteen
 * `landing.faq*`. This is the FAQ every "help" and "FAQ" link lands on
 * (`/#faq`) since the old `/landing` page was removed (30 Oct 2569).
 *
 * A heading over a hairline-separated list: centred with one continuous list
 * on a phone, the heading to the left from `md`, and from `lg` the list split
 * into two columns. The split is in the data, not in CSS: each column is its
 * own block, so opening an answer grows only its own column.
 *
 * One answer open at a time in the whole list, at every width: opening one
 * closes any other, in either column. How it opens depends on the layout:
 * - One column (a phone, an upright tablet): the movement is on `transform`
 *   (FLIP). The page is laid out
 *   once, at the final state, and every question below and the rest of the
 *   page after the list slide from where they were to where they now are,
 *   on the compositor, while the answer is unclipped and fades in. Animating
 *   the answer's height instead re-laid out and repainted the whole page under
 *   it on every frame, which is what stuttered. Closing runs the other way:
 *   what is below slides up over the answer as it fades, and only then does
 *   the row collapse.
 * - Two columns: a grid row going `0fr` → `1fr` with the answer fading with
 *   it. Nothing sets a height on the text either way (iOS re-runs its text
 *   autosizing on a block whose height is animated).
 *
 * 20 / 14 / 14 on a phone (heading, questions, answers), 24 heading from
 * `sm`; drawn for the 1710 frame the home sections are zoomed from, 30 / 18 /
 * 16 and a 32 badge on the desktop.
 */
export function HomeFaq() {
  const t = useTranslations("home");
  const l = useTranslations("landing");
  const panel = useId();
  const list = useRef<HTMLDivElement>(null);
  // The one open answer, by its index in the list.
  const [open, setOpen] = useState<number | null>(null);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    const two = window.matchMedia(TWO_COLUMNS);
    const reduced = window.matchMedia(REDUCED);
    const update = () => {
      setFlip(!two.matches && !reduced.matches);
      setOpen(null);
    };
    update();
    two.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      two.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  const items = [
    { q: l("faq1Question"), a: l("faq1Answer") },
    { q: l("faq2Question"), a: l("faq2Answer") },
    { q: l("faq3Question"), a: l("faq3Answer") },
    { q: l("faq4Question"), a: l("faq4Answer") },
    { q: l("faq5Question"), a: l("faq5Answer") },
    { q: l("faq6Question"), a: l("faq6Answer") },
    { q: l("faq7Question"), a: l("faq7Answer") },
    { q: l("faq8Question"), a: l("faq8Answer") },
    { q: l("faq9Question"), a: l("faq9Answer") },
    { q: l("faq10Question"), a: l("faq10Answer") },
    { q: l("faq11Question"), a: l("faq11Answer") },
    { q: l("faq12Question"), a: l("faq12Answer") },
    { q: l("faq13Question"), a: l("faq13Answer") },
    { q: l("faq14Question"), a: l("faq14Answer") },
  ].map((item, index) => ({ ...item, index }));
  const mid = Math.ceil(items.length / 2);
  const columns = [items.slice(0, mid), items.slice(mid)];

  const panelOf = (index: number) => document.getElementById(`${panel}-${index}`);

  // Everything that moves when an answer changes height: every question row,
  // and the page after the list.
  const movers = () => {
    const rows = list.current ? Array.from(list.current.querySelectorAll<HTMLElement>("[data-faq-item]")) : [];
    const after = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="home-cta"], footer'));
    return [...rows, ...after];
  };

  const toggle = async (index: number) => {
    const prev = open;
    const next = prev === index ? null : index;

    if (!flip) {
      setOpen(next);
      return;
    }

    // Closing: slide what is below up over the answer, then collapse it.
    if (next === null && prev !== null) {
      const box = panelOf(prev);
      if (!box) {
        setOpen(null);
        return;
      }
      const height = box.offsetHeight;
      const top = box.getBoundingClientRect().top;
      const below = movers().filter((el) => el.getBoundingClientRect().top >= top + height - 1);
      const slides = below.map((el) =>
        el.animate([{ transform: "none" }, { transform: `translateY(${-height}px)` }], {
          duration: FAQ_MS,
          easing: "ease-in",
          fill: "forwards",
        }),
      );
      const fade = box.firstElementChild?.animate([...REVEAL].reverse(), {
        duration: FAQ_MS,
        easing: "ease-in",
        fill: "forwards",
      });
      await Promise.all(slides.map((a) => a.finished.catch(() => undefined)));
      flushSync(() => setOpen(null));
      for (const a of slides) a.cancel();
      fade?.cancel();
      return;
    }

    // Opening (or switching): lay out the final state once, then play every
    // row from where it was back to where it is now.
    const els = movers();
    const before = new Map(els.map((el) => [el, el.getBoundingClientRect().top]));
    flushSync(() => setOpen(next));
    for (const el of els) {
      const dy = (before.get(el) ?? 0) - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
        duration: FAQ_MS,
        easing: "ease-out",
      });
    }
    if (next !== null) panelOf(next)?.firstElementChild?.animate(REVEAL, { duration: FAQ_MS, easing: "ease-out" });
  };

  return (
    <section
      className="w-full shrink-0 scroll-mt-24 pt-10 pb-6 md:pt-12 md:pb-8 lg:py-24"
      data-slot="home-faq"
      id="faq"
    >
      <div className={cn(FRAME, "md:px-12 lg:px-0")}>
        {/* Centred on a phone, to the left from `md`. */}
        <Rise className="mx-auto max-w-3xl text-center md:mx-0 md:text-left lg:max-w-none">
          <h2 className="text-xl font-extrabold tracking-tight text-balance text-hero-ink sm:text-2xl lg:text-3xl">
            {t("faqTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-pretty text-hero-ink/75 sm:mt-2 lg:mt-4 lg:text-base">
            <ThaiText>{l("faqSubtitle")}</ThaiText>
          </p>
        </Rise>

        {/* No gap between the two columns' wrappers below `lg`: stacked, the
            seam between them is invisible and the list reads as one. */}
        <div
          className="mt-4 flex flex-col sm:mt-6 lg:mt-12 lg:flex-row lg:items-start lg:gap-x-14"
          ref={list}
        >
          {columns.map((column, ci) => (
            <Rise className="flex-1" delay={ci * 0.08} key={column[0]?.q ?? ci}>
              {column.map(({ q, a, index }) => {
                const shown = open === index;
                return (
                  <div
                    className={cn(
                      "border-b border-faq-accent/12",
                      // No rule under the last question: the second column's
                      // last is the list's last; from `lg` each column ends.
                      ci === 0 ? "lg:last:border-b-0" : "last:border-b-0",
                    )}
                    data-faq-item=""
                    data-open={shown ? "" : undefined}
                    key={q}
                  >
                    <button
                      aria-controls={`${panel}-${index}`}
                      aria-expanded={shown}
                      id={`${panel}-q-${index}`}
                      className="flex w-full cursor-pointer items-center gap-3.5 rounded-lg py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-faq-accent/40 lg:gap-4 lg:py-5"
                      onClick={() => void toggle(index)}
                      type="button"
                    >
                      <span aria-hidden className="faq-badge" />
                      <span className="text-sm font-semibold text-faq-accent lg:text-lg">{q}</span>
                    </button>
                    {/* A `section` named by its question: the answer's region. */}
                    <section
                      aria-labelledby={`${panel}-q-${index}`}
                      className={cn(
                        "grid",
                        shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        // The CSS row transition is the two columns' only; the
                        // one-column list snaps and moves on transforms.
                        !flip &&
                          cn(
                            "transition-[grid-template-rows] duration-150 motion-reduce:transition-none",
                            shown ? "ease-out" : "ease-in",
                          ),
                      )}
                      id={`${panel}-${index}`}
                    >
                      {/* Both, or a 0fr row does not collapse; and the padding
                          on the text, not this box, or a closed answer keeps it.
                          Plain text, not `ThaiText`: its unbreakable phrases
                          left each line short and a wide gap on the right. */}
                      <div
                        className={cn(
                          "min-h-0 overflow-hidden",
                          shown ? "opacity-100" : "opacity-0",
                          !flip &&
                            cn(
                              "transition-opacity duration-150 motion-reduce:transition-none",
                              shown ? "ease-out" : "ease-in",
                            ),
                        )}
                      >
                        <p className="pb-3 pl-10.5 text-sm leading-6 whitespace-pre-line text-hero-ink/78 lg:pb-5 lg:pl-12 lg:text-base lg:leading-7">
                          {a}
                        </p>
                      </div>
                    </section>
                  </div>
                );
              })}
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}
