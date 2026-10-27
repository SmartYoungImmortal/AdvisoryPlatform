"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CreditCard, HandCoins, Lock, Undo2, Video } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef } from "react";

import { HandQuestion } from "@/components/home/hand-question";
import { scrollTopOf } from "@/components/home/hold";
import { FRAME } from "@/components/home/section-parts";
import { ThaiText } from "@/components/mobile/thai-text";
import { Rise, THROW, onFirstView, scrollerOf } from "@/components/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Where the money goes, in the product's own words (`landing.faq3Answer`,
 * `landing.faq6Answer`, `payment.secureNote`, `service.stepBookBody`): paid at
 * booking, held by Advisory, the session, and only then paid out.
 */
const STAGES = [
  { icon: CreditCard, title: "safePayTitle", body: "safePayBody" },
  { icon: Lock, title: "safeHoldTitle", body: "safeHoldBody" },
  { icon: Video, title: "safeEndTitle", body: "safeEndBody" },
  { icon: HandCoins, title: "safeReleaseTitle", body: "safeReleaseBody" },
] as const;

/**
 * The held scene on `lg`: a 640px stage that sticks at the middle of the
 * screen, on a track two screens longer than it, the scroll the fee travels
 * over. The section is zoomed by `100vw / 1710px` (`app/globals.css`), which
 * scales its lengths too, so a screen in here is a screen divided by it.
 */
const TRACK = "lg:h-[calc(640px_+_200dvh/tan(atan2(100vw,1710px)))]";
const STAGE = "lg:sticky lg:top-[calc((100dvh/tan(atan2(100vw,1710px))_-_640px)/2)] lg:h-160";

/** The centre of the first and of the last of four columns 24px apart: the track runs between them. */
const FROM_FIRST = "lg:left-[calc((100%_-_4.5rem)/8)]";
const TO_LAST = "lg:right-[calc((100%_-_4.5rem)/8)]";

/**
 * Chapter four, the page's one dark band: "will I lose my money?", answered by
 * following it. On `lg` the stage holds still for two screens while a real
 * session fee travels along the flow, from the reader's payment, to Advisory
 * holding it, to the end of the session, to the expert, each stop lighting as
 * the fee reaches it; `position: sticky` and a scrubbed ScrollTrigger, never
 * GSAP's `pin`. Under it, what happens when a session does not go as agreed.
 *
 * The phone draws the flow down the left once seen. Without motion every stop
 * is lit and the fee sits at the first: the whole flow, read at once.
 */
