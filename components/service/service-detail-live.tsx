"use client";

import type { StaticImageData } from "next/image";
import Link from "next/link";
import { SearchX, Video } from "lucide-react";
import { useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/lib/api/client";
import { getAdvisor, getAdvisorRatingSummary, getService } from "@/lib/api/resources";
import type { ApiPublicAdvisor, ApiPublicService, ApiRatingSummary } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { authPill } from "@/components/auth/auth-split";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import {
  BookingBar,
  BookingPanel,
  FailedNotice,
  PILL_LG,
  TrustLine,
  useSelection,
} from "@/components/service/service-booking";
import { ServiceHead } from "@/components/service/service-head";
import { ServicePhotos } from "@/components/service/service-photos";
import {
  AdvisorSection,
  AdvisorServices,
  ReviewsSection,
  SessionSection,
  SimilarServices,
} from "@/components/service/service-sections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `/service/…?serviceId=<uuid>`: one service, read from the API, and the place
 * it is booked.
 *
 * A showcase head (the face beside the name, the line about them, a row of
 * figures) over the shape of the
 * page before it: a large photograph, and a booking panel that rides beside
 * the reading column. Below them, what the session is and what happens after
 * the button, the advisor's reviews, who the advisor is, their other services,
 * and services like this one from others.
 *
 * Only what the API knows is drawn: there is no sales count or online status
 * behind a service, so neither appears.
 *
 * Nothing on this page animates beyond short hover and panel transitions:
 * the user keeps motion to the home page.
 *
 * The cover and the advisor's face come from the live catalogue (the same
 * cached `GET /services` + `GET /advisors` the search page reads), so the
 * photo is the one the reader just pressed on a card; the service's own
 * photographs (`images`) follow it.
 */

/**
 * The grid the page and its skeleton share: the reading column and the 400
 * panel, in the 1496 frame (`max-w-374`) drawn at 1710 and zoomed down.
 */
const COLUMNS = "grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_25rem]";

/**
 * The advisor's score, or undefined when nothing has been scored: `average`
 * is `null`, not 0, while `total` is 0, and a zero would read as the lowest
 * score. `settled` tells "none" from "not yet", so neither is drawn as the
 * other. One fetch however many blocks ask (`useResource` is keyed by request).
 */
function useRatingSummary(advisorId: string): { readonly summary?: ApiRatingSummary; readonly settled: boolean } {
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal),
    [advisorId],
  );
  const { data, loading } = useResource<ApiRatingSummary>(`advisors/${advisorId}/reviews/summary`, fetcher);
  return {
    summary: data && data.average !== null && data.total > 0 ? data : undefined,
    settled: !loading,
  };
}

/** The public advisor (`GET /advisors/:id`), shared by every block that asks. */
function useAdvisor(advisorId: string): ApiPublicAdvisor | undefined {
  const fetcher = useCallback((signal: AbortSignal) => getAdvisor(advisorId, signal), [advisorId]);
  return useResource<ApiPublicAdvisor>(`advisors/${advisorId}`, fetcher).data;
}

/**
 * The photographs, cover first: the card's cover (what the reader pressed),
 * then the service's own, each URL once, since the API may list the same
 * cover among them.
 */
function photosOf(item: LiveService | undefined, service: ApiPublicService): readonly string[] {
  const all = [item?.cover.src, ...(service.images ?? item?.images ?? [])];
  return [...new Set(all.filter((src): src is string => Boolean(src)))];
}

