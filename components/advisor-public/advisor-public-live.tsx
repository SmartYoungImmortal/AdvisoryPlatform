"use client";

import { useCallback, useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { initialsOf, splitHeadline } from "@/components/advisor-public/headline";
import {
  AboutView,
  EmptyNotice,
  NoticeLink,
  PanelError,
  PendingProfile,
  PhotoCollage,
  ProfileHeader,
  ProfilePage,
  ProfileTabs,
  ReviewList,
  ReviewListPending,
  ServiceGrid,
  ServiceGridPending,
  ServicesSketch,
  TabPanel,
  useProfileTab,
  type Photo,
  type ProfileFigure,
  type ProfileModel,
  type RatingModel,
  type ReviewModel,
  type ServiceCardModel,
} from "@/components/advisor-public/profile-parts";
import {
  baht,
  liveServiceHref,
  LIVE_ADVISOR_PATH,
} from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { ApiError, type Paginated } from "@/lib/api/client";
import {
  getAdvisor,
  getAdvisorRatingSummary,
  listAdvisorReviews,
  listServices,
} from "@/lib/api/resources";
import type {
  ApiPublicAdvisor,
  ApiPublicService,
  ApiRatingSummary,
  ApiReview,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import type { ProfileTab } from "@/lib/catalogue/profiles";

/**
 * `/advisors/…` when the uuid is known: the public profile page
 * (`profile-parts.tsx`), read from the API.
 *
 * Reached as `?advisorId=<uuid>` on a prerendered slug, the way
 * `components/bookings/booking-flow.ts` explains. Without it the slug route
 * renders its fixture profile and none of this mounts.
 *
 * ## What each part is read from
 *
 * - `GET /advisors/:id`: the name, the headline (split into the profession
 *   and, when it names a province, the location line), the bio, the portrait
 *   (`image`, an already-public URL; the ring's advisors carry their ring
 *   face there), the verified skills and the published-service count.
 * - The identity mark is a fact about everyone this route can show: the API
 *   only lists an advisor whose identity an admin verified
 *   (`isVerifiedAdvisor` in its discovery query), and 404s anyone else.
 * - `GET /advisors/:id/reviews/summary`: the review count on the handle row,
 *   the rating figure and the reviews tab's histogram.
 * - `GET /services?advisorId=`: the cards and the "from" price. Their
 *   photographs are the live catalogue's (`useLiveCatalogue`), so a service
 *   wears the same cover here as on the home page and in search.
 * - `GET /advisors/:id/reviews`: the reviews tab, and each card's own score,
 *   worked out from the reviews that name it, and only while the page of
 *   reviews holds all of them; a part of the reviews would give a part of an
 *   average.
 *
 * Nothing that is absent is drawn as a zero: a figure that failed to load is
 * left out of the box, and one still loading shows its shape.
 */

/** Which tab route this profile's links point at, uuid and all. */
function liveTabHref(advisorId: string, tab: ProfileTab): string {
  const base = tab === "services" ? LIVE_ADVISOR_PATH : `${LIVE_ADVISOR_PATH}/${tab}`;
  return `${base}?advisorId=${advisorId}`;
}

/** The tab order: the work first, then what people said, then the person. */
const TABS: readonly ProfileTab[] = ["services", "reviews", "about"];

const REVIEW_PAGE = 100;

/** Each service's own average, from reviews that name it; null when the page is partial. */
function scoresByService(
  reviews: Paginated<ApiReview> | undefined,
): ReadonlyMap<string, { readonly average: number; readonly count: number }> | null {
  if (!reviews || reviews.total > reviews.items.length) return null;
  const sums = new Map<string, { sum: number; count: number }>();
  for (const review of reviews.items) {
    const entry = sums.get(review.serviceName) ?? { sum: 0, count: 0 };
    entry.sum += review.stars;
    entry.count += 1;
    sums.set(review.serviceName, entry);
  }
  return new Map(
    [...sums].map(([name, { sum, count }]) => [name, { average: sum / count, count }] as const),
  );
}

/**
 * The average, or null before anyone has scored. The DTO types it a number,
 * but with no reviews the route answers `average: null`.
 */
function averageOf(summary: ApiRatingSummary): number | null {
  const average: number | null = summary.average;
  return summary.total > 0 ? average : null;
}

/** The histogram, five stars down to one, as shares of the total. */
function ratingOf(summary: ApiRatingSummary | undefined): RatingModel | null {
  if (!summary) return null;
  const total = summary.total;
  const bars = [5, 4, 3, 2, 1].map((stars) => {
    const count = summary.distribution.find((bar) => bar.stars === stars)?.count ?? 0;
    return { stars, count, share: total > 0 ? (count / total) * 100 : 0 };
  });
  return { average: averageOf(summary) ?? 0, total, bars };
}

export function LiveAdvisorProfileScreen({
  advisorId,
  tab: initialTab = "services",
}: {
  readonly advisorId: string;
  readonly tab?: ProfileTab;
}) {
  const t = useTranslations("advisorProfile");
  const s = useTranslations("search");
  const format = useFormatter();

  const hrefFor = useCallback((tab: ProfileTab) => liveTabHref(advisorId, tab), [advisorId]);
  const { tab, select, jumpTo } = useProfileTab(initialTab, hrefFor);

  const advisor = useResource<ApiPublicAdvisor>(
    `advisors/${advisorId}`,
    useCallback((signal: AbortSignal) => getAdvisor(advisorId, signal), [advisorId]),
  );
  const summary = useResource<ApiRatingSummary>(
    `advisors/${advisorId}/reviews/summary`,
    useCallback((signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal), [advisorId]),
  );
  const services = useResource<Paginated<ApiPublicService>>(
    `services?advisorId=${advisorId}&limit=50`,
    useCallback((signal: AbortSignal) => listServices({ advisorId, limit: 50 }, signal), [advisorId]),
  );
  const reviews = useResource<Paginated<ApiReview>>(
    `advisors/${advisorId}/reviews?limit=${REVIEW_PAGE}`,
    useCallback(
      (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: REVIEW_PAGE }, signal),
      [advisorId],
    ),
  );
  const catalogue = useLiveCatalogue();

  const own = useMemo(() => services.data?.items ?? [], [services.data]);
  const covers = useMemo(
    () => new Map(catalogue.items.map((item) => [item.id, item.cover] as const)),
    [catalogue.items],
  );
  const coverOf = useCallback(
    (service: ApiPublicService): Photo | null => covers.get(service.id) ?? service.images?.[0] ?? null,
    [covers],
  );

  /** The advisor's own photographs first, then the catalogue's, none twice. */
  const photos = useMemo(() => {
    const list: Photo[] = [];
    const seen = new Set<string>();
    const add = (photo: Photo | null | undefined) => {
      if (!photo) return;
      const key = typeof photo === "string" ? photo : photo.src;
      if (seen.has(key)) return;
      seen.add(key);
      list.push(photo);
    };
    for (const service of own) {
      add(coverOf(service));
      for (const image of service.images ?? []) add(image);
    }
    for (const item of catalogue.items) add(item.cover);
    return list.slice(0, 6);
  }, [own, coverOf, catalogue.items]);

  const tabItems = TABS.map((key) => ({ key, label: t(`tab.${key}`), href: hrefFor(key) }));

  if (advisor.loading) {
    return (
      <PendingProfile
        back="/search"
        items={tabItems}
        label={t("tabsLabel")}
        onSelect={select}
        reviewsHref={hrefFor("reviews")}
        servicesHref={hrefFor("services")}
        tab={tab}
      />
    );
  }

  if (advisor.error || !advisor.data) {
    // A 404 is the API saying this advisor is not listed (suspended, or with
    // nothing published), which is an answer, not a broken page.
    const missing = !advisor.error || (advisor.error instanceof ApiError && advisor.error.status === 404);
    return (
      <ProfilePage back="/search">
        <TabPanel>
          {missing ? (
            <EmptyNotice
              action={<NoticeLink href="/search">{t("findAdvisor")}</NoticeLink>}
              body={t("notFoundBody")}
              figure={<PhotoCollage photos={photos} />}
              title={t("notFoundTitle")}
            />
          ) : (
            <PanelError error={advisor.error ?? new Error(t("loadError"))} onRetry={advisor.reload} title={t("loadError")} />
          )}
        </TabPanel>
      </ProfilePage>
    );
  }

  const live = advisor.data;
  const { role, place } = splitHeadline(live.headline);
  const prices = own.map((service) => service.priceSatang);

  const figures: ProfileFigure[] = [];
  if (services.loading) {
    figures.push({ key: "from", label: t("statFrom"), value: null });
  } else if (prices.length > 0) {
    figures.push({
      key: "from",
      label: t("statFrom"),
      value: format.number(baht(Math.min(...prices)), "baht"),
    });
  }
  figures.push(
    { key: "services", label: t("statServices"), value: String(live.publishedServiceCount) },
    { key: "skills", label: t("statSkills"), value: String(live.skills.length) },
  );
  if (summary.loading) {
    figures.push({ key: "rating", label: t("statRating"), value: null, star: true });
  } else if (summary.data) {
    // An unrated advisor reads "★ 0"; the count beside it on the handle row
    // says why.
    const average = averageOf(summary.data);
    figures.push({
      key: "rating",
      label: t("statRating"),
      value: average === null ? "0" : average.toFixed(1),
      star: true,
    });
  }

  const featuredService = own.find((service) => coverOf(service) !== null);
  const featuredCover = featuredService ? coverOf(featuredService) : null;
  const model: ProfileModel = {
    name: live.displayName,
    portrait: live.image ?? null,
    initials: initialsOf(live.displayName),
    verified: true,
    reviewCount: summary.data ? summary.data.total : summary.loading ? undefined : null,
    role: role || null,
    place,
    figures,
    featured:
      services.loading || (catalogue.loading && own.length > 0)
        ? undefined
        : featuredService && featuredCover
          ? {
              cover: featuredCover,
              title: featuredService.name,
              href: liveServiceHref(featuredService.id),
            }
          : null,
    skills: live.skills,
    chatHref: chatWithHref(advisorId),
    servicesHref: hrefFor("services"),
    reviewsHref: hrefFor("reviews"),
  };

  const scores = scoresByService(reviews.data);
  const cards: ServiceCardModel[] = own.map((service) => {
    const score = scores?.get(service.name);
    return {
      key: service.id,
      title: service.name,
      cover: coverOf(service),
      length: s("durationMinutes", { count: service.durationMinutes }),
      price: format.number(baht(service.priceSatang), "baht"),
      rating: score?.average ?? null,
      ratingCount: score?.count ?? 0,
      href: liveServiceHref(service.id),
    };
  });

  const reviewCards: ReviewModel[] = (reviews.data?.items ?? []).map((review) => ({
    key: review.appointmentId,
    name: review.reviewerDisplayName,
    initials: initialsOf(review.reviewerDisplayName),
    avatar: null,
    date: format.dateTime(new Date(review.createdAt), "short"),
    stars: review.stars,
    service: review.serviceName,
    comment: review.comment,
    reply: review.advisorReply,
  }));

  return (
    <ProfilePage
      actions={{
        chatHref: chatWithHref(advisorId),
        servicesHref: hrefFor("services"),
        onBook: jumpTo("services"),
      }}
      back="/search"
    >
      <ProfileHeader model={model} onBook={jumpTo("services")} onReviews={jumpTo("reviews")} />
      <ProfileTabs current={tab} items={tabItems} label={t("tabsLabel")} onSelect={select} />
      <TabPanel>
        {tab === "services" ? (
          services.loading ? (
            <ServiceGridPending />
          ) : services.error ? (
            <PanelError error={services.error} onRetry={services.reload} title={t("servicesError")} />
          ) : cards.length > 0 ? (
            <ServiceGrid cards={cards} />
          ) : (
            <EmptyNotice
              body={t("noServicesBody", { name: live.displayName })}
              figure={<ServicesSketch photos={photos} />}
              title={t("noServicesTitle")}
            />
          )
        ) : null}

        {tab === "reviews" ? (
          reviews.loading ? (
            <ReviewListPending />
          ) : reviews.error ? (
            <PanelError error={reviews.error} onRetry={reviews.reload} title={t("reviewsError")} />
          ) : reviewCards.length > 0 ? (
            <ReviewList rating={ratingOf(summary.data)} reviews={reviewCards} />
          ) : (
            <EmptyNotice
              body={t("noReviewsBody", { name: live.displayName })}
              figure={<PhotoCollage photos={photos} />}
              title={t("noReviewsTitle")}
            />
          )
        ) : null}

        {tab === "about" ? (
          // `bio` is nullable on the DTO; the headline says something rather
          // than opening the tab on an empty section.
          <AboutView bio={live.bio ?? live.headline} skills={live.skills} verified />
        ) : null}
      </TabPanel>
    </ProfilePage>
  );
}