export function ChapterSafe({ fee }: { readonly fee: number | null }) {
  const t = useTranslations("home");
  const format = useFormatter();
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      const track = root?.querySelector<HTMLElement>("[data-safe-track]");
      const stage = root?.querySelector<HTMLElement>("[data-safe-stage]");
      const flow = root?.querySelector<HTMLElement>("[data-safe-flow]");
      const chip = root?.querySelector<HTMLElement>("[data-safe-chip]");
      const fill = root?.querySelector<HTMLElement>("[data-safe-fill]");
      if (!root || !track || !stage || !flow || !chip || !fill) return;
      const markers = Array.from(flow.querySelectorAll<HTMLElement>("[data-safe-marker]"));
      const lits = Array.from(flow.querySelectorAll<HTMLElement>("[data-safe-lit]"));
      const icons = Array.from(chip.querySelectorAll<SVGElement>("[data-safe-icon]"));

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const scroller = scrollerOf(root);
        if (!scroller) return;
        const zoom = () => root.getBoundingClientRect().width / root.offsetWidth || 1;
        const stuckAt = () => (Number.parseFloat(getComputedStyle(stage).top) || 0) * zoom();
        // Each stop's centre, from the first, in the frame's own pixels.
        const offsets = () => {
          const k = zoom();
          const first = markers[0].getBoundingClientRect();
          return markers.map((marker) => {
            const box = marker.getBoundingClientRect();
            return (box.left + box.width / 2 - (first.left + first.width / 2)) / k;
          });
        };

        // One unit per stop: the fee waits at a stop, then travels to the next
        // through most of a unit, and arrives as the stop lights.
        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: track,
            scroller,
            start: () => scrollTopOf(track, root, scroller) - stuckAt(),
            end: () =>
              scrollTopOf(track, root, scroller) -
              stuckAt() +
              track.getBoundingClientRect().height -
              stage.offsetHeight * zoom(),
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });
        for (let stop = 1; stop < STAGES.length; stop += 1) {
          const leave = stop - 0.7;
          timeline
            .fromTo(
              chip,
              { x: () => offsets()[stop - 1] },
              { x: () => offsets()[stop], duration: 0.6, ease: "power1.inOut", immediateRender: stop === 1 },
              leave,
            )
            .fromTo(fill, { scaleX: (stop - 1) / 3 }, { scaleX: stop / 3, duration: 0.6, immediateRender: stop === 1 }, leave)
            .fromTo(icons[stop - 1], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1, immediateRender: false }, stop - 0.15)
            .fromTo(icons[stop], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, stop - 0.1)
            .fromTo(lits[stop], { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: THROW }, stop - 0.12);
        }
        // The whole flow holds for the last unit before the stage lets go.
        timeline.set({}, {}, STAGES.length);
      });

      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(fill, { scaleY: 0 });
        gsap.set(lits.slice(1), { autoAlpha: 0, scale: 0.6 });
        return onFirstView(flow, () => {
          const reach = 0.5;
          const timeline = gsap.timeline({ delay: 0.2 });
          timeline.to(fill, { scaleY: 1, duration: reach * (lits.length - 1), ease: "none" }, 0);
          lits.slice(1).forEach((lit, i) => {
            timeline.to(lit, { autoAlpha: 1, scale: 1, duration: 0.6, ease: THROW }, (i + 1) * reach);
          });
        });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [fee] },
  );

  const line = cn("absolute top-7 bottom-7 left-7 w-px lg:top-28 lg:bottom-auto lg:h-px lg:w-auto", FROM_FIRST, TO_LAST);

  return (
    <section className="w-full shrink-0 bg-footer-surface text-on-media" data-slot="home-safe" ref={scope}>
      <div className="py-16 lg:py-20">
        <div className={cn("relative", TRACK)} data-safe-track>
          <div className={cn("flex items-center", STAGE)} data-safe-stage>
            <div className={cn(FRAME, "flex flex-col gap-10 lg:gap-14")}>
              <div className="grid gap-3 lg:grid-cols-12 lg:items-end lg:gap-6">
                <HandQuestion ask="askSafe" className="text-4xl text-on-media lg:col-span-6 lg:text-7xl" />
                <Rise className="lg:col-span-6 lg:text-right" delay={0.9}>
                  <p className="font-hero text-2xl font-normal tracking-tight text-on-media lg:text-5xl lg:leading-tight">
                    <ThaiText>{t("safeTitle")}</ThaiText>
                  </p>
                </Rise>
              </div>

              <div className="relative" data-safe-flow>
                {/* The fee itself, which travels the flow on `lg`. */}
                <div
                  className={cn(
                    "mb-8 flex w-fit items-center gap-3 rounded-full bg-card py-2 pr-5 pl-2 text-foreground shadow-hero lg:absolute lg:top-0 lg:mb-0 lg:-translate-x-1/2 lg:gap-4 lg:pr-6",
                    FROM_FIRST,
                  )}
                  data-safe-chip
                >
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-hero-action text-hero-action-foreground lg:size-11">
                    {STAGES.map(({ icon: Icon, title }, i) => (
                      <Icon
                        aria-hidden
                        className={cn("absolute size-4.5 lg:size-5", i > 0 && "opacity-0")}
                        data-safe-icon
                        key={title}
                      />
                    ))}
                  </span>
                  {fee !== null ? (
                    <span className="font-latin text-xl font-semibold tabular-nums lg:text-2xl">
                      {format.number(fee, "baht")}
                    </span>
                  ) : null}
                  <span className="text-base text-muted-foreground lg:text-lg">{t("safeFee")}</span>
                </div>

                <ol className="relative flex flex-col gap-8 lg:grid lg:grid-cols-4 lg:gap-6 lg:pt-20">
                  <span aria-hidden className={cn(line, "bg-on-media/15")} />
                  <span aria-hidden className={cn(line, "origin-top bg-on-media lg:origin-left")} data-safe-fill />
                  {STAGES.map(({ icon: Icon, title, body }) => (
                    <li className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-6 lg:text-center" key={title}>
                      <span
                        className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-on-media/25 bg-footer-surface text-on-media/70 lg:size-16"
                        data-safe-marker
                      >
                        <Icon aria-hidden className="size-6 lg:size-7" />
                        <span
                          className="absolute -inset-px flex items-center justify-center rounded-full bg-on-media text-footer-surface"
                          data-safe-lit
                        >
                          <Icon aria-hidden className="size-6 lg:size-7" />
                        </span>
                      </span>
                      <span className="flex flex-col gap-1.5 pt-2.5 lg:max-w-80 lg:gap-2 lg:pt-0">
                        <span className="text-lg font-semibold text-on-media lg:text-2xl">{t(title)}</span>
                        <span className="text-base text-on-media/75 lg:text-lg">
                          <ThaiText>{t(body)}</ThaiText>
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <Rise className="flex items-start gap-4 rounded-card border border-on-media/15 p-5 lg:max-w-4xl lg:gap-5 lg:p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-media/10 lg:size-12">
                  <Undo2 aria-hidden className="size-5 lg:size-6" />
                </span>
                <span className="flex flex-col gap-1 lg:gap-1.5">
                  <span className="text-lg font-semibold text-on-media lg:text-xl">{t("safeRefundTitle")}</span>
                  <span className="text-base text-on-media/75 lg:text-lg">
                    <ThaiText>{t("safeRefundBody")}</ThaiText>
                  </span>
                </span>
              </Rise>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