/** Best rated first, the busier of two equal scores ahead. */
function byScore(a: LiveService, b: LiveService): number {
  return (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews;
}

/**
 * Three services like this one from other advisors (three big cards across
 * the page rather than four small ones): the same category when it
 * has any, otherwise the best rated of everything else. `category` is empty
 * for the second, so the row is not titled with a category it does not hold.
 */
function similarTo(
  items: readonly LiveService[],
  service: ApiPublicService,
  category: string,
): { readonly items: readonly LiveService[]; readonly category: string } {
  const others = items.filter((item) => item.advisorId !== service.advisorId && item.id !== service.id);
  const same = category ? others.filter((item) => item.category === category) : [];
  if (same.length > 0) return { items: same.toSorted(byScore).slice(0, 3), category };
  return { items: others.toSorted(byScore).slice(0, 3), category: "" };
}

/**
 * The frame every state shares: the docking bar over the 1710 column, the
 * home hero's two lights at the top (`bg-legal-wash`, scrolling away with the
 * first screen), the footer on a desktop, and the phone's bar along the
 * bottom when there is one. No rail: this is a page of the marketplace, the
 * search's next step, not an account page.
 *
 * The column is zoomed by `app-scale` (0.842 at 1440, held there on wider
 * screens) rather than `doc-scale`, which reaches 1 on a 1710-wide window: the
 * account pages are drawn at `app-scale`, and the same `frame-*` step has to
 * read the same size here as there.
 */
function Frame({ children, bar }: { readonly children: ReactNode; readonly bar?: ReactNode }) {
  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="bg-card bg-legal-wash bg-local bg-no-repeat">
        <TopBar dock unreadNotifications />
        {/* `max-w-374`, the account pages' column (`FEED_COLUMN`): at the
            1280 it had, the page sat in a narrow strip with wide empty
            margins either side of it. */}
        <div className="app-scale mx-auto flex w-full max-w-374 flex-1 flex-col px-5 pt-2 pb-14 md:px-12 md:pt-4 lg:px-8 lg:pt-6 lg:pb-28">
          {children}
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      {bar}
    </MobileScreen>
  );
}

/**
 * The loaded page's own shape, so nothing jumps when it lands: the head, the
 * photograph and the panel beside them. The route's prerendered HTML is this
 * too (`ServiceDetailScreen`), so a cold load never shows another page first.
 */
export function LiveServiceDetailSkeleton() {
  return (
    <Frame
      bar={
        // The phone's bar holds its place too, so the page does not lift
        // when the price arrives.
        <div aria-hidden className="flex w-full shrink-0 items-center gap-2 border-t border-border bg-card px-5 py-3 md:px-12 lg:hidden">
          <span className="flex flex-col gap-1.5">
            <span className="h-5 w-16 animate-pulse rounded-md bg-muted" />
            <span className="h-3 w-24 animate-pulse rounded-md bg-muted" />
          </span>
          <span className="ml-auto h-11 w-40 animate-pulse rounded-full bg-muted" />
        </div>
      }
    >
      <div aria-busy className={COLUMNS}>
        <div aria-hidden className="flex min-w-0 flex-col gap-6 lg:gap-7">
          <span className="h-5 w-48 animate-pulse rounded-full bg-muted lg:h-6" />
          <div className="flex items-center gap-6">
            <span className="hidden size-20 shrink-0 animate-pulse rounded-full bg-muted lg:block" />
            <span className="flex flex-1 flex-col gap-3">
              <span className="h-9 w-4/5 animate-pulse rounded-lg bg-muted lg:h-11" />
              <span className="h-5 w-1/2 animate-pulse rounded-md bg-muted lg:h-6" />
            </span>
          </div>
          <span className="flex flex-col gap-2 lg:pl-26">
            <span className="h-4 w-full max-w-xl animate-pulse rounded-md bg-muted lg:h-5" />
            <span className="h-4 w-3/4 max-w-md animate-pulse rounded-md bg-muted lg:h-5" />
          </span>
          <span className="h-16 w-full max-w-lg animate-pulse rounded-2xl bg-muted lg:ml-26 lg:h-14" />
          <span className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted lg:aspect-[21/9]" />
        </div>
        <span aria-hidden className="hidden h-180 animate-pulse rounded-card bg-muted lg:block" />
      </div>
    </Frame>
  );
}

/**
 * The service could not be shown: "not found" for the API's 404 (closed or
 * moved), with the way back to search; any other failure is the API's own
 * sentence with a retry.
 */
