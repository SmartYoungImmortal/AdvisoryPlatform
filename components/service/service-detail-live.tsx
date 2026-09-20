"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MessageSquare, Star } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { Paginated } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import {
  bookSlot,
  getAdvisor,
  getAdvisorRatingSummary,
  getService,
  listAdvisorReviews,
  listServiceCategories,
  listServiceSlots,
  listServices,
} from "@/lib/api/resources";
import type {
  ApiNamedRecord,
  ApiPublicAdvisor,
  ApiPublicService,
  ApiRatingSummary,
  ApiReview,
  ApiSlot,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import {
  addDays,
  baht,
  isoDay,
  liveAdvisorHref,
  liveServiceHref,
} from "@/components/bookings/booking-flow";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { FaqSection } from "@/components/marketing/faq-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import {
  ApiErrorCard,
  DistributionRow,
  SECTION_HEAD,
  StepList,
} from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { PAGE, PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * `/service/…` when the uuid is known — the same page, read from the API.
 *
 * ## How the uuid gets here
 *
 * `?serviceId=<uuid>` on any of the prerendered slug routes, or a uuid in the
 * path where the route can serve one. `output: "export"` emits only the slugs
 * `generateStaticParams` lists, so the query string is the reachable form — see
 * `components/bookings/booking-flow.ts`. When it is absent the slug route renders
 * its fixtures exactly as before and none of this mounts.
 *
 * ## What the API has, and what this page therefore does not draw
 *
 * `PublicServiceResponseDto` carries name, description, `priceSatang`,
 * `durationMinutes`, `screeningRequired` and the trial pair. It has **no cover
 * image**, so there is no gallery here: `service_images` holds SeaweedFS keys the
 * API presigns and the frontend's photographs live in R2, and a 16:9 grey
 * rectangle where a photograph belongs is worse than no rectangle.
 *
 * It has **no rating and no booked count** either. The score comes from
 * `GET /advisors/:id/reviews/summary`, which is the advisor's and not the
 * service's, and it prints only once `total > 0` — with the seed at zero reviews
 * the API answers `average: null`, and "0.0 ★" is a claim about quality that no
 * row supports.
 *
 * The three-tier package card is gone. `packagesFor` derived brief/standard/deep
 * from one fixture price; the API sells one duration at one price, and inventing
 * two more tiers around it would be inventing prices.
 *
 * `verified` is gone from the advisor card: `PublicAdvisorResponseDto` has no such
 * field. Being listed at all already means an active, unbanned account with a
 * profile and a published service — but that is not the identity check the badge
 * claims, so the badge stays off.
 */

/** Seven days is the window the slot rail offers, from today. */
const SLOT_WINDOW_DAYS = 7;

/**
 * The advisor's score, or undefined when nothing has been scored.
 *
 * Three blocks on this page want it, and `useResource` is keyed by request, so
 * three calls to this hook are one fetch and the cache hands the same entry to
 * each. That is also why the summary is not fetched in the screen and threaded
 * down: the advisor's id lives on the service, so the parent's first render has
 * no id and a hook there would fire `advisors/undefined/reviews/summary`.
 *
 * `average` is `null` — not 0 — whenever `total` is 0, which the seed's zero
 * reviews make the normal case. Undefined here means "no score to show", and every
 * caller then renders nothing rather than "0.0 ★".
 */
function useRatingSummary(advisorId: string): ApiRatingSummary | undefined {
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal),
    [advisorId],
  );
  const summary = useResource<ApiRatingSummary>(
    `advisors/${advisorId}/reviews/summary`,
    fetcher,
  );
  const { data } = summary;
  return data && data.average !== null && data.total > 0 ? data : undefined;
}

