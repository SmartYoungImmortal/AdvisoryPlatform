"use client";

import Link from "next/link";
import { MessageSquare, ShieldCheck, Star, UserRound } from "lucide-react";
import { useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { Paginated } from "@/lib/api/client";
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
import {
  baht,
  liveServiceHref,
  LIVE_ADVISOR_PATH,
} from "@/components/bookings/booking-flow";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ApiErrorCard, DistributionRow } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { PAGE, PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/catalogue/profiles";

/**
 * `/advisors/…` when the uuid is known — the same three tabs, read from the API.
 *
 * Reached as `?advisorId=<uuid>` on a prerendered slug, the way
 * `components/bookings/booking-flow.ts` explains. Without it the slug route
 * renders its fixture profile and none of this mounts.
 *
 * ## What the public advisor really carries
 *
 * `PublicAdvisorResponseDto` is `displayName`, `headline`, `bio`, `avatarKey`,
 * `skills` and `publishedServiceCount`. Compared with the fixture profile that
 * means four things the frame draws are absent, and none of them is faked:
 *
 * - **The portrait.** `avatarKey` is a storage key and the only presigning route
 *   is `GET /users/me/avatar` — there is no public one for somebody else. Every
 *   seeded advisor has it null anyway. A glyph in a tinted circle holds the
 *   80px lead column rather than a grey disc standing in for a face.
 * - **The level badge.** `LevelBadge` reads `lib/catalogue/profiles`; nothing in
 *   the API grades an advisor.
 * - **"ยืนยันตัวตนแล้ว".** There is no `verified` field. Discoverability implies an
 *   active, unbanned account with a published service, which is not the identity
 *   check the badge claims.
 * - **Consultations delivered.** No field, so the stat row is two wide.
 *
 * The skills *are* real, and they are the one thing the verified-skills card was
 * right about: `advisor_skills` only holds skills an admin has cleared.
 *
 * ## Why the reviews tab is normally empty
 *
 * `service_appointments` has no rows, so no consultation has been completed and
 * no review can exist. `GET /advisors/:id/reviews/summary` answers
 * `average: null, total: 0` and the histogram all zeroes. That is an empty list,
 * not a failed one, and it gets the empty state the fixture tab already had.
 */

/** Which tab route this profile's links point at, uuid and all. */
function liveTabHref(advisorId: string, tab: ProfileTab): string {
  const base = tab === "services" ? LIVE_ADVISOR_PATH : `${LIVE_ADVISOR_PATH}/${tab}`;
  return `${base}?advisorId=${advisorId}`;
}

/** The 80px lead column, with no photograph to put in it. */
function AdvisorMark({ size }: { readonly size: "lg" | "sm" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent-surface",
        size === "lg" ? "size-20" : "size-9",
      )}
    >
      <UserRound
        aria-hidden
        className={cn("text-primary", size === "lg" ? "size-9" : "size-4.5")}
      />
    </span>
  );
}

