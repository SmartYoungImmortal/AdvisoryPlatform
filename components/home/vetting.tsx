"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { BadgeCheck, FileCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { CountUp, Rise, THROW, onFirstView } from "@/components/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * Why the people on this page can be trusted: the three stages of
 * `/advisor-onboarding` every advisor clears before a profile is published.
 * It is the promise the verified mark on every card is making, spelled out.
 */
const CHECKS = [
  { icon: BadgeCheck, title: "vetting1Title", body: "vetting1Body" },
  { icon: FileCheck, title: "vetting2Title", body: "vetting2Body" },
  { icon: ShieldCheck, title: "vetting3Title", body: "vetting3Body" },
] as const;

/** What the catalogue holds right now, counted from the API: never a round number made up to impress. */
export type CatalogueCounts = {
  readonly advisors: number;
  readonly services: number;
  readonly categories: number;
};

type Tone = "light" | "dark";

/**
 * The three checks, strung on a line drawn through them in the order an
 * advisor meets them, each lighting as the line reaches it. Down the left on
 * the phone, across on `lg`.
 */
export function VettingChecks({ tone = "light" }: { readonly tone?: Tone }) {
  const t = useTranslations("home");
  const scope = useRef<HTMLOListElement>(null);
  const dark = tone === "dark";

  useGSAP(
    () => {
      const list = scope.current;
      if (!list) return;
      const fill = list.querySelector<HTMLElement>("[data-vet-fill]");
      const rings = Array.from(list.querySelectorAll<HTMLElement>("[data-vet-ring]"));
      const copies = Array.from(list.querySelectorAll<HTMLElement>("[data-vet-copy]"));
      if (!fill) return;

      const mm = gsap.matchMedia();
      mm.add({ across: "(min-width: 1024px)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
        const { across, motion } = context.conditions ?? {};
        if (!motion) return;
        const axis = across ? "scaleX" : "scaleY";
        gsap.set(fill, { [axis]: 0 });
        gsap.set(rings, { scale: 0.6, autoAlpha: 0 });
        gsap.set(copies, { autoAlpha: 0, y: 20, filter: "blur(8px)" });
        return onFirstView(list, () => {
          const reach = 0.55;
          const timeline = gsap.timeline({ delay: 0.15 });
          timeline.to(fill, { [axis]: 1, duration: reach * (rings.length - 1), ease: "none" }, 0);
          rings.forEach((ring, i) => {
            timeline.to(ring, { scale: 1, autoAlpha: 1, duration: 0.8, ease: THROW }, i * reach);
            timeline.to(
              copies[i],
              {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.7,
                ease: "power2.out",
                clearProps: "transform,filter,opacity,visibility",
              },
              i * reach + 0.1,
            );
          });
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  const line =
    "absolute top-7 bottom-7 left-7 w-px lg:top-9 lg:right-[calc((100%_-_3rem)/6)] lg:bottom-auto lg:left-[calc((100%_-_3rem)/6)] lg:h-px lg:w-auto";

  return (
    <ol className="relative flex flex-col gap-8 lg:grid lg:grid-cols-3 lg:gap-6" ref={scope}>
      <span aria-hidden className={cn(line, dark ? "bg-on-media/15" : "bg-border")} />
      <span
        aria-hidden
        className={cn(line, "origin-top lg:origin-left", dark ? "bg-on-media" : "bg-hero-ink")}
        data-vet-fill
      />
      {CHECKS.map(({ icon: Icon, title, body }) => (
        <li className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-7 lg:text-center" key={title}>
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-full border lg:size-18",
              dark ? "border-on-media/20 bg-footer-surface" : "border-border bg-card",
            )}
            data-vet-ring
          >
            <Icon aria-hidden className={cn("size-6 lg:size-8", dark ? "text-on-media" : "text-success")} />
          </span>
          <span className="flex flex-col gap-1.5 pt-2.5 lg:max-w-96 lg:gap-2 lg:pt-0" data-vet-copy>
            <span className={cn("text-lg font-semibold lg:text-2xl", dark ? "text-on-media" : "text-foreground")}>
              {t(title)}
            </span>
            <span className={cn("text-base lg:text-lg", dark ? "text-on-media/75" : "text-muted-foreground")}>
              {t(body)}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The catalogue's own figures, counted up once when seen; nothing at all until the API has answered. */
export function VettingCounts({
  counts,
  tone = "light",
  className,
}: {
  readonly counts: CatalogueCounts | null;
  readonly tone?: Tone;
  readonly className?: string;
}) {
  const t = useTranslations("home");
  if (!counts) return null;
  const dark = tone === "dark";
  const stats = [
    { value: counts.advisors, label: t("statAdvisors") },
    { value: counts.services, label: t("statServices") },
    { value: counts.categories, label: t("statCategories") },
  ];
  return (
    <Rise as="div" className={cn("grid grid-cols-3 gap-3 lg:gap-6", className)} delay={0.1} stagger>
      {stats.map(({ value, label }) => (
        <div className={cn("flex flex-col gap-1 border-l pl-3 lg:gap-2 lg:pl-5", dark ? "border-on-media/15" : "border-border")} key={label}>
          <CountUp
            className={cn("font-latin text-4xl font-medium lg:text-6xl", dark ? "text-on-media" : "text-foreground")}
            value={value}
          />
          <span className={cn("text-sm lg:text-lg", dark ? "text-on-media/75" : "text-muted-foreground")}>{label}</span>
        </div>
      ))}
    </Rise>
  );
}

/** The verified mark as it sits in the sentence (`t.rich`'s `<tick>`), on either ground. */
function VettingTick({ dark, children }: { readonly dark: boolean; readonly children: ReactNode }) {
  return (
    <span
      className={cn(
        "mx-1 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 align-middle text-sm font-medium lg:text-base",
        dark ? "bg-success/15 text-on-media" : "bg-success/12 text-foreground",
      )}
    >
      <BadgeCheck aria-hidden className="size-4 text-success lg:size-4.5" />
      {children}
    </span>
  );
}

function tickOnDark(chunks: ReactNode) {
  return <VettingTick dark>{chunks}</VettingTick>;
}

function tickOnLight(chunks: ReactNode) {
  return <VettingTick dark={false}>{chunks}</VettingTick>;
}

/** What the verified mark on a card means, with the mark itself in the sentence. */
export function VettingNote({ tone = "light" }: { readonly tone?: Tone }) {
  const t = useTranslations("home");
  const dark = tone === "dark";
  return (
    <p className={cn("text-base leading-relaxed lg:text-lg", dark ? "text-on-media/75" : "text-muted-foreground")}>
      {t.rich("vettingBandBody", { tick: dark ? tickOnDark : tickOnLight })}
    </p>
  );
}
