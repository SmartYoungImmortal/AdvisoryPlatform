"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, BadgeCheck, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import type { HomeAdvisor } from "@/components/home/home-data";
import { VerifiedTick } from "@/components/home/parts";
import { Face, Fee } from "@/components/home/section-parts";
import { Rise, Tilt } from "@/components/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/** People in the list beside the spotlight; the rest are a search away. */
const ROSTER = 6;

/** Services named in the spotlight, the advisor's most reviewed first. */
const OFFERS = 3;

/**
 * One advisor at length: a photograph of their work, their face, name and
 * line, the verified mark spelled out, what they have published and from what
 * price, and the services themselves. Desktop only; the phone lists people.
 */
function Spotlight({ advisor }: { readonly advisor: HomeAdvisor }) {
  const t = useTranslations("home");
  const s = useTranslations("search");
  const v = useTranslations("service");
  const format = useFormatter();

  return (
    <article className="grid h-full grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10" data-spotlight>
      <Tilt className="h-full" faceClassName="h-full" max={4}>
        <span className="relative block h-full overflow-hidden rounded-card border border-hero-card-border bg-muted shadow-hero-card">
          <Image
            alt=""
            className="absolute inset-0 size-full scale-[1.06] object-cover [translate:calc(var(--tilt-x,0)*-12px)_calc(var(--tilt-y,0)*-12px)]"
            data-spot-photo
            src={advisor.photo}
          />
        </span>
      </Tilt>
      <div className="flex min-w-0 flex-col gap-6 py-2" data-spot-copy>
        <div className="flex items-center gap-5">
          <Face className="size-24 ring-4 ring-card" face={advisor.face} name={advisor.name} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="truncate font-hero text-3xl leading-normal font-normal tracking-tight text-hero-ink">
              {advisor.name}
            </h3>
            <span className="flex items-center gap-1.5 text-base font-medium text-success">
              <BadgeCheck aria-hidden className="size-5" />
              {s("verifiedAdvisor")}
            </span>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">{advisor.headline}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base text-muted-foreground">
          <span>{t("advisorServices", { count: advisor.offers.length })}</span>
          <span>
            {v("priceFrom")}{" "}
            <span className="font-latin font-semibold text-foreground tabular-nums">
              {format.number(advisor.from, "baht")}
            </span>
          </span>
          {advisor.rating !== null && advisor.reviews > 0 ? (
            <span className="flex items-center gap-1.5">
              <Star aria-hidden className="size-4.5 fill-primary text-primary" />
              <span className="font-latin font-semibold text-foreground tabular-nums">{advisor.rating.toFixed(1)}</span>
              {v("reviewCount", { count: advisor.reviews })}
            </span>
          ) : null}
        </div>
        <ul className="flex flex-col border-t border-border">
          {advisor.offers.slice(0, OFFERS).map((offer) => (
            <li className="border-b border-border" key={offer.id}>
              <Link
                className="group/offer flex min-h-16 items-center gap-4 rounded-md py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href={offer.href}
              >
                <span className="min-w-0 flex-1 truncate text-lg font-medium text-foreground underline-offset-4 group-hover/offer:underline">
                  {offer.title}
                </span>
                <Fee minutes={offer.minutes} price={offer.price} />
              </Link>
            </li>
          ))}
        </ul>
        <Link
          className="group/profile mt-auto flex h-12 items-center gap-2 self-start text-lg font-medium text-foreground"
          href={advisor.href}
        >
          <span className="underline underline-offset-4">{t("advisorProfile")}</span>
          <ArrowRight
            aria-hidden
            className="size-5 transition-transform duration-300 group-hover/profile:translate-x-1 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </article>
  );
}