function Header({
  advisor,
  summary,
}: {
  readonly advisor: ApiPublicAdvisor;
  readonly summary: ApiRatingSummary | undefined;
}) {
  const t = useTranslations("advisorProfile");

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-center gap-3 overflow-clip px-6 lg:flex-row lg:items-center lg:gap-5 lg:border-b lg:border-border lg:py-6",
        PAGE,
      )}
    >
      <AdvisorMark size="lg" />
      {/* `contents` keeps the phone's stack exactly as it was; from `lg` these
          become the middle column of the row. */}
      <div className="contents lg:flex lg:min-w-px lg:flex-1 lg:flex-col lg:items-start lg:gap-1.5">
        <h1 className="font-latin text-2xl font-semibold text-foreground lg:text-heading">
          {advisor.displayName}
        </h1>
        <p className="text-center text-sm font-normal text-muted-foreground lg:text-start">
          <ThaiText>{advisor.headline}</ThaiText>
        </p>
      </div>

      {/* Figma "Stats" — the frame draws three; the API keeps two. */}
      <div
        className={cn(
          surfaceClass(),
          "flex w-full shrink-0 items-start gap-2 overflow-clip px-4 py-3",
          "lg:w-auto lg:gap-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
        )}
      >
        {[
          {
            value: String(advisor.publishedServiceCount),
            label: t("tab.services"),
          },
          { value: String(summary?.total ?? 0), label: t("statReviews") },
        ].map((stat, index) => (
          <div className="contents" key={stat.label}>
            {index > 0 ? (
              <div className="w-px shrink-0 self-stretch bg-border lg:hidden" />
            ) : null}
            <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 text-center">
              <p className="w-full font-latin text-lg font-semibold tabular-nums text-foreground lg:text-xl">
                {stat.value}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  title,
  trailing,
}: {
  readonly title: string;
  readonly trailing: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-lg">
        {title}
      </h2>
      <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
        {trailing}
      </p>
    </div>
  );
}

/**
 * Figma "Service Card" without its 88px cover, because the API has none.
 *
 * The rating line goes with it: a per-service score needs an aggregate the
 * service response does not carry, and the advisor's own average would be a
 * different number wearing this service's name.
 */
function ListingCard({ service }: { readonly service: ApiPublicService }) {
  const s = useTranslations("search");
  const format = useFormatter();

  return (
    <Link
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-full shrink-0 flex-col items-start gap-1 overflow-clip p-3",
      )}
      href={liveServiceHref(service.id)}
    >
      <p className="w-full text-base font-semibold text-foreground">
        <ThaiText>{service.name}</ThaiText>
      </p>
      <p className="w-full text-xs font-normal text-muted-foreground">
        {s("durationMinutes", { count: service.durationMinutes })}
      </p>
      <p className="w-full font-latin text-base font-semibold tabular-nums text-foreground">
        {format.number(baht(service.priceSatang), "baht")}
      </p>
    </Link>
  );
}

function ServicesTab({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("advisorProfile");
  const s = useTranslations("search");

  const fetcher = useCallback(
    (signal: AbortSignal) => listServices({ advisorId, limit: 50 }, signal),
    [advisorId],
  );
  const services = useResource<Paginated<ApiPublicService>>(
    `services?advisorId=${advisorId}&limit=50`,
    fetcher,
  );
  const items = services.data?.items ?? [];

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-card">
      <div className="w-full lg:col-span-2">
        <SectionHead
          title={t("servicesTitle")}
          trailing={t("serviceCount", { count: services.data?.total ?? 0 })}
        />
      </div>
      {services.loading ? (
        [0, 1].map((index) => (
          <div
            className="h-24 w-full rounded-card bg-muted"
            key={index}
          />
        ))
      ) : services.error ? (
        <div className="w-full lg:col-span-2">
          <ApiErrorCard
            error={services.error}
            onRetry={services.reload}
            title={t("servicesTitle")}
          />
        </div>
      ) : items.length > 0 ? (
        items.map((service) => <ListingCard key={service.id} service={service} />)
      ) : (
        <p className="w-full text-sm font-normal text-muted-foreground lg:col-span-2">
          {s("noResults")}
        </p>
      )}
    </section>
  );
}

