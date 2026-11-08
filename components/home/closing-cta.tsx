"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { FRAME } from "@/components/home/section-parts";
import { ThaiText } from "@/components/mobile/thai-text";
import { Rise, SETTLE, onFirstView } from "@/components/motion";
import { homeClosing, homeClosingWide } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Where the page ends: "go ahead, ask", and a field to ask in, the hero's own
 * (`search`, a `HeroSearch` with its suggestions panel). For someone who cannot
 * put it in words, the matching flow.
 *
 * One shape at every width: the copy in white over a white room, a table and a
 * chair by the window, under a grey veil it reads on. The phone and an upright
 * tablet take a 5:4 crop of the photograph, the desktop and a landscape tablet
 * a 2.5:1 strip across the same table. The photograph comes into focus as it
 * arrives. In the dark theme there is no photograph and the copy sits on the
 * page's own ground.
 */
export function ClosingCta({
  search,
}: {
  /** The field to ask in: the hero's `HeroSearch`. */
  readonly search: ReactNode;
}) {
  const t = useTranslations("home");
  const room = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = room.current;
      // Both photographs: one of them is hidden at any width, and the tween on
      // it is harmless.
      const photo = el ? Array.from(el.querySelectorAll("img")) : [];
      if (!el || photo.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(photo, { scale: 1.08, filter: "blur(10px)", autoAlpha: 0 });
        return onFirstView(el, () => {
          gsap.to(photo, {
            scale: 1,
            filter: "blur(0px)",
            autoAlpha: 1,
            duration: 1.6,
            ease: SETTLE,
            clearProps: "transform,filter,opacity,visibility",
          });
        });
      });
      return () => mm.revert();
    },
    { scope: room },
  );

  return (
    <section className="relative w-full shrink-0 py-8 md:py-12 lg:py-14" data-slot="home-cta">
      {/* The phone's block at every width: 24 headline, 14 body, the phone's
          40 field (`compact`), a 12 link. From `lg` (the desktop and a
          landscape tablet) the same block, values and all, zoomed 1.5 times
          as one piece, so its sizes keep the phone's proportions to each
          other instead of each growing by its own step. */}
      <div className={cn(FRAME, "relative z-1 flex flex-col items-center gap-5 text-center lg:[zoom:1.5]")}>
        {/* 12px lower, nearer the field, the field itself staying put; the
            body tucked up under the headline. */}
        <Rise className="flex max-w-4xl translate-y-3 flex-col items-center gap-2">
          <h2 className="font-hero text-2xl leading-snug font-normal tracking-tight text-on-media">
            {t("closeTitle")}
          </h2>
          <p className="-mt-1.5 max-w-2xl text-sm text-on-media/85">
            <ThaiText>{t("closeBody")}</ThaiText>
          </p>
        </Rise>
        {/* 352 wide, 432 on an upright tablet. From `lg` taken back to 0.8 of
            the block's zoom (1.2 in all), so the field is the hero's own 48
            by 422 rather than half as big again. */}
        <Rise className="flex w-full max-w-88 text-left md:max-w-108 lg:max-w-88 lg:[zoom:0.8]" delay={0.15}>
          {search}
        </Rise>
        {/* 8px nearer the field; from `lg` a step smaller than the block's zoom. */}
        <Rise className="-mt-2 lg:[zoom:0.8]" delay={0.25}>
          <Link
            className="group/match flex h-11 items-center gap-1.5 text-xs font-medium text-on-media md:text-sm lg:text-xs"
            href="/matching"
          >
            <span className="underline underline-offset-4">{t("closeMatch")}</span>
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-300 group-hover/match:translate-x-1 motion-reduce:transition-none md:size-4 lg:size-3.5"
            />
          </Link>
        </Rise>
      </div>
      <div aria-hidden className="absolute inset-0 overflow-hidden dark:hidden" ref={room}>
        <Image alt="" className="size-full object-cover lg:hidden" src={homeClosing} />
        <Image alt="" className="hidden size-full object-cover lg:block" src={homeClosingWide} />
        <div className="absolute inset-0 bg-scrim/65" />
      </div>
    </section>
  );
}
