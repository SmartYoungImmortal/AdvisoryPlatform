"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocale } from "next-intl";
import { useRef } from "react";

import { SETTLE } from "@/components/motion/ease";
import { onFirstView } from "@/components/motion/view";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * A real figure counting up to itself the first time it is on screen, so the
 * number reads as the point of the block. Never for a made-up number: the
 * motion lends weight, and weight on an invented figure is a lie told louder.
 *
 * The markup carries the final value, so without JavaScript, under reduced
 * motion, or for a screen reader (the moving digits are hidden from it), the
 * figure is simply there. Keyed on the value so a new figure starts clean.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  readonly value: number;
  readonly decimals?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly className?: string;
}) {
  const locale = useLocale();
  const digits = useRef<HTMLSpanElement>(null);
  const format = (n: number) =>
    `${prefix}${new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)}${suffix}`;
  const final = format(value);

  useGSAP(
    () => {
      const el = digits.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const state = { n: 0 };
        el.textContent = format(0);
        const stop = onFirstView(el, () => {
          gsap.to(state, {
            n: value,
            duration: 1.2,
            ease: SETTLE,
            onUpdate: () => {
              el.textContent = format(state.n);
            },
            onComplete: () => {
              el.textContent = final;
            },
          });
        });
        return () => {
          stop();
          el.textContent = final;
        };
      });

      return () => mm.revert();
    },
    { scope: digits, dependencies: [value, decimals, prefix, suffix, locale] },
  );

  return (
    <span className={cn("tabular-nums", className)}>
      <span className="sr-only">{final}</span>
      <span aria-hidden key={final} ref={digits}>
        {final}
      </span>
    </span>
  );
}
