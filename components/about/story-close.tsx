"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Search, SkipForward } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { authPill } from "@/components/auth/auth-split";
import { Art, Lines } from "@/components/about/story-parts";
import { scrollerOf } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Where the story ends and the skip button lands, taking focus with it. */
const CLOSE_ID = "story-close";
const CLOSE_TITLE_ID = "story-close-title";

/**
 * The end of the story, and what to do with it: are you an Ask or an Answer?
 * "I have a question" goes to `/search`, "I have answers" to the way in as an
 * expert, and Ask and Answer stand either side of the buttons, each beside
 * their own (the two of them under the buttons on the phone). They walk in
 * from the edges as the section scrolls up; scrubbed, so they walk back out on
 * the way up, and under reduced motion they are simply there. Drawn at the
 * 1710 frame's size and zoomed by the width (`page-scale`), like the footer
 * under it.
 */
export function StoryClose() {
  const t = useTranslations("about");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const scroller = el ? scrollerOf(el) : undefined;
      if (!el || !scroller) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, scroller, start: "top 85%", end: "center 60%", scrub: 0.5 },
        });
        tl.fromTo("[data-close-left]", { xPercent: -120, opacity: 0 }, { xPercent: 0, opacity: 1, ease: "power2.out", duration: 1 }, 0);
        tl.fromTo("[data-close-right]", { xPercent: 120, opacity: 0 }, { xPercent: 0, opacity: 1, ease: "power2.out", duration: 1 }, 0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      aria-labelledby={CLOSE_TITLE_ID}
      className="page-scale relative isolate flex w-full shrink-0 justify-center overflow-clip bg-card px-6 pt-20 text-center outline-none md:px-12 lg:pt-28"
      id={CLOSE_ID}
      ref={root}
      // The skip link's landing: focusable so it can take focus.
      tabIndex={-1}
    >
      <div className="grid w-full max-w-sm grid-cols-2 items-end gap-x-4 lg:max-w-[1500px] lg:grid-cols-[1fr_auto_1fr] lg:gap-x-16">
        <div className="col-span-2 flex flex-col items-center pb-10 lg:order-2 lg:col-span-1 lg:pb-28">
          <Lines accent={1} id={CLOSE_TITLE_ID} lines={[t("closeL1"), t("closeL2")]} still />
          <div className="mt-8 flex w-full flex-col gap-3 md:w-auto md:flex-row lg:mt-12 lg:gap-4">
            <Button
              className={cn(authPill(true), "md:w-auto lg:h-16 lg:px-10 lg:text-xl")}
              nativeButton={false}
              render={<Link href="/search" />}
            >
              <Search aria-hidden />
              {t("closeSearch")}
            </Button>
            <Button
              className={cn(authPill(), "md:w-auto lg:h-16 lg:px-10 lg:text-xl")}
              nativeButton={false}
              render={<Link href="/advisor/apply" />}
            >
              {t("closeAdvisor")}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
        {/* Ask beside "I have a question", Answer beside "I have answers". */}
        <div aria-hidden className="flex justify-center lg:order-1 lg:justify-end" data-close-left>
          <Art className="h-60 lg:h-[560px]" name="asker_think" />
        </div>
        <div aria-hidden className="flex justify-center lg:order-3 lg:justify-start" data-close-right>
          <Art className="h-60 lg:h-[560px]" name="expert_wave" />
        </div>
      </div>
    </section>
  );
}

/**
 * "Skip to the end": a capsule over the bottom of the held stage, for anyone
 * who came for the buttons rather than the story. Desktop with motion only,
 * the one layout where the story is fourteen screens of scrolling; it fades
 * out once the end is on screen. The link glides there (Lenis, or the
 * scroller's own smooth scrolling) and hands focus to the closing heading.
 */
export function SkipToEnd() {
  const t = useTranslations("about");
  const [shown, setShown] = useState(true);

  // Read on scroll, once a frame, rather than with an IntersectionObserver:
  // a jump from the story to the footer (the link itself, End, a scrollbar
  // drag) passes the end without ever intersecting it, and an observer would
  // never call back.
  useEffect(() => {
    const close = document.getElementById(CLOSE_ID);
    const scroller = close?.closest<HTMLElement>('[data-slot="screen-body"]');
    if (!close || !scroller) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setShown(close.getBoundingClientRect().top > scroller.getBoundingClientRect().bottom - 120);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <a
      aria-hidden={!shown}
      className={cn(
        // An outlined pill in the story's type and the brand blue, see-through
        // over the scene, its icon trailing.
        "absolute bottom-6 left-1/2 z-20 hidden h-10 -translate-x-1/2 items-center gap-2 rounded-full border-2 border-primary px-6 font-story text-base leading-none font-semibold text-primary uppercase transition-[opacity,background-color] duration-300 hover:bg-primary/10 lg:motion-safe:flex",
        !shown && "pointer-events-none opacity-0",
      )}
      href={`#${CLOSE_ID}`}
      onClick={() => {
        // After the scroll has been handed off, so focusing cannot jump it.
        requestAnimationFrame(() => document.getElementById(CLOSE_ID)?.focus({ preventScroll: true }));
      }}
      tabIndex={shown ? undefined : -1}
    >
      {t("skip")}
      <SkipForward aria-hidden className="size-5 shrink-0" />
    </a>
  );
}