function AboutTab({ advisor }: { readonly advisor: ApiPublicAdvisor }) {
  const t = useTranslations("advisorProfile");

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-6 overflow-clip px-6 lg:gap-3 lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-card">
      <h2 className="hidden w-full text-base font-semibold text-foreground lg:block lg:text-lg">
        {t("tab.about")}
      </h2>
      {/* `bio` is nullable on the DTO, so the tab says the headline when that is
          all there is rather than opening on an empty column. */}
      <p className="w-full text-sm font-normal text-foreground lg:text-base">
        <ThaiText>{advisor.bio ?? advisor.headline}</ThaiText>
      </p>
      {/* Figma's desktop frame moves the skills into the column beside the page,
          so here they stop at the breakpoint. */}
      {advisor.skills.length > 0 ? (
        <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:hidden">
          <h2 className="w-full text-base font-semibold text-foreground">
            {t("verifiedSkills")}
          </h2>
          {advisor.skills.map((skill) => (
            <Surface
              className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3"
              key={skill}
              tier="flat"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10">
                <ShieldCheck className="size-4.5 text-success" />
              </span>
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                <p className="w-full text-sm font-semibold text-foreground">
                  {skill}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {t("verifiedByTeam")}
                </p>
              </div>
              <StatusPill tone="success">{t("verified")}</StatusPill>
            </Surface>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewsTab({
  advisorId,
  summary,
}: {
  readonly advisorId: string;
  readonly summary: ApiRatingSummary | undefined;
}) {
  const t = useTranslations("advisorProfile");
  const r = useTranslations("reviews");
  const format = useFormatter();

  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: 20 }, signal),
    [advisorId],
  );
  const reviews = useResource<Paginated<ApiReview>>(
    `advisors/${advisorId}/reviews?limit=20`,
    fetcher,
  );

  const items = reviews.data?.items ?? [];
  const total = summary?.total ?? 0;
  const average = summary?.average ?? null;

  return (
    <section className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
      <SectionHead
        title={t("reviewsTitle")}
        trailing={t("reviewCount", { count: total })}
      />

      {/* The score summary only exists once something has been scored. With the
          seed at zero the API answers `average: null`, and a "0.0" with five empty
          bars would look like a bad advisor rather than a new one. */}
      {average !== null && total > 0 ? (
        <Surface className="flex w-full shrink-0 items-center gap-4 overflow-clip p-4">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <p className="font-latin text-heading font-semibold tabular-nums text-foreground">
              {average.toFixed(1)}
            </p>
            <div className="flex items-start gap-0.5">
              {[0, 1, 2, 3, 4].map((index) => (
                <Star className="size-2.75 fill-primary text-primary" key={index} />
              ))}
            </div>
          </div>
          <div className="flex min-w-px flex-1 flex-col gap-1">
            {(summary?.distribution ?? []).map((bar) => (
              <DistributionRow
                fill={(bar.count / total) * 100}
                key={bar.stars}
                label={String(bar.stars)}
              />
            ))}
          </div>
        </Surface>
      ) : null}

      {items.length > 0 ? (
        <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
          {items.map((review) => (
            <article
              className={cn(
                surfaceClass(),
                "flex w-full shrink-0 flex-col items-start gap-2 overflow-clip p-3",
              )}
              key={review.appointmentId}
            >
              <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
                <AdvisorMark size="sm" />
                <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
                  <p className="w-full text-sm font-semibold text-foreground">
                    {review.reviewerDisplayName}
                  </p>
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {format.dateTime(new Date(review.createdAt), "short")}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 font-latin text-sm font-semibold tabular-nums text-foreground">
                  <Star className="size-3 fill-primary text-primary" />
                  {review.stars}
                </span>
              </div>
              <StatusPill>{review.serviceName}</StatusPill>
              {review.comment ? (
                <p className="w-full text-sm font-normal text-foreground">
                  <ThaiText>{review.comment}</ThaiText>
                </p>
              ) : null}
              {review.advisorReply ? (
                <Surface className="w-full p-3" tier="well">
                  <p className="w-full text-xs font-normal text-muted-foreground">
                    {r("yourReply")}
                  </p>
                  <p className="w-full pt-1 text-sm font-normal text-foreground">
                    <ThaiText>{review.advisorReply}</ThaiText>
                  </p>
                </Surface>
              ) : null}
            </article>
          ))}
        </div>
      ) : reviews.loading ? (
        <div className="h-24 w-full rounded-card bg-muted" />
      ) : (
        <Surface className="w-full" tier="well">
          <EmptyState
            body={r("emptyBody")}
            icon={MessageSquare}
            title={r("emptyTitle")}
          />
        </Surface>
      )}
    </section>
  );
}

export function LiveAdvisorProfileScreen({
  advisorId,
  tab = "services",
}: {
  readonly advisorId: string;
  readonly tab?: ProfileTab;
}) {
  const t = useTranslations("advisorProfile");
  const c = useTranslations("common");

  const advisorFetcher = useCallback(
    (signal: AbortSignal) => getAdvisor(advisorId, signal),
    [advisorId],
  );
  const summaryFetcher = useCallback(
    (signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal),
    [advisorId],
  );
  const advisor = useResource<ApiPublicAdvisor>(
    `advisors/${advisorId}`,
    advisorFetcher,
  );
  const summary = useResource<ApiRatingSummary>(
    `advisors/${advisorId}/reviews/summary`,
    summaryFetcher,
  );

  const tabs: readonly ProfileTab[] = ["services", "about", "reviews"];

  if (advisor.loading) {
    return (
      <MobileScreen className="pb-0" wide>
        <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />
        <ScreenBody>
          <div className={cn("flex w-full flex-col gap-4 px-6 pt-4", PAGE)}>
            <div className="size-20 rounded-full bg-muted" />
            <div className="h-7 w-2/5 rounded-md bg-muted" />
            <div className="h-20 w-full rounded-card bg-muted" />
            <div className="h-40 w-full rounded-card bg-muted" />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  if (advisor.error || !advisor.data) {
    return (
      <MobileScreen className="pb-0" wide>
        <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />
        <ScreenBody>
          <div className={cn("w-full px-6 pt-4", PAGE)}>
            {/* A 404 here is the API saying this advisor is not discoverable —
                suspended, or with nothing published — which is information and
                not a broken page. */}
            <ApiErrorCard
              error={advisor.error ?? new Error(t("servicesTitle"))}
              onRetry={advisor.reload}
              title={t("reviewsTitle")}
            />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  const live = advisor.data;

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenTopBar className="lg:hidden" href="/search" label={c("back")} />

      <ScreenBody className="gap-6 pb-6 lg:gap-0 lg:pb-0">
        <div className="hidden w-full lg:block">
          <TopBar unreadNotifications />
        </div>

        <Header advisor={live} summary={summary.data} />
        <SegmentedTabs
          className="pt-1 pb-2 lg:hidden"
          current={tab}
          items={tabs.map((key) => ({
            key,
            label: t(`tab.${key}`),
            href: liveTabHref(advisorId, key),
          }))}
          label={live.displayName}
        />

        <div
          className={cn(
            "w-full lg:pt-6 lg:pb-14",
            PAGE_INSET_BLOCKS,
            SPLIT_WITH_ASIDE,
          )}
        >
          {/* Each tab keeps its route on the phone and simply stacks here. */}
          <div className="flex w-full flex-col gap-6 lg:px-6">
            <div className={cn("w-full", tab !== "services" && "hidden lg:block")}>
              <ServicesTab advisorId={advisorId} />
            </div>
            <div className={cn("w-full", tab !== "about" && "hidden lg:block")}>
              <AboutTab advisor={live} />
            </div>
            <div className={cn("w-full", tab !== "reviews" && "hidden lg:block")}>
              <ReviewsTab advisorId={advisorId} summary={summary.data} />
            </div>
          </div>

          <aside className="hidden lg:sticky lg:top-24 lg:me-6 lg:flex lg:flex-col lg:gap-4">
            <Surface className="flex flex-col gap-3 p-4 shadow-panel">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold text-foreground">
                  {t("pickServiceTitle")}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {t("serviceCount", { count: live.publishedServiceCount })}
                </p>
              </div>
              {/* The all-services sheet reads the fixture catalogue, so the live
                  profile sends the reader to the services tab it does render
                  rather than to a sheet that would be somebody else's list. */}
              <PrimaryButton
                block
                href={liveTabHref(advisorId, "services")}
                size="lg"
              >
                {t("chooseService")}
              </PrimaryButton>
              <NeutralButton block href={`/chat/${advisorId}`}>
                {t("chat")}
              </NeutralButton>
            </Surface>

            {live.skills.length > 0 ? (
              <Surface className="flex flex-col gap-3 p-4">
                <p className="text-base font-semibold text-foreground">
                  {t("verifiedSkills")}
                </p>
                {live.skills.map((skill) => (
                  <Surface
                    className="flex items-center gap-2.5 p-3"
                    key={skill}
                    tier="well"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <ShieldCheck aria-hidden className="size-4 text-success" />
                    </span>
                    <span className="flex min-w-px flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {skill}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("verifiedByTeam")}
                      </span>
                    </span>
                  </Surface>
                ))}
              </Surface>
            ) : null}
          </aside>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 shadow-panel lg:hidden">
        <Button
          aria-label={t("chat")}
          className="size-9 shrink-0"
          nativeButton={false}
          render={<Link href={`/chat/${advisorId}`} />}
          size="icon"
          variant="outline"
        >
          <MessageSquare className="size-4" />
        </Button>
        <PrimaryButton
          block
          className="min-w-px flex-1"
          href={liveTabHref(advisorId, "services")}
        >
          {t("chooseService")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
