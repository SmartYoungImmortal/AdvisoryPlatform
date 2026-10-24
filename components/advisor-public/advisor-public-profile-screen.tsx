"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { notFound } from "next/navigation";

import { LiveAdvisorProfileScreen } from "@/components/advisor-public/advisor-public-live";
import { initialsOf } from "@/components/advisor-public/headline";
import {
  AboutView,
  EmptyNotice,
  PendingProfile,
  PhotoCollage,
  ProfileHeader,
  ProfilePage,
  ProfileTabs,
  ReviewList,
  ServiceGrid,
  TabPanel,
  useProfileTab,
  type ProfileFigure,
  type ProfileModel,
  type RatingModel,
  type ReviewModel,
  type ServiceCardModel,
} from "@/components/advisor-public/profile-parts";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import {
  publicProfile,
  type ProfileTab,
  type PublicProfile,
} from "@/lib/catalogue/profiles";
import { services } from "@/lib/catalogue/services";

/** The listing's own covers, then the rest of the fixture catalogue's, each once. */
function collagePhotos(profile: PublicProfile) {
  const seen = new Set<string>();
  return [...profile.listing.map((entry) => entry.cover), ...services.map((service) => service.cover)]
    .filter((cover) => {
      if (seen.has(cover.src)) return false;
      seen.add(cover.src);
      return true;
    })
    .slice(0, 6);
}

/** The tab order: the work first, then what people said, then the person. */
const TABS: readonly ProfileTab[] = ["services", "reviews", "about"];

const STAR_VALUES = [5, 4, 3, 2, 1] as const;

function profileHref(advisorId: string, tab: ProfileTab): string {
  const base = `/advisors/${advisorId}`;
  return tab === "services" ? base : `${base}/${tab}`;
}

const noSubscription = () => () => {};

/**
 * False on the server pass and the hydrating render, true after. Every
 * advisor route is prerendered from its slug, and the live profile rides on
 * the `sarah-jenskins` slug with `?advisorId=`, which no prerender can see:
 * drawing the fixture until then flashed Sarah's page before the real
 * advisor's. Until the query can be read, the page draws its own shape.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** The fixture profile (`lib/catalogue/profiles`), drawn as the public profile page. */