/** One person in the list: their face, name with the verified mark, and what they do. */
function RosterRow({
  advisor,
  active,
  onActivate,
}: {
  readonly advisor: HomeAdvisor;
  readonly active: boolean;
  readonly onActivate: () => void;
}) {
  return (
    <Link
      aria-current={active ? "true" : undefined}
      className={cn(
        "group/row flex items-center gap-4 rounded-card px-3 py-3 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 lg:px-4 lg:py-3.5",
        active ? "lg:bg-muted" : "hover:bg-muted/60",
      )}
      href={advisor.href}
      onFocus={onActivate}
      onPointerEnter={onActivate}
    >
      <Face className="size-12 lg:size-14" face={advisor.face} name={advisor.name} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-base font-semibold text-foreground lg:text-lg">{advisor.name}</span>
          <VerifiedTick className="size-4 lg:size-4.5" />
        </span>
        <span className="truncate text-sm text-muted-foreground lg:text-base">{advisor.headline}</span>
      </span>
      <ChevronRight
        aria-hidden
        className={cn(
          "size-5 shrink-0 text-muted-foreground transition-[translate,color] duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-foreground motion-reduce:transition-none",
          active && "lg:text-foreground",
        )}
      />
    </Link>
  );
}

/** The roster's rows and the spotlight's frame in muted blocks while the catalogue loads. */
function AdvisorsSkeleton() {
  return (
    <div aria-hidden className="grid gap-8 lg:grid-cols-12 lg:gap-6">
      <div className="hidden h-130 animate-pulse rounded-card bg-muted/70 lg:col-span-8 lg:block" />
      <div className="flex flex-col gap-2 lg:col-span-4">
        {Array.from({ length: ROSTER }, (_, i) => (
          <span className="flex items-center gap-4 px-3 py-3 lg:px-4" key={i}>
            <span className="size-12 shrink-0 animate-pulse rounded-full bg-muted lg:size-14" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
              <span className="h-3.5 w-3/4 animate-pulse rounded-md bg-muted" />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The people behind the services. On `lg` one of them at length, and beside
 * them a list of the others: pointing at a name brings that person into the
 * spotlight, pressing it opens their profile. The phone has the list.
 *
 * Every figure is the catalogue's own: how many services they publish, their
 * lowest price, their score only once someone has given one. No section or
 * title of its own: the chapter it answers asks the question above it.
 */
export function AdvisorPeople({
  advisors,
  delay = 0,
}: {
  readonly advisors: readonly HomeAdvisor[];
  /** Seconds the entrance waits, so a question above can be written first. */
  readonly delay?: number;
}) {
  const t = useTranslations("home");
  const scope = useRef<HTMLDivElement>(null);
  const roster = advisors.slice(0, ROSTER);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = roster.find((advisor) => advisor.id === activeId) ?? roster[0];

  // A new person in the spotlight comes in out of a short blur, their
  // photograph settling a beat behind the words: the same arrival the rest of
  // the page uses, quickened for something the reader asked for.
  useGSAP(
    () => {
      const spot = scope.current?.querySelector<HTMLElement>("[data-spotlight]");
      if (!spot || activeId === null) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const photo = spot.querySelector("[data-spot-photo]");
        const copy = spot.querySelector("[data-spot-copy]");
        if (photo) gsap.fromTo(photo, { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1.06, duration: 0.6, ease: "power3.out" });
        if (copy) {
          gsap.fromTo(
            copy.children,
            { autoAlpha: 0, y: 14, filter: "blur(6px)" },
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.45,
              ease: "power2.out",
              stagger: 0.04,
              clearProps: "transform,filter,opacity,visibility",
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope, dependencies: [activeId] },
  );

  return (
    <div ref={scope}>
        {active ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <Rise className="hidden h-130 lg:col-span-8 lg:block" delay={delay}>
              <Spotlight advisor={active} key={active.id} />
            </Rise>
            <div className="flex flex-col gap-1 lg:col-span-4">
              <Rise className="flex flex-col gap-1" delay={delay + 0.1} key={roster.length} stagger>
                {roster.map((advisor) => (
                  <RosterRow
                    active={advisor.id === active.id}
                    advisor={advisor}
                    key={advisor.id}
                    onActivate={() => setActiveId(advisor.id)}
                  />
                ))}
              </Rise>
              {advisors.length > roster.length ? (
                <Link
                  className="group/all mt-2 flex h-12 items-center gap-2 self-start px-3 text-base font-medium text-foreground lg:px-4 lg:text-lg"
                  href="/search"
                >
                  <span className="underline underline-offset-4">{t("advisorsAll", { count: advisors.length })}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-5 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none"
                  />
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <AdvisorsSkeleton />
        )}
    </div>
  );
}
