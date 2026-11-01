"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarPlus,
  MapPin,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type MouseEvent, type ReactNode } from "react";

import { initialsOf } from "@/components/advisor-public/headline";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { ResultCard } from "@/components/search/search-screen";
import { ApiErrorCard } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import type { ApiAdvisorBackground } from "@/lib/api/types";
import type { LiveService } from "@/lib/catalogue/live";
import type { ProfileTab } from "@/lib/catalogue/profiles";
import { cn } from "@/lib/utils";

/**
 * An advisor's public profile: the parts both renderings share, the live one
 * (`advisor-public-live.tsx`) and the fixture one
 * (`advisor-public-profile-screen.tsx`).
 *
 * ## Sizes
 *
 * - **Phone** (below `md`): a 200px cover, the identity sheet lapping 36px
 *   over it with 24px corners, the 72px avatar riding its edge, the stats as
 *   one row with 24px rules, the actions two to a row, a sticky full-bleed
 *   tab strip.
 * - **Tablet** (`md`): the same with 36px gutters, the stats in their
 *   bordered box, the tab strip inset.
 * - **Desktop** (`lg`) sits under the site's bar and is drawn in the
 *   1710 design space (`app-scale`: 0.842 at 1440, held there on wider
 *   screens), so every length here is its 1440 px ×1.1875. Type is the
 *   `frame-*` steps in `app/globals.css`.
 *
 * ## What fills each slot
 *
 * - The `@handle` row says the identity check every listed advisor has
 *   passed (`isVerifiedAdvisor` in the API's discovery query), and the
 *   review count.
 * - The profession and location lines are the headline split by
 *   `splitHeadline`; the location only exists when the headline names a
 *   province.
 * - The four figures are real or absent, never a placeholder zero.
 * - The featured cover is the advisor's first service photograph, with their
 *   verified skills as its caption; without one it keeps its cell, blank.
 * - No motion anywhere: colour changes on hover and focus, nothing moves.
 */

/** A photograph from `lib/assets/r2`, or an absolute URL from the API. */
export type Photo = StaticImageData | string;

/** One figure in the stats box. `value: null` is still on its way. */
export type ProfileFigure = {
  readonly key: string;
  readonly label: string;
  readonly value: string | null;
  /** The rating figure carries its star. */
  readonly star?: boolean;
};

export type FeaturedService = {
  readonly cover: Photo;
  readonly title: string;
  readonly href?: string;
};

/**
 * Everything the header draws. A `null` name, figure list or action means
 * "still loading": the header draws the shape of it instead, which is what
 * makes the loading state the same page as the loaded one.
 */
export type ProfileModel = {
  readonly name: string | null;
  readonly portrait: Photo | null;
  readonly initials: string;
  readonly verified: boolean;
  /** `undefined` while it is on its way; `null` when it could not be read. */
  readonly reviewCount: number | null | undefined;
  readonly role: string | null;
  readonly place: string | null;
  readonly figures: readonly ProfileFigure[] | null;
  /** `undefined` while it is being worked out; `null` when there is none. */
  readonly featured: FeaturedService | null | undefined;
  readonly skills: readonly string[];
  readonly chatHref: string | null;
  readonly servicesHref: string;
  readonly reviewsHref: string;
};

/** What a link does when the page handles it in place (a tab, the booking jump). */
export type LinkHandler = (event: MouseEvent<HTMLAnchorElement>) => void;

/** A plain left click, the only one a page should take over from the browser. */
export function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/* ------------------------------------------------------------------- page */

/** The wrapper the desktop bar sits in, for the tab jump to measure it. */
const PROFILE_BAR_ID = "advisor-profile-bar";

/**
 * The page around the profile: the phone keeps its own back bar and bottom
 * bar; from `lg` the site's own bar, the one search and the service page
 * wear (the rail is for the reader's own account pages, not someone else's
 * profile), and under it the way back, 44 round at 1440. The column is the
 * service page's: 1594 of content in the 1710 space, 32 in and 38 down.
 */
export function ProfilePage({
  back,
  actions,
  children,
}: {
  readonly back: string;
  /** The phone's bottom bar. Left out while there is nobody to act on. */
  readonly actions?: {
    readonly chatHref: string;
    readonly servicesHref: string;
    readonly onBook?: LinkHandler;
  };
  readonly children: ReactNode;
}) {
  const t = useTranslations("advisorProfile");
  const c = useTranslations("common");

  return (
    <MobileScreen className="bg-card pb-0" wide="md">
      <ScreenTopBar className="lg:hidden" href={back} label={c("back")} />
      <ScreenBody className="bg-card">
        {/* `contents`, so the bar is the scroller's own child and sticks. */}
        <div className="hidden lg:contents" id={PROFILE_BAR_ID}>
          <TopBar dock unreadNotifications />
        </div>
        <div className="app-scale mx-auto flex w-full flex-col lg:max-w-[1658px] lg:px-8 lg:pt-9.5">
          <Link
            aria-label={c("back")}
            className="hidden size-[52.25px] shrink-0 items-center justify-center self-start rounded-full bg-muted text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex"
            href={back}
          >
            {/* The checkout's arrow: 22 across in a 2px line at 1440. */}
            <ArrowLeft absoluteStrokeWidth aria-hidden className="size-[26.125px]" strokeWidth={2.375} />
          </Link>
          {children}
        </div>
      </ScreenBody>
      {actions ? (
        <div className="flex w-full shrink-0 items-center gap-3 overflow-clip border-t border-border bg-card px-6 py-3 shadow-panel lg:hidden">
          <Button
            aria-label={t("chat")}
            className="size-9 shrink-0"
            nativeButton={false}
            render={<Link href={actions.chatHref} />}
            size="icon"
            variant="outline"
          >
            <MessageSquare className="size-4" />
          </Button>
          {/* `PrimaryButton`'s proportions, with the click on the anchor
              itself: the booking jump is a link's handler, not a button's. */}
          <Button
            className="h-9 min-w-px flex-1 gap-2 border-0 px-4 shadow-none"
            nativeButton={false}
            render={<Link href={actions.servicesHref} onClick={actions.onBook} />}
          >
            {t("chooseService")}
          </Button>
        </div>
      ) : null}
    </MobileScreen>
  );
}

