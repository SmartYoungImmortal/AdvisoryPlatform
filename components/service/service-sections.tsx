"use client";

import type { StaticImageData } from "next/image";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronDown,
  MessageCircle,
  Star,
  UserCheck,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { PanelError } from "@/components/advisor-public/profile-parts";
import { liveAdvisorHref } from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { ResultCard } from "@/components/search/search-screen";
import { Face } from "@/components/service/service-head";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/api/client";
import { listAdvisorReviews } from "@/lib/api/resources";
import type { ApiPublicAdvisor, ApiPublicService, ApiRatingSummary, ApiReview } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import type { LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/**
 * The column that scrolls beside the intro, drawn after the listing pages of
 * a large marketplace for services and experiences, cut to what a session
 * here has to say: the reviews, the photographs, the advisor's
 * qualifications, the things to know, and their other services.
 *
 * Measured there at 1440 and drawn in the 1710 space at ×1.1875, so it reads
 * the same size on a 1440 screen: a section head 22/600 (`text-heading`),
 * lines 14 (`frame-meta`), small print 12 (`frame-label`), 48 of air above
 * and below each section's hairline.
 */

/** How many reviews the page shows before "see all" opens the rest under them. */
const REVIEW_LIMIT = 6;

/** The rest, read in one page: the reviews route's largest. */
const ALL_REVIEWS = 100;

/** A section head: 22/600 at 1440. */
const SECTION_TITLE = "text-xl leading-tight font-semibold text-foreground lg:text-heading lg:leading-tight";

/** The full-width grey button under a section, its way on: 40 tall, 8 round, 14/500. */
const WIDE_BUTTON =
  "flex h-11 w-full items-center justify-center rounded-lg bg-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-accented lg:h-[47.5px] lg:rounded-[9.5px] lg:text-frame-meta";

/**
 * One section: the head (with a link at its far end), then the content, a
 * hairline between it and the next. `id` is also the anchor the intro's
 * review count jumps to.
 */
function Section({
  id,
  title,
  action,
  children,
}: {
  readonly id: string;
  readonly title: ReactNode;
  /** A link at the head's far end. */
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    // No `scroll-mt-*`: `ScreenBody` already pads anchor jumps clear of the
    // bar (`scroll-padding-top`), and the two would add up.
    <section
      aria-labelledby={`${id}-title`}
      className="border-b border-border py-9 first:pt-0 last:border-b-0 lg:py-[57px] lg:first:pt-0"
      id={id}
    >
      <header className="mb-6 flex items-baseline justify-between gap-4 lg:mb-9.5">
        <h2 className={SECTION_TITLE} id={`${id}-title`}>
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/* --------------------------------------------------------------- reviews */

/** Five 9px stars at 1440, filled to the score, said once for a screen reader. */
function Stars({ value }: { readonly value: number }) {
  const t = useTranslations("service");
  const filled = Math.round(value);
  return (
    <span aria-label={t("starsLabel", { stars: value.toFixed(1) })} className="flex items-center gap-px lg:gap-[1.1875px]" role="img">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          aria-hidden
          className={cn("size-2.5 lg:size-[10.7px]", step <= filled ? "fill-foreground text-foreground" : "fill-border text-border")}
          key={step}
        />
      ))}
    </span>
  );
}

/**
 * One review, unboxed: the 40 face (their initial; no route draws another
 * person's photograph) with the name 14/500 and, under it, which service it
 * was for; 16 under that the stars and the date; 13 under them what they
 * said, 14/20.
 */
