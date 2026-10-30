"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import { buildDesktopStory, buildPhoneStory, playIntro } from "@/components/about/story-motion";
import { OpeningScene, StoryScenes } from "@/components/about/story-scenes";
import { scrollerOf } from "@/components/motion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * What Advisory is for, told as Ask and Answer's story in ten scenes, like a
 * short commercial: a still each, two short lines over it (`story-scenes.tsx`).
 *
 * From `lg`, with motion allowed, the track below is twelve screens tall and
 * the stage inside it is `position: sticky` for eleven of them: the scenes are
 * stacked on that one screen and the scroll plays them (`buildDesktopStory`).
 * Nothing between the stage and `ScreenBody` may clip (`overflow-hidden`,
 * `overflow-clip`): sticky stops working under a clipping ancestor, silently.
 *
 * Below `lg`, or without motion, the track and the stage are plain blocks and
 * the scenes are sections one after another, already in their finished state;
 * on the phone with motion each piece arrives as it is reached.
 *
 * The scenes are always in the page, in reading order, so the story is all
 * there for a screen reader whichever way it is drawn; the desktop hides the
 * ones not on stage with `opacity`, never `visibility`, so none of them leaves
 * the accessibility tree.
 */
export function Story() {
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      const scroller = el ? scrollerOf(el) : undefined;
      if (!el || !scroller) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => playIntro(el));
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () =>
        buildDesktopStory(el, scroller),
      );
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () =>
        buildPhoneStory(el, scroller),
      );
      return () => mm.revert();
    },
    { scope: track },
  );

  return (
    <div className="relative w-full shrink-0 lg:motion-safe:h-[1200dvh]" data-story ref={track}>
      <div
        className="relative w-full lg:motion-safe:sticky lg:motion-safe:top-0 lg:motion-safe:h-dvh lg:motion-safe:overflow-hidden lg:motion-safe:bg-card"
        data-story-stage
      >
        <OpeningScene />
        <StoryScenes />
      </div>
    </div>
  );
}
