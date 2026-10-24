"use client";

import { RotateCw, SlidersHorizontal, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { HeroSearch } from "@/components/home/hero-search";
import { ServicePrice } from "@/components/home/parts";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { errorSearch } from "@/lib/assets/r2";
import {
  DEFAULT_FILTERS,
  activeCount,
  applyFilters,
  categoriesOf,
  matchQuery,
  type Filters,
  type LengthBand,
  type MinRating,
  type PriceBand,
  type SortKey,
} from "@/lib/catalogue/filters";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/** The terms the empty state offers back, from the `search` namespace. */
const SUGGESTED_TERMS = [
  "termTax",
  "termTaxPlanning",
  "termBusinessTax",
  "termPersonalFinance",
  "termAccounting",
] as const;

const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "recommended", label: "sortRecommended" },
  { key: "priceLow", label: "sortPriceLow" },
  { key: "priceHigh", label: "sortPriceHigh" },
  { key: "rating", label: "sortRating" },
];

const PRICES: readonly { key: PriceBand; label: string }[] = [
  { key: "any", label: "priceAll" },
  { key: "under", label: "priceUnder" },
  { key: "mid", label: "priceMid" },
  { key: "over", label: "priceOver" },
];

const LENGTHS: readonly { key: LengthBand; label: string }[] = [
  { key: "any", label: "durationAll" },
  { key: "short", label: "durationShort" },
  { key: "hour", label: "durationHour" },
  { key: "long", label: "durationLong" },
];

const RATINGS: readonly { key: MinRating; label: string }[] = [
  { key: "any", label: "ratingAll" },
  { key: "4.5", label: "rating45" },
  { key: "4.8", label: "rating48" },
];

/**
 * The page's one chip: a 36px pill, the chosen one in the home hero's black.
 * `aria-pressed` carries the state for a screen reader.
 */
