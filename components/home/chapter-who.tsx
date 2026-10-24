"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { HandQuestion } from "@/components/home/hand-question";
import type { HomeCategory } from "@/components/home/home-data";
import { heroTrack, pulledIn } from "@/components/home/hold";
import { FRAME, latinFigure } from "@/components/home/section-parts";
import { THROW, Tilt, onFirstView, scrollerOf } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Size = "lead" | "wide" | "small";

/** The busiest topic large, the next wide beside it, two more under that. */
const SIZES: readonly Size[] = ["lead", "wide", "small", "small"];

const CELL: Record<Size, string> = {
  lead: "lg:col-span-6 lg:row-span-2",
  wide: "lg:col-span-6",
  small: "lg:col-span-3",
};

/**
 * Exactly the screen under the bar on `lg`, whatever its shape: the block is
 * zoomed by `100vw / 1710px` (`app/globals.css`), which scales its lengths
 * too, so a screen inside it is a screen divided by that ratio.
 *
 * It has to fill it. The hero holds this block in place for its first screen
 * of scroll (`HeroShapes`), and whatever else stood inside that screen would
 * be held there too, unseen under the band, and play its entrance before
 * anyone could see it.
 */
const FILL_SCREEN = "lg:min-h-[calc((100dvh_-_6rem)/tan(atan2(100vw,1710px)))]";

/**
 * One topic: the photograph of its most reviewed service, its name, how much
 * is filed under it, and, where there is room, what people ask about it, in
 * the words of real service titles. The whole tile searches the topic.
 */
