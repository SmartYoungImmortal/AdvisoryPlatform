/**
 * The motion every redesigned page shares, taken from the home hero: things
 * thrown to their place on the ring's overshoot, blocks coming out of a blur,
 * faces that turn towards the cursor. One vocabulary, so the pages move like
 * one product.
 *
 * Rules the pieces keep, and that anything built beside them should too:
 * - every tween sits inside `prefers-reduced-motion: no-preference`, and the
 *   markup is already in its finished state without it or without JavaScript;
 * - only transform, opacity and filter are animated;
 * - nothing is pinned: the page scrolls inside `ScreenBody`, where GSAP's `pin`
 *   falls back to transform pinning and breaks scrolling, so a scroll-held
 *   stage is `position: sticky` with a scrubbed ScrollTrigger on that scroller.
 */
export { CountUp } from "@/components/motion/count-up";
export { SETTLE, THROW } from "@/components/motion/ease";
export { Magnetic } from "@/components/motion/magnetic";
export { Parallax } from "@/components/motion/parallax";
export { Rise } from "@/components/motion/rise";
export { Throw, type ThrowOrigin } from "@/components/motion/throw";
export { Tilt } from "@/components/motion/tilt";
export { onFirstView, scrollerOf } from "@/components/motion/view";