function Review({
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
  const ours = review.serviceName === serviceName;
  return (
    <li className="flex min-w-0 flex-col">
      <div className="flex items-center gap-4 lg:gap-[23.75px]">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground lg:size-[47.5px] lg:text-frame-meta"
        >
          {review.reviewerDisplayName.slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-meta lg:leading-[1.29]">
            {review.reviewerDisplayName}
          </span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-label">
            {ours ? t("reviewThisService") : t("reviewFor", { service: review.serviceName })}
          </span>
        </span>
      </div>
      <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground lg:mt-[19px] lg:gap-[4.75px] lg:text-frame-label">
        <Stars value={review.stars} />
        <span aria-hidden>·</span>
        {format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}
      </span>
      {review.comment ? (
        <p className="mt-3 line-clamp-5 text-sm leading-[1.43] text-foreground lg:mt-[15.4px] lg:text-frame-meta lg:leading-[1.43]">
          {review.comment}
        </p>
      ) : null}
      {review.advisorReply ? (
        <div className="mt-3 flex flex-col gap-0.5 border-l-2 border-border pl-3 lg:mt-[15.4px] lg:gap-[2.375px] lg:pl-[14.25px]">
          <span className="text-xs font-medium text-foreground lg:text-frame-label">{t("advisorReply", { name: advisorName })}</span>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{review.advisorReply}</p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * What a review here is, said where the reviews are: who can leave one, what
 * the advisor can do to it, and what the score counts. Each line is the API's
 * own rule (`reviews.service.ts`: an advisee's completed appointment, one
 * review each; the advisor only replies).
 */
function HowReviewsWork() {
  const t = useTranslations("service");
  const [open, setOpen] = useState(false);
  const lines: readonly { readonly key: string; readonly icon: LucideIcon; readonly text: string }[] = [
    { key: "completed", icon: UserCheck, text: t("reviewsHowCompleted") },
    { key: "reply", icon: MessageCircle, text: t("reviewsHowReply") },
    { key: "scope", icon: Star, text: t("reviewsHowScope") },
  ];

  return (
    <div className="flex flex-col items-center">
      <Button
        aria-controls="reviews-how"
        aria-expanded={open}
        className="h-auto gap-1 p-0 text-xs font-normal text-foreground underline underline-offset-4 hover:bg-transparent lg:gap-[4.75px] lg:text-frame-label"
        onClick={() => setOpen((value) => !value)}
        type="button"
        variant="ghost"
      >
        {t("reviewsHow")}
        <ChevronDown
          aria-hidden
          className={cn("size-3.5 transition-transform duration-150 lg:size-[16.6px]", open && "rotate-180")}
        />
      </Button>
      {/* In place, under the link, rather than over the page: three lines
          read where the reviews are. */}
      {open ? (
        <ul className="mt-4 flex w-full flex-col gap-3 lg:mt-[19px] lg:gap-[14.25px]" id="reviews-how">
          {lines.map(({ key, icon: Icon, text }) => (
            <li className="flex items-start gap-3 text-sm text-muted-foreground lg:gap-[14.25px] lg:text-frame-meta" key={key}>
              <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-foreground lg:size-[21.375px]" strokeWidth={1.5} />
              {text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The advisor's reviews under a head that is the score itself, two to a row
 * (356 wide, 40 apart at 1440) and unboxed; under them the full-width grey
 * button to every review on the advisor's profile, and what a review here is.
 */
/**
 * The reviews after the first page, read once "see all" is pressed and
 * drawn on in the same grid: the first page again from the top (the route's
 * order is fixed), less the ones already shown. Placeholders hold their two
 * cells while it loads.
 */
function MoreReviews({
  advisorId,
  advisorName,
  serviceName,
  shown,
}: {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly serviceName: string;
  readonly shown: number;
}) {
  const a = useTranslations("advisorProfile");
  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: ALL_REVIEWS }, signal),
    [advisorId],
  );
  const all = useResource<Paginated<ApiReview>>(`advisors/${advisorId}/reviews?limit=${ALL_REVIEWS}`, fetcher);

  if (all.error) {
    return (
      <li className="md:col-span-2">
        <PanelError error={all.error} onRetry={all.reload} title={a("reviewsError")} />
      </li>
    );
  }
  if (all.loading) {
    return (
      <>
        {[0, 1].map((key) => (
          <li aria-hidden className="flex flex-col gap-4" key={`more-${key}`}>
            <span className="flex items-center gap-4">
              <span className="size-10 animate-pulse rounded-full bg-muted lg:size-[47.5px]" />
              <span className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
            </span>
            <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
          </li>
        ))}
      </>
    );
  }
  return (
    <>
      {(all.data?.items ?? []).slice(shown).map((review) => (
        <Review advisorName={advisorName} key={review.appointmentId} review={review} serviceName={serviceName} />
      ))}
    </>
  );
}

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
  const a = useTranslations("advisorProfile");
  const format = useFormatter();
  const advisorId = service.advisorId;
  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: REVIEW_LIMIT }, signal),
    [advisorId],
  );
  const reviews = useResource<Paginated<ApiReview>>(`advisors/${advisorId}/reviews?limit=${REVIEW_LIMIT}`, fetcher);
  const items = reviews.data?.items ?? [];
  const total = reviews.data?.total ?? summary?.total ?? 0;
  const [expanded, setExpanded] = useState(false);

  const title = summary ? (
    <span className="inline-flex items-center gap-2 lg:gap-[9.5px]">
      <Star aria-hidden className="size-4 fill-current lg:size-[19px]" />
      {format.number(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      <span aria-hidden>·</span>
      {t("reviewCount", { count: summary.total })}
    </span>
  ) : (
    t("statReviews")
  );

  let body: ReactNode;
  if (reviews.error) {
    // Not "no reviews yet": that would be a claim the page cannot back.
    body = <PanelError error={reviews.error} onRetry={reviews.reload} title={a("reviewsError")} />;
  } else if (reviews.loading || !summarySettled) {
    body = (
      <div aria-hidden className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:gap-x-[47.5px]">
        {[0, 1].map((key) => (
          <span className="flex flex-col gap-4" key={key}>
            <span className="flex items-center gap-4">
              <span className="size-10 animate-pulse rounded-full bg-muted lg:size-[47.5px]" />
              <span className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
            </span>
            <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
            <span className="h-4 w-3/5 animate-pulse rounded-md bg-muted" />
          </span>
        ))}
      </div>
    );
  } else if (items.length === 0) {
    body = <p className="text-sm text-muted-foreground lg:text-frame-meta">{t("noAdvisorReviews")}</p>;
  } else {
    body = (
      <div className="flex flex-col">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:gap-x-[47.5px] lg:gap-y-[57px]">
          {items.map((review) => (
            <Review advisorName={advisorName} key={review.appointmentId} review={review} serviceName={service.name} />
          ))}
          {expanded ? (
            <MoreReviews advisorId={advisorId} advisorName={advisorName} serviceName={service.name} shown={items.length} />
          ) : null}
        </ul>
        {/* The rest open here, under the first ones, rather than on another
            page; the button goes once they are all in. */}
        {!expanded && total > items.length ? (
          <Button
            className={cn(WIDE_BUTTON, "mt-10 lg:mt-[57px]")}
            onClick={() => setExpanded(true)}
            type="button"
            variant="ghost"
          >
            {t("allReviews", { count: total })}
          </Button>
        ) : null}
        <div className="mt-4 lg:mt-[19px]">
          <HowReviewsWork />
        </div>
      </div>
    );
  }

  return (
    <Section id="reviews" title={title}>
      {body}
    </Section>
  );
}

/* --------------------------------------------------------------- advisor */

/** A qualification: a 24 line glyph, its head 14/500 and what it says 14 in grey. */
function Qualification({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 lg:gap-[23.75px]">
      <Icon aria-hidden className="size-6 shrink-0 text-foreground lg:size-[28.5px]" strokeWidth={1.5} />
      <span className="flex min-w-0 flex-col text-sm lg:text-frame-meta lg:leading-[1.29]">
        <span className="font-medium text-foreground">{title}</span>
        <span className="line-clamp-3 text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

/**
 * The advisor's qualifications, as the listing pages draw a host's: a card
 * 372 wide and 230 tall at 1440 on a shadow, the 104 face over the name
 * 31.5/600 and the headline 12 (the way to their profile); beside it, 36
 * over, the qualifications as rows; 35 under both the full-width grey button
 * that messages them, and 16 under that the line that keeps the payment on
 * the platform.
 */
export function AdvisorSection({
  advisorId,
  advisor,
  name,
  headline,
  face,
}: {
  readonly advisorId: string;
  readonly advisor: ApiPublicAdvisor | undefined;
  readonly name: string;
  readonly headline: string;
  readonly face: StaticImageData | null;
}) {
  const t = useTranslations("service");
  // The first name alone, as a host card reads: the full name is the intro's.
  const firstName = name.trim().split(/\s+/)[0] ?? name;

  return (
    <Section id="advisor" title={t("qualificationsTitle")}>
      <div className="grid gap-6 md:grid-cols-2 md:items-start lg:grid-cols-[441.75px_minmax(0,1fr)] lg:gap-x-[42.75px]">
        <Link
          className="flex flex-col items-center justify-center rounded-3xl bg-card px-6 py-8 text-center shadow-panel outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-[273px] lg:rounded-[28.5px] lg:px-[28.5px] lg:py-0"
          href={liveAdvisorHref(advisorId)}
        >
          <Face className="size-24 text-3xl lg:size-[123.5px] lg:text-frame-title" face={face} name={name} />
          <span className="mt-2.5 text-2xl leading-tight font-semibold text-balance text-foreground lg:mt-[10.7px] lg:text-frame-title lg:leading-[1.15]">
            {firstName}
          </span>
          {headline ? <span className="text-xs text-muted-foreground lg:text-frame-label">{headline}</span> : null}
        </Link>

        <ul className="flex flex-col gap-5 lg:gap-[23.75px]">
          {advisor?.bio ? (
            <Qualification icon={BriefcaseBusiness} title={t("experienceTitle")}>
              {advisor.bio}
            </Qualification>
          ) : null}
          {advisor && advisor.skills.length > 0 ? (
            <Qualification icon={Award} title={t("skillsTitle")}>
              {advisor.skills.join(" · ")}
            </Qualification>
          ) : null}
          <Qualification icon={BadgeCheck} title={t("verifiedIdentity")}>
            {t("verifiedDetail")}
          </Qualification>
        </ul>
      </div>

      <Link className={cn(WIDE_BUTTON, "mt-8 lg:mt-[41.5px]")} href={chatWithHref(advisorId)}>
        {t("messageName", { name: firstName })}
      </Link>
      <p className="mx-auto mt-4 max-w-xs text-center text-xs text-muted-foreground lg:mt-[19px] lg:max-w-[356px] lg:text-frame-label">
        {t("payInApp")}
      </p>
    </Section>
  );
}

/* ---------------------------------------------------------- things to know */

/**
 * What happens after the button, as the listing pages' "things to know": a
 * glyph, its head and a line, two to a row. The identity check is the
 * qualifications' to say, not said again here.
 */
export function KnowSection() {
  const t = useTranslations("service");
  const items = [
    { key: "book", icon: CalendarCheck, title: t("stepBookTitle"), body: t("stepBookBody") },
    { key: "talk", icon: Video, title: t("stepTalkTitle"), body: t("stepTalkBody") },
    { key: "review", icon: Star, title: t("stepReviewTitle"), body: t("stepReviewBody") },
  ];

  return (
    <Section id="know" title={t("knowTitle")}>
      <ul className="grid gap-7 md:grid-cols-2 md:gap-x-10 lg:gap-x-[57px] lg:gap-y-9.5">
        {items.map(({ key, icon: Icon, title, body }) => (
          <li className="flex flex-col gap-3 lg:gap-[14.25px]" key={key}>
            <Icon aria-hidden className="size-6 text-foreground lg:size-[28.5px]" strokeWidth={1.5} />
            <span className="flex flex-col text-sm lg:text-frame-meta">
              <span className="font-medium text-foreground">{title}</span>
              <span className="text-muted-foreground">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------- services */

/**
 * Other services to look at, on the search page's own cards: the advisor's
 * when they have any (a reader not sold on this hour is often sold on their
 * next one), otherwise ones like it from others. Three across.
 */
export function MoreServices({
  own,
  similar,
  category,
  advisorId,
}: {
  readonly own: readonly LiveService[];
  readonly similar: readonly LiveService[];
  readonly category: string;
  readonly advisorId: string;
}) {
  const t = useTranslations("service");
  const mine = own.length > 0;
  const items = (mine ? own : similar).slice(0, 3);
  if (items.length === 0) return null;

  let title = t("similarFallback");
  if (mine) title = t("relatedTitle");
  else if (category) title = t("similarTitle", { category });

  return (
    <Section
      action={
        mine ? (
          <Link
            className="shrink-0 text-sm font-medium text-foreground underline underline-offset-4 lg:text-frame-meta"
            href={liveAdvisorHref(advisorId)}
          >
            {t("viewAll")}
          </Link>
        ) : null
      }
      id="more"
      title={title}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 lg:gap-x-10">
        {items.map((item) => (
          <ResultCard item={item} key={item.id} />
        ))}
      </div>
    </Section>
  );
}