function TopicTile({ topic, size }: { readonly topic: HomeCategory; readonly size: Size }) {
  const t = useTranslations("home");
  // The lead tile lists every example, a wide one the first, the rest none.
  const shown: Record<Size, number> = { lead: topic.examples.length, wide: 1, small: 0 };
  const examples = topic.examples.slice(0, shown[size]);
  return (
    <Link
      className={cn(
        "group block min-h-0 rounded-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        CELL[size],
      )}
      data-who-tile
      href={topic.href}
    >
      <Tilt className="h-full" faceClassName="h-full" max={size === "lead" ? 3 : 4}>
        <span
          className={cn(
            "flex h-full overflow-hidden rounded-card border border-hero-card-border bg-card shadow-hero-card transition-[box-shadow,translate] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-hero-card-hover motion-reduce:transition-none",
            size === "lead" ? "flex-col" : "flex-row lg:flex-col",
            size === "wide" && "lg:flex-row",
          )}
        >
          <span
            className={cn(
              "relative block shrink-0 overflow-hidden bg-muted",
              size === "lead" ? "aspect-[16/10] lg:aspect-auto lg:min-h-0 lg:flex-1" : "w-28",
              size === "wide" && "lg:w-[44%]",
              size === "small" && "lg:aspect-auto lg:min-h-0 lg:w-full lg:flex-1",
            )}
          >
            <Image
              alt=""
              className="absolute inset-0 size-full scale-[1.06] object-cover transition-[scale] duration-700 ease-out [translate:calc(var(--tilt-x,0)*-10px)_calc(var(--tilt-y,0)*-10px)] group-hover:scale-[1.1] motion-reduce:transition-none"
              src={topic.cover}
            />
          </span>
          <span className={cn("flex min-w-0 flex-1 flex-col gap-1.5 p-4 lg:gap-2", size === "small" ? "lg:p-5" : "lg:p-6", size === "wide" && "justify-center")}>
            <span
              className={cn(
                "font-hero font-normal tracking-tight text-hero-ink",
                size === "lead" ? "text-xl lg:text-heading lg:leading-normal" : "text-lg lg:text-2xl",
              )}
            >
              {topic.name}
            </span>
            <span className="text-sm text-muted-foreground lg:text-lg">
              {t.rich("categoryCount", {
                count: topic.count,
                n: latinFigure,
              })}
            </span>
            {examples.length > 0 ? (
              <span className="mt-1 hidden flex-col gap-1 lg:flex">
                <span className="text-base text-muted-foreground">{t("whoExample")}</span>
                {examples.map((title) => (
                  <span className="truncate text-lg text-foreground" key={title}>
                    “{title}”
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </Tilt>
    </Link>
  );
}

/** The bento's own shape in muted blocks, so nothing moves when the catalogue lands. */
function TopicsSkeleton() {
  return (
    <div aria-hidden className="grid gap-3 lg:flex-1 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6">
      {SIZES.map((size, i) => (
        <span
          className={cn("block animate-pulse rounded-card bg-muted/70", size === "lead" ? "h-72 lg:h-auto" : "h-28 lg:h-auto", CELL[size])}
          key={size + i}
        />
      ))}
    </div>
  );
}

/** The catalogue could not be read: the block keeps its screen, and says so, with the way to ask again. */
function TopicsUnavailable({ failed, onRetry }: { readonly failed: boolean; readonly onRetry: () => void }) {
  const t = useTranslations("home");
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-card bg-muted/60 px-6 py-14 text-center lg:flex-1">
      <p className="text-lg font-semibold text-foreground lg:text-2xl">
        {failed ? t("showcaseFailed") : t("showcaseEmpty")}
      </p>
      <Button className={cn(authPill(true), "w-auto lg:h-14 lg:px-8 lg:text-lg")} onClick={onRetry} type="button">
        <RotateCw aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}

/**
 * Chapter one, the first block under the hero: "who do I even ask about
 * this?", answered with the topics people actually bring here, each with the
 * real services filed under it and a search behind it.
 *
 * Question on the left in the visitor's hand, the answer on the right in type,
 * like a conversation. On `lg` the block is in place from the start, held under
 * the band while the ring flies apart (`HeroShapes`): the question writes
 * itself on that same scroll, and the answer is thrown in as the band clears.
 * Below `lg` the question writes itself when seen, then the answer follows.
 */
export function ChapterWho({
  topics,
  total,
  loading,
  failed,
  onRetry,
}: {
  readonly topics: readonly HomeCategory[];
  /** Every service listed, for the link to the rest. */
  readonly total: number;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onRetry: () => void;
}) {
  const t = useTranslations("home");
  const scope = useRef<HTMLDivElement>(null);
  const tiles = topics.slice(0, SIZES.length);
  const rest = topics.slice(SIZES.length);

  useGSAP(
    () => {
      const root = scope.current;
      const grid = root?.querySelector<HTMLElement>("[data-who-grid]");
      if (!root || !grid) return;
      const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-who-tile]"));
      const words = Array.from(root.querySelectorAll<HTMLElement>("[data-who-answer], [data-who-more]"));

      // The answer, thrown out from the middle of the bento on the ring's
      // overshoot, the words settling out of a blur beside it.
      const answer = () => {
        const timeline = gsap.timeline();
        timeline.to(words, {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.1,
          clearProps: "transform,filter,opacity,visibility",
        });
        cards.forEach((card, order) => {
          const at = 0.05 + order * 0.07;
          timeline.fromTo(
            card,
            { ...pulledIn(card, grid, 0.45), scale: 0.5 },
            { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, duration: 1, ease: THROW, clearProps: "transform" },
            at,
          );
          timeline.fromTo(
            card,
            { autoAlpha: 0, filter: "blur(8px)" },
            { autoAlpha: 1, filter: "blur(0px)", duration: 0.45, ease: "power2.out", clearProps: "filter,opacity,visibility" },
            at + 0.12,
          );
        });
      };
      const hide = () => {
        gsap.set(words, { autoAlpha: 0, y: 24, filter: "blur(8px)" });
        gsap.set(cards, { autoAlpha: 0 });
      };

      const mm = gsap.matchMedia();
      // On `lg`: once the hold has run its course and the band has cleared.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const track = heroTrack();
        if (!track) return;
        hide();
        let played = false;
        const play = () => {
          if (played) return;
          played = true;
          answer();
        };
        const trigger = ScrollTrigger.create({
          trigger: track,
          scroller: scrollerOf(track),
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            if (self.progress > 0.96) play();
          },
          onLeave: play,
        });
        if (trigger.progress > 0.96) play();
      });
      // Below it: after the question has written itself.
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        hide();
        return onFirstView(grid, () => gsap.delayedCall(0.8, answer));
      });
      return () => mm.revert();
    },
    { scope, dependencies: [tiles.map((topic) => topic.name).join(",")], revertOnUpdate: true },
  );

  let body: ReactNode;
  if (tiles.length > 0) {
    body = (
      <div className="relative grid gap-3 lg:flex-1 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6" data-who-grid>
        {tiles.map((topic, i) => (
          <TopicTile key={topic.name} size={SIZES[i]} topic={topic} />
        ))}
      </div>
    );
  } else if (loading) {
    body = <TopicsSkeleton />;
  } else {
    body = <TopicsUnavailable failed={failed} onRetry={onRetry} />;
  }

  return (
    <section
      className={cn("flex w-full shrink-0 flex-col pt-10 pb-12 lg:pt-10 lg:pb-12", FILL_SCREEN)}
      data-slot="home-who"
    >
      <div className={cn(FRAME, "flex flex-1 flex-col gap-6 lg:gap-8")} ref={scope}>
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end lg:gap-6">
          <HandQuestion ask="askWho" className="text-4xl text-hero-ink lg:col-span-7 lg:text-7xl" onHold />
          <div className="flex flex-col gap-1 lg:col-span-5 lg:items-end lg:gap-2 lg:text-right" data-who-answer>
            <p className="font-hero text-2xl font-normal tracking-tight text-foreground lg:text-5xl lg:leading-tight">
              {t("whoTitle")}
            </p>
            {total > 0 ? (
              <Link
                className="group/all flex h-11 items-center gap-1.5 text-base font-medium text-foreground lg:h-12 lg:text-lg"
                href="/search"
              >
                <span className="underline-offset-4 group-hover/all:underline">{t("showcaseAll", { count: total })}</span>
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none lg:size-5"
                />
              </Link>
            ) : null}
          </div>
        </div>
        {body}
        {rest.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 lg:gap-3" data-who-more>
            <span className="mr-1 text-base text-muted-foreground lg:text-lg">{t("whoMore")}</span>
            {rest.map((topic) => (
              <Link
                className="flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors hover:bg-muted lg:h-12 lg:px-5 lg:text-base"
                href={topic.href}
                key={topic.name}
              >
                {topic.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
