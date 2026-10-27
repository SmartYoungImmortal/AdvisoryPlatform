"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { FRAME } from "@/components/home/section-parts";
import { ThaiText } from "@/components/mobile/thai-text";
import { Magnetic, Rise, SETTLE, onFirstView } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { heroGround } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Where the page ends: "go ahead, ask", and a field to ask in. What is typed
 * there is set in the visitor's hand, the face every question on this page is
 * written in, and it opens `/search` on it. For someone who cannot put it in
 * words, the matching flow.
 *
 * Set in the room the hero is set in, the empty desk and its chair, so the
 * page ends where it began. The photograph melts into the page at its edges
 * and comes into focus as it arrives. The search button leans towards the
 * cursor (`Magnetic`): the one primary action, answering the hand.
 */
export function ClosingCta() {
  const t = useTranslations("home");
  const c = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const room = useRef<HTMLDivElement>(null);

  const ask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  useGSAP(
    () => {
      const el = room.current;
      const photo = el?.querySelector("img");
      if (!el || !photo) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(photo, { scale: 1.08, filter: "blur(10px)", autoAlpha: 0 });
        return onFirstView(el, () => {
          gsap.to(photo, {
            scale: 1,
            filter: "blur(0px)",
            autoAlpha: 1,
            duration: 1.6,
            ease: SETTLE,
            clearProps: "transform,filter,opacity,visibility",
          });
        });
      });
      return () => mm.revert();
    },
    { scope: room },
  );

  return (
    <section className="relative w-full shrink-0 pt-16 lg:pt-0" data-slot="home-cta">
      {/* Over the bare wall on `lg`; above the photograph on the phone, and
          over plain ground in the dark theme, which has no photograph. */}
      <div
        className={cn(
          FRAME,
          "relative z-1 flex flex-col items-center gap-6 text-center lg:absolute lg:inset-x-0 lg:top-24 lg:gap-8 dark:lg:static dark:lg:py-28",
        )}
      >
        <Rise className="flex max-w-4xl flex-col items-center gap-3 lg:gap-5">
          <h2 className="font-hero text-3xl leading-snug font-normal tracking-tight text-hero-ink lg:text-6xl lg:leading-tight">
            {t("closeTitle")}
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground lg:text-xl">
            <ThaiText>{t("closeBody")}</ThaiText>
          </p>
        </Rise>
        <Rise className="w-full max-w-2xl" delay={0.15}>
          <form onSubmit={ask} role="search">
            <InputGroup className="h-14 rounded-full border-border bg-card pr-1.5 pl-4 shadow-hero lg:h-18 lg:pr-2 lg:pl-6">
              <InputGroupAddon className="p-0 text-muted-foreground">
                <Search aria-hidden className="size-5 lg:size-6" />
              </InputGroupAddon>
              {/* The visitor's own words, in the hand the page's questions are written in. */}
              <InputGroupInput
                aria-label={t("closeLabel")}
                className="h-full px-3 font-hand text-lg placeholder:text-muted-foreground lg:px-4 lg:text-2xl"
                name="q"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchExample2")}
                type="search"
                value={query}
              />
              <InputGroupAddon align="inline-end" className="p-0">
                <Magnetic strength={0.2}>
                  <Button
                    className="h-11 rounded-full bg-hero-action px-5 text-base font-medium text-hero-action-foreground hover:bg-hero-action/85 lg:h-14 lg:px-8 lg:text-lg"
                    type="submit"
                  >
                    {c("search")}
                  </Button>
                </Magnetic>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </Rise>
        <Rise delay={0.25}>
          <Link
            className="group/match flex h-11 items-center gap-1.5 text-base font-medium text-foreground lg:h-12 lg:text-lg"
            href="/matching"
          >
            <span className="underline underline-offset-4">{t("closeMatch")}</span>
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-300 group-hover/match:translate-x-1 motion-reduce:transition-none lg:size-5"
            />
          </Link>
        </Rise>
      </div>
      <div
        aria-hidden
        className="relative mt-8 aspect-[4/3] w-full overflow-hidden mask-y-from-80% lg:mt-0 lg:aspect-[1710/900] dark:hidden"
        ref={room}
      >
        <Image alt="" className="size-full object-cover object-bottom" src={heroGround} />
      </div>
    </section>
  );
}
