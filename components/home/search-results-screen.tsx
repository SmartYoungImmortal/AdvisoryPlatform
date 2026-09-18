import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  getAdvisor,
  getService,
  type Service,
} from "@/lib/catalogue/services";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import {
  FilterButton,
  FilterChip,
  SearchField,
  ServicePrice,
  ServiceProof,
  VerifiedTick,
} from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

/**
 * Figma "Result Card" — an 88px square cover beside the title, advisor and meta.
 *
 * A results list whose rows go nowhere is a dead end, which is what this was
 * until `/service/[id]` existed. It reads the same catalogue the home rails do,
 * so a service found here and a service found there are the same record.
 */
function ResultCard({ service }: { readonly service: Service }) {
  const advisor = getAdvisor(service.advisorId);
  if (!advisor) return null;

  return (
    // Figma's desktop "Card /" (1564:25369) turns the same record on its side:
    // a 140px cover across the top of a 282 column, then the body under it.
    // The frame also stamps an advisor level on the cover; the catalogue has no
    // level to read, so that badge is left off rather than invented.
    <Link
      className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-xl border bg-card p-2 lg:flex-col lg:gap-0 lg:p-0"
      href={`/service/${service.id}`}
    >
      <Image
        alt=""
        className="size-22 shrink-0 rounded-xl object-cover lg:h-35 lg:w-full lg:rounded-none"
        src={service.cover}
      />
      <span className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip lg:w-full lg:flex-none lg:gap-1.5 lg:p-3.5">
        <span className="w-full text-sm font-semibold text-foreground">
          <ThaiText>{service.title}</ThaiText>
        </span>
        <span className="flex w-full shrink-0 items-center gap-1 overflow-clip">
          <ChatAvatar crop={advisor.crop} size={16} src={advisor.avatar} />
          <span className="flex min-w-px flex-1 items-center gap-1 overflow-clip">
            <span className="min-w-px truncate text-xs font-normal text-muted-foreground">
              {advisor.name}
            </span>
            {advisor.verified ? <VerifiedTick /> : null}
          </span>
        </span>
        <ServiceProof
          bookings={service.bookings}
          rating={advisor.rating}
          reviews={advisor.reviews}
          starClassName="size-3"
        />
        <ServicePrice minutes={service.minutes} price={service.price} />
      </span>
    </Link>
  );
}

/** A rail section: the label, an optional hint under it, then the control. */
function RailGroup({
  title,
  hint,
  children,
}: {
  readonly title: string;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      <p className="w-full text-sm font-semibold text-foreground">{title}</p>
      {hint ? (
        <p className="w-full text-xs font-normal text-muted-foreground">{hint}</p>
      ) : null}
      <div className="w-full pt-0.5">{children}</div>
    </div>
  );
}

/** Figma "Opt /" — a radio and its label, on one 20px row. */
function RailOption({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <label className="flex w-full items-center gap-2 py-1 text-sm font-normal text-foreground">
      <RadioGroupItem className="size-4 shrink-0" value={value} />
      {label}
    </label>
  );
}

/**
 * Figma "Filter Rail" (1564:25283) — the 280px card of filters the desktop
 * frame stands beside the results: categories as chips, a price range, advisor
 * level, review score, when they are free, and verified-only.
 *
 * The phone frame has no room for it and shows three active-filter chips
 * instead, so the rail starts at `lg`. Nothing here is wired: the prototype
 * filters no data yet, and the frame draws the controls in their resting state.
 */
function FilterRail() {
  const t = useTranslations("search");
  const h = useTranslations("home");

  return (
    <aside className="hidden shrink-0 lg:block lg:w-70 lg:self-start lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-4.5">
      <div className="flex items-center justify-between pb-4">
        <p className="text-lg leading-7 font-semibold text-foreground">
          {t("filtersTitle")}
        </p>
        <Button
          className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent"
          size="sm"
          variant="ghost"
        >
          {t("clearAll")}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <RailGroup hint={t("categoryHint")} title={t("categoryTitle")}>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_KEYS.map((key) => (
              <FilterChip key={key}>{h(key)}</FilterChip>
            ))}
          </div>
        </RailGroup>

        <RailGroup hint={t("priceHint")} title={t("priceTitle")}>
          {/* The frame's slider, at rest: a full track with no handle drawn. */}
          <div aria-hidden className="h-1 w-full rounded-full bg-primary/25" />
          <div className="flex items-center justify-between pt-2 font-latin text-xs text-muted-foreground">
            <span>{t("priceMin")}</span>
            <span>{t("priceMax")}</span>
          </div>
        </RailGroup>

        <RailGroup title={t("levelTitle")}>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active>{t("levelAll")}</FilterChip>
            {[1, 2, 3].map((level) => (
              <FilterChip key={level}>{t("level", { level })}</FilterChip>
            ))}
          </div>
        </RailGroup>

        <RailGroup title={t("ratingTitle")}>
          <RadioGroup className="gap-0" defaultValue="all" name="rating">
            <RailOption label={t("ratingAll")} value="all" />
            <RailOption label={t("rating40")} value="4.0" />
            <RailOption label={t("rating45")} value="4.5" />
          </RadioGroup>
        </RailGroup>

        <RailGroup title={t("availabilityTitle")}>
          <RadioGroup className="gap-0" defaultValue="all" name="availability">
            <RailOption label={t("availabilityAll")} value="all" />
            <RailOption label={t("availabilityToday")} value="today" />
            <RailOption label={t("availabilityWeek")} value="week" />
            <RailOption label={t("availabilityMonth")} value="month" />
          </RadioGroup>
        </RailGroup>

        <RailGroup title={t("advisorTitle")}>
          <div className="flex items-start gap-3">
            <div className="flex min-w-px flex-1 flex-col">
              <span className="text-sm font-normal text-foreground">
                {t("verifiedOnly")}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {t("verifiedHint")}
              </span>
            </div>
            <Switch aria-label={t("verifiedOnly")} className="mt-1 shrink-0" />
          </div>
        </RailGroup>
      </div>
    </aside>
  );
}

