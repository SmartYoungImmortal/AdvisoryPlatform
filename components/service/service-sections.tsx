"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { CalendarCheck, ClipboardList, Gift, MessageCircle, ShieldCheck, Star, Video } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import type { Paginated } from "@/lib/api/client";
import { listAdvisorReviews } from "@/lib/api/resources";
import type { ApiPublicAdvisor, ApiPublicService, ApiRatingSummary, ApiReview } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import type { LiveService } from "@/lib/catalogue/live";
import { authPill } from "@/components/auth/auth-split";
import { liveAdvisorHref } from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { FailedNotice, PILL_LG } from "@/components/service/service-booking";
import { Face } from "@/components/service/service-head";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The sections under the head. From `lg` the page sits in the app frame's
 * panel, drawn in the 1710 space and zoomed by `app-scale`, so every size is a
 * `frame-*` step, the ones the other framed pages use: heads at the frame's
 * heading step, primary lines at its body step, the rest at meta.
 */

/** How many reviews the page shows before pointing at the advisor's profile. */
const REVIEW_LIMIT = 6;

/** The page's section heads, as the advisor's profile sets its own. */
const SECTION_TITLE = "text-lg font-semibold text-foreground lg:text-frame-heading";

/** The one card padding, at every size the card is drawn. */

/**
 * One section of the page: a hairline above, the head, then the content.
 * `id` is also the anchor the head's figures link to.
 */
function Section({
  id,
  title,
  aside,
  action,
  children,
  className,
}: {
  readonly id: string;
  readonly title: string;
  /** A line under the head. */
  readonly aside?: ReactNode;
  /** A link at the head's far end. */
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    // No `scroll-mt-*`: `ScreenBody` already pads anchor jumps clear of the
    // bar (`scroll-padding-top`), and the two would add up.
    <section aria-labelledby={`${id}-title`} className={cn("border-t border-border pt-9 lg:pt-16", className)} id={id}>
      <div className="flex items-end justify-between gap-4 pb-6 lg:pb-8">
        <div className="flex min-w-0 flex-col gap-1 lg:gap-2">
          <h2 className={SECTION_TITLE} id={`${id}-title`}>
            {title}
          </h2>
          {aside}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Five stars, filled to the score, said once for a screen reader. */
function Stars({ value, className }: { readonly value: number; readonly className?: string }) {
  const t = useTranslations("service");
  const filled = Math.round(value);
  return (
    <span aria-label={t("starsLabel", { stars: value.toFixed(1) })} className="flex items-center gap-0.5" role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          aria-hidden
          className={cn("size-3.5 lg:size-4.5", i < filled ? "fill-primary text-primary" : "text-border", className)}
          key={i}
        />
      ))}
    </span>
  );
}

/* --------------------------------------------------------------- session */

/**
 * A fact about the session, shaped like a notification row and unboxed like
 * one: the glyph in the soft grey circle, a line, and why. The section's
 * hairline groups the facts; a box round each one only added frames.
 */
function Fact({ icon: Icon, title, body }: { readonly icon: typeof Video; readonly title: string; readonly body: string }) {
  return (
    <li className="flex gap-3 lg:gap-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12">
        <Icon aria-hidden className="size-4 lg:size-6" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
        <span className="text-base font-semibold text-foreground lg:text-frame-body">{title}</span>
        <span className="text-sm leading-6 text-muted-foreground lg:text-frame-meta">{body}</span>
      </span>
    </li>
  );
}

/**
 * What the reader is buying, from what the service says about itself: a
 * video call of its length, the free trial and the screening when it has
 * them; then what happens after the button, which is the platform's promise
 * (the payment held until the session ends) told as three moments, without
 * numbers, joined by one line.
 */
