"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * Thai stacks vowels and tone marks onto a base consonant as separate code
 * points, so slicing a string by index tears a mark off its consonant and leaves
 * it floating on its own for a frame. Grapheme segmentation keeps each written
 * character whole.
 */
function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
    return [...segmenter.segment(value)].map((s) => s.segment);
  }
  return [...value];
}

/**
 * Types example queries into the search field's placeholder slot, one after
 * another, with a caret blinking after them.
 *
 * The text is driven by tweening a count and slicing to it, rather than by
 * TextPlugin. The plugin sizes its animation by the length of the *incoming*
 * string, so animating to `""` gives a length of zero: it holds the old phrase
 * at full length for the whole tween and then clears it in one frame. Counting
 * down and slicing deletes from the end, one character at a time, the way a
 * person backspaces.
 *
 * It leaves the input's own `placeholder` alone in the markup — that stays the
 * accessible, no-JS, reduced-motion answer. Only once the animation is running
 * does it blank the real placeholder out, and it restores it on cleanup; the
 * input already carries an `aria-label`, so nothing leaves the accessibility
 * tree. The typed span is `aria-hidden`: a screen reader should hear one stable
 * prompt, not a string mutating letter by letter.
 */
export function TypingPlaceholder({
  phrases,
  className,
  /** Seconds per character while typing. */
  typeSpeed = 0.05,
  /** How long a finished phrase sits before it is deleted. */
  hold = 1.8,
  /** Deleting is quicker than typing, as it is for a person. */
  deleteRatio = 0.4,
}: {
  readonly phrases: readonly string[];
  readonly className?: string;
  readonly typeSpeed?: number;
  readonly hold?: number;
  readonly deleteRatio?: number;
}) {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const text = root.current?.firstElementChild;
      const caret = root.current?.lastElementChild;
      if (!text || !caret || phrases.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const input = root.current?.closest("[data-slot=input-group]")?.querySelector("input");
        const original = input?.placeholder;
        if (input) input.placeholder = "";

        gsap.set(root.current, { autoAlpha: 1 });
        gsap.to(caret, { autoAlpha: 0, duration: 0.5, repeat: -1, yoyo: true, ease: "none" });

        const cursor = { shown: 0 };
        const tl = gsap.timeline({ repeat: -1 });

        for (const phrase of phrases) {
          const chars = graphemes(phrase);
          const write = () => {
            text.textContent = chars.slice(0, Math.round(cursor.shown)).join("");
          };

          tl.to(cursor, {
            shown: chars.length,
            duration: chars.length * typeSpeed,
            ease: "none",
            onUpdate: write,
          })
            .to({}, { duration: hold })
            .to(cursor, {
              shown: 0,
              duration: chars.length * typeSpeed * deleteRatio,
              ease: "none",
              onUpdate: write,
            })
            .to({}, { duration: 0.2 });
        }

        return () => {
          if (input && original !== undefined) input.placeholder = original;
        };
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [phrases, typeSpeed, hold, deleteRatio] },
  );

  return (
    // Hidden until the animation claims it, so the real placeholder is never
    // covered by an empty overlay on the frames before GSAP runs.
    <span
      aria-hidden
      className={cn(
        "pointer-events-none invisible absolute inset-y-0 left-0 flex items-center text-sm text-muted-foreground",
        className,
      )}
      ref={root}
    >
      <span />
      <span className="ml-px inline-block h-4 w-px bg-muted-foreground align-middle" />
    </span>
  );
}
