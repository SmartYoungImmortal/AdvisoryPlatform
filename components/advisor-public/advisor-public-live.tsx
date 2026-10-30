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
import { useResource, type Resource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
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
 * - `GET /services?advisorId=`: which services, in what order, and the
 *   "from" price. Each is drawn as the live catalogue's card
 *   (`useLiveCatalogue`), so it wears the same cover, score and price here
 *   as in search.
 * - `GET /advisors/:id/reviews`: the reviews tab, each naming the service
 *   and the package it was for.
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

/**
 * The average, or null before anyone has scored. The DTO types it a number,
 * but with no reviews the route answers `average: null`.
 */
function averageOf(summary: ApiRatingSummary): number | null {
  const average: number | null = summary.average;
  return summary.total > 0 ? average : null;
}

/** The score the reviews tab opens on. */
function ratingOf(summary: ApiRatingSummary | undefined): RatingModel | null {
  if (!summary) return null;
  return { average: averageOf(summary) ?? 0, total: summary.total };
}

/**
 * The four figures in the stats box, each real or absent: the lowest price
 * (held as pending while the services load), the counts, and the rating.
 */
function profileFigures({
  t,
  formatBaht,
  advisor,
  services,
  own,
  summary,
}: {
  readonly t: ReturnType<typeof useTranslations<"advisorProfile">>;
  readonly formatBaht: (satang: number) => string;
  readonly advisor: ApiPublicAdvisor;
  readonly services: Resource<Paginated<ApiPublicService>>;
  readonly own: readonly ApiPublicService[];
  readonly summary: Resource<ApiRatingSummary>;
}): ProfileFigure[] {
  const figures: ProfileFigure[] = [];
  const prices = own.map((service) => service.priceSatang);
  if (services.loading) {
    figures.push({ key: "from", label: t("statFrom"), value: null });
  } else if (prices.length > 0) {
    figures.push({ key: "from", label: t("statFrom"), value: formatBaht(Math.min(...prices)) });
  }
  figures.push(
    { key: "services", label: t("statServices"), value: String(advisor.publishedServiceCount) },
    { key: "skills", label: t("statSkills"), value: String(advisor.skills.length) },
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
  return figures;
}

/** The review count on the handle row: the number, pending (undefined), or unknown (null). */
function reviewCountOf(summary: Resource<ApiRatingSummary>): number | null | undefined {
  if (summary.data) return summary.data.total;
  return summary.loading ? undefined : null;
}

/** The first service with a photograph, as the featured cover; null when none has one. */
function featuredOf(
  own: readonly ApiPublicService[],
  coverOf: (service: ApiPublicService) => Photo | null,
): ProfileModel["featured"] {
  const service = own.find((candidate) => coverOf(candidate) !== null);
  const cover = service ? coverOf(service) : null;
  if (!service || !cover) return null;
  return { cover, title: service.name, href: liveServiceHref(service.id) };
}

/**
 * The services tab: pending, failed, the grid, or the empty sketch. The
 * cards are the catalogue's (`useLiveCatalogue`), the very ones search
 * lists, in the order the advisor's own list gives them.
 */
function ServicesTab({
  services,
  catalogue,
  own,
  name,
  photos,
}: {
  readonly services: Resource<Paginated<ApiPublicService>>;
  readonly catalogue: ReturnType<typeof useLiveCatalogue>;
  readonly own: readonly ApiPublicService[];
  readonly name: string;
  readonly photos: readonly Photo[];
}) {
  const t = useTranslations("advisorProfile");
  const items = useMemo(() => {
    const byId = new Map(catalogue.items.map((item) => [item.id, item] as const));
    return own.map((service) => byId.get(service.id)).filter((item): item is LiveService => item !== undefined);
  }, [catalogue.items, own]);

  if (services.loading || (catalogue.loading && own.length > 0)) return <ServiceGridPending />;
  const error = services.error ?? (own.length > 0 ? catalogue.error : null);
  if (error) {
    return (
      <PanelError
        error={error}
        onRetry={() => {
          services.reload();
          catalogue.reload();
        }}
        title={t("servicesError")}
      />
    );
  }
  if (items.length > 0) return <ServiceGrid items={items} />;
  return (
    <EmptyNotice
      body={t("noServicesBody", { name })}
      figure={<ServicesSketch photos={photos} />}
      title={t("noServicesTitle")}
    />
  );
}

/** The reviews tab: pending, failed, the list under its rating, or the empty collage. */
function ReviewsTab({
  reviews,
  reviewCards,
  rating,
  name,
  photos,
}: {
  readonly reviews: Resource<Paginated<ApiReview>>;
  readonly reviewCards: readonly ReviewModel[];
  readonly rating: RatingModel | null;
  readonly name: string;
  readonly photos: readonly Photo[];
}) {
  const t = useTranslations("advisorProfile");
  if (reviews.loading) return <ReviewListPending />;
  if (reviews.error) {
    return <PanelError error={reviews.error} onRetry={reviews.reload} title={t("reviewsError")} />;
  }
  if (reviewCards.length > 0) return <ReviewList rating={rating} reviews={reviewCards} />;
  return (
    <EmptyNotice
      body={t("noReviewsBody", { name })}
      figure={<PhotoCollage photos={photos} />}
      title={t("noReviewsTitle")}
    />
  );
}

export function LiveAdvisorProfileScreen({
  advisorId,
  tab: initialTab = "services",
}: {
  readonly advisorId: string;
  readonly tab?: ProfileTab;
}) {
  const t = useTranslations("advisorProfile");
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
  const figures = profileFigures({
    t,
    formatBaht: (satang) => format.number(baht(satang), "baht"),
    advisor: live,
    services,
    own,
    summary,
  });

  const model: ProfileModel = {
    name: live.displayName,
    portrait: live.image ?? null,
    initials: initialsOf(live.displayName),
    verified: true,
    reviewCount: reviewCountOf(summary),
    role: role || null,
    place,
    figures,
    featured:
      services.loading || (catalogue.loading && own.length > 0) ? undefined : featuredOf(own, coverOf),
    skills: live.skills,
    chatHref: chatWithHref(advisorId),
    servicesHref: hrefFor("services"),
    reviewsHref: hrefFor("reviews"),
  };

  const reviewCards: ReviewModel[] = (reviews.data?.items ?? []).map((review) => ({
    key: review.appointmentId,
    name: review.reviewerDisplayName,
    initials: initialsOf(review.reviewerDisplayName),
    avatar: null,
    date: format.dateTime(new Date(review.createdAt), { dateStyle: "medium" }),
    stars: review.stars,
    service: review.serviceName,
    pkg: review.packageName ?? null,
    // An API older than the field leaves it out; the line then names the service without the way to it.
    serviceHref: review.serviceId ? liveServiceHref(review.serviceId) : undefined,
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
          <ServicesTab catalogue={catalogue} name={live.displayName} own={own} photos={photos} services={services} />
        ) : null}

        {tab === "reviews" ? (
          <ReviewsTab
            name={live.displayName}
            photos={photos}
            rating={ratingOf(summary.data)}
            reviewCards={reviewCards}
            reviews={reviews}
          />
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