function Chip({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-sm font-medium",
        active
          ? "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
}

/**
 * One filter group: a label over a list of radios, one option per row. Chips
 * wrapped two to a row in a 17rem column and read as a heap; a list reads
 * top to bottom and every row is a full-width target.
 */
function OptionGroup<K extends string>({
  title,
  options,
  value,
  onChange,
}: {
  readonly title: string;
  readonly options: readonly { key: K; label: string }[];
  readonly value: K;
  readonly onChange: (key: K) => void;
}) {
  const t = useTranslations("search");
  return (
    <fieldset className="flex flex-col">
      <legend className="pb-2 text-sm font-semibold text-foreground">{title}</legend>
      <RadioGroup className="gap-0" onValueChange={(next) => onChange(next as K)} value={value}>
        {options.map((option) => (
          <label
            className="-mx-2 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-foreground transition-colors hover:bg-muted has-data-checked:font-semibold lg:h-10"
            key={option.key}
          >
            <RadioGroupItem value={option.key} />
            {/* The labels are keys of `search`; typed loosely so one group serves three lists. */}
            {t(option.label as "priceAll")}
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

/** The label a filter's current value shows under, or null when it is off. */
function chosen<K extends string>(options: readonly { key: K; label: string }[], value: K): string | null {
  if (value === "any") return null;
  return options.find((option) => option.key === value)?.label ?? null;
}

/**
 * What is on, as pills above the results, each one taking its own filter
 * off: the phone keeps its filters in a sheet, so without these it cannot
 * see what is narrowing the list.
 */
function ActiveFilters({
  filters,
  onChange,
}: {
  readonly filters: Filters;
  readonly onChange: (next: Filters) => void;
}) {
  const t = useTranslations("search");
  const pills: { key: keyof Filters; label: string }[] = [];
  if (filters.category) pills.push({ key: "category", label: filters.category });
  for (const [key, label] of [
    ["price", chosen(PRICES, filters.price)],
    ["length", chosen(LENGTHS, filters.length)],
    ["rating", chosen(RATINGS, filters.rating)],
  ] as const) {
    if (label) pills.push({ key, label: t(label as "priceAll") });
  }
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <Button
          aria-label={t("removeFilter", { label: pill.label })}
          className="h-8 gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground hover:bg-accented/60"
          key={pill.key}
          onClick={() => onChange({ ...filters, [pill.key]: DEFAULT_FILTERS[pill.key] })}
          type="button"
          variant="ghost"
        >
          {pill.label}
          <X aria-hidden className="size-3.5" />
        </Button>
      ))}
      <Button
        className="h-8 px-1 text-xs font-semibold underline underline-offset-2"
        onClick={() => onChange(DEFAULT_FILTERS)}
        type="button"
        variant="link"
      >
        {t("clearAll")}
      </Button>
    </div>
  );
}

/**
 * Every filter, drawn once and used twice: in the desktop column beside the
 * results, and in the phone's bottom sheet. The category is not here; it is
 * the row of chips under the search field, one tap at any width.
 */
function FilterPanel({
  filters,
  onChange,
}: {
  readonly filters: Filters;
  readonly onChange: (next: Filters) => void;
}) {
  const t = useTranslations("search");
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-6">
      <OptionGroup onChange={(v) => set("price", v)} options={PRICES} title={t("priceTitle")} value={filters.price} />
      <OptionGroup onChange={(v) => set("length", v)} options={LENGTHS} title={t("durationTitle")} value={filters.length} />
      <OptionGroup onChange={(v) => set("rating", v)} options={RATINGS} title={t("ratingTitle")} value={filters.rating} />
    </div>
  );
}

/** The score, or "new" for an advisor nobody has reviewed yet. */
function Rating({ item }: { readonly item: LiveService }) {
  const t = useTranslations("search");
  const s = useTranslations("service");
  if (item.rating === null) {
    return <span aria-hidden className="h-4 w-24 animate-pulse rounded-md bg-muted" />;
  }
  if (item.reviews === 0) {
    return (
      <span className="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        {t("newListing")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star aria-hidden className="size-3.5 fill-primary text-primary" />
      <span className="font-latin font-semibold text-foreground tabular-nums">{item.rating.toFixed(1)}</span>
      <span className="text-muted-foreground">{s("reviewCount", { count: item.reviews })}</span>
    </span>
  );
}

/**
 * The advisor's face from their ring card, or their initial on the muted step.
 * 20px in the phone's row; from `sm` a 44px portrait laid into the photo's
 * bottom edge with a white ring, the way the home hero's cards carry theirs.
 */
// `relative` so it paints over the photo, which is positioned and would
// otherwise cover the half of the face that overlaps it.
const FACE = "relative size-5 shrink-0 rounded-full sm:-mt-6 sm:size-11 sm:ring-3 sm:ring-card";

function AdvisorFace({ item }: { readonly item: LiveService }) {
  if (item.face) {
    return <Image alt="" className={cn(FACE, "object-cover")} src={item.face} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        FACE,
        "flex items-center justify-center bg-muted text-2xs font-semibold text-muted-foreground sm:text-base",
      )}
    >
      {item.advisorName.slice(0, 1)}
    </span>
  );
}

/**
 * A result. A row on the phone (a 112px square photo beside the text, so two
 * or three fit a screen), a card from `sm`: the photo across the top at
 * 16:10, the advisor's face over its edge, then the service, the score and
 * the price. Who is giving the advice comes first, because that is what a
 * client is choosing. The whole card is the link to the service's live page.
 */
function ResultCard({ item }: { readonly item: LiveService }) {
  return (
    <Link
      className="group flex gap-3 rounded-2xl border border-border bg-card p-2.5 transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-0 sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0"
      href={item.href}
    >
      <span className="relative w-28 shrink-0 overflow-hidden rounded-xl sm:w-full sm:rounded-none">
        <Image
          alt=""
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:aspect-[16/10]"
          src={item.cover}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2 sm:px-4 sm:pb-4">
        <span className="flex min-w-0 items-center gap-1.5 sm:items-end sm:gap-2.5">
          <AdvisorFace item={item} />
          <span className="truncate text-sm text-muted-foreground">{item.advisorName}</span>
        </span>
        {/* Two lines held at every card, so a row's scores and prices line up. */}
        <span className="line-clamp-2 text-base leading-snug font-semibold text-foreground sm:min-h-11">
          {item.title}
        </span>
        <Rating item={item} />
        <span className="mt-auto pt-1 sm:border-t sm:border-border sm:pt-3">
          <ServicePrice minutes={item.minutes} price={item.price} />
        </span>
      </span>
    </Link>
  );
}