/** The catalogue's six categories, as the rail's chips — home names them. */
const CATEGORY_KEYS = [
  "categoryBusiness",
  "categoryFinance",
  "categoryLegal",
  "categoryEducation",
  "categoryWellbeing",
  "categoryTech",
] as const;

/** The catalogue records this frame's query ("วางแผนภาษี") turns up. */
const RESULT_IDS = [
  "tax-freelance",
  "tax-review",
  "tax-corporate",
  "tax-personal",
];

/**
 * Figma "Search results (Light)" — 1155:17475.
 *
 * The search bar replaces the app's nav bar on this frame, so `TopBar` is not
 * used here: there is no lockup and the leading glyph goes back to the home
 * screen. It stays above `ScreenBody` rather than inside it, so the query and
 * the filter affordance remain on screen while the results scroll.
 */
export function SearchResultsScreen() {
  const t = useTranslations("search");
  const c = useTranslations("common");
  const results = RESULT_IDS.map(getService).filter(
    (service): service is Service => Boolean(service),
  );

  return (
    <MobileScreen className="pb-0" wide>
      {/* Figma "Search Bar" — 16px side padding over a 28px back chevron. The
          glyph is #a3a3a3 in the design, which no token names; the muted ink at
          70% lands on the same grey and still follows the theme.

          The desktop frame (1564:25253) keeps the app's nav bar instead and
          moves the query into a header band under it, so this row is the phone
          frame's alone. */}
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip px-4 pt-8 pb-2 lg:hidden">
        <Button
          aria-label={c("back")}
          className="relative size-7 shrink-0 overflow-visible text-muted-foreground/70 before:absolute before:-inset-2 before:content-['']"
          nativeButton={false}
          render={<Link href="/" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-7" />
        </Button>
        <SearchField
          aria-label={c("search")}
          defaultValue={t("query")}
          iconClassName="size-4"
        />
        <FilterButton iconClassName="size-4" label={c("filters")} />
      </div>

      <ScreenBody className="pb-18 lg:items-stretch lg:pb-0">
        {/* The desktop frame puts the app's nav back on this screen. */}
        <div className="hidden w-full lg:block">
          <TopBar unreadNotifications />
        </div>

        {/* Figma "Search Header" (1564:25276) — a 640px field on the page inset
            with the query spelled back under it. */}
        <div className="hidden w-full border-b border-border bg-card lg:block">
          <div className="mx-auto w-full max-w-[1440px] px-30 py-7">
            <SearchField
              aria-label={c("search")}
              defaultValue={t("query")}
              groupClassName="h-14 max-w-160 rounded-xl px-4"
              iconClassName="size-4.5"
              inputClassName="text-base"
              trailing={
                <span className="flex h-8 shrink-0 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
                  {c("search")}
                </span>
              }
            />
            <p className="pt-3 text-sm font-normal text-muted-foreground">
              {t("resultsFor", { query: t("query") })}
            </p>
          </div>
        </div>

        {/* Figma "Page Content" — 24px side padding, 16px between blocks. The
            desktop frame splits the same content into a 280px filter rail and
            an 896px results column. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-4 px-6 pt-2 pb-6 lg:mx-auto lg:max-w-[1440px] lg:flex-row lg:items-start lg:gap-6 lg:px-30 lg:pt-6 lg:pb-14">
          <FilterRail />

          <div className="flex w-full min-w-px flex-col items-center gap-4 lg:gap-6">
            {/* Figma "Results Meta" / "Results Head" */}
            <div className="flex w-full shrink-0 items-center overflow-clip">
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground lg:text-2xl lg:font-semibold lg:text-foreground">
                {t("count", { count: results.length })}
              </p>
              <div className="flex shrink-0 items-center gap-1 overflow-clip lg:h-9.5 lg:gap-2 lg:rounded-lg lg:border lg:border-border lg:bg-card lg:px-3.5">
                <p className="text-sm font-medium whitespace-nowrap text-foreground lg:font-normal">
                  {t("sort")}
                </p>
                <ChevronUp className="size-3.5 shrink-0 text-foreground lg:hidden" />
                <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground lg:block" />
              </div>
            </div>

            {/* Figma "Active Filters" — the phone's stand-in for the rail. */}
            <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto lg:hidden">
              <FilterChip active>{t("filterQuery")}</FilterChip>
              <FilterChip>{t("filterToday")}</FilterChip>
              <FilterChip>{t("filterRating")}</FilterChip>
            </div>

            {/* Figma "Results List" / "Grid" */}
            <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:grid lg:grid-cols-3 lg:gap-6">
              {results.map((service) => (
                <ResultCard key={service.id} service={service} />
              ))}
            </div>

            <p className="hidden w-full pt-4 text-center text-sm font-normal text-muted-foreground lg:block">
              {t("endOfResults", { count: results.length })}
            </p>
          </div>
        </div>
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
