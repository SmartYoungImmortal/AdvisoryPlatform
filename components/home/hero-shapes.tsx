"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type CSSProperties } from "react";

import { heroCards } from "@/lib/assets/r2";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The ring of photographs that turns around the home hero.
 *
 * Fourteen cards set on one circle whose upper arc frames the headline, each
 * tilted along the curve, the whole ring turning slowly and stopping while a
 * card is under the cursor. The entrance is the team's own, from
 * `mochiice-fe/app/components/pages/home/SectionHome.vue`: every card starts at
 * the centre and is thrown out to its place on a curve that overshoots.
 *
 * The geometry and both animations live in `.hero-ring` / `.hero-card` in
 * `app/globals.css`; all this file sets is each card's angle.
 *
 * The card is fastwork's: a photograph of the work, the person's portrait laid
 * over its bottom edge, and their name over what they do and where. Each card
 * is a real search for its topic.
 */
/**
 * Twelve, not more: at fourteen the gap between neighbours was tight enough
 * that the cards read as a strip rather than as cards. Twelve keeps one
 * upright at the top and leaves roughly 48px between each pair.
 */
const CARDS = [1, 2, 3, 4, 11, 5, 6, 12, 7, 8, 9, 10] as const;

const STEP = 360 / CARDS.length;

export function HeroShapes({ className }: { readonly className?: string }) {
  const t = useTranslations("home");
  const scope = useRef<HTMLDivElement>(null);
  // Each card is a real advisor (seeded in the API repo); once the live
  // catalogue is in, a card opens that advisor's service. Until then, and for
  // a card with no service, it searches its topic.
  const catalogue = useLiveCatalogue();
  const serviceHref = new Map<number, string>();
  for (const item of catalogue.items) {
    if (item.card && !serviceHref.has(item.card)) serviceHref.set(item.card, item.href);
  }

  // The hero's scroll-out runs across the first screen of `home-hero-track`,
  // the stretch where the band is held `sticky`: the ring's `--hero-exit`
  // (which `.hero-card` turns into the fly-out and the blur) goes 0 → 1, and
  // the whole band blurs out where it stands.
  // The entrance waits for the photographs. `.hero-ring` without
  // `data-ready` holds every card's animation paused on its first frame,
  // which is invisible, so nothing is thrown out until there is something to
  // see. Capped at 1.2s: on a slow connection the ring comes out anyway and
  // the pictures fill in, rather than the hero sitting empty.
  useEffect(() => {
    const ring = scope.current?.querySelector<HTMLElement>(".hero-ring");
    if (!ring) return;
    let done = false;
    const ready = () => {
      if (done) return;
      done = true;
      ring.dataset.ready = "";
    };
    const images = Array.from(ring.querySelectorAll("img"));
    void Promise.all(images.map((img) => img.decode().catch(() => undefined))).then(ready);
    const cap = window.setTimeout(ready, 1200);
    return () => window.clearTimeout(cap);
  }, []);

  useGSAP(
    () => {
      const el = scope.current;
      const track = el?.closest<HTMLElement>('[data-slot="home-hero-track"]');
      const band = track?.querySelector<HTMLElement>('[data-slot="home-hero"]');
      if (!el || !track || !band) return;

      const mm = gsap.matchMedia();
      // Desktop only, like the ring itself, and not a single tween under
      // `prefers-reduced-motion`: the hero then simply scrolls away as it is.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: track,
              // The page scrolls inside `ScreenBody`, not the window.
              scroller: track.closest('[data-slot="screen-body"]') ?? undefined,
              // The track's bottom reaching the scroller's bottom is the
              // moment the sticky band lets go.
              start: "top top",
              end: "bottom bottom",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(el, { "--hero-exit": 0 }, { "--hero-exit": 1, ease: "none" }, 0)
          // The whole band dissolves where it stands, room, copy and all, from
          // the first pixel of scroll, together with the cards leaving.
          .fromTo(
            band,
            { autoAlpha: 1, filter: "blur(0px)" },
            { autoAlpha: 0, filter: "blur(14px)", ease: "none", duration: 1 },
            0,
          );

        // What follows the hero, held still against the scroll while the band
        // holds, then faded in as the band clears: it appears where it stands
        // instead of sliding up. Its own trigger, with `scrub: true` and no
        // smoothing, because a counter-move that lags the scroll even a
        // little reads as a wobble.
        const after: Element[] = [];
        for (let node = track.nextElementSibling; node; node = node.nextElementSibling) {
          after.push(node);
        }
        if (after.length > 0) {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: track,
                scroller: track.closest('[data-slot="screen-body"]') ?? undefined,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
            // Divided by each block's own `zoom` (`app/globals.css`): a
            // transform inside a zoomed box is zoomed with it, and a screen of
            // counter-move has to stay a screen.
            .fromTo(
              after,
              {
                y: (_: number, node: Element) =>
                  -window.innerHeight / (Number.parseFloat(getComputedStyle(node).zoom) || 1),
              },
              { y: 0, ease: "none", duration: 1 },
              0,
            )
            // Across the whole hold rather than starting late, on a curve that
            // keeps it nearly invisible until the band has mostly cleared. A
            // tween that only began at 0.6 never rendered its start state, and
            // `HomeIntro` clears opacity off these same blocks when its own
            // entrance ends, so the section sat at full strength under the band.
            .fromTo(after, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power4.in", duration: 1 }, 0);
        }
      });

      // The pointer parallax: the cursor's place over the band, -1 → 1 on
      // each axis, written to `--hero-px` / `--hero-py` on the band and eased
      // so the layers trail the hand instead of jumping with it. The three
      // layers read the pair in `app/globals.css` at three strengths. A mouse
      // only: on touch there is no hovering cursor to follow.
      mm.add(
        "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const toX = gsap.quickTo(band, "--hero-px", { duration: 0.8, ease: "power3.out" });
          const toY = gsap.quickTo(band, "--hero-py", { duration: 0.8, ease: "power3.out" });
          const move = (event: PointerEvent) => {
            const r = band.getBoundingClientRect();
            toX(((event.clientX - r.left) / r.width) * 2 - 1);
            toY(((event.clientY - r.top) / r.height) * 2 - 1);
          };
          const rest = () => {
            toX(0);
            toY(0);
          };
          band.addEventListener("pointermove", move);
          band.addEventListener("pointerleave", rest);
          return () => {
            band.removeEventListener("pointermove", move);
            band.removeEventListener("pointerleave", rest);
          };
        },
      );

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div
      // No clipping of its own: the band clips (`HomeHero`).
      className={cn("pointer-events-none absolute inset-0", className)}
      data-slot="hero-shapes"
      ref={scope}
    >
      <div className="hero-ring">
        {CARDS.map((n, i) => {
          const name = t(`card${n}Name`);
          const role = t(`card${n}Role`);
          const topic = encodeURIComponent(t(`card${n}Topic`));
          return (
            <Link
              aria-label={`${name}, ${role}`}
              className={cn(
                // fastwork's `orbit-card`, to the pixel where Thai allows: 208
                // wide, 12px corners, a cool hairline and a 2px shadow. The
                // photograph is the card; the type under it is small on purpose.
                "hero-card animate-hero-pop pointer-events-auto flex w-52 flex-col overflow-hidden rounded-[0.75rem] border border-hero-card-border bg-card shadow-hero-card outline-none",
                // The ring every other interactive surface in the app focuses
                // with, from `components/ui/button.tsx`.
                "focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
              href={serviceHref.get(n) ?? `/search?q=${topic}`}
              key={n}
              // Index 0 sits at the top of the ring; the rest follow
              // clockwise.
              style={{ "--angle": `${i * STEP}deg` } as CSSProperties}
            >
              {/* Eager and first in the queue: these are the first screen, and
                  left lazy they arrived after the cards had already been
                  thrown out, so the ring burst out empty and filled in late. */}
              <Image
                alt=""
                // 202:191, the reference's own frame, a touch wider than square.
                className="aspect-[202/191] w-full object-cover"
                fetchPriority="high"
                loading="eager"
                src={heroCards[n].photo}
              />
              <div className="flex flex-col px-2.5 pb-2.5">
                {/* Laid well into the photograph's bottom edge, as the
                    reference does (33px of a 40px face), with only a hairline
                    of white round it. */}
                <Image
                  alt=""
                  className="-mt-8 mb-1.5 size-10 rounded-full object-cover ring-1 ring-card"
                  loading="eager"
                  src={heroCards[n].face}
                />
                <span className="truncate text-hero-name font-medium text-foreground">{name}</span>
                <span className="truncate text-hero-role font-medium text-muted-foreground">
                  {role}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