/** The score beside the price, when there is one. */
function HeaderRating({ advisorId }: { readonly advisorId: string }) {
  const rating = useRatingSummary(advisorId);
  if (!rating?.average) return null;

  return (
    <span className="flex shrink-0 items-center gap-1 overflow-clip">
      <Star className="size-3.5 shrink-0 fill-primary text-primary" />
      <span className="font-latin text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
        {rating.average.toFixed(1)}
      </span>
      <span className="font-latin text-sm font-normal tabular-nums whitespace-nowrap text-muted-foreground">
        ({rating.total})
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------- slots */

/**
 * The bookable times, and the one write this app can honestly make.
 *
 * `GET /services/:id/slots` needs a session and **that is not a bug**:
 * `AvailabilityService.assertCanViewSlots` gates slots on whether *this advisee*
 * has passed the service's screening when `screeningRequired` is true, which it
 * cannot answer for a visitor it does not know. So three outcomes, each shown as
 * itself rather than folded into one "could not load":
 *
 * - **401 "Authentication required"** — signed out. The card prints the API's own
 *   sentence and offers the way in. No retry: pressing it again changes nothing.
 * - **400 "Accepted screening is required before viewing slots"** — signed in,
 *   but this service screens first. The card says so and points at the screening
 *   questions, which is the actual next step and not an error to shrug at.
 * - **200 with an empty array** — the advisor has published no availability in
 *   this window. An empty list, not a failure.
 *
 * Picking a time calls `POST /bookings`, which answers `PENDING_PAYMENT`: the
 * range is held, nothing is charged. A slot somebody else took in the meantime
 * comes back 409, which is what `/checkout/slot-taken` is for.
 */
function SlotsBlock({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const sc = useTranslations("screening");
  const format = useFormatter();
  const router = useRouter();
  const [day, setDay] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Anchored to midnight so the range is stable across a render that crosses a
  // minute boundary, which would otherwise change the resource key and refetch.
  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { from: isoDay(today), to: isoDay(addDays(today, SLOT_WINDOW_DAYS)) };
  }, []);

  const fetcher = useCallback(
    (signal: AbortSignal) => listServiceSlots(serviceId, range, signal),
    [serviceId, range],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `services/${serviceId}/slots?from=${range.from}&to=${range.to}`,
    fetcher,
  );

  // Grouped in the viewer's own zone: the API answers UTC instants, and a 09:00
  // Bangkok slot is 02:00Z, so grouping on the ISO string would file half a day
  // under the day before.
  const byDay = new Map<string, ApiSlot[]>();
  for (const slot of slots.data ?? []) {
    const key = isoDay(new Date(slot.startTime));
    const existing = byDay.get(key);
    if (existing) existing.push(slot);
    else byDay.set(key, [slot]);
  }
  const days = [...byDay.keys()].toSorted();
  const selected = day && byDay.has(day) ? day : (days[0] ?? null);

  const onPick = useCallback(
    (startTime: string) => {
      setBooking(startTime);
      setFailure(null);
      void bookSlot({ serviceId, startTime })
        .then((created) => {
          router.push(`/checkout/card?bookingId=${created.id}`);
        })
        .catch((cause: unknown) => {
          if (cause instanceof ApiError && cause.status === 409) {
            router.push(
              `/checkout/slot-taken?startTime=${encodeURIComponent(startTime)}&serviceId=${serviceId}`,
            );
            return;
          }
          setFailure(cause instanceof Error ? cause.message : String(cause));
        })
        .finally(() => setBooking(null));
    },
    [router, serviceId],
  );

  return (
    // `scroll-mt` so the anchor the booking card points at does not land under
    // the sticky nav bar.
    <div
      className="flex w-full shrink-0 scroll-mt-24 flex-col items-start gap-3"
      id="slots"
    >
      <p className={cn(SECTION_HEAD, "px-6")}>{t("slotsTitle")}</p>

      {slots.loading ? (
        <div className="flex w-full shrink-0 items-start gap-2 overflow-clip px-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              className="h-13 w-24 shrink-0 rounded-card bg-muted"
              key={index}
            />
          ))}
        </div>
      ) : slots.error ? (
        <div className="w-full px-6">
          <ApiErrorCard
            error={slots.error}
            extra={
              // The 400 the screening gate answers with. It is not a failure to
              // retry — it names the step that comes first.
              slots.error instanceof ApiError && slots.error.status === 400 ? (
                <>
                  <StatusPill tone="info">{s("screeningRequired")}</StatusPill>
                  <NeutralButton
                    className="w-auto shrink-0"
                    href="/screening/questions"
                    size="sm"
                  >
                    {sc("answerTitle")}
                  </NeutralButton>
                </>
              ) : undefined
            }
            onRetry={slots.reload}
            title={t("slotsTitle")}
          />
        </div>
      ) : selected === null ? (
        <p className="w-full px-6 text-sm font-normal text-muted-foreground">
          {s("noResults")}
        </p>
      ) : (
        <>
          {/* The day rail. A week of a 30-minute service is well over a hundred
              slots, which is why the chips are two levels rather than the one
              row the phone frame draws: a day, then that day's times. */}
          <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto px-6">
            {days.map((key) => (
              <Button
                aria-pressed={key === selected}
                className={cn(
                  "h-auto shrink-0 flex-col items-start gap-0.5 rounded-card px-3 py-2 shadow-none",
                  key === selected
                    ? "border-primary bg-accent-surface text-primary hover:bg-accent-surface"
                    : "bg-card",
                )}
                key={key}
                onClick={() => setDay(key)}
                variant="outline"
              >
                <span className="text-sm font-semibold whitespace-nowrap">
                  {format.dateTime(new Date(`${key}T00:00:00`), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="font-latin text-xs font-normal tabular-nums">
                  {s("count", { count: byDay.get(key)?.length ?? 0 })}
                </span>
              </Button>
            ))}
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-start gap-2 px-6">
            {(byDay.get(selected) ?? []).map((slot) => (
              <Button
                className="h-auto shrink-0 rounded-card bg-card px-3 py-2 shadow-none"
                disabled={booking !== null}
                key={slot.startTime}
                onClick={() => onPick(slot.startTime)}
                variant="outline"
              >
                <span className="font-latin text-sm font-semibold tabular-nums whitespace-nowrap">
                  {format.dateTime(new Date(slot.startTime), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Button>
            ))}
          </div>

          {failure ? (
            <p className="w-full px-6 text-sm font-normal text-destructive">
              {failure}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- advisor */

/**
 * Figma "Advisor Card", from `GET /advisors/:advisorId`.
 *
 * Mounted only once the service has resolved, because the advisor's id is on the
 * service — which is also why this is its own component rather than a second
 * `useResource` in the parent with a key that would be `advisors/undefined` on
 * the first pass.
 *
 * A 404 here is meaningful and not a bug: `GET /advisors/:id` lists only a
 * discoverable advisor, so a suspended one 404s while their published service
 * still answers. The card then says nothing about them rather than guessing.
 */
function AdvisorBlock({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("service");
  const a = useTranslations("advisorProfile");
  const summary = useRatingSummary(advisorId);

  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisor(advisorId, signal),
    [advisorId],
  );
  const advisor = useResource<ApiPublicAdvisor>(
    `advisors/${advisorId}`,
    fetcher,
  );

  if (advisor.loading) {
    return (
      <div className="flex w-full shrink-0 flex-col items-start px-6">
        <div
          className={cn(
            surfaceClass(),
            "flex w-full shrink-0 flex-col items-start gap-3 p-4",
          )}
        >
          <div className="h-5 w-2/5 rounded-md bg-muted" />
          <div className="h-4 w-4/5 rounded-md bg-muted" />
          <div className="h-4 w-3/5 rounded-md bg-muted" />
        </div>
      </div>
    );
  }
  if (advisor.error || !advisor.data) return null;

  const { data } = advisor;

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
      <Surface className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-4">
        <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
          <p className="w-full truncate text-base font-semibold text-foreground">
            {data.displayName}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            <ThaiText>{data.headline}</ThaiText>
          </p>
        </div>

        {data.bio ? (
          <p className="w-full text-sm font-normal text-muted-foreground">
            <ThaiText>{data.bio}</ThaiText>
          </p>
        ) : null}

        {/* `publishedServiceCount` and the review total are the only two counts
            the API keeps about an advisor. The third stat the frame draws —
            consultations delivered — has no field, so the row is two wide. */}
        <Surface
          className="flex w-full shrink-0 items-start gap-2 overflow-clip p-3"
          tier="well"
        >
          <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 text-center">
            <p className="w-full font-latin text-base font-semibold tabular-nums text-foreground">
              {data.publishedServiceCount}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {a("tab.services")}
            </p>
          </div>
          <div className="flex min-w-px flex-1 flex-col items-center gap-0.5 text-center">
            <p className="w-full font-latin text-base font-semibold tabular-nums text-foreground">
              {summary?.total ?? 0}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {t("statReviews")}
            </p>
          </div>
        </Surface>

        {data.skills.length > 0 ? (
          <ul className="flex w-full shrink-0 flex-col items-start gap-2">
            {data.skills.map((skill) => (
              <li className="flex w-full shrink-0 items-start gap-2" key={skill}>
                <BadgeCheck
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <span className="min-w-px flex-1 text-sm font-normal text-foreground">
                  {skill}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          className="h-auto p-0 text-sm font-medium whitespace-nowrap"
          nativeButton={false}
          render={<Link href={liveAdvisorHref(advisorId)} />}
          variant="link"
        >
          {t("viewProfile")}
        </Button>
      </Surface>
    </div>
  );
}

/* ----------------------------------------------------------------- reviews */

/**
 * Figma "Reviews", from `GET /advisors/:advisorId/reviews`.
 *
 * The reviews are the advisor's, not this service's — there is no per-service
 * review route — so each card names the service it was left about. `reviewer`
 * portraits are storage keys with no public presign, so the cards carry names and
 * no faces.
 *
 * `service_appointments` is seeded empty, so every advisor legitimately has zero
 * reviews and this block renders nothing at all rather than an empty shell.
 */
function ReviewsBlock({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("service");
  const format = useFormatter();
  const summary = useRatingSummary(advisorId);

  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: 6 }, signal),
    [advisorId],
  );
  const reviews = useResource<Paginated<ApiReview>>(
    `advisors/${advisorId}/reviews?limit=6`,
    fetcher,
  );

  const items = reviews.data?.items ?? [];
  if (items.length === 0) return null;

  const total = summary?.total ?? 0;
  const bars = summary?.distribution ?? [];

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
      <div className="flex w-full shrink-0 items-center overflow-clip">
        <p className={cn(SECTION_HEAD, "min-w-px flex-1")}>{t("reviewsTitle")}</p>
        <p className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
          {t("reviewCount", { count: total })}
        </p>
      </div>

      {summary?.average && total > 0 ? (
        <Surface className="flex w-full shrink-0 items-center gap-4 overflow-clip p-4">
          <div className="flex shrink-0 flex-col items-center gap-1 overflow-clip">
            <p className="font-latin text-heading font-semibold tabular-nums whitespace-nowrap text-foreground">
              {summary.average.toFixed(1)}
            </p>
            <div className="flex shrink-0 items-start gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  className="size-2.75 shrink-0 fill-primary text-primary"
                  key={i}
                />
              ))}
            </div>
            <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
              {t("reviewCount", { count: total })}
            </p>
          </div>
          <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
            {bars.map((bar) => (
              <DistributionRow
                fill={total === 0 ? 0 : (bar.count / total) * 100}
                key={bar.stars}
                label={String(bar.stars)}
              />
            ))}
          </div>
        </Surface>
      ) : null}

      <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
        {items.map((review) => (
          <Surface
            className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip p-3"
            key={review.appointmentId}
          >
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
                <p className="w-full text-sm font-semibold text-foreground">
                  {review.reviewerDisplayName}
                </p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {format.dateTime(new Date(review.createdAt), "short")}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 overflow-clip">
                <Star className="size-3 shrink-0 fill-primary text-primary" />
                <span className="font-latin text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
                  {review.stars}
                </span>
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
                <p className="w-full text-sm font-normal text-muted-foreground">
                  <ThaiText>{review.advisorReply}</ThaiText>
                </p>
              </Surface>
            ) : null}
          </Surface>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- related */

/** The rest of the advisor's catalogue, from `GET /services?advisorId=`. */
function RelatedBlock({
  advisorId,
  serviceId,
}: {
  readonly advisorId: string;
  readonly serviceId: string;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();

  const fetcher = useCallback(
    (signal: AbortSignal) => listServices({ advisorId, limit: 20 }, signal),
    [advisorId],
  );
  const related = useResource<Paginated<ApiPublicService>>(
    `services?advisorId=${advisorId}&limit=20`,
    fetcher,
  );

  const items = (related.data?.items ?? []).filter(
    (item) => item.id !== serviceId,
  );
  if (items.length === 0) return null;

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
      <p className={SECTION_HEAD}>{t("relatedTitle")}</p>
      {/* No covers on the API, so these are text cards rather than the fixture
          screen's 16:9 photo tiles. */}
      <div className="flex w-full flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-4">
        {items.map((item) => (
          <Link
            className={cn(
              surfaceClass({ interactive: true }),
              "flex w-full flex-col items-start gap-1 p-3",
            )}
            href={liveServiceHref(item.id)}
            key={item.id}
          >
            <p className="line-clamp-2 w-full text-base font-semibold text-foreground">
              <ThaiText>{item.name}</ThaiText>
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              {s("durationMinutes", { count: item.durationMinutes })}
            </p>
            <p className="font-latin mt-auto w-full text-base font-semibold tabular-nums text-foreground">
              {format.number(baht(item.priceSatang), "baht")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function LiveServiceDetailScreen({
  serviceId,
}: {
  readonly serviceId: string;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const sc = useTranslations("screening");
  const format = useFormatter();

  const serviceFetcher = useCallback(
    (signal: AbortSignal) => getService(serviceId, signal),
    [serviceId],
  );
  const categoriesFetcher = useCallback(
    (signal: AbortSignal) => listServiceCategories(signal),
    [],
  );
  const service = useResource<ApiPublicService>(
    `services/${serviceId}`,
    serviceFetcher,
  );
  const categories = useResource<Paginated<ApiNamedRecord>>(
    "service-categories",
    categoriesFetcher,
  );

  if (service.loading) {
    return (
      <MobileScreen className="pb-0" wide>
        <ScreenBody>
          <TopBar unreadNotifications />
          <div className={cn("flex w-full flex-col gap-4 px-6 pt-6", PAGE)}>
            <div className="h-7 w-3/5 rounded-md bg-muted" />
            <div className="h-5 w-2/5 rounded-md bg-muted" />
            <div className="h-24 w-full rounded-card bg-muted" />
            <div className="h-40 w-full rounded-card bg-muted" />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  if (service.error || !service.data) {
    return (
      <MobileScreen className="pb-0" wide>
        <ScreenBody>
          <TopBar unreadNotifications />
          <div className={cn("w-full px-6 pt-6", PAGE)}>
            <ApiErrorCard
              error={service.error ?? new Error(t("notFoundBody"))}
              extra={
                <NeutralButton className="w-auto shrink-0" href="/search" size="sm">
                  {s("browseAll")}
                </NeutralButton>
              }
              onRetry={service.reload}
              title={t("notFoundTitle")}
            />
          </div>
        </ScreenBody>
      </MobileScreen>
    );
  }

  const live = service.data;
  const price = format.number(baht(live.priceSatang), "baht");
  const duration = s("durationMinutes", { count: live.durationMinutes });
  const categoryName = (categories.data?.items ?? []).find(
    (item) => item.id === live.categoryId,
  )?.name;

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody>
        <TopBar unreadNotifications />

        <div className={cn("w-full shrink-0 px-6 py-3 lg:pt-6", PAGE)}>
          <Breadcrumb aria-label={t("breadcrumbLabel")}>
            <BreadcrumbList className="gap-1 text-xs sm:gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/search" />}>
                  {t("breadcrumbAll")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {categoryName ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href="/search" />}>
                      {categoryName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              ) : null}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {live.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className={cn("w-full lg:pb-14", PAGE_INSET_BLOCKS, SPLIT_WITH_ASIDE)}>
          <div className="flex w-full flex-col lg:px-6">
            <div className="flex w-full shrink-0 flex-col items-center gap-6 pb-6 lg:px-0">
              {/* Figma "Service Header". No gallery above it — the API has no
                  cover, and this page does not draw a rectangle for one. */}
              <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-4">
                <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5">
                  {live.screeningRequired ? (
                    <StatusPill tone="info">{s("screeningRequired")}</StatusPill>
                  ) : null}
                  {live.trialEnabled && live.trialDurationMinutes !== null ? (
                    <StatusPill tone="success">
                      {sc("trialLabel")}{" "}
                      {s("durationMinutes", {
                        count: live.trialDurationMinutes,
                      })}
                    </StatusPill>
                  ) : null}
                </div>

                <h1 className="w-full text-2xl font-semibold text-foreground lg:text-heading">
                  <ThaiText>{live.name}</ThaiText>
                </h1>

                <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
                  <p className="font-latin shrink-0 text-2xl font-semibold tabular-nums whitespace-nowrap text-foreground lg:text-heading">
                    {price}
                  </p>
                  <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                    {t("priceUnit", { duration })}
                  </p>
                  {/* Only when reviews exist. The seed has none, so this is
                      normally absent rather than "0.0". */}
                  <HeaderRating advisorId={live.advisorId} />
                </div>

                {live.description ? (
                  <p className="w-full text-sm font-normal text-foreground lg:text-base">
                    <ThaiText>{live.description}</ThaiText>
                  </p>
                ) : null}
              </div>

              <AdvisorBlock advisorId={live.advisorId} />

              <SlotsBlock serviceId={live.id} />

              <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
                <p className={SECTION_HEAD}>{t("stepsTitle")}</p>
                <StepList />
              </div>

              <ReviewsBlock advisorId={live.advisorId} />

              <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
                <p className={SECTION_HEAD}>{t("faqTitle")}</p>
                <FaqSection limit={4} />
              </div>

              <RelatedBlock advisorId={live.advisorId} serviceId={live.id} />
            </div>
          </div>

          {/* Figma "Booking Card". The action scrolls the reader back to the
              times rather than jumping to a checkout: a booking cannot be made
              without picking one, and the slot chips are the control that does
              it. */}
          <aside className="hidden lg:sticky lg:top-24 lg:me-6 lg:block lg:rounded-card lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-panel">
            <p className="flex items-baseline gap-2">
              <span className="font-latin text-2xl font-semibold tabular-nums text-foreground">
                {price}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {t("perSession", { duration })}
              </span>
            </p>
            {live.screeningRequired ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
                <StatusPill tone="info">{s("screeningRequired")}</StatusPill>
              </div>
            ) : null}
            <div className="flex flex-col gap-2.5 pt-5">
              <PrimaryButton block href="#slots" size="lg">
                {t("book")}
              </PrimaryButton>
              <NeutralButton block href={`/chat/${live.advisorId}`}>
                {t("message")}
              </NeutralButton>
            </div>
            <p className="pt-4 text-xs font-normal text-muted-foreground">
              <ThaiText>{t("packagesNote")}</ThaiText>
            </p>
          </aside>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>

      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 shadow-panel lg:hidden">
        <div className="flex shrink-0 flex-col items-start gap-0.5 overflow-clip">
          <p className="font-latin text-base font-semibold tabular-nums whitespace-nowrap text-foreground">
            {price}
          </p>
          <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
            {t("perSession", { duration })}
          </p>
        </div>
        <NeutralButton
          aria-label={t("message")}
          className="size-9 shrink-0 border-input px-0 shadow-none [&_svg]:size-4.5"
          href={`/chat/${live.advisorId}`}
        >
          <MessageSquare />
        </NeutralButton>
        <PrimaryButton className="w-auto min-w-px flex-1" href="#slots">
          {t("book")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
