"use client";

import type { StaticImageData } from "next/image";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { useCallback, useEffect, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/lib/api/client";
import { getAdvisor, getAdvisorRatingSummary, getService } from "@/lib/api/resources";
import type { ApiPublicAdvisor, ApiPublicService, ApiRatingSummary } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { authPill } from "@/components/auth/auth-split";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import {
  BookingBar,
  BookingCard,
  BookingPicker,
  PackageCards,
  usePicker,
  FailedNotice,
  PILL_LG,
  useSelection,
} from "@/components/service/service-booking";
import { ServiceIntro } from "@/components/service/service-head";
import { servicePhotoSet } from "@/components/service/service-photo-sets";
import {
  AdvisorSection,
  KnowSection,
  MoreServices,
  ReviewsSection,
} from "@/components/service/service-sections";
import { Button } from "@/components/ui/button";
import { WorkFrame } from "@/components/work/work-frame";
import { cn } from "@/lib/utils";

/**
 * `/service/…?serviceId=<uuid>`: one service, read from the API, and the place
 * it is booked.
 *
 * Laid out after the listing pages of a large marketplace for services and
 * experiences, cut to what a session here has to say. On the left, riding
 * on screen, the intro: the cover with the advisor's face on its edge, the
 * name, the line, the facts and the price card whose button opens the times.
 * On the right, scrolling: the highlights, the reviews, the photographs, the
 * advisor, the things to know and more services. On the phone the two
 * columns stack, and the booking bar along the bottom holds the price.
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
 * The grid the page and its skeleton share, the listing pages' two columns
 * measured at 1440 and drawn at ×1.1875: the intro's 493 riding on the left
 * (585 here), 73 of air (86.7), the 776 that scrolls (921.5), 1594 in all.
 * One column, intro first, below `lg`.
 */
const COLUMNS =
  "grid items-start gap-y-9 lg:grid-cols-[585px_minmax(0,921.5px)] lg:justify-between lg:gap-x-[86.7px]";

/**
 * The intro's column, from `lg` held still from the first frame, the way the
 * listing pages hold theirs: it sticks at exactly the height it starts at, so
 * the page never moves it, and it is the screen's height below that, so the
 * price card at its foot sits on the bottom edge.
 *
 * Its start is the bar above it (88, zoomed by `doc-scale`) and the column's
 * 38 of top padding; inside `app-scale` that is the bar's height over the
 * page's zoom, plus 38. The screen's height is `100dvh` over the same zoom,
 * since a viewport length here is zoomed with everything else.
 */
const INTRO_COLUMN =
  "flex min-w-0 flex-col md:mx-auto md:w-full md:max-w-xl lg:sticky lg:top-(--intro-top) lg:mx-0 lg:min-h-[calc(var(--intro-screen,100dvh)_/_var(--app-zoom)_-_var(--intro-top))] lg:max-w-none";

const INTRO_VARS = {
  "--app-zoom": "tan(atan2(min(100vw, 1440px), 1710px))",
  "--intro-top": "calc(88px * clamp(0.75, tan(atan2(100vw, 1710px)), 1) / var(--app-zoom) + 38px)",
} as CSSProperties;

/**
 * The head of the advisor's own service in the desk's frame (`WorkFrame`):
 * the band's title, line and action, and where its chevron goes back to.
 */
export type DeskHead = {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly action?: ReactNode;
  readonly backHref: string;
};

/**
 * Where the owner's page starts from `lg`, under the desk's band held at the
 * top (its 88, then the page's 32), and so where what rides beside it sticks:
 * there, it never moves.
 */
export const OWNER_PAGE_TOP = "120px";

/** The intro's start in the desk's frame: under the band; the screen's height less the panel's 6 above and below. */
const OWNER_INTRO_VARS = {
  "--app-zoom": "tan(atan2(min(100vw, 1440px), 1710px))",
  "--intro-top": OWNER_PAGE_TOP,
  "--intro-screen": "calc(100dvh - 12px)",
} as CSSProperties;

/**
 * The advisor's score, or undefined when nothing has been scored: `average`
 * is `null`, not 0, while `total` is 0, and a zero would read as the lowest
 * score. `settled` tells "none" from "not yet", so neither is drawn as the
 * other, and `count` is the review count as the handle row takes it: pending
 * (undefined), unknown (null) or the number. One fetch however many blocks
 * ask (`useResource` is keyed by request).
 */
function useRatingSummary(advisorId: string): {
  readonly summary?: ApiRatingSummary;
  readonly settled: boolean;
  readonly count: number | null | undefined;
} {
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal),
    [advisorId],
  );
  const { data, loading } = useResource<ApiRatingSummary>(`advisors/${advisorId}/reviews/summary`, fetcher);
  let count: number | null | undefined = null;
  if (data) count = data.total;
  else if (loading) count = undefined;
  return {
    summary: data && data.average !== null && data.total > 0 ? data : undefined,
    settled: !loading,
    count,
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
  // Photographs the advisor uploaded win: they come back presigned from our
  // storage, where the seed's are plain hotlinks. A local preview is one on
  // its way there (the editor's client view, before the save).
  const uploaded = (service.images ?? []).some((src) => /[?&]X-Amz-Signature=/.test(src) || src.startsWith("blob:"));
  if (uploaded && service.images) return service.images;
  // This page's own three, where the service has them (`service-photo-sets`).
  const own = servicePhotoSet(service.id);
  if (own) return own;
  const all = [item?.cover.src, ...(service.images ?? item?.images ?? [])];
  return [...new Set(all.filter((src): src is string => Boolean(src)))];
}

