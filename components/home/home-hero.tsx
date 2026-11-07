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
      //
      // Below `lg` it is pulled up under the bar the same way, by the bar's
      // own 72 (88 on an upright tablet), so the full-screen band starts at the
      // top of the screen with the bar over its photograph.
      className={cn(
        // Two screens tall at every width now, so a phone and a tablet get the
        // desktop's hold and fly-out too; the next section waits 5rem below
        // the top on a phone (its 72px bar and a little), 6rem from `md`.
        "-mt-18 -mb-[calc(100dvh-5rem)] h-[200dvh] w-full shrink-0 md:-mt-22 md:-mb-[calc(100dvh-6rem)] lg:-mt-[5.5rem]",
        className,
      )}
      data-slot="home-hero-track"
    >
      <section
        className={cn(
          // Clipped here, at the band, not inside the stage: the stage is the
          // 1710×985 frame scaled to fit, so on a screen of another shape it
          // is shorter or narrower than the band, and clipping the ring to it
          // cut the lower cards off along a straight line. The search panel
          // is held above the bottom of the screen, so it is not cut either.
          "relative isolate flex w-full flex-col items-center justify-center overflow-hidden bg-hero-ground",
          // `z-1` keeps the band over the sections waiting beneath it and
          // under the bar, which is `z-10` (`components/topbar.tsx`).
          // Full screen on a phone and an upright tablet too: a whole screen
          // tall, the bar's height given back as padding so the copy centres
          // in what is left under it.
          "sticky top-0 z-1 h-[100dvh] pt-18 pb-16 md:pt-22 lg:py-0 lg:pt-[5.5rem]",
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
            // Below `lg` the band is a tall full screen, where the 110% height
            // blew the room up to its bare wall. There the photo is drawn at
            // 66% of the band's height, fading in from the ground above it,
            // and shifted so the chair (at 50.9% of the 3200 × 2000
            // photograph's width) stands on the screen's centre line: 0.9% of
            // the drawn width, which is 1.6 × 66% of the drawn height (100dvh
            // and the 2rem of overhang). It stands 2.5rem up from the floor on
            // a phone, 3.5rem on an upright tablet, its fade with it, so the
            // strip of ground under the photo stays hidden under the tab bar,
            // never showing as a gap.
            //
            // A phone draws it a little smaller, at 60%: the chair's 0.9% is
            // then 0.864dvh and its fade runs from 40% to 55%. An upright
            // tablet at 61%: 0.878dvh, fading from 39% to 54%.
            className="absolute -inset-4 bg-hero-photo bg-[length:auto_60%] bg-[position:calc(50%-0.864dvh-0.28px)_calc(100%-4rem)] bg-no-repeat [mask-image:linear-gradient(to_bottom,transparent_calc(40%-4rem),black_calc(55%-4rem))] md:bg-[length:auto_61%] md:bg-[position:calc(50%-0.878dvh-0.28px)_calc(100%-3.5rem)] md:[mask-image:linear-gradient(to_bottom,transparent_calc(39%-3.5rem),black_calc(54%-3.5rem))] lg:bg-[length:auto_110%] lg:bg-[position:85%_center] lg:[mask-image:none]"
            data-slot="home-hero-photo"
          />
        </div>
        {/* The composition, drawn once at 1710×985 and scaled whole to the
            screen (`.hero-stage` in `app/globals.css`), so ring, cards, copy
            and search keep the proportions they have on that screen on every
            other one. Below `lg` it steps out of the way and the copy flows
            as it always has. */}
        <div className="hero-stage">
        {/* At every width: below `lg` the same ring, zoomed down and its
            centre set lower (`[data-slot="hero-shapes"]` in `app/globals.css`),
            so its upper arc frames the headline on a phone as on a desktop. */}
        <HeroShapes />
        <div
          // `lg:pt-24` sets the copy 48px below the band's centre, deeper inside
          // the ring: level with the centre, the cards passing over the top of
          // the ring clipped the corners of the headline. Centred at every width,
          // as the desktop is; below `lg` in the band's middle, under the arc.
          // `-mt-4` sets the copy 8px above the band's centre on a phone;
          // `md:mt-4` 8px below it on an upright tablet, a little inside the
          // arc. 30rem wide, not 480px, so the column grows with the type on a
          // large upright tablet (`app/globals.css`).
          className="relative z-10 -mt-4 flex w-full max-w-120 flex-col items-center gap-4 px-6 text-center md:mt-4 lg:mt-0 lg:gap-5 lg:pt-24"
          // The pointer parallax in `app/globals.css` moves this by its slot.
          data-slot="home-hero-copy"
        >
          {/* Kanit at its regular weight with the tracking drawn in a little:
              the 500 read as a poster headline, which is loud rather than
              assured. */}
          <h1 className="w-full font-hero text-heading font-normal tracking-tight text-hero-ink md:text-hero">
            {title}
          </h1>
          {body ? (
            // One line, wider than the 480px column if it must be: wrapped,
            // Thai broke it as `แบบตัวต่อ / ตัว`. A flex column centres an
            // overflowing child evenly on both sides.
            // Tucked up to the headline, the two line boxes almost touching,
            // so the leading alone separates them and they read as one
            // statement; the column's 20px gap follows before the field.
            // Below `md` it may wrap, balanced, rather than run past a phone.
            <p className="-mt-2 font-hero text-sm text-balance text-muted-foreground md:-mt-3 md:text-base md:whitespace-nowrap">
              {body}
            </p>
          ) : null}
          {/* At most 352 wide on a phone. */}
          <div className="flex w-full max-w-88 shrink-0 items-start gap-2 md:max-w-none">
            {children}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