/* ----------------------------------------------------------------- header */

/** A bar the size of the text it stands in for. */
function Pending({ className }: { readonly className: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-muted", className)} />;
}

/**
 * The avatar: 72px on the phone, lapping the cover with a white
 * rim and a soft drop; 80 (×1.1875) on the desktop, flat.
 */
function Portrait({ portrait, initials }: { readonly portrait: Photo | null; readonly initials: string }) {
  return (
    // `relative` rather than `static` from `lg`: the photograph is a `fill`
    // image and needs this box to be the one it fills.
    <span className="absolute -top-9 left-4 flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted shadow-hero-card ring-2 ring-card lg:relative lg:top-0 lg:left-0 lg:size-[95px] lg:shadow-none lg:ring-0">
      {portrait ? (
        <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 96px, 72px" src={portrait} />
      ) : (
        <span aria-hidden className="text-heading leading-none font-medium text-muted-foreground lg:text-frame-title lg:leading-none">
          {initials}
        </span>
      )}
    </span>
  );
}

/** The `@handle` row: the identity check, then the review count. */
function MetaRow({
  verified,
  reviewCount,
  reviewsHref,
  onReviews,
}: {
  readonly verified: boolean;
  readonly reviewCount: number | null | undefined;
  readonly reviewsHref: string;
  readonly onReviews?: LinkHandler;
}) {
  const s = useTranslations("service");

  return (
    <div className="flex min-h-6 flex-wrap items-center gap-2 text-sm leading-[1.54] text-muted-foreground lg:min-h-[28.5px] lg:gap-[9.5px] lg:text-frame-meta">
      {verified ? (
        <span className="inline-flex items-center gap-1 lg:gap-[4.75px]">
          <BadgeCheck aria-hidden className="size-4 shrink-0 text-primary lg:size-[19px]" />
          {s("verifiedIdentity")}
        </span>
      ) : null}
      {verified && reviewCount !== null ? (
        <span aria-hidden className="text-dimmed">
          •
        </span>
      ) : null}
      <ReviewCount count={reviewCount} href={reviewsHref} onClick={onReviews} />
    </div>
  );
}

/** The figure in a count, bold in the Latin face (`t.rich`'s `<b>`). */
function boldFigure(chunks: ReactNode) {
  return <b className="font-latin font-bold text-foreground tabular-nums">{chunks}</b>;
}

/** The review count on the handle row: nothing when unknown, a bar while it loads, then the link. */
function ReviewCount({
  count,
  href,
  onClick,
}: {
  readonly count: number | null | undefined;
  readonly href: string;
  readonly onClick?: LinkHandler;
}) {
  const t = useTranslations("advisorProfile");
  if (count === null) return null;
  if (count === undefined) return <Pending className="h-4 w-14 lg:h-[19px] lg:w-[76px]" />;
  return (
    <Link
      className="rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      href={href}
      onClick={onClick}
    >
      {t.rich("reviewCountRich", { count, b: boldFigure })}
    </Link>
  );
}

/** The profession and location lines: a 16px line icon and a muted line. */
function IconLine({
  icon: Icon,
  className,
  children,
}: {
  readonly icon: LucideIcon;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-[5.6px] flex items-center gap-[5.6px] text-sm leading-[1.54] text-muted-foreground lg:mt-0 lg:gap-[6.65px] lg:text-frame-meta",
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0 lg:size-[19px]" strokeWidth={1.75} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * The stats: one row split by 24px rules
 * on the phone, a bordered box sized to its figures from `md`, each figure its
 * value over its label.
 */
function Figures({ figures }: { readonly figures: readonly ProfileFigure[] | null }) {
  const cells: readonly (ProfileFigure | null)[] = figures ?? [null, null, null, null];

  return (
    <dl className="mt-3 flex w-full py-2 md:w-fit md:max-w-full md:rounded-[16px] md:border md:border-border md:py-0 lg:mt-[19.125px] lg:rounded-[19px]">
      {cells.map((figure, index) => (
        <div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col-reverse items-center gap-1 px-1 text-center",
            index > 0 &&
              "before:absolute before:top-1/2 before:left-0 before:h-6 before:w-px before:-translate-y-1/2 before:bg-border md:before:hidden",
            "md:flex-none md:gap-0.5 md:p-4 md:first:pl-6 md:last:pr-6",
            "lg:gap-[2.375px] lg:p-[19px] lg:first:pl-[28.5px] lg:last:pr-[28.5px]",
          )}
          // Pending cells have no key of their own; they never reorder.
          key={figure?.key ?? `pending-${index}`}
        >
          <dt className="text-xs leading-[1.3] whitespace-nowrap text-muted-foreground lg:text-frame-label">
            {figure ? figure.label : <Pending className="my-0.5 h-3 w-10 lg:h-[14.25px] lg:w-13" />}
          </dt>
          <dd className="flex items-center gap-1 font-latin text-base leading-[1.2] font-semibold whitespace-nowrap text-foreground tabular-nums md:text-lg md:leading-[1.2] lg:gap-[4.75px] lg:text-frame-figure">
            {figure?.star ? (
              <Star aria-hidden className="size-[14.4px] shrink-0 fill-warning text-warning md:size-[16.2px] lg:size-[19.2px]" />
            ) : null}
            {figure?.value ?? <Pending className="h-4 w-8 lg:h-[21px] lg:w-9.5" />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The action pill, twice: the message (outline) and the booking (filled). */
function Pill({
  href,
  icon: Icon,
  filled = false,
  onClick,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly filled?: boolean;
  readonly onClick?: LinkHandler;
  readonly children: ReactNode;
}) {
  return (
    <Link
      className={cn(
        "flex h-10 min-w-0 items-center justify-center gap-3 rounded-full border pr-4 pl-3 text-base font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "lg:h-[47.5px] lg:gap-[14.25px] lg:pr-[19px] lg:pl-[14.25px] lg:text-frame-body",
        filled
          ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/85"
          : "border-accented bg-card text-foreground hover:bg-muted",
      )}
      href={href}
      onClick={onClick}
    >
      <Icon aria-hidden className="size-4 shrink-0 lg:size-[19px]" strokeWidth={1.75} />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Actions({
  chatHref,
  servicesHref,
  onBook,
}: {
  readonly chatHref: string | null;
  readonly servicesHref: string;
  readonly onBook?: LinkHandler;
}) {
  const t = useTranslations("advisorProfile");

  return (
    <div className="mt-[10.4px] grid grid-cols-2 gap-3 lg:mt-[4.625px] lg:flex lg:flex-wrap lg:items-center lg:gap-[14.25px]">
      {chatHref ? (
        <>
          <Pill href={chatHref} icon={MessageCircle}>
            {t("message")}
          </Pill>
          <Pill filled href={servicesHref} icon={CalendarPlus} onClick={onBook}>
            {t("book")}
          </Pill>
        </>
      ) : (
        <>
          <Pending className="h-10 rounded-full lg:h-[47.5px] lg:w-[180px]" />
          <Pending className="h-10 rounded-full lg:h-[47.5px] lg:w-[200px]" />
        </>
      )}
    </div>
  );
}

/** A verified skill as an outline badge. */
function SkillChip({ children }: { readonly children: string }) {
  return (
    <li className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border px-4 text-base font-medium text-muted-foreground lg:min-h-[42.75px] lg:gap-[7.125px] lg:px-[19px] lg:text-frame-body">
      <ShieldCheck aria-hidden className="size-4.5 shrink-0 text-success lg:size-[21.375px]" strokeWidth={1.75} />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

const COVER_BOX =
  "relative block h-50 w-full overflow-hidden md:rounded-2xl lg:aspect-video lg:h-auto lg:rounded-[21.375px]";

/**
 * The cover itself: grey while it loads, an empty cell when there is none,
 * the photograph (a link to the service when it has one) otherwise.
 */
function FeaturedCover({ featured }: { readonly featured: FeaturedService | null | undefined }) {
  const t = useTranslations("advisorProfile");
  if (featured === undefined) return <span aria-hidden className={cn(COVER_BOX, "bg-muted")} />;
  // A blank cover: the cell keeps its size and draws nothing.
  if (featured === null) return <span aria-hidden className={COVER_BOX} />;
  const image = (
    <Image alt="" className="object-cover" fill priority sizes="(min-width: 1024px) 680px, 100vw" src={featured.cover} />
  );
  if (!featured.href) return <span className={cn(COVER_BOX, "bg-muted")}>{image}</span>;
  return (
    <Link
      aria-label={t("featuredLabel", { title: featured.title })}
      className={cn(COVER_BOX, "bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}
      href={featured.href}
    >
      {image}
      <span className="absolute bottom-[19px] left-[19px] hidden max-w-[calc(100%-38px)] items-center rounded-full bg-card/95 px-[19px] py-[7.125px] text-frame-meta font-medium text-foreground shadow-hero-card lg:flex">
        <span className="truncate">{featured.title}</span>
      </span>
    </Link>
  );
}

/**
 * The featured cover: the full-bleed 200px cover on the phone, the
 * 16:9 cover in the right-hand cell from `lg`, captioned with skills there.
 */
function Featured({
  featured,
  skills,
}: {
  readonly featured: FeaturedService | null | undefined;
  readonly skills: readonly string[];
}) {
  return (
    <figure className="m-0 flex w-full flex-col md:px-5 lg:col-start-2 lg:row-start-1 lg:gap-[16.15px] lg:px-0">
      <FeaturedCover featured={featured} />
      {/* A blank cover drops its caption too. */}
      {featured !== null && skills.length > 0 ? (
        <figcaption className="hidden lg:block">
          <ul className="flex flex-wrap gap-[9.5px]">
            {skills.map((skill) => (
              <SkillChip key={skill}>{skill}</SkillChip>
            ))}
          </ul>
        </figcaption>
      ) : null}
    </figure>
  );
}

/** The page head: the cover and the identity beside (desktop) or under (phone) it. */
export function ProfileHeader({
  model,
  onReviews,
  onBook,
}: {
  readonly model: ProfileModel;
  readonly onReviews?: LinkHandler;
  readonly onBook?: LinkHandler;
}) {
  return (
    <header className="flex w-full flex-col lg:grid lg:grid-cols-[minmax(684px,1fr)_minmax(0,807.5px)] lg:items-start lg:gap-x-9.5 lg:pt-9.5">
      <Featured featured={model.featured} skills={model.skills} />

      <div className="relative z-1 -mt-9 flex flex-col rounded-t-[24px] bg-card px-4 pt-11 md:mx-5 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:mt-0 lg:max-w-[836px] lg:flex-row lg:gap-[28.5px] lg:rounded-none lg:bg-transparent lg:p-0">
        <Portrait initials={model.initials} portrait={model.portrait} />

        <div className="flex min-w-0 flex-1 flex-col gap-[5.6px] lg:gap-[7.125px] lg:pt-[4.75px]">
          {model.name === null ? (
            <Pending className="h-6.5 w-48 lg:h-[41.8px] lg:w-[380px]" />
          ) : (
            <h1 className="-mb-[3.6px] text-xl leading-[1.3] font-bold text-foreground lg:mb-0 lg:text-frame-title lg:leading-[1.1] lg:font-semibold">
              {model.name}
            </h1>
          )}
          <MetaRow
            onReviews={onReviews}
            reviewCount={model.reviewCount}
            reviewsHref={model.reviewsHref}
            verified={model.verified}
          />
          {model.name === null ? (
            <>
              <Pending className="mt-[5.6px] h-[21.5px] w-56 lg:mt-0 lg:h-[25.6px] lg:w-[280px]" />
              <Pending className="mt-[5.6px] h-[21.5px] w-32 lg:mt-[2.375px] lg:h-[25.6px] lg:w-[150px]" />
            </>
          ) : (
            <>
              {model.role ? <IconLine icon={BriefcaseBusiness}>{model.role}</IconLine> : null}
              {model.place ? (
                <IconLine className="lg:mt-[2.375px]" icon={MapPin}>
                  {model.place}
                </IconLine>
              ) : null}
            </>
          )}
          <Figures figures={model.figures} />
          <Actions chatHref={model.chatHref} onBook={onBook} servicesHref={model.servicesHref} />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------- tabs */

export type TabItem = {
  readonly key: ProfileTab;
  readonly label: string;
  readonly href: string;
};

/** The id the tab bar and the booking jump find the content by. */
export const PROFILE_CONTENT_ID = "advisor-profile-content";
const PROFILE_TABS_ID = "advisor-profile-tabs";

/**
 * Bring the tab's content up under the sticky tab bar, at once (the user
 * asked for no motion; `scrollTo` with "instant" skips the scroller's smooth
 * behaviour).
 */
export function revealProfileContent(): void {
  const content = document.getElementById(PROFILE_CONTENT_ID);
  const body = content?.closest<HTMLElement>('[data-slot="screen-body"]');
  if (!content || !body) return;
  const tabs = document.getElementById(PROFILE_TABS_ID)?.getBoundingClientRect().height ?? 0;
  // The desktop bar the tabs stick under: `TopBar`'s last element is its
  // sticky row, and the wrapper is hidden (0 tall) below `lg`.
  const bar = document.getElementById(PROFILE_BAR_ID)?.lastElementChild?.getBoundingClientRect().height ?? 0;
  const top = content.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - tabs - bar;
  body.scrollTo({ top, behavior: "instant" });
}

/**
 * The current tab, switched in place: the content changes
 * under the sticky bar and the page keeps its scroll. The address follows
 * (`replaceState`, which Next's router tracks), so a reload or a shared link
 * opens the same tab from its own prerendered route.
 *
 * `jumpTo` is for the links that lead to a tab from elsewhere on the page,
 * the booking pill and the review count: switch, then bring the content up.
 */
export function useProfileTab(
  initial: ProfileTab,
  hrefFor: (tab: ProfileTab) => string,
): {
  readonly tab: ProfileTab;
  readonly select: (tab: ProfileTab) => void;
  readonly jumpTo: (tab: ProfileTab) => LinkHandler;
} {
  const [tab, setTab] = useState(initial);
  const select = useCallback(
    (next: ProfileTab) => {
      setTab(next);
      window.history.replaceState(null, "", hrefFor(next));
    },
    [hrefFor],
  );
  const jumpTo = useCallback(
    (next: ProfileTab): LinkHandler =>
      (event) => {
        if (!isPlainClick(event)) return;
        event.preventDefault();
        select(next);
        // A click's update is rendered before the next frame, so the new
        // tab's content is in place by then.
        requestAnimationFrame(revealProfileContent);
      },
    [select],
  );
  return { tab, select, jumpTo };
}

/**
 * Line tabs: a 48px tab, the label semibold when current with a
 * 2px rule on the hairline under the bar, and the bar sticking to the top of
 * the scroller, from `lg` to the foot of the site's bar: its 88 (zoomed by
 * `doc-scale`) over this column's own zoom (`app-scale`). Every tab is the
 * route it names, so it opens in a new tab and survives a reload; a plain
 * click switches in place (`onSelect`).
 */
export function ProfileTabs({
  current,
  items,
  label,
  onSelect,
}: {
  readonly current: ProfileTab;
  readonly items: readonly TabItem[];
  readonly label: string;
  readonly onSelect: (tab: ProfileTab) => void;
}) {
  return (
    <div
      className="sticky top-0 z-10 mt-1 w-full border-b border-border bg-card px-4 pt-3 pb-px md:mx-6 md:mt-2 md:w-auto md:px-3 lg:top-[calc(88px*clamp(0.75,tan(atan2(100vw,1710px)),1)/tan(atan2(min(100vw,1440px),1710px)))] lg:-mx-[14.25px] lg:mt-[23.75px] lg:px-[14.25px] lg:pt-[14.25px]"
      id={PROFILE_TABS_ID}
    >
      <nav aria-label={label} className="flex items-end gap-0.5 md:min-h-13 lg:min-h-[61.75px] lg:gap-[2.375px]">
        {items.map((item) => {
          const selected = item.key === current;
          return (
            <Link
              aria-current={selected ? "page" : undefined}
              className={cn(
                "relative flex h-12 shrink-0 items-center justify-center rounded-[12px] px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                "lg:h-[57px] lg:rounded-[14.25px] lg:px-[19px] lg:text-frame-body",
                selected ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              href={item.href}
              key={item.key}
              onClick={(event) => {
                if (!isPlainClick(event)) return;
                event.preventDefault();
                onSelect(item.key);
              }}
            >
              {/* The semibold copy holds the width, so the row does not shift
                  when the current tab changes. */}
              <span className="grid">
                <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
                  {item.label}
                </span>
                <span className="col-start-1 row-start-1">{item.label}</span>
              </span>
              {selected ? (
                <span
                  aria-hidden
                  className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-foreground lg:inset-x-[19px] lg:h-[2.375px]"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** The tab's panel: 28px under the tabs on the phone, 32 from `md`, 80 of room at the foot. */
export function TabPanel({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full flex-col px-4 pt-7 pb-10 md:px-9 md:pt-8 lg:px-0 lg:pt-9.5 lg:pb-[95px]" id={PROFILE_CONTENT_ID}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

/**
 * A rounded panel that fades from the muted
 * ground to nothing, closed by a hairline that fades out at both ends.
 */
export function FadePanel({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn("relative w-full rounded-[16px] bg-linear-to-b from-muted to-transparent lg:rounded-[19px]", className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] bottom-0 h-px bg-linear-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}

function Tile({ photo, className }: { readonly photo: Photo | undefined; readonly className: string }) {
  return (
    <span className={cn("relative block w-full shrink-0 overflow-hidden rounded-lg bg-muted lg:rounded-[11.875px]", className)}>
      {photo ? <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 96px, 100px" src={photo} /> : null}
    </span>
  );
}

/**
 * The empty-state collage: three columns of
 * photographs fading into the panel from `lg`, two columns below it. Ours are
 * the advisor's own service photographs, topped up from the catalogue.
 */
export function PhotoCollage({ photos }: { readonly photos: readonly Photo[] }) {
  const at = (index: number) => (photos.length > 0 ? photos[index % photos.length] : undefined);

  return (
    <span aria-hidden className="block">
      <span className="flex h-[173px] w-50 gap-2 lg:hidden">
        <span className="flex flex-1 flex-col gap-2">
          <Tile className="h-18" photo={at(0)} />
          <Tile className="h-18" photo={at(3)} />
        </span>
        <span className="flex flex-1 flex-col gap-2">
          <Tile className="h-[101px]" photo={at(1)} />
          <Tile className="h-16" photo={at(2)} />
        </span>
      </span>
      <span className="relative hidden lg:flex lg:h-[237.5px] lg:w-[261.25px] lg:gap-[9.5px]">
        <span className="flex flex-1 flex-col gap-[9.5px]">
          <Tile className="h-[85.5px]" photo={at(0)} />
          <Tile className="h-[76px]" photo={at(4)} />
        </span>
        <span className="flex flex-1 flex-col gap-[9.5px]">
          <Tile className="h-[152px]" photo={at(1)} />
          <Tile className="h-[76px]" photo={at(2)} />
        </span>
        <span className="flex flex-1 flex-col gap-[9.5px]">
          <Tile className="h-[95px]" photo={at(3)} />
          <Tile className="h-[114px]" photo={at(5)} />
        </span>
        <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-card opacity-70" />
      </span>
    </span>
  );
}

/** A sketched service card: a photograph and two grey lines. */
function SketchCard({ photo, className }: { readonly photo: Photo | undefined; readonly className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-lg bg-card p-1.5 shadow-hero-card lg:gap-[9.5px] lg:rounded-[11.875px] lg:p-[7.125px]",
        className,
      )}
    >
      <span className="relative block h-[49px] w-[65px] shrink-0 overflow-hidden rounded-sm bg-muted lg:h-[58.2px] lg:w-[77.2px] lg:rounded-[7.125px]">
        {photo ? <Image alt="" className="object-cover" fill sizes="80px" src={photo} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 pr-1 lg:gap-[7.125px]">
        <span className="block h-2 w-full rounded-xs bg-muted lg:h-[9.5px] lg:w-[88%]" />
        <span className="block h-2 w-1/2 rounded-xs bg-muted lg:h-[9.5px]" />
      </span>
    </span>
  );
}

/**
 * The empty-services figure: three sketched service cards stacked and fading
 * from `lg`, one on its own below it. Prices are drawn as lines, so no
 * stranger's price reads as this advisor's.
 */
export function ServicesSketch({ photos }: { readonly photos: readonly Photo[] }) {
  const at = (index: number) => (photos.length > 0 ? photos[index % photos.length] : undefined);

  return (
    <span aria-hidden className="block">
      <span className="flex w-35 lg:hidden">
        <SketchCard className="w-full" photo={at(0)} />
      </span>
      <span className="relative hidden lg:flex lg:w-[220.875px] lg:flex-col lg:gap-[9.5px]">
        <SketchCard photo={at(0)} />
        <SketchCard photo={at(1)} />
        <SketchCard photo={at(2)} />
        <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-card opacity-70" />
      </span>
    </span>
  );
}

/** The empty state: the figure, an 18px title, a 14px line, and an optional way on. */
export function EmptyNotice({
  figure,
  title,
  body,
  action,
}: {
  readonly figure: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly action?: ReactNode;
}) {
  return (
    <FadePanel className="flex flex-col items-center gap-1.5 px-8 py-15 text-center lg:gap-[7.125px] lg:px-9.5 lg:py-[71.25px]">
      <span className="mb-2 block lg:mb-[9.5px]">{figure}</span>
      <h2 className="text-lg leading-[1.4] font-semibold text-foreground lg:text-frame-figure lg:leading-[1.4]">{title}</h2>
      <p className="max-w-[42ch] text-sm leading-[1.54] text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
      {action ? <div className="mt-2 lg:mt-[9.5px]">{action}</div> : null}
    </FadePanel>
  );
}

/** A pill link in the empty state's own voice, its way on. */
export function NoticeLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <Link
      className="flex h-10 items-center justify-center rounded-full border border-accented bg-card px-5 text-base font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-[47.5px] lg:px-[23.75px] lg:text-frame-body"
      href={href}
    >
      {children}
    </Link>
  );
}

/**
 * `ApiErrorCard`, a size up from `lg`: inside the frame's zoom its 14 and
 * 16px type would land under 13px at 1440.
 */
export function PanelError({
  title,
  error,
  onRetry,
}: {
  readonly title: string;
  readonly error: Error;
  readonly onRetry?: () => void;
}) {
  return (
    <ApiErrorCard
      className="lg:max-w-[760px] lg:gap-[19px] lg:rounded-[19px] lg:p-9.5 lg:[&_[data-slot=button]]:h-[47.5px] lg:[&_[data-slot=button]]:px-[23.75px] lg:[&_[data-slot=button]]:text-frame-body lg:[&>p:first-child]:text-frame-heading lg:[&>p:nth-child(2)]:text-frame-body"
      error={error}
      onRetry={onRetry}
      title={title}
    />
  );
}

/* --------------------------------------------------------------- services */

/**
 * The search page's grid and its card (`ResultCard`), so a service looks the
 * same here as where it was found: on white, two across on the phone and the
 * upright tablet. From `lg` five across rather than search's four, since this
 * column is 1594 wide to search's 1136: five keeps each card near search's
 * 254 (287), where four would blow it up to 369.
 */
const SERVICE_GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 lg:grid-cols-5 lg:gap-x-10 lg:gap-y-14";

export function ServiceGrid({ items }: { readonly items: readonly LiveService[] }) {
  return (
    <ul className={SERVICE_GRID}>
      {items.map((item) => (
        // A grid cell, so the card fills the row's height and the prices line up.
        <li className="grid" key={item.id}>
          <ResultCard item={item} />
        </li>
      ))}
    </ul>
  );
}

/** The grid's shape while the services are on their way: the card's photo and three lines. */
export function ServiceGridPending() {
  return (
    <div aria-hidden className={SERVICE_GRID}>
      {[0, 1, 2, 3].map((index) => (
        <span className="flex flex-col gap-3" key={index}>
          <span className="block aspect-[4/3] w-full rounded-2xl bg-muted" />
          <span className="flex flex-col gap-2 px-0.5">
            <Pending className="h-4 w-1/2" />
            <Pending className="h-4 w-4/5" />
            <Pending className="h-3 w-1/3" />
          </span>
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- reviews */

export type ReviewModel = {
  readonly key: string;
  readonly name: string;
  readonly initials: string;
  readonly avatar: Photo | null;
  readonly date: string;
  readonly stars: number;
  readonly service: string;
  /** The package it was booked on; null for a service sold whole. */
  readonly pkg: string | null;
  /** The service's page, when it has one to open. */
  readonly serviceHref?: string;
  readonly comment: string | null;
  readonly reply: string | null;
};

export type RatingModel = {
  readonly average: number;
  readonly total: number;
};

/** The reviews' grid: one to a row on the phone, two from `md`, three from `lg`, 40 and 48 apart at 1440. */
const REVIEW_GRID = "grid gap-10 md:grid-cols-2 md:gap-x-10 lg:grid-cols-3 lg:gap-x-[47.5px] lg:gap-y-[57px]";

/** Five 9px stars at 1440, filled to the score, said once for a screen reader. */
function StarRow({ value }: { readonly value: number }) {
  const t = useTranslations("advisorProfile");
  const filled = Math.round(value);
  return (
    <span aria-label={t("reviewStars", { stars: value })} className="flex items-center gap-px lg:gap-[1.1875px]" role="img">
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
 * One review the way the service page draws its own, unboxed: the 40 face
 * with the name 14/500 and, under it, the service and the package it was
 * for (the way to that service); 16 under that the stars and the date; 13
 * under them what they said, 14/20; the advisor's reply on a rule.
 */
function ReviewItem({ review }: { readonly review: ReviewModel }) {
  const t = useTranslations("advisorProfile");
  const s = useTranslations("service");
  const what = s("reviewFor", { service: review.pkg ? `${review.service} · ${review.pkg}` : review.service });
  const whatClass = "truncate text-xs text-muted-foreground lg:text-frame-label";

  return (
    <li className="flex min-w-0 flex-col">
      <div className="flex items-center gap-4 lg:gap-[23.75px]">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-foreground lg:size-[47.5px] lg:text-frame-meta">
          {review.avatar ? (
            <Image alt="" className="object-cover" fill sizes="48px" src={review.avatar} />
          ) : (
            <span aria-hidden>{review.initials}</span>
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-meta lg:leading-[1.29]">{review.name}</span>
          {review.serviceHref ? (
            <Link className={cn(whatClass, "underline-offset-4 hover:text-foreground hover:underline")} href={review.serviceHref}>
              {what}
            </Link>
          ) : (
            <span className={whatClass}>{what}</span>
          )}
        </span>
      </div>
      <span className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground lg:mt-[19px] lg:gap-[4.75px] lg:text-frame-label">
        <StarRow value={review.stars} />
        <span aria-hidden>·</span>
        {review.date}
      </span>
      {review.comment ? (
        <p className="mt-3 text-sm leading-[1.43] text-foreground lg:mt-[15.4px] lg:text-frame-meta lg:leading-[1.43]">
          {review.comment}
        </p>
      ) : null}
      {review.reply ? (
        <div className="mt-3 flex flex-col gap-0.5 border-l-2 border-border pl-3 lg:mt-[15.4px] lg:gap-[2.375px] lg:pl-[14.25px]">
          <span className="text-xs font-medium text-foreground lg:text-frame-label">{t("advisorReply")}</span>
          <p className="text-sm text-muted-foreground lg:text-frame-meta">{review.reply}</p>
        </div>
      ) : null}
    </li>
  );
}

/**
 * The reviews under a head that is the score itself, as on the service page
 * (22/600 at 1440), then the reviews unboxed on white.
 */
export function ReviewList({
  rating,
  reviews,
}: {
  readonly rating: RatingModel | null;
  readonly reviews: readonly ReviewModel[];
}) {
  const t = useTranslations("advisorProfile");
  const format = useFormatter();

  return (
    <section aria-labelledby="profile-reviews-title" className="flex flex-col">
      <h2
        className="mb-6 text-xl leading-tight font-semibold text-foreground lg:mb-9.5 lg:text-heading lg:leading-tight"
        id="profile-reviews-title"
      >
        {rating && rating.total > 0 ? (
          <span className="inline-flex items-center gap-2 lg:gap-[9.5px]">
            <Star aria-hidden className="size-4 fill-current lg:size-[19px]" />
            {format.number(rating.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span aria-hidden>·</span>
            {t("reviewCount", { count: rating.total })}
          </span>
        ) : (
          t("reviewsTitle")
        )}
      </h2>
      <ul className={REVIEW_GRID}>
        {reviews.map((review) => (
          <ReviewItem key={review.key} review={review} />
        ))}
      </ul>
    </section>
  );
}

/** The reviews' shape while they are on their way: the head, and three reviews' faces and lines. */
export function ReviewListPending() {
  return (
    <div aria-hidden className="flex flex-col">
      <Pending className="mb-6 h-7 w-48 lg:mb-9.5 lg:h-[33px] lg:w-[260px]" />
      <div className={REVIEW_GRID}>
        {[0, 1, 2].map((index) => (
          <span className="flex flex-col gap-4 lg:gap-[19px]" key={index}>
            <span className="flex items-center gap-4 lg:gap-[23.75px]">
              <span className="block size-10 shrink-0 rounded-full bg-muted lg:size-[47.5px]" />
              <Pending className="h-4 w-1/3 lg:h-[19px]" />
            </span>
            <Pending className="h-3 w-4/5 lg:h-[16.6px]" />
            <Pending className="h-3 w-3/5 lg:h-[16.6px]" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pending */

/**
 * The whole page before there is an advisor to draw: the same header, tabs
 * and panel, each in the shape of what will fill it. Still, like the rest of
 * the page: no shimmer.
 */
export function PendingProfile({
  back,
  tab,
  items,
  label,
  onSelect,
  servicesHref,
  reviewsHref,
}: {
  readonly back: string;
  readonly tab: ProfileTab;
  readonly items: readonly TabItem[];
  readonly label: string;
  readonly onSelect: (tab: ProfileTab) => void;
  readonly servicesHref: string;
  readonly reviewsHref: string;
}) {
  const model: ProfileModel = {
    name: null,
    portrait: null,
    initials: "",
    verified: false,
    reviewCount: undefined,
    role: null,
    place: null,
    figures: null,
    featured: undefined,
    skills: [],
    chatHref: null,
    servicesHref,
    reviewsHref,
  };

  return (
    <ProfilePage back={back}>
      <ProfileHeader model={model} />
      <ProfileTabs current={tab} items={items} label={label} onSelect={onSelect} />
      <TabPanel>
        {tab === "reviews" ? <ReviewListPending /> : null}
        {tab === "services" ? <ServiceGridPending /> : null}
      </TabPanel>
    </ProfilePage>
  );
}

/* ------------------------------------------------------------------ about */

/**
 * An About section, after the profile pages of a large freelance
 * marketplace: the head 20/500, the body under it, a hairline between one
 * section and the next and none above the first.
 */
function AboutSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="border-t border-border py-7 first:border-t-0 first:pt-0 lg:py-9.5 lg:first:pt-0">
      <h2 className="mb-5 text-lg font-medium text-foreground lg:mb-[23.75px] lg:text-frame-heading">{title}</h2>
      {children}
    </section>
  );
}

/** The head of a row: 17/500 in ink, and what goes beside it (the current job's pill). */
const ROW_HEAD = "text-base font-medium text-foreground lg:text-frame-body";
/** A row's lines: 15/22 in grey. */
const ROW_LINE = "text-sm leading-[1.47] text-muted-foreground lg:text-frame-meta lg:leading-[1.47]";

/**
 * A row of the lists with a place to it, a job or a course: the place's
 * initials on a 64 grey tile, 14 round, 20 from the head 17/500 and the
 * lines 15 in grey under it.
 */
function PlaceRow({
  place,
  head,
  aside,
  children,
}: {
  readonly place: string;
  readonly head: string;
  readonly aside?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <li className="flex items-start gap-5 lg:gap-[23.75px]">
      <span
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center rounded-[12px] bg-muted text-base font-semibold text-muted-foreground lg:size-[76px] lg:rounded-[16.625px] lg:text-frame-figure"
      >
        {initialsOf(place)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5 lg:gap-[4.75px] lg:pt-[2.375px]">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:gap-x-[9.5px]">
          <span className={ROW_HEAD}>{head}</span>
          {aside}
        </p>
        {children}
      </div>
    </li>
  );
}

/** A plain row, with nothing to put on a tile: the head, and its line under it. */
function TextRow({ head, line }: { readonly head: string; readonly line: string | null }) {
  return (
    <li className="flex flex-col gap-0.5 lg:gap-[2.375px]">
      <span className={ROW_HEAD}>{head}</span>
      {line ? <span className={ROW_LINE}>{line}</span> : null}
    </li>
  );
}

/** A month and year ("มิ.ย. 2562"), or the year alone when the month is not given. */
function useMonthYear() {
  const format = useFormatter();
  return useCallback(
    (year: number, month: number | null) =>
      format.dateTime(new Date(year, (month ?? 1) - 1, 1), month ? { month: "short", year: "numeric" } : { year: "numeric" }),
    [format],
  );
}

/** What the About tab shows below the introduction; undefined while it loads, null where there is none. */
export type AboutBackground = ApiAdvisorBackground | null | undefined;

/**
 * The About tab, drawn after the same pages' own: the full column inset 38
 * at 1440, one section per subject, each only when there is something in it:
 * the introduction, work experience (the current job marked), education,
 * the skills an admin approved proof for, languages, and licences and
 * awards. The background is the advisor's own words
 * (`GET /advisors/:id/background`).
 */
export function AboutView({
  bio,
  skills,
  background,
}: {
  readonly bio: string | null;
  readonly skills: readonly string[];
  readonly background: AboutBackground;
}) {
  const t = useTranslations("advisorProfile");
  const format = useFormatter();
  const monthYear = useMonthYear();
  const experiences = background?.experiences ?? [];
  const educations = background?.educations ?? [];
  const languages = background?.languages ?? [];
  const credentials = background?.credentials ?? [];

  return (
    <div className="flex w-full flex-col pb-12 lg:px-[45.125px] lg:pb-[57px]">
      {bio ? (
        <AboutSection title={t("introTitle")}>
          <p className="text-base leading-7 whitespace-pre-line text-foreground lg:text-frame-body lg:leading-[1.6]">{bio}</p>
        </AboutSection>
      ) : null}

      {background === undefined ? (
        <AboutSection title={t("experienceTitle")}>
          <div aria-hidden className="flex items-start gap-5 lg:gap-[23.75px]">
            <span className="block size-14 shrink-0 rounded-[12px] bg-muted lg:size-[76px] lg:rounded-[16.625px]" />
            <span className="flex flex-1 flex-col gap-2 pt-1 lg:gap-[9.5px]">
              <Pending className="h-4 w-2/3 lg:h-[19px]" />
              <Pending className="h-3 w-1/3 lg:h-[16.6px]" />
            </span>
          </div>
        </AboutSection>
      ) : null}

      {experiences.length > 0 ? (
        <AboutSection title={t("experienceTitle")}>
          <ul className="flex flex-col gap-6 lg:gap-[28.5px]">
            {experiences.map((job) => {
              const current = job.endYear === null;
              const from = monthYear(job.startYear, job.startMonth);
              let period = `${from} – ${t("present")}`;
              if (!current) {
                period = job.startMonth && job.endMonth
                  ? format.dateTimeRange(
                      new Date(job.startYear, job.startMonth - 1, 1),
                      new Date(job.endYear, job.endMonth - 1, 1),
                      { month: "short", year: "numeric" },
                    )
                  : `${from} – ${monthYear(job.endYear, job.endMonth)}`;
              }
              return (
                <PlaceRow
                  aside={
                    current ? (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground lg:px-[11.875px] lg:py-[3.5625px] lg:text-frame-label">
                        {t("current")}
                      </span>
                    ) : null
                  }
                  head={`${job.title} · ${job.organization}`}
                  key={`${job.title}-${job.organization}-${job.startYear}`}
                  place={job.organization}
                >
                  <span className={ROW_LINE}>{period}</span>
                  {job.description ? <span className={cn(ROW_LINE, "whitespace-pre-line")}>{job.description}</span> : null}
                </PlaceRow>
              );
            })}
          </ul>
        </AboutSection>
      ) : null}

      {educations.length > 0 ? (
        <AboutSection title={t("educationTitle")}>
          <ul className="flex flex-col gap-6 lg:gap-[28.5px]">
            {educations.map((course) => {
              let years: string | null = null;
              if (course.startYear && course.endYear) {
                years = format.dateTimeRange(new Date(course.startYear, 0, 1), new Date(course.endYear, 0, 1), { year: "numeric" });
              } else if (course.endYear ?? course.startYear) {
                years = monthYear((course.endYear ?? course.startYear) as number, null);
              }
              return (
                <PlaceRow
                  head={course.degree ? `${course.institution} · ${course.degree}` : course.institution}
                  key={`${course.institution}-${course.degree ?? ""}`}
                  place={course.institution}
                >
                  {years ? <span className={ROW_LINE}>{years}</span> : null}
                </PlaceRow>
              );
            })}
          </ul>
        </AboutSection>
      ) : null}

      {skills.length > 0 ? (
        <AboutSection title={t("verifiedSkills")}>
          <ul className="flex flex-wrap gap-3 lg:gap-[14.25px]">
            {skills.map((skill) => (
              <li
                className="flex min-h-11 items-center rounded-full border border-border px-5 text-base text-foreground lg:min-h-[54.625px] lg:px-[23.75px] lg:text-frame-body"
                key={skill}
              >
                {skill}
              </li>
            ))}
          </ul>
        </AboutSection>
      ) : null}

      {languages.length > 0 ? (
        <AboutSection title={t("languagesTitle")}>
          <ul className="flex flex-col gap-4 lg:gap-[19px]">
            {languages.map((entry) => (
              <TextRow head={entry.language} key={entry.language} line={t(`proficiency.${entry.proficiency}`)} />
            ))}
          </ul>
        </AboutSection>
      ) : null}

      {credentials.length > 0 ? (
        <AboutSection title={t("credentialsTitle")}>
          <ul className="flex flex-col gap-4 lg:gap-[19px]">
            {credentials.map((entry) => {
              const line = [entry.issuer, entry.year ? monthYear(entry.year, null) : null].filter(Boolean).join(" · ");
              return <TextRow head={entry.title} key={`${entry.title}-${entry.year ?? ""}`} line={line || null} />;
            })}
          </ul>
        </AboutSection>
      ) : null}
    </div>
  );
}