/** The loaded grid's own shape, so nothing shifts when the list lands. */
function ResultsSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="flex gap-3 rounded-2xl border border-border p-2.5 sm:flex-col sm:p-0" key={i}>
          <span className="aspect-square w-28 animate-pulse rounded-xl bg-muted sm:aspect-[4/3] sm:w-full sm:rounded-none" />
          <span className="flex flex-1 flex-col gap-2 sm:p-4">
            <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
            <span className="h-3 w-2/5 animate-pulse rounded-md bg-muted" />
            <span className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** The list could not be read: the API's own sentence, and a way to try again. */
function LoadFailed({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  const t = useTranslations("search");
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <h2 className="text-xl font-bold text-foreground">{t("loadFailedTitle")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button className={cn(authPill(true), "w-auto")} onClick={onRetry} type="button">
        <RotateCw aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}

/** Nothing matched: what was not found, the way out, and terms to try. */
function EmptyResults({
  query,
  filtered,
  onClear,
}: {
  readonly query: string;
  readonly filtered: boolean;
  readonly onClear: () => void;
}) {
  const t = useTranslations("search");

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <Image alt="" className="h-28 w-auto" src={errorSearch} />
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-xl font-bold text-foreground">
          {query ? t("emptyTitle", { query }) : t("noResults")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {filtered ? (
          <Button className={cn(authPill(true), "w-auto")} onClick={onClear} type="button">
            {t("clearFilters")}
          </Button>
        ) : null}
        <Button className={cn(authPill(), "w-auto")} nativeButton={false} render={<Link href="/search" />} variant="outline">
          {t("browseAll")}
        </Button>
      </div>
      <div className="flex flex-col items-center gap-2.5 pt-2">
        <p className="text-sm font-medium text-foreground">{t("tryTerms")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_TERMS.map((key) => (
            <Link
              className="flex h-9 items-center rounded-full bg-muted px-4 text-sm text-foreground transition-colors hover:bg-accented/60"
              href={`/search?q=${encodeURIComponent(t(key))}`}
              key={key}
            >
              {t(key)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The phone's filters: the same panel in a bottom sheet, with its own count. */
function FilterSheet({
  filters,
  onChange,
  resultCount,
}: {
  readonly filters: Filters;
  readonly onChange: (next: Filters) => void;
  readonly resultCount: number;
}) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const count = activeCount({ ...filters, category: DEFAULT_FILTERS.category });

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium lg:hidden",
          count > 0 ? "border-transparent bg-hero-action text-hero-action-foreground" : "border-border bg-card text-foreground",
        )}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {count > 0 ? t("filtersCount", { count }) : t("filtersTitle")}
      </SheetTrigger>
      <SheetContent className="max-h-[85dvh] gap-0 rounded-t-3xl p-0" side="bottom">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <SheetTitle className="text-lg font-bold">{t("filtersTitle")}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <FilterPanel filters={filters} onChange={onChange} />
        </div>
        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button
            className={cn(authPill(), "flex-1")}
            onClick={() => onChange({ ...DEFAULT_FILTERS, category: filters.category })}
            type="button"
            variant="outline"
          >
            {t("clearAll")}
          </Button>
          <Button className={cn(authPill(true), "flex-1")} onClick={() => setOpen(false)} type="button">
            {t("showResults", { count: resultCount })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** The sort, on the project's `Select` primitive, its trigger a pill. */
function SortSelect({ value, onChange }: { readonly value: SortKey; readonly onChange: (key: SortKey) => void }) {
  const t = useTranslations("search");
  const items = SORTS.map((sort) => ({ value: sort.key, label: t(sort.label as "sortRecommended") }));
  return (
    <Select items={items} onValueChange={(next) => onChange(next as SortKey)} value={value}>
      <SelectTrigger
        aria-label={t("sortLabel")}
        className="h-10! rounded-full border-border bg-card pr-3 pl-4 font-medium shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** What the results column shows: failed, loading, results, or none. */
function ResultsBody({
  catalogue,
  results,
  query,
  filtered,
  onClear,
}: {
  readonly catalogue: ReturnType<typeof useLiveCatalogue>;
  readonly results: readonly LiveService[];
  readonly query: string;
  readonly filtered: boolean;
  readonly onClear: () => void;
}) {
  const t = useTranslations("search");
  if (catalogue.error) return <LoadFailed message={catalogue.error.message} onRetry={catalogue.reload} />;
  if (catalogue.loading && catalogue.items.length === 0) return <ResultsSkeleton />;
  if (results.length === 0) return <EmptyResults filtered={filtered} onClear={onClear} query={query} />;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {results.map((item) => (
          <ResultCard item={item} key={item.id} />
        ))}
      </div>
      <p className="pt-2 text-center text-sm text-muted-foreground">{t("endOfResults", { count: results.length })}</p>
    </>
  );
}

/**
 * `/search`: the live catalogue (`GET /services`, joined to advisors,
 * categories and ratings in `useLiveCatalogue`), matched against `?q=` when
 * there is one, then narrowed by the filters and ordered by the sort, all on
 * this page.
 *
 * Laid out on the frame the rest of the redesign uses: the same search field
 * as the home hero (its suggestions, history and categories included), the
 * docking bar, pills throughout, and the 1710 desktop zoomed down on a
 * landscape tablet (`doc-scale`).
 *
 * - **Categories** are the chips under the field, one tap at every width,
 *   and are the categories the catalogue holds, so each filters to something.
 * - **The rest of the filters** sit in a column beside the results on a
 *   desktop and in a bottom sheet on the phone; the same panel either way.
 * - **Results** are rows on the phone and cards from `sm`, each opening the
 *   service's live page.
 */
export function SearchScreen({
  query: typed,
  state = "default",
}: {
  readonly query?: string;
  /** The `/search/no-results` frame: a query the catalogue cannot answer. */
  readonly state?: "default" | "no-results";
}) {
  const t = useTranslations("search");
  const h = useTranslations("home");
  const c = useTranslations("common");
  const fallback = state === "no-results" ? t("noResultsQuery") : "";
  const query = typed?.trim() || fallback;

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("recommended");
  const catalogue = useLiveCatalogue();

  const matched = matchQuery(catalogue.items, query);
  const results = applyFilters(matched, filters, sort);
  const categories = categoriesOf(catalogue.items);
  const filtered = activeCount(filters) > 0;
  const clear = () => setFilters(DEFAULT_FILTERS);
  const examples = [
    h("searchExample1"),
    h("searchExample2"),
    h("searchExample3"),
    h("searchExample4"),
    h("searchExample5"),
  ];

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="bg-card pb-18 lg:pb-0">
        <TopBar dock unreadNotifications />

        <div className="doc-scale mx-auto flex w-full max-w-340 flex-1 flex-col px-6 pt-6 pb-14 md:px-8 lg:pt-10 lg:pb-24">
          <header className="flex flex-col gap-5 md:gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl leading-tight font-bold text-foreground md:text-4xl">
                {query ? t("resultsTitle", { query }) : t("pageTitle")}
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                {query ? t("count", { count: results.length }) : t("pageSubtitle")}
              </p>
            </div>
            <div className="flex w-full max-w-2xl">
              {/* Keyed by the query: a new search from this field is a new
                  page view, and the field should open holding it. */}
              <HeroSearch
                categories={categories}
                defaultValue={query}
                examples={examples}
                key={query}
                placeholder={t("browsePlaceholder")}
                submitLabel={c("search")}
                variant="page"
              />
            </div>
            {/* Categories: one row that scrolls sideways on the phone. */}
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
              <Chip active={filters.category === null} onClick={() => setFilters({ ...filters, category: null })}>
                {t("allCategories")}
              </Chip>
              {categories.map((category) => (
                <Chip
                  active={filters.category === category}
                  key={category}
                  onClick={() => setFilters({ ...filters, category })}
                >
                  {category}
                </Chip>
              ))}
            </div>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-28 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">{t("filtersTitle")}</h2>
                  {filtered ? (
                    <Button
                      className="h-auto p-0 text-sm font-semibold underline underline-offset-2"
                      onClick={clear}
                      type="button"
                      variant="link"
                    >
                      {t("clearAll")}
                    </Button>
                  ) : null}
                </div>
                <FilterPanel filters={filters} onChange={setFilters} />
              </div>
            </aside>

            <section aria-live="polite" className="flex min-w-0 flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{t("count", { count: results.length })}</p>
                <div className="flex items-center gap-2">
                  <FilterSheet filters={filters} onChange={setFilters} resultCount={results.length} />
                  <SortSelect onChange={setSort} value={sort} />
                </div>
              </div>

              <ActiveFilters filters={filters} onChange={setFilters} />

              <ResultsBody
                catalogue={catalogue}
                filtered={filtered}
                onClear={clear}
                query={query}
                results={results}
              />
            </section>
          </div>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
