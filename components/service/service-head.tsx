"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Gift, ShieldCheck, Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { baht, liveAdvisorHref } from "@/components/bookings/booking-flow";
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

/** One figure: the value over its label, a hairline between neighbours. */
function Figure({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-2 text-center lg:items-start lg:gap-1 lg:px-8 lg:text-left lg:first:pl-0 lg:last:pr-0">
      <dt className="order-2 text-xs whitespace-nowrap text-muted-foreground lg:text-frame-label">{label}</dt>
      <dd className="order-1 flex items-center gap-1 font-latin text-base font-semibold whitespace-nowrap text-foreground tabular-nums md:text-lg lg:gap-2 lg:text-frame-heading">
        {children}
      </dd>
    </div>
  );
}

/** A figure still on its way: the shape of a value, not a zero. */
function FigurePending({ label }: { readonly label: string }) {
  return (
    <Figure label={label}>
      <span aria-hidden className="my-1 h-4 w-10 animate-pulse rounded-md bg-muted lg:h-6 lg:w-14" />
    </Figure>
  );
}

/**
 * The showcase head: the advisor's face beside the service's name, the line
 * that says who they are, what the service is, and the figures behind it.
 *
 * Only figures the API has: price and length from the service, the score and
 * the review count from the advisor's summary (reviews belong to an advisor,
 * not to one service). Nobody scored yet reads as "no reviews yet", never as
 * a zero, which would read as the lowest score.
 *
 * On a desktop the face hangs in the margin across the title and the advisor
 * line, and everything under them keeps the title's left edge; on the phone
 * the title has the full width and the face sits beside the advisor line.
 */
export function ServiceHead({
  service,
  category,
  face,
  name,
  headline,
  rating,
  ratingSettled,
}: {
  readonly service: ApiPublicService;
  readonly category: string;
  readonly face: StaticImageData | null;
  readonly name: string;
  readonly headline: string;
  readonly rating: ApiRatingSummary | undefined;
  readonly ratingSettled: boolean;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const profile = liveAdvisorHref(service.advisorId);
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;

  let score: ReactNode;
  if (rating) {
    score = (
      <>
        <Figure label={t("statRating")}>
          <Star aria-hidden className="size-4 fill-primary text-primary lg:size-5" />
          {format.number(rating.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </Figure>
        <Figure label={t("statReviews")}>
          {/* The count is the way to the reviews themselves. */}
          <a className="underline-offset-4 hover:underline" href="#reviews">
            {format.number(rating.total)}
          </a>
        </Figure>
      </>
    );
  } else if (ratingSettled) {
    score = (
      <Figure label={t("statRating")}>
        <span className="text-sm font-normal text-muted-foreground lg:text-frame-meta">{s("noReviews")}</span>
      </Figure>
    );
  } else {
    score = (
      <>
        <FigurePending label={t("statRating")} />
        <FigurePending label={t("statReviews")} />
      </>
    );
  }

  return (
    <header className="flex flex-col gap-5 lg:gap-6">
      <nav
        aria-label={t("breadcrumbLabel")}
        className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground lg:gap-3 lg:text-frame-meta"
      >
        <Link className="inline-flex shrink-0 items-center gap-1.5 py-1 transition-colors hover:text-foreground lg:gap-2" href="/search">
          <ArrowLeft aria-hidden className="size-4 lg:size-5" />
          {t("back")}
        </Link>
        {category ? (
          <>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link
              className="truncate py-1 transition-colors hover:text-foreground"
              href={`/search?q=${encodeURIComponent(category)}`}
            >
              {category}
            </Link>
          </>
        ) : null}
      </nav>

      {/* From `lg` the page sits in the app frame's panel, drawn in the 1710
          space and zoomed by `app-scale`, on the `frame-*` steps the other
          framed pages use: the title at the frame's title step, as theirs. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 lg:gap-x-6 lg:gap-y-2">
        {/* Balanced, so a two-line name splits near its middle rather than
            leaving one Thai syllable alone on the second line. */}
        <h1 className="col-span-2 font-hero text-heading font-normal tracking-tight text-balance text-hero-ink md:text-heading-lg lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:self-end lg:text-frame-title">
          {service.name}
        </h1>
        {/* The name beside it is the same link and the one a keyboard
            reaches; the face is for the pointer. */}
        <Link
          aria-hidden
          className="rounded-full lg:col-start-1 lg:row-span-2 lg:row-start-1"
          href={profile}
          tabIndex={-1}
        >
          <Face className="size-12 text-base lg:size-20 lg:text-2xl" face={face} name={name} verified />
        </Link>
        <div className="flex min-w-0 flex-col gap-0.5 lg:col-start-2 lg:row-start-2 lg:gap-1 lg:self-start">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:gap-x-3">
            {name ? (
              <Link
                className="text-base font-semibold text-foreground underline-offset-4 hover:underline lg:text-frame-body"
                href={profile}
              >
                {name}
              </Link>
            ) : (
              <span aria-hidden className="h-5 w-36 animate-pulse rounded-md bg-muted lg:h-6 lg:w-44" />
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-surface px-2 py-0.5 text-xs font-medium text-primary lg:gap-1.5 lg:px-3 lg:py-1 lg:text-frame-label">
              <ShieldCheck aria-hidden className="size-3.5 lg:size-4.5" />
              {t("verifiedIdentity")}
            </span>
          </span>
          {headline ? <span className="text-sm text-muted-foreground lg:text-frame-meta">{headline}</span> : null}
        </div>
      </div>

      {service.description ? (
        // Indented by the face and its gap (80 + 24), so it keeps the title's left edge.
        <p className="max-w-2xl text-base leading-7 text-pretty text-muted-foreground lg:ml-26 lg:max-w-3xl lg:text-frame-body">
          {service.description}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-4 lg:pl-26">
        <dl
          aria-label={t("atAGlance")}
          className={cn(
            "grid divide-x divide-border rounded-2xl border border-border bg-card py-3 lg:flex lg:rounded-none lg:border-0 lg:bg-transparent lg:py-0",
            rating || !ratingSettled ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          <Figure label={t("statPrice")}>{format.number(baht(service.priceSatang), "baht")}</Figure>
          <Figure label={t("statLength")}>{s("durationMinutes", { count: service.durationMinutes })}</Figure>
          {score}
        </dl>
        {trial ? (
          <span className="inline-flex h-9 items-center gap-2 self-start rounded-full bg-accent-surface px-4 text-sm font-medium text-primary lg:h-11 lg:self-center lg:px-5 lg:text-frame-meta">
            <Gift aria-hidden className="size-4 lg:size-5" />
            {t("trialFree", { minutes: trial })}
          </span>
        ) : null}
      </div>
    </header>
  );
}