export function SessionSection({
  service,
  advisorName,
}: {
  readonly service: ApiPublicService;
  readonly advisorName: string;
}) {
  const t = useTranslations("service");
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;
  const facts = [
    { key: "video", icon: Video, title: t("videoCallLength", { minutes: service.durationMinutes }), body: t("factVideoBody") },
    ...(trial ? [{ key: "trial", icon: Gift, title: t("trialFree", { minutes: trial }), body: t("factTrialBody") }] : []),
    ...(service.screeningRequired
      ? [
          {
            key: "screening",
            icon: ClipboardList,
            title: t("factScreeningTitle"),
            body: t("factScreeningBody", { name: advisorName }),
          },
        ]
      : []),
  ];
  const steps = [
    { key: "book", icon: CalendarCheck, title: t("stepBookTitle"), body: t("stepBookBody") },
    { key: "talk", icon: Video, title: t("stepTalkTitle"), body: t("stepTalkBody") },
    { key: "review", icon: Star, title: t("stepReviewTitle"), body: t("stepReviewBody") },
  ];

  return (
    <Section id="session" title={t("sessionTitle")}>
      <div className="flex flex-col gap-9 lg:gap-12">
        <ul
          className={cn(
            "grid gap-3 lg:gap-4",
            facts.length > 1 && "md:grid-cols-2 md:[&>li:last-child:nth-child(odd)]:col-span-2",
          )}
        >
          {facts.map(({ key, ...fact }) => (
            <Fact key={key} {...fact} />
          ))}
        </ul>

        <div className="flex flex-col gap-5 lg:gap-7">
          <h3 className="text-base font-semibold text-foreground lg:text-frame-body">{t("journeyTitle")}</h3>
          <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map(({ key, icon: Icon, title, body }, i) => (
              <li className="relative flex gap-4 md:flex-col md:gap-3 lg:gap-4" key={key}>
                {/* The line from this moment's glyph to the next one's: down
                    the column on the phone, across the gap on a wider screen.
                    Drawn per step, so it ends exactly at the last glyph. */}
                {i < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-10 -bottom-6 left-5 w-px bg-border md:top-5 md:bottom-auto md:left-10 md:h-px md:w-[calc(100%-0.5rem)] lg:top-6 lg:left-12 lg:w-[calc(100%-1rem)]"
                  />
                ) : null}
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12">
                  <Icon aria-hidden className="size-4.5 lg:size-5.5" strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-col gap-1 pt-1.5 md:pt-0 lg:gap-1.5">
                  <span className="text-sm font-semibold text-foreground lg:text-frame-body">{title}</span>
                  <span className="text-sm leading-6 text-muted-foreground lg:text-frame-meta">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- reviews */

/** The average, its stars and the count, beside the share at each star. */
function ScoreBoard({ summary }: { readonly summary: ApiRatingSummary }) {
  const t = useTranslations("service");
  const format = useFormatter();

  return (
    // On the page, not in a tinted box: the section's hairline frames it.
    <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10 lg:gap-14">
      <div className="flex flex-col items-start gap-1.5 lg:gap-2">
        <span className="font-latin text-4xl leading-none font-semibold tracking-tight text-foreground tabular-nums lg:text-frame-title lg:leading-none">
          {format.number(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <Stars className="size-4 lg:size-5" value={summary.average} />
        <span className="text-sm text-muted-foreground lg:text-frame-meta">{t("reviewsBasedOn", { count: summary.total })}</span>
      </div>
      <ul className="flex flex-col gap-2 lg:gap-2.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.distribution.find((bar) => bar.stars === stars)?.count ?? 0;
          return (
            <li className="flex items-center gap-3 text-xs text-muted-foreground lg:gap-4 lg:text-frame-meta" key={stars}>
              <span className="flex w-7 shrink-0 items-center gap-1 font-latin tabular-nums lg:w-9">
                {stars}
                <Star aria-hidden className="size-3 fill-current lg:size-4" />
              </span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-card lg:h-2">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${summary.total ? (count / summary.total) * 100 : 0}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right font-latin tabular-nums lg:w-8">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One review: who, how many stars and when, what they said, and which service. */
function ReviewCard({
  review,
  serviceName,
  advisorName,
}: {
  readonly review: ApiReview;
  readonly serviceName: string;
  readonly advisorName: string;
}) {
  const t = useTranslations("service");
  const format = useFormatter();
  return (
    // One review to a row, the whole column wide, a hairline between them
    // (the list's `divide-y`): unboxed, the way the notification feed lists.
    <li className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 lg:gap-4 lg:py-7">
      {/* The name has its line to itself, the stars and the date under it:
          beside the name, five stars cut a Thai full name short. */}
      <div className="flex items-center gap-3 lg:gap-4">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground lg:size-12 lg:text-frame-meta"
        >
          {review.reviewerDisplayName.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="truncate text-sm font-semibold text-foreground lg:text-frame-body">{review.reviewerDisplayName}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground lg:gap-x-3 lg:text-frame-meta">
            <Stars value={review.stars} />
            {format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}
          </span>
        </span>
      </div>
      {review.comment ? <p className="text-sm leading-6 text-foreground lg:text-frame-body">{review.comment}</p> : null}
      {review.serviceName === serviceName ? (
        <span className="self-start rounded-full bg-accent-surface px-2.5 py-0.5 text-xs font-medium text-primary lg:px-3 lg:py-1 lg:text-frame-meta">
          {t("reviewThisService")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground lg:text-frame-meta">{t("reviewFor", { service: review.serviceName })}</span>
      )}
      {review.advisorReply ? (
        <div className="flex flex-col gap-1 border-l-2 border-border pl-3 lg:pl-4">
          <span className="text-xs font-medium text-foreground lg:text-frame-meta">{t("advisorReply", { name: advisorName })}</span>
          <p className="text-sm leading-6 text-muted-foreground lg:text-frame-meta">{review.advisorReply}</p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * The advisor's reviews. There is no per-service review route, so the
 * section says whose they are, and marks the ones left on this service.
 */
export function ReviewsSection({
  service,
  advisorName,
  summary,
  summarySettled,
}: {
  readonly service: ApiPublicService;
  readonly advisorName: string;
  readonly summary: ApiRatingSummary | undefined;
  readonly summarySettled: boolean;
}) {
  const t = useTranslations("service");
  const advisorId = service.advisorId;
  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: REVIEW_LIMIT }, signal),
    [advisorId],
  );
  const reviews = useResource<Paginated<ApiReview>>(`advisors/${advisorId}/reviews?limit=${REVIEW_LIMIT}`, fetcher);
  const items = reviews.data?.items ?? [];
  const total = reviews.data?.total ?? summary?.total ?? 0;

  let body: ReactNode;
  if (reviews.error) {
    // Not "no reviews yet": that would be a claim the page cannot back.
    body = <FailedNotice error={reviews.error} onRetry={reviews.reload} />;
  } else if (reviews.loading || !summarySettled) {
    body = (
      <div aria-hidden className="flex flex-col gap-4">
        <span className="h-36 animate-pulse rounded-card bg-muted lg:h-44" />
        <div className="grid gap-4 md:grid-cols-2">
          <span className="h-36 animate-pulse rounded-card bg-muted lg:h-48" />
          <span className="h-36 animate-pulse rounded-card bg-muted lg:h-48" />
        </div>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <p className="flex items-center gap-3 text-sm text-muted-foreground lg:text-frame-meta">
        <Star aria-hidden className="size-4 shrink-0 lg:size-5" />
        {t("noAdvisorReviews")}
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-5 lg:gap-6">
        {summary ? <ScoreBoard summary={summary} /> : null}
        <ul className="flex flex-col divide-y divide-border border-t border-border pt-5 lg:pt-7">
          {items.map((review) => (
            <ReviewCard
              advisorName={advisorName}
              key={review.appointmentId}
              review={review}
              serviceName={service.name}
            />
          ))}
        </ul>
        {total > items.length ? (
          <Button
            className={cn(authPill(), "self-start md:w-auto md:px-8", PILL_LG)}
            nativeButton={false}
            render={<Link href={liveAdvisorHref(advisorId)} />}
            variant="outline"
          >
            {t("allReviews", { count: total })}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Section
      aside={
        advisorName ? (
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("reviewsScope", { name: advisorName })}</p>
        ) : null
      }
      id="reviews"
      title={t("reviewsTitle")}
    >
      {body}
    </Section>
  );
}

/* --------------------------------------------------------------- advisor */

/** A figure in the advisor card's row. */
function AdvisorFigure({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-2 text-center lg:gap-1">
      <dt className="order-2 text-xs text-muted-foreground lg:text-frame-meta">{label}</dt>
      <dd className="order-1 flex items-center gap-1 font-latin text-lg font-semibold text-foreground tabular-nums lg:gap-1.5 lg:text-frame-figure">
        {children}
      </dd>
    </div>
  );
}

/**
 * Who the advisor is: their face and line, what the verified mark means,
 * their own words, the three figures behind them, and what they work on.
 */
export function AdvisorSection({
  advisorId,
  advisor,
  name,
  headline,
  face,
  summary,
  summarySettled,
}: {
  readonly advisorId: string;
  readonly advisor: ApiPublicAdvisor | undefined;
  readonly name: string;
  readonly headline: string;
  readonly face: StaticImageData | null;
  readonly summary: ApiRatingSummary | undefined;
  readonly summarySettled: boolean;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const profile = liveAdvisorHref(advisorId);
  const pending = <span aria-hidden className="h-5 w-8 animate-pulse rounded bg-muted lg:h-7 lg:w-10" />;

  return (
    <Section id="advisor" title={t("tabAbout")}>
      {/* On the page, not in a card: the section's hairline groups it. */}
      <div className="flex flex-col gap-6 lg:gap-7">
        <div className="flex items-center gap-4 lg:gap-6">
          <Face className="size-16 text-xl md:size-20 md:text-2xl lg:size-20" face={face} name={name} verified />
          <div className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
            <Link className="font-hero text-xl text-hero-ink underline-offset-4 hover:underline md:text-2xl lg:text-frame-heading" href={profile}>
              {name}
            </Link>
            {headline ? <p className="text-sm text-muted-foreground md:text-base lg:text-frame-meta">{headline}</p> : null}
          </div>
        </div>

        <p className="flex items-start gap-2.5 text-sm leading-6 text-foreground lg:gap-3 lg:text-frame-meta">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary lg:mt-1 lg:size-5" />
          {t("verifiedDetail")}
        </p>

        {advisor?.bio ? <p className="text-base leading-7 text-muted-foreground lg:text-frame-body">{advisor.bio}</p> : null}

        <dl
          className={cn(
            "grid divide-x divide-border border-y border-border py-3 lg:py-5",
            summary || !summarySettled ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {summary ? (
            <>
              <AdvisorFigure label={t("statRating")}>
                <Star aria-hidden className="size-4 fill-primary text-primary lg:size-5" />
                {summary.average.toFixed(1)}
              </AdvisorFigure>
              <AdvisorFigure label={t("statReviews")}>{summary.total}</AdvisorFigure>
            </>
          ) : null}
          {!summary && summarySettled ? (
            <AdvisorFigure label={t("statRating")}>
              <span className="text-sm font-normal text-muted-foreground lg:text-frame-meta">{s("noReviews")}</span>
            </AdvisorFigure>
          ) : null}
          {!summary && !summarySettled ? (
            <>
              <AdvisorFigure label={t("statRating")}>{pending}</AdvisorFigure>
              <AdvisorFigure label={t("statReviews")}>{pending}</AdvisorFigure>
            </>
          ) : null}
          <AdvisorFigure label={t("statServices")}>{advisor ? advisor.publishedServiceCount : pending}</AdvisorFigure>
        </dl>

        {advisor && advisor.skills.length > 0 ? (
          <div className="flex flex-col gap-2.5 lg:gap-3">
            <p className="text-sm font-semibold text-foreground lg:text-frame-meta">{t("skillsTitle")}</p>
            <ul className="flex flex-wrap gap-2">
              {advisor.skills.map((skill) => (
                <li
                  className="rounded-full border border-border px-3 py-1 text-sm text-foreground lg:px-4 lg:py-1.5 lg:text-frame-meta"
                  key={skill}
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className={cn(authPill(), "sm:w-auto sm:px-7", PILL_LG)}
            nativeButton={false}
            render={<Link href={profile} />}
            variant="outline"
          >
            {t("viewProfile")}
          </Button>
          <Button
            className={cn(authPill(), "border-transparent sm:w-auto sm:px-5", PILL_LG)}
            nativeButton={false}
            render={<Link href={chatWithHref(advisorId)} />}
            variant="ghost"
          >
            <MessageCircle aria-hidden />
            {t("message")}
          </Button>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- services */

/** The score on a card, or "no reviews yet"; a pulse while the scores load. */
function CardRating({ item }: { readonly item: LiveService }) {
  const s = useTranslations("search");
  if (item.rating === null) {
    return <span aria-hidden className="h-5 w-16 animate-pulse rounded-md bg-muted" />;
  }
  if (item.reviews === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground lg:gap-1.5 lg:text-frame-meta">
        <Star aria-hidden className="size-3.5 lg:size-4" />
        {s("noReviews")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs lg:gap-1.5 lg:text-frame-meta">
      <Star aria-hidden className="size-3.5 fill-primary text-primary lg:size-4.5" />
      <span className="font-latin font-semibold text-foreground tabular-nums">{item.rating.toFixed(1)}</span>
      <span className="text-muted-foreground tabular-nums">({item.reviews})</span>
    </span>
  );
}

/**
 * A service as a card: the photograph, who (when it is someone else), the
 * name, what it covers, the score and the price for its length. Only what
 * the catalogue knows. The search page's card, drawn a size up for this
 * page's 1710 frame, where its 12px lines would read at 10. Under the
 * pointer the photo's shadow deepens, and nothing moves.
 */
function ServiceCard({ item, withAdvisor }: { readonly item: LiveService; readonly withAdvisor: boolean }) {
  const s = useTranslations("search");
  const format = useFormatter();
  return (
    <Link
      className="group flex h-full flex-col gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-4"
      href={item.href}
    >
      <span className="overflow-hidden rounded-2xl bg-muted shadow-hero-card transition-shadow duration-150 group-hover:shadow-hero-card-hover">
        <Image alt="" className="aspect-[4/3] w-full object-cover" src={item.cover} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5 lg:gap-2">
        {withAdvisor ? (
          <span className="flex min-w-0 items-center gap-2">
            <Face className="size-6 text-2xs lg:size-8 lg:text-xs" face={item.face} name={item.advisorName} rim={false} />
            <span className="truncate text-xs font-medium text-foreground lg:text-frame-meta">{item.advisorName}</span>
          </span>
        ) : null}
        <span className="line-clamp-2 text-sm leading-snug font-semibold text-foreground md:text-base lg:text-frame-body">
          {item.title}
        </span>
        <span className="line-clamp-2 text-xs leading-5 text-muted-foreground lg:text-frame-meta">
          {item.description}
        </span>
        <span className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <CardRating item={item} />
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="font-latin text-sm font-bold text-foreground tabular-nums md:text-base lg:text-frame-body">
              {format.number(item.price, { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-muted-foreground lg:text-frame-meta">{s("perSession", { minutes: item.minutes })}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

/** A row of service cards: a rail on the phone, a grid from the tablet up. */
const RAIL =
  "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scroll-px-5 md:mx-0 md:grid md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:gap-8";
const RAIL_ITEM = "w-64 shrink-0 snap-start md:w-auto";

/**
 * The advisor's other services: a reader not sold on this hour is often sold
 * on their next one. Two across, so each card is big enough to read.
 */
export function AdvisorServices({
  items,
  advisorId,
}: {
  readonly items: readonly LiveService[];
  readonly advisorId: string;
}) {
  const t = useTranslations("service");
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);

  return (
    <Section
      action={
        <Link
          className="shrink-0 py-1 text-sm font-medium text-foreground underline-offset-4 hover:underline lg:text-frame-meta"
          href={liveAdvisorHref(advisorId)}
        >
          {t("viewAll")}
        </Link>
      }
      id="more"
      title={t("relatedTitle")}
    >
      <div className={cn(RAIL, "md:grid-cols-2")}>
        {shown.map((item) => (
          <div className={RAIL_ITEM} key={item.id}>
            <ServiceCard item={item} withAdvisor={false} />
          </div>
        ))}
      </div>
    </Section>
  );
}

/**
 * Services like this one from other advisors, across the page's full width
 * below the booking panel's column. `category` names the row when every item
 * shares it; empty, the row is the general "more to explore".
 */
export function SimilarServices({
  items,
  category,
}: {
  readonly items: readonly LiveService[];
  readonly category: string;
}) {
  const t = useTranslations("service");
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="similar-title" className="mt-14 border-t border-border pt-9 lg:mt-20 lg:pt-16">
      <h2 className={cn(SECTION_TITLE, "pb-6 lg:pb-8")} id="similar-title">
        {category ? t("similarTitle", { category }) : t("similarFallback")}
      </h2>
      <div className={cn(RAIL, "md:grid-cols-3")}>
        {items.map((item) => (
          <div className={RAIL_ITEM} key={item.id}>
            <ServiceCard item={item} withAdvisor />
          </div>
        ))}
      </div>
    </section>
  );
}