function Unavailable({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  const t = useTranslations("service");
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-20 text-center lg:gap-7 lg:py-36">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted lg:size-18">
          <SearchX aria-hidden className="size-6 text-muted-foreground lg:size-8" />
        </span>
        <div className="flex max-w-md flex-col gap-1.5 lg:max-w-xl lg:gap-3">
          <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-frame-title">{t("notFoundTitle")}</h1>
          <p className="text-sm text-muted-foreground lg:text-lg">{t("notFoundBody")}</p>
        </div>
        <Button
          className={cn(authPill(true), "w-auto px-8", PILL_LG)}
          nativeButton={false}
          render={<Link href="/search" />}
        >
          {t("back")}
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-16 text-center lg:gap-7 lg:py-32">
      <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-frame-title">{t("loadFailedTitle")}</h1>
      <FailedNotice error={error} onRetry={onRetry} />
    </div>
  );
}

/** The loaded service, with everything around it. */
function ServiceView({ service }: { readonly service: ApiPublicService }) {
  const t = useTranslations("service");
  const catalogue = useLiveCatalogue();
  const advisor = useAdvisor(service.advisorId);
  const rating = useRatingSummary(service.advisorId);
  const selection = useSelection();

  const item = catalogue.items.find((entry) => entry.id === service.id);
  const name = item?.advisorName ?? advisor?.displayName ?? "";
  const headline = advisor?.headline ?? item?.advisorHeadline ?? "";
  const face: StaticImageData | null =
    item?.face ?? (advisor?.image ? { src: advisor.image, width: 128, height: 128 } : null);
  const category = item?.category ?? "";
  const photos = photosOf(item, service);
  const own = catalogue.items.filter((entry) => entry.advisorId === service.advisorId && entry.id !== service.id);
  const similar = similarTo(catalogue.items, service, category);

  // Held back until the catalogue is in, so the first photo is the cover the
  // reader pressed rather than whichever the API lists first.
  let gallery: ReactNode = null;
  if (catalogue.loading && !item) {
    gallery = <span aria-hidden className="block aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted lg:aspect-[21/9]" />;
  } else if (photos.length > 0) {
    gallery = (
      <ServicePhotos
        chip={
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card/85 px-3 text-xs font-medium text-foreground shadow-hero-card backdrop-blur-md lg:h-11 lg:gap-2 lg:px-4 lg:text-frame-meta">
            <Video aria-hidden className="size-3.5 lg:size-5" />
            {t("videoCallLength", { minutes: service.durationMinutes })}
          </span>
        }
        photos={photos}
        title={service.name}
      />
    );
  }

  return (
    <Frame bar={<BookingBar advisorName={name} selection={selection} service={service} />}>
      <div className={COLUMNS}>
        <div className="flex min-w-0 flex-col gap-8">
          <ServiceHead
            category={category}
            face={face}
            headline={headline}
            name={name}
            rating={rating.summary}
            ratingSettled={rating.settled}
            service={service}
          />
          {gallery}
          <SessionSection advisorName={name} service={service} />
          <ReviewsSection
            advisorName={name}
            service={service}
            summary={rating.summary}
            summarySettled={rating.settled}
          />
          <AdvisorSection
            advisor={advisor}
            advisorId={service.advisorId}
            face={face}
            headline={headline}
            name={name}
            summary={rating.summary}
            summarySettled={rating.settled}
          />
          <AdvisorServices advisorId={service.advisorId} items={own} />
        </div>

        {/* `sticky` against `ScreenBody`, the page's scroller, clear of the
            bar; `items-start` on the grid is what lets it ride. */}
        <aside aria-label={t("panelLabel")} className="hidden lg:sticky lg:top-28 lg:block">
          <BookingPanel advisorName={name} selection={selection} service={service} />
          <TrustLine className="mt-4 lg:mt-5" />
        </aside>
      </div>

      <SimilarServices category={similar.category} items={similar.items} />
    </Frame>
  );
}

export function LiveServiceDetailScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const fetcher = useCallback((signal: AbortSignal) => getService(serviceId, signal), [serviceId]);
  const service = useResource<ApiPublicService>(`services/${serviceId}`, fetcher);

  if (service.loading) return <LiveServiceDetailSkeleton />;
  if (service.error || !service.data) {
    return (
      <Frame>
        <Unavailable error={service.error ?? new Error(t("notFoundBody"))} onRetry={service.reload} />
      </Frame>
    );
  }
  return <ServiceView service={service.data} />;
}