/**
 * The advisor's other services this page shows: the ones they chose, in their
 * order, where any is still listed; otherwise the page picks, those in the
 * same category first and the newest first within each.
 */
export function relatedOf(
  items: readonly LiveService[],
  service: Pick<ApiPublicService, "id" | "advisorId" | "categoryId" | "relatedServiceIds">,
): readonly LiveService[] {
  const others = items.filter((item) => item.advisorId === service.advisorId && item.id !== service.id);
  const chosen = (service.relatedServiceIds ?? [])
    .map((id) => others.find((item) => item.id === id))
    .filter((item): item is LiveService => item !== undefined);
  if (chosen.length > 0) return chosen;
  const near = (item: LiveService) => (item.categoryId === service.categoryId ? 0 : 1);
  return others.toSorted((a, b) => near(a) - near(b) || b.listedAt - a.listedAt);
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
 * The frame every state shares: the docking bar over the 1710 column on the
 * account pages' plain white, and the phone's price floating over the foot
 * when there is one (the column's foot padding is what clears it). No rail: this is a page of the marketplace, the search's next step,
 * not an account page. No footer either: the page ends on its last section,
 * and the column beside it never gives way to one.
 *
 * The column is zoomed by `app-scale` (0.842 at 1440, held there on wider
 * screens) rather than `doc-scale`, which reaches 1 on a 1710-wide window: the
 * account pages are drawn at `app-scale`, and the same `frame-*` step has to
 * read the same size here as there.
 */
export function ServiceFrame({ children, bar, desk, footer }: {
  readonly children: ReactNode;
  readonly bar?: ReactNode;
  /**
   * The advisor's own service (its editor, and the client's view of it): in
   * the work desk's frame (`WorkFrame`) under this head, with the desk's menu
   * at the left and "บริการ" marked, not under the marketplace's bar.
   */
  readonly desk?: DeskHead;
  /** Held to the foot of the scroller, under the page (the editor's save). */
  readonly footer?: ReactNode;
}) {
  // This page's neutral greys (`.neutral-greys`): on the frame for what it
  // draws, on <body> while it is mounted for the dialogs and sheets that
  // portal out of it. Not on <body> in the desk's frame, whose menu and rail
  // keep the account pages' own greys.
  const inDesk = desk !== undefined;
  useEffect(() => {
    if (inDesk) return;
    document.body.classList.add("neutral-greys");
    return () => document.body.classList.remove("neutral-greys");
  }, [inDesk]);

  if (desk) {
    return (
      <WorkFrame
        action={desk.action}
        backHref={desk.backHref}
        bodyClassName="neutral-greys"
        footer={footer}
        overlay={bar}
        place="services"
        stickyBand
        subtitle={desk.subtitle}
        title={desk.title}
      >
        <div className="mt-5 flex flex-1 flex-col lg:mt-8">{children}</div>
      </WorkFrame>
    );
  }

  return (
    <MobileScreen className="neutral-greys pb-0" wide="md">
      <ScreenBody className="bg-card">
        {/* On the phone the bar floats over the cover, which starts at the
            top edge; from the portrait tablet it sits above the page. */}
        <TopBar dock overlay="phone" unreadNotifications />
        {/* 1594 wide from `lg`, the two columns `COLUMNS` measures. */}
        <div className="app-scale mx-auto flex w-full flex-1 flex-col px-6 pt-2 pb-32 md:px-12 md:pt-4 lg:max-w-[1658px] lg:px-8 lg:pt-9.5 lg:pb-0">
          {children}
        </div>
        {footer}
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
export function LiveServiceDetailSkeleton({ desk = false }: { readonly desk?: boolean }) {
  return (
    <ServiceFrame
      desk={
        desk
          ? { backHref: "/advisor/services", title: <span aria-hidden className="block h-7 w-56 animate-pulse rounded-md bg-muted motion-reduce:animate-none" /> }
          : undefined
      }
      bar={
        // The phone's floating price holds its place too, so nothing
        // appears from nowhere when the price arrives.
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-6 md:px-12 lg:hidden">
          <div className="flex h-[70px] w-full max-w-xl items-center justify-between gap-3 rounded-full bg-card py-2 pr-2 pl-5 shadow-float">
            <span className="flex flex-col gap-1.5">
              <span className="h-5 w-24 animate-pulse rounded-md bg-muted" />
              <span className="h-3 w-28 animate-pulse rounded-md bg-muted" />
            </span>
            <span className="h-13.5 w-40 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      }
    >
      <div aria-busy className={COLUMNS}>
        {/* `ServiceIntro`'s own stack, piece for piece: the cover, on the
            phone the white sheet lapping it with the face on its edge, the
            name, two lines of what it is, the facts, and from `lg` the price
            card docked on the screen's foot. */}
        <div aria-hidden className={INTRO_COLUMN} style={INTRO_VARS}>
          <div className="flex flex-col items-center lg:flex-1">
            <span className="-mx-6 -mt-2 block aspect-[4/3] animate-pulse self-stretch bg-muted md:mx-0 md:mt-0 md:aspect-[493/241] md:rounded-2xl lg:rounded-[28.5px]" />
            <div className="relative z-1 -mx-6 -mt-8 flex flex-col items-center self-stretch rounded-t-[32px] bg-card px-6 md:contents">
              <span className="relative -mt-8 block size-16 rounded-full bg-muted ring-3 ring-card md:-mt-9 md:size-18 lg:-mt-[51px] lg:size-[102px]" />
              {/* Each bar the height of the line it stands for, so the
                  packages under it start where they will. */}
              <span className="mt-3 block h-9 w-3/4 max-w-[427px] animate-pulse rounded-lg bg-muted md:mt-4 md:h-8 lg:mt-[23.75px] lg:h-[42.75px]" />
              <span className="mt-1.5 block h-5 w-28 animate-pulse rounded-md bg-muted lg:mt-[7.125px] lg:h-[19px] lg:w-[150px]" />
              <span className="mt-3 block h-5 w-4/5 max-w-[427px] animate-pulse rounded-md bg-muted lg:mt-[23.75px] lg:h-[23.75px]" />
              <span className="mt-1.5 block h-5 w-3/5 max-w-[340px] animate-pulse rounded-md bg-muted lg:mt-2 lg:h-[23.75px]" />
              <span className="mt-4 block h-3.5 w-40 animate-pulse rounded-md bg-muted lg:mt-[28.5px] lg:h-[16.6px] lg:w-[195px]" />
              <span className="mt-1.5 block h-3.5 w-28 animate-pulse rounded-md bg-muted lg:mt-[4.75px] lg:h-[14.25px] lg:w-[135px]" />
              <div className="hidden w-full pt-[57px] lg:mt-auto lg:block">
                <div className="flex items-center justify-between gap-[19px] rounded-t-[28.5px] rounded-b-[7.125px] bg-card py-[23.75px] pr-[23.75px] pl-9.5 shadow-panel">
                  <span className="flex flex-col gap-[7.125px]">
                    <span className="block h-[28.5px] w-[140px] animate-pulse rounded-md bg-muted" />
                    <span className="block h-[16.6px] w-[180px] animate-pulse rounded-md bg-muted" />
                  </span>
                  <span className="block h-[61.75px] w-[230px] animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The packages as `PackageCards` draws them, then the reviews'
            head and their first two, as `ReviewsSection` does. */}
        <div aria-hidden className="flex min-w-0 flex-col lg:pb-28">
          <div className="border-b border-border pb-9 lg:pb-[57px]">
            <div className="flex flex-col gap-3 lg:gap-[19px]">
              {[0, 1, 2].map((key) => (
                <span
                  className="flex items-center gap-5 rounded-[20px] bg-card p-2 pr-5 shadow-panel ring-1 ring-foreground/[0.03] lg:gap-[23.75px] lg:rounded-[28.5px] lg:p-[9.5px] lg:pr-[28.5px]"
                  key={key}
                >
                  <span className="block h-25 w-26 shrink-0 animate-pulse rounded-[20px] bg-muted lg:size-[123.5px] lg:rounded-[19px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-[9.5px]">
                    <span className="block h-4 w-1/3 animate-pulse rounded-md bg-muted lg:h-[21.4px]" />
                    <span className="block h-3.5 w-11/12 animate-pulse rounded-md bg-muted lg:h-[16.6px]" />
                    <span className="block h-3.5 w-3/4 animate-pulse rounded-md bg-muted lg:h-[16.6px]" />
                    <span className="block h-3.5 w-1/4 animate-pulse rounded-md bg-muted lg:h-[16.6px]" />
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="py-9 lg:py-[57px]">
            <span className="mb-6 block h-6 w-28 animate-pulse rounded-md bg-muted lg:mb-9.5 lg:h-6.5 lg:w-[150px]" />
            <div className="grid gap-10 md:grid-cols-2 md:gap-x-10 lg:gap-x-[47.5px]">
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
          </div>
        </div>
      </div>
    </ServiceFrame>
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

/**
 * What the owner's view of their own service adds to the page a customer
 * sees (`/advisor/services/view`): a bar above it, and the way to change the
 * details and the packages where they stand.
 */
export type OwnerSlots = {
  /** The desk's band over the page (`DeskHead`). */
  readonly head: DeskHead;
  readonly intro: ReactNode;
  readonly packages: ReactNode;
  /** Held to the foot of the page (the editor's save). */
  readonly footer?: ReactNode;
};

/** The loaded service, with everything around it; with `owner`, the owner's view of it. */
export function ServiceView({ service, owner }: { readonly service: ApiPublicService; readonly owner?: OwnerSlots }) {
  const t = useTranslations("service");
  const catalogue = useLiveCatalogue();
  const advisor = useAdvisor(service.advisorId);
  const rating = useRatingSummary(service.advisorId);
  const selection = useSelection();
  const picker = usePicker();

  const item = catalogue.items.find((entry) => entry.id === service.id);
  const name = item?.advisorName ?? advisor?.displayName ?? "";
  const headline = advisor?.headline ?? item?.advisorHeadline ?? "";
  const face: StaticImageData | null =
    item?.face ?? (advisor?.image ? { src: advisor.image, width: 128, height: 128 } : null);
  const category = item?.category ?? "";
  const photos = photosOf(item, service);
  const own = relatedOf(catalogue.items, service);
  const similar = similarTo(catalogue.items, service, category);

  // Held back until the catalogue is in, so the cover is the photo the reader
  // pressed rather than whichever the API lists first.
  const settled = !(catalogue.loading && !item);

  return (
    <ServiceFrame bar={<BookingBar picker={picker} selection={selection} service={service} />} desk={owner?.head} footer={owner?.footer}>
      <BookingPicker
        advisorName={name}
        photos={settled ? photos : []}
        picker={picker}
        selection={selection}
        service={service}
      />
      <div className={COLUMNS}>
        {/* `items-start` on the grid is what lets the column ride. */}
        <aside aria-label={t("panelLabel")} className={INTRO_COLUMN} style={owner ? OWNER_INTRO_VARS : INTRO_VARS}>
          {owner ? <div className="mb-4 flex flex-wrap gap-2 lg:mb-6">{owner.intro}</div> : null}
          <ServiceIntro
            booking={<BookingCard picker={picker} selection={selection} service={service} />}
            category={category}
            face={face}
            photos={settled ? photos : []}
            name={name}
            rating={rating.summary}
            reviewCount={rating.count}
            service={service}
          />
        </aside>

        {/* The page's foot padding is this column's, not the frame's: the
            grid then ends where the page does, and the intro beside it stays
            put to the last pixel of the scroll. */}
        <div className="flex min-w-0 flex-col lg:pb-28">
          {/* The packages, where the listing pages list a host's offerings:
              first, and with no head, as theirs has none. */}
          {service.packages && service.packages.length > 0 ? (
            <div className="border-b border-border pb-9 lg:pb-[57px]">
              {owner ? <div className="mb-4 flex justify-end lg:mb-6">{owner.packages}</div> : null}
              <PackageCards photos={settled ? photos : []} picker={picker} selection={selection} service={service} />
            </div>
          ) : owner ? (
            <div className="border-b border-border pb-9 lg:pb-[57px]">{owner.packages}</div>
          ) : null}
          <ReviewsSection
            advisorName={name}
            service={service}
            summary={rating.summary}
            summarySettled={rating.settled}
          />
          {/* The listing pages' order once the dates are behind the price
              card's button: what people said, who the host is, the things
              to know, and more to look at. The photographs are the cover's,
              opened from it, rather than drawn twice. */}
          <AdvisorSection advisor={advisor} advisorId={service.advisorId} face={face} headline={headline} name={name} />
          <KnowSection />
          <MoreServices advisorId={service.advisorId} category={similar.category} own={own} similar={similar.items} />
        </div>
      </div>
    </ServiceFrame>
  );
}

export function LiveServiceDetailScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const fetcher = useCallback((signal: AbortSignal) => getService(serviceId, signal), [serviceId]);
  const service = useResource<ApiPublicService>(`services/${serviceId}`, fetcher);

  if (service.loading) return <LiveServiceDetailSkeleton />;
  if (service.error || !service.data) {
    return (
      <ServiceFrame>
        <Unavailable error={service.error ?? new Error(t("notFoundBody"))} onRetry={service.reload} />
      </ServiceFrame>
    );
  }
  return <ServiceView service={service.data} />;
}
