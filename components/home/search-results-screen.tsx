import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

// `services` is gone from this file: the browse list reads the API now. The two
// helpers stay because the search-results screen above still renders fixtures.
import {
  getAdvisor,
  getService,
  type Service,
} from "@/lib/catalogue/services";
import { BrowseList } from "@/components/home/browse-list";
import { errorSearch } from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import {
  AvailabilityPill,
  FilterButton,
  FilterChip,
  SearchField,
  ServicePrice,
  ServiceProof,
  VerifiedTick,
} from "@/components/home/parts";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

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
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-full shrink-0 items-start gap-3 overflow-clip p-2 lg:flex-col lg:gap-0 lg:p-0",
      )}
      href={`/service/${service.id}`}
    >
      <span className="relative shrink-0 lg:w-full">
        <Image
          alt=""
          className="size-22 rounded-card object-cover lg:h-35 lg:w-full lg:rounded-none"
          src={service.cover}
        />
        {/* Held to the cover's foot on the desktop card, where there is room for
            it; the 88px phone thumbnail is too small to carry a pill, so it
            rides in the body there instead. */}
        <AvailabilityPill
          className="absolute bottom-2 left-2 hidden bg-card/95 shadow-card lg:inline-flex"
          slots={service.slots}
        />
      </span>
      <span className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip lg:w-full lg:flex-none lg:gap-1.5 lg:p-3.5">
        <span className="w-full text-base font-semibold text-foreground">
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
        <AvailabilityPill className="lg:hidden" slots={service.slots} />
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
    <aside
      className={cn(
        "hidden shrink-0 lg:block lg:w-70 lg:self-start lg:p-4.5",
        // The rail is a card like any other from `lg`; below it does not exist.
        "lg:rounded-card lg:border lg:border-border lg:bg-card lg:shadow-card",
      )}
    >
      <div className="flex items-center justify-between pb-4">
        <p className="text-lg font-semibold text-foreground">
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
          <div className="flex items-center justify-between pt-2 font-latin text-xs tabular-nums text-muted-foreground">
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

/** Figma "Suggestions / Terms" — the queries the no-results frame offers back. */
const SUGGESTED_TERMS = [
  "termTax",
  "termTaxPlanning",
  "termBusinessTax",
  "termPersonalFinance",
  "termAccounting",
] as const;

/**
 * Figma "Results Meta" (phone) / "Results Head" (desktop) — what was found, and
 * the sort control. One row for both screens: the phone states it in 14/20 muted
 * beside a bare chevron, the desktop promotes it to the 24/34 page title and
 * boxes the sort into a control.
 */
function ResultsHead({ label }: { readonly label: string }) {
  const t = useTranslations("search");

  return (
    <div className="flex w-full shrink-0 items-center overflow-clip">
      <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground lg:text-2xl lg:font-semibold lg:text-foreground">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-1 overflow-clip transition-colors lg:h-9.5 lg:gap-2 lg:rounded-lg lg:border lg:border-border lg:bg-card lg:px-3.5 lg:shadow-card lg:hover:border-accented">
        <p className="text-sm font-medium whitespace-nowrap text-foreground lg:font-normal">
          {t("sort")}
        </p>
        <ChevronUp className="size-3.5 shrink-0 text-foreground lg:hidden" />
        <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground lg:block" />
      </div>
    </div>
  );
}

/**
 * Figma "Empty State" (1615:34331 / 1615:34263) — the card that stands where the
 * results list would be: what was not found, what to do about it, and the way
 * out.
 *
 * The frame draws a circled magnifier. `lib/assets/r2` has shipped `errorSearch`
 * since the error screens landed and two screens use the six illustrations
 * between them, so the one state in the app that is literally "we searched and
 * found nothing" gets the drawing rather than a grey glyph.
 *
 * The phone frame offers one way out ("clear the filters") because the terms and
 * categories under the card are the rest of the offer; the 1440 frame has no
 * such block, so it puts "browse everything" beside the first button instead.
 */
function NoResults({ query }: { readonly query: string }) {
  const t = useTranslations("search");

  return (
    <Surface className="w-full shrink-0 overflow-clip">
      <EmptyState
        action={
          // A row of two, so neither takes `block` — and the second only exists
          // at `lg`, where the suggestion chips below are gone.
          <div className="flex shrink-0 items-start justify-center gap-2.5">
            <PrimaryButton size="lg">{t("clearFilters")}</PrimaryButton>
            <NeutralButton className="hidden lg:inline-flex" href="/search/browse" size="lg">
              {t("browseAll")}
            </NeutralButton>
          </div>
        }
        body={t("emptyBody")}
        className="lg:py-14"
        illustration={errorSearch}
        title={t("emptyTitle", { query })}
      />
    </Surface>
  );
}

