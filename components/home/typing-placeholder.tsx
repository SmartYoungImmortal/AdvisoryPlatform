"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { useRef } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, TextPlugin);

/**
 * Types example queries into the search field's placeholder slot, one after
 * another, with a caret blinking after them.
 *
 * It does not touch the input's own `placeholder`, which stays in the markup as
 * the accessible, no-JS, reduced-motion answer. Only once the animation is
 * actually running does it blank the real placeholder out — the input keeps its
 * `aria-label`, so nothing is lost from the accessibility tree — and it puts the
 * original back on cleanup. The typed text is `aria-hidden`: a screen reader
 * should hear one stable prompt, not a string mutating letter by letter.
 */
export function TypingPlaceholder({
  phrases,
  className,
  /** Seconds per character while typing. */
  typeSpeed = 0.05,
  /** How long a finished phrase sits before it is cleared. */
  hold = 1.8,
}: {
  readonly phrases: readonly string[];
  readonly className?: string;
  readonly typeSpeed?: number;
  readonly hold?: number;
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

        const tl = gsap.timeline({ repeat: -1 });
        for (const phrase of phrases) {
          tl.to(text, {
            duration: phrase.length * typeSpeed,
            ease: "none",
            text: { value: phrase, delimiter: "" },
          })
            .to({}, { duration: hold })
            // Backspacing is quicker than typing, the way a person deletes.
            .to(text, { duration: phrase.length * typeSpeed * 0.4, ease: "none", text: { value: "" } })
            .to({}, { duration: 0.2 });
        }

        return () => {
          if (input && original !== undefined) input.placeholder = original;
        };
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [phrases, typeSpeed, hold] },
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