function FixtureProfile({
  profile,
  initialTab,
}: {
  readonly profile: PublicProfile;
  readonly initialTab: ProfileTab;
}) {
  const t = useTranslations("advisorProfile");
  const format = useFormatter();
  const { advisor } = profile;

  const hrefFor = useCallback((tab: ProfileTab) => profileHref(advisor.id, tab), [advisor.id]);
  const { tab, select, jumpTo } = useProfileTab(initialTab, hrefFor);

  const prices = profile.listing.map((entry) => entry.price);
  const figures: ProfileFigure[] = [
    ...(prices.length > 0
      ? [{ key: "from", label: t("statFrom"), value: format.number(Math.min(...prices), "baht") }]
      : []),
    { key: "services", label: t("statServices"), value: String(profile.listing.length) },
    { key: "skills", label: t("statSkills"), value: String(profile.skills.length) },
    { key: "rating", label: t("statRating"), value: advisor.rating, star: true },
  ];

  const lead = profile.listing[0];
  const model: ProfileModel = {
    name: advisor.name,
    portrait: advisor.avatar,
    initials: initialsOf(advisor.name),
    verified: advisor.verified,
    reviewCount: advisor.writtenReviews,
    role: t("credentialField", { credential: advisor.credential, field: advisor.field }),
    place: null,
    figures,
    featured: lead
      ? {
          cover: lead.cover,
          title: lead.title,
          href: lead.serviceId ? `/service/${lead.serviceId}` : undefined,
        }
      : null,
    skills: profile.skills,
    chatHref: `/chat/${advisor.id}`,
    servicesHref: hrefFor("services"),
    reviewsHref: hrefFor("reviews"),
  };

  const cards: ServiceCardModel[] = profile.listing.map((entry) => ({
    key: entry.title,
    title: entry.title,
    cover: entry.cover,
    length: t("slotLength"),
    price: format.number(entry.price, "baht"),
    rating: Number.parseFloat(entry.rating) || null,
    ratingCount: entry.ratingCount,
    // Only a catalogue service of this same advisor has a page to open.
    href: entry.serviceId ? `/service/${entry.serviceId}` : undefined,
  }));

  const reviews: ReviewModel[] = profile.reviews.map((review) => ({
    key: review.id,
    name: review.name,
    initials: initialsOf(review.name),
    avatar: review.avatar,
    date: review.date,
    stars: Number.parseFloat(review.stars),
    service: review.service,
    comment: review.body,
    reply: null,
  }));

  const rating: RatingModel = {
    average: Number.parseFloat(advisor.rating) || 0,
    total: advisor.writtenReviews,
    bars: STAR_VALUES.map((stars, index) => ({
      stars,
      count: Math.round((advisor.ratingBreakdown[index] / 100) * advisor.writtenReviews),
      share: advisor.ratingBreakdown[index],
    })),
  };

  return (
    <ProfilePage
      actions={{
        chatHref: `/chat/${advisor.id}`,
        servicesHref: hrefFor("services"),
        onBook: jumpTo("services"),
      }}
      back="/search"
    >
      <ProfileHeader model={model} onBook={jumpTo("services")} onReviews={jumpTo("reviews")} />
      <ProfileTabs
        current={tab}
        items={TABS.map((key) => ({ key, label: t(`tab.${key}`), href: hrefFor(key) }))}
        label={t("tabsLabel")}
        onSelect={select}
      />
      <TabPanel>
        {tab === "services" ? <ServiceGrid cards={cards} /> : null}
        {tab === "reviews" ? (
          // Two of the three fixture advisors have no written excerpts, so this
          // tab really does render empty on `/advisors/thanakrit-w/reviews`.
          reviews.length > 0 ? (
            <ReviewList rating={rating} reviews={reviews} />
          ) : (
            <EmptyNotice
              body={t("noReviewsBody", { name: advisor.name })}
              figure={<PhotoCollage photos={collagePhotos(profile)} />}
              title={t("noReviewsTitle")}
            />
          )
        ) : null}
        {tab === "about" ? (
          <AboutView bio={profile.about} skills={profile.skills} verified={advisor.verified} />
        ) : null}
      </TabPanel>
    </ProfilePage>
  );
}

/**
 * The advisor's public profile: the three tabs are
 * sibling routes (`/advisors/<id>`, `/about`, `/reviews`) that switch in
 * place once the page is open.
 *
 * `/advisors/<id>/services` used to open an all-services sheet over the
 * profile; the services tab now lists every service, so that route opens
 * the services tab.
 */
export function AdvisorPublicProfileScreen({
  advisorId,
  tab = "services",
  sheet = false,
}: {
  readonly advisorId: string;
  readonly tab?: ProfileTab;
  readonly sheet?: boolean;
}) {
  const t = useTranslations("advisorProfile");
  const hydrated = useHydrated();
  // `?advisorId=<uuid>` on a prerendered slug is how the API-backed profile is
  // reached under `output: "export"`; see `components/bookings/booking-flow.ts`.
  const live = asUuid(useQueryValue("advisorId")) ?? asUuid(advisorId);
  const initialTab = sheet ? "services" : tab;

  if (!hydrated) {
    return (
      <PendingProfile
        back="/search"
        items={TABS.map((key) => ({ key, label: t(`tab.${key}`), href: profileHref(advisorId, key) }))}
        label={t("tabsLabel")}
        onSelect={() => {}}
        reviewsHref={profileHref(advisorId, "reviews")}
        servicesHref={profileHref(advisorId, "services")}
        tab={initialTab}
      />
    );
  }

  if (live) return <LiveAdvisorProfileScreen advisorId={live} tab={initialTab} />;

  const profile = publicProfile(advisorId);
  if (!profile) notFound();

  return <FixtureProfile initialTab={initialTab} profile={profile} />;
}