/**
 * Figma "Suggestions" — the terms to try instead, and, on the phone frame only,
 * the categories to fall back on.
 *
 * Figma stamps a count on each category chip (38, 42, 21 …). The catalogue holds
 * no such tally, so the number is left off rather than invented — the same call
 * the result card makes about the advisor level it cannot read.
 */
function Suggestions() {
  const t = useTranslations("search");
  const h = useTranslations("home");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip lg:pt-2">
      <p className="w-full text-sm font-medium text-foreground">{t("tryTerms")}</p>
      <div className="flex w-full flex-wrap items-start gap-2">
        {SUGGESTED_TERMS.map((key) => (
          <Link
            className="flex h-8.5 shrink-0 items-center justify-center rounded-full border border-border bg-card px-3.5 text-sm font-normal whitespace-nowrap text-primary shadow-card transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-card-hover lg:h-9"
            href="/search"
            key={key}
          >
            {t(key)}
          </Link>
        ))}
      </div>
      {/* The 1440 frame stops at the terms — its filter rail already carries the
          categories, which on the phone have nowhere else to be. */}
      <p className="w-full text-sm font-medium text-foreground lg:hidden">
        {t("orPopularCategories")}
      </p>
      <div className="flex w-full flex-wrap items-start gap-2 lg:hidden">
        {CATEGORY_KEYS.map((key) => (
          <Link
            className="flex h-9.5 shrink-0 items-center rounded-lg bg-muted px-3.5 text-sm font-normal whitespace-nowrap text-foreground transition-colors hover:bg-accent-surface hover:text-primary"
            href="/search"
            key={key}
          >
            {h(key)}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Figma "Search results (Light)" — 1155:17475.
 *
 * The search bar replaces the app's nav bar on this frame, so `TopBar` is not
 * used here: there is no lockup and the leading glyph goes back to the home
 * screen. It stays above `ScreenBody` rather than inside it, so the query and
 * the filter affordance remain on screen while the results scroll.
 *
 * `no-results` (1615:34301 / 1615:34157) is the same screen with a query the
 * catalogue cannot answer: every band above the list is untouched, the list is
 * replaced by the empty-state card, and the suggestions follow it.
 */
export function SearchResultsScreen({
  state = "default",
}: {
  readonly state?: "default" | "no-results";
}) {
  const t = useTranslations("search");
  const c = useTranslations("common");
  const empty = state === "no-results";
  // The no-results frame is asked a different question ("ภาษีคริปโต"), which is
  // why it comes back with nothing; the query is echoed in four places.
  const query = empty ? t("noResultsQuery") : t("query");
  const results = empty
    ? []
    : RESULT_IDS.map(getService).filter(
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
          defaultValue={query}
          groupClassName="shadow-card"
          iconClassName="size-4"
        />
        <FilterButton
          className="shadow-card"
          iconClassName="size-4"
          label={c("filters")}
        />
      </div>

      <ScreenBody className="pb-18 lg:items-stretch lg:pb-0">
        {/* The desktop frame puts the app's nav back on this screen. */}
        <div className="hidden w-full lg:block">
          <TopBar unreadNotifications />
        </div>

        {/* Figma "Search Header" (1564:25276) — a 640px field on the page inset
            with the query spelled back under it. */}
        <div className="hidden w-full border-b border-border bg-card lg:block">
          <div className={cn("w-full py-7", PAGE)}>
            <SearchField
              aria-label={c("search")}
              defaultValue={query}
              groupClassName="h-14 max-w-160 rounded-card px-4 shadow-card"
              iconClassName="size-4.5"
              inputClassName="text-base"
              trailing={
                <span className="flex h-8 shrink-0 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
                  {c("search")}
                </span>
              }
            />
            <p className="pt-3 text-sm font-normal text-muted-foreground">
              {t("resultsFor", { query })}
            </p>
          </div>
        </div>

        {/* Figma "Page Content" — 24px side padding, 16px between blocks. The
            desktop frame splits the same content into a 280px filter rail and
            an 896px results column. */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center gap-4 px-6 pt-2 pb-6 lg:flex-row lg:items-start lg:gap-6 lg:pt-6 lg:pb-14",
            PAGE,
          )}
        >
          <FilterRail />

          <div className="flex w-full min-w-px flex-col items-center gap-4 lg:gap-6">
            <ResultsHead
              label={empty ? t("noResults") : t("count", { count: results.length })}
            />

            {/* Figma "Active Filters" — the phone's stand-in for the rail. */}
            <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto lg:hidden">
              <FilterChip active>{query}</FilterChip>
              <FilterChip>{t("filterToday")}</FilterChip>
              <FilterChip>{t("filterRating")}</FilterChip>
            </div>

            {empty ? (
              <>
                <NoResults query={query} />
                <Suggestions />
              </>
            ) : (
              <>
                {/* Figma "Results List" / "Grid" */}
                <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:grid lg:grid-cols-3 lg:gap-6">
                  {results.map((service) => (
                    <ResultCard key={service.id} service={service} />
                  ))}
                </div>

                <p className="hidden w-full pt-4 text-center text-sm font-normal text-muted-foreground lg:block">
                  {t("endOfResults", { count: results.length })}
                </p>
              </>
            )}
          </div>
        </div>
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}

/**
 * Figma "Desktop / Browse all (Light)" — 1564:25666.
 *
 * The catalogue with no query in front of it: the search header states what the
 * page is, a band of categories sits under it, and the same filter rail and
 * result grid the search frame uses carry the whole catalogue.
 *
 * There is no phone frame for this one, so below `lg` it is assembled out of the
 * app's own parts — the back chevron and 28/40 heading every detail screen opens
 * on, the results head from `/search`, and the result card's phone form, which
 * is the 88px-cover row the rails and the results list already use.
 *
 * The rows are the catalogue, not the frame's eighteen invented services, so the
 * count is the real one and the frame's pager — drawn for 180 records over eight
 * pages — has nothing to page through and is left off. The line under the grid
 * still says how much of the catalogue is on screen.
 */
export function BrowseAllScreen() {
  const t = useTranslations("search");
  const c = useTranslations("common");
  const h = useTranslations("home");

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenTopBar className="lg:hidden" href="/" label={c("back")} />
      <ScreenBody className="pb-18 lg:items-stretch lg:pb-0">
        <div className="hidden w-full lg:block">
          <TopBar />
        </div>

        {/* Figma "Search Header" (1564:25689) — the title, the line under it and
            a 640px field, on the card surface behind a hairline. The phone has
            no frame of its own here, so it keeps the heading it would have. */}
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card">
          <div className={cn("w-full lg:pt-8 lg:pb-6", PAGE)}>
            <ScreenHeading
              className="lg:px-0 lg:pt-0 lg:pb-0"
              subtitle={t("browseSubtitle")}
              title={c("findAdvisor")}
            />
            <div className="flex w-full items-start px-6 pt-4 lg:px-0">
              <SearchField
                aria-label={c("search")}
                groupClassName="shadow-card lg:h-14 lg:max-w-160 lg:rounded-card lg:px-4"
                iconClassName="size-4.5"
                inputClassName="lg:text-base"
                placeholder={t("browsePlaceholder")}
                trailing={
                  <span className="hidden h-8 shrink-0 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground lg:flex">
                    {c("search")}
                  </span>
                }
              />
            </div>
          </div>
        </div>

        {/* Figma "Categories" (1564:25696) — a band of the six the rail filters
            by, on the page ground. Figma tallies each one; the catalogue has no
            such count, so the chip is the label alone. */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-start gap-2.5 px-6 pt-5",
            PAGE,
          )}
        >
          <p className="w-full text-sm font-medium text-foreground lg:text-base">
            {t("popularCategories")}
          </p>
          <div className="flex w-full items-start gap-2.5 overflow-x-auto">
            {CATEGORY_KEYS.map((key) => (
              <Link
                className="flex h-9.5 shrink-0 items-center rounded-lg bg-muted px-3.5 text-sm font-normal whitespace-nowrap text-foreground transition-colors hover:bg-accent-surface hover:text-primary lg:h-11 lg:px-4.5"
                href="/search"
                key={key}
              >
                {h(key)}
              </Link>
            ))}
          </div>
        </div>

        {/* Figma "Body" — the same 280px rail and 896px column as the search
            frame, on the same page inset. */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center gap-4 px-6 pt-4 pb-6 lg:flex-row lg:items-start lg:gap-6 lg:pt-6 lg:pb-12",
            PAGE,
          )}
        >
          <FilterRail />

          {/* Read from the API, not from `lib/catalogue/services`. This is the
              first screen in the app that talks to it, and `BrowseList` carries
              its own loading, error and empty states because a client-side fetch
              under a static export has all three. The count in the head comes off
              the catalogue still: the API's `total` is inside the response, so a
              heading above the list cannot know it until the list has answered. */}
          <div className="flex w-full min-w-px flex-col items-center gap-4 lg:gap-6">
            <ResultsHead label={t("browseTitle")} />
            <BrowseList />
          </div>
        </div>
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
