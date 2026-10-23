import type { ReactNode } from "react";

import { HeroShapes } from "@/components/home/hero-shapes";
import { cn } from "@/lib/utils";

/**
 * The home hero, built to the shape of the team's own
 * `mochiice-fe/app/components/pages/home/SectionHome.vue`.
 *
 * One full-height band on a soft ground, with everything stacked at its
 * centre: the copy and the search field in the middle, and twelve pieces that
 * burst out around them on load and breathe outward under the cursor. See
 * `HeroShapes` for the mechanism, which is ported rather than approximated.
 *
 * `min-h-[100dvh]`, never `h-screen`: a `vh` hero jumps as the iOS address bar
 * resizes the visual viewport. The reference uses `h-screen` and only gets
 * away with it because its hero is desktop-only.
 */
export function HomeHero({
  title,
  body,
  children,
  className,
}: {
  readonly title: ReactNode;
  /** One line under the headline, desktop only: the reference's "In the age of AI…". */
  readonly body?: ReactNode;
  /** The search field, which is this hero's call to action. */
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    // The track the hero holds still on while the ring flies apart. Two screens
    // tall at `lg`: the band is `sticky` for the first, so the scroll-out in
    // `HeroShapes` plays across a whole screen of scrolling with the band
    // fixed in view, and only then does the band scroll away.
    //
    // `sticky`, not GSAP's `pin`: the page scrolls inside `ScreenBody`, not
    // the window, and with a non-viewport scroller `pin` falls back to
    // transform-pinning (`gsap/ScrollTrigger.js`, the `pinType` line), which
    // is the thing `components/about/reveal.tsx` warns breaks scrolling.
    //
    // The bar is not an overlay here, so it takes 88px of flow above the
    // hero: a 64px capsule inside `lg:py-3`. The track is pulled up under it
    // by exactly that much and the band given the padding back, so the ground
    // runs behind the bar instead of stopping at it. `overlay` would do the
    // same job and is not used: it reverses the bar's ink to white below `lg`.
    <div
      // The negative margin pulls everything after the hero up under the
      // sticky band, so that when the hold ends the next section is already
      // where it will be read, 6rem below the top of the screen. `HeroShapes`
      // holds it there against the scroll for the length of the hold and
      // fades it in as the band dissolves: it appears in place, it does not
      // slide up.
      className={cn(
        "w-full shrink-0 lg:-mt-[5.5rem] lg:-mb-[calc(100dvh-6rem)] lg:h-[200dvh]",
        className,
      )}
      data-slot="home-hero-track"
    >
      <section
        className={cn(
          // No `overflow-hidden` here: the search's suggestion panel has to be
          // able to hang below the band. The two layers that need clipping,
          // the photograph and the ring, each clip themselves.
          "relative isolate flex w-full flex-col items-center justify-center bg-hero-ground",
          // `z-1` keeps the band over the sections waiting beneath it and
          // under the bar, which is `z-10` (`components/topbar.tsx`).
          "py-16 lg:sticky lg:top-0 lg:z-1 lg:h-[100dvh] lg:py-0 lg:pt-[5.5rem]",
        )}
        data-slot="home-hero"
      >
        {/* The photograph, on a layer of its own so it can be the farthest
            of the three depths in the pointer parallax (`app/globals.css`).
            It overhangs the band by 16px on every side, more than its 10px of
            travel, so the drift never shows an edge; the flat ground still
            shows where it is not drawn (`.dark` sets `--hero-photo` to none).
            Drawn a tenth taller than the band so there is width to spare, and
            that spare spent on the left: the room sits a little left of
            centre, keeping its chair out from under the search field. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -inset-4 bg-hero-photo bg-[length:auto_110%] bg-[position:85%_center] bg-no-repeat"
            data-slot="home-hero-photo"
          />
        </div>
        {/* Desktop only. The pieces are placed in `vw`/`vh` from the centre, and
          on a phone that arrangement either covers the copy or leaves the band
          empty; the phone keeps the category rail it already has. */}
        {/* Covers the whole band; `.hero-ring` moves its origin down from the
          copy's centre. */}
        <HeroShapes className="hidden lg:block" />
        <div
          // `lg:pt-24` sets the copy 48px below the band's centre, deeper inside
          // the ring: level with the centre, the cards passing over the top of
          // the ring clipped the corners of the headline.
          className="relative z-10 flex w-full max-w-[480px] flex-col items-start gap-4 px-6 lg:items-center lg:gap-5 lg:pt-24 lg:text-center"
          // The pointer parallax in `app/globals.css` moves this by its slot.
          data-slot="home-hero-copy"
        >
          {/* Kanit at its regular weight with the tracking drawn in a little:
              the 500 read as a poster headline, which is loud rather than
              assured. */}
          <h1 className="w-full text-2xl font-semibold text-foreground lg:font-hero lg:text-hero lg:font-normal lg:tracking-tight lg:text-hero-ink">
            {title}
          </h1>
          {body ? (
            // One line, wider than the 480px column if it must be: wrapped,
            // Thai broke it as `แบบตัวต่อ / ตัว`. A flex column centres an
            // overflowing child evenly on both sides.
            // Tucked up to the headline, the two line boxes almost touching,
            // so the leading alone separates them and they read as one
            // statement; the column's 20px gap follows before the field.
            <p className="-mt-3 hidden font-hero text-base whitespace-nowrap text-muted-foreground lg:block">
              {body}
            </p>
          ) : null}
          <div className="flex w-full shrink-0 items-start gap-2">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
