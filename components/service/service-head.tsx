"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { liveAdvisorHref } from "@/components/bookings/booking-flow";
import { CoverPhoto } from "@/components/service/service-photos";
import type { ApiPublicService, ApiRatingSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The advisor's face, or their initial on the muted step, with the verified
 * mark on its rim. Every advisor the public API lists has had their identity
 * checked (`discoverableWhere` in the API's advisors repository), so the mark
 * is a fact about anyone this page can show, not a badge some earn.
 */
export function Face({
  face,
  name,
  className,
  verified = false,
  rim = true,
}: {
  readonly face: StaticImageData | null;
  readonly name: string;
  readonly className: string;
  readonly verified?: boolean;
  /** The white rim and lift of a portrait; off for the small faces on cards. */
  readonly rim?: boolean;
}) {
  return (
    // The hero's portraits sit on the photograph with a hairline of white
    // round them; this one sits on the page with the same rim and lift.
    <span className={cn("relative block shrink-0 rounded-full", rim && "shadow-hero-card ring-3 ring-card", className)}>
      {face ? (
        <Image alt="" className="size-full rounded-full object-cover" src={face} />
      ) : (
        <span
          aria-hidden
          className="flex size-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground"
        >
          {name.slice(0, 1)}
        </span>
      )}
      {verified ? (
        // Drawn on the card's own white, so the mark reads on any portrait.
        <span
          aria-hidden
          className="absolute right-0 bottom-0 flex size-[32%] min-h-4 min-w-4 items-center justify-center rounded-full bg-card"
        >
          <BadgeCheck className="size-[86%] fill-primary text-card" />
        </span>
      ) : null}
    </span>
  );
}


/**
 * The column that rides beside the page from `lg`, drawn after the listing
 * pages of a large marketplace for services: the cover, the advisor's face
 * lapping its lower edge, the service's name centred under it, what the
 * service is, a line of facts (the score and the reviews, which is the way
 * to them, and the category), and at its foot, on the screen's bottom edge,
 * the price card (`booking`).
 *
 * Measured there at 1440 and drawn here in the 1710 space at ×1.1875, so it
 * reads the same size on a 1440 screen: the cover 493:241 and 24 round, the
 * face 86 with its rim, the name 32/600, the line 16/22 in grey, the facts
 * 12, the card 52 tall at its button.
 *
 * On the phone the same stack opens the page, and the card gives way to the
 * booking bar along the bottom.
 */
export function ServiceIntro({
  service,
  category,
  photos,
  face,
  name,
  rating,
  reviewCount,
  booking,
}: {
  readonly service: ApiPublicService;
  readonly category: string;
  /** Every photograph, the cover first; a grey cell while there are none. */
  readonly photos: readonly string[];
  readonly face: StaticImageData | null;
  readonly name: string;
  readonly rating: ApiRatingSummary | undefined;
  /** The advisor's review count; undefined while it loads, null when unknown. */
  readonly reviewCount: number | null | undefined;
  readonly booking: ReactNode;
}) {
  const t = useTranslations("service");
  const format = useFormatter();
  const profile = liveAdvisorHref(service.advisorId);
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;

  const facts: { readonly key: string; readonly node: ReactNode }[] = [];
  if (rating) {
    facts.push({
      key: "score",
      node: (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <Star aria-hidden className="size-3 fill-current lg:size-[14.25px]" />
          {format.number(rating.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      ),
    });
  }
  if (typeof reviewCount === "number") {
    facts.push({
      key: "reviews",
      node: (
        <a className="underline-offset-4 hover:underline" href="#reviews">
          {t("reviewCount", { count: reviewCount })}
        </a>
      ),
    });
  }
  if (category) facts.push({ key: "category", node: category });

  return (
    <div className="flex flex-col items-center text-center lg:flex-1">
      {/* On the phone the cover runs edge to edge from the top of the
          screen, 4:3, the bar floating over it; the rest of the intro is a
          white sheet lapping its foot by 32, round at its top corners, the
          face centred on its edge. From the portrait tablet the sheet is
          gone (`contents`) and the cover is the column's card. */}
      <CoverPhoto
        className="-mx-6 -mt-2 aspect-[4/3] self-stretch rounded-none md:mx-0 md:mt-0 md:aspect-[493/241] md:rounded-2xl lg:rounded-[28.5px]"
        photos={photos}
        title={service.name}
      />

      <div className="relative z-10 -mx-6 -mt-8 flex flex-col items-center self-stretch rounded-t-[32px] bg-card px-6 md:contents">
        {/* The name under the title is the same link and the one a keyboard
            reaches; the face is for the pointer. */}
        <Link aria-hidden className="relative -mt-8 block rounded-full md:-mt-9 lg:-mt-[51px]" href={profile} tabIndex={-1}>
          <Face className="size-16 text-2xl md:size-18 lg:size-[102px] lg:text-frame-title" face={face} name={name} />
        </Link>

        {/* Balanced, so a two-line name splits near its middle rather than
            leaving one Thai syllable alone on the second line. */}
        <h1 className="mt-3 max-w-[427px] text-display-sm font-semibold text-balance text-foreground md:mt-4 md:text-2xl md:leading-[1.25] lg:mt-[23.75px] lg:text-frame-title lg:leading-[1.125]">
          {service.name}
        </h1>
        {name ? (
          <Link
            className="mt-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline lg:mt-[7.125px] lg:text-frame-meta"
            href={profile}
          >
            {name}
          </Link>
        ) : null}

        {service.description ? (
          <p className="mt-3 max-w-[427px] text-base leading-[1.375] text-pretty text-muted-foreground lg:mt-[23.75px] lg:text-frame-body lg:leading-[1.375]">
            {service.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col items-center gap-0.5 text-xs lg:mt-[28.5px] lg:gap-[2.375px] lg:text-frame-label">
          {facts.length > 0 ? (
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-foreground lg:gap-x-[7.125px]">
              {facts.map((fact, i) => (
                <span className="inline-flex items-center gap-x-1.5 lg:gap-x-[7.125px]" key={fact.key}>
                  {i > 0 ? <span aria-hidden>·</span> : null}
                  {fact.node}
                </span>
              ))}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            {trial ? `${t("videoInApp")} · ${t("trialFree", { minutes: trial })}` : t("videoInApp")}
          </p>
        </div>

        {/* From `lg` only, docked on the screen's bottom edge (the column is
            the screen's height and this is its last child, pushed down);
            below it the price floats over the page's foot. */}
        <div className="hidden w-full pt-[57px] lg:mt-auto lg:block">{booking}</div>
      </div>
    </div>
  );
}
