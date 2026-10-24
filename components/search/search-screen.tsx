"use client";

import { ChevronLeft, ChevronRight, RotateCw, SearchX, SlidersHorizontal, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { HeroSearch } from "@/components/home/hero-search";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { HandwrittenWord } from "@/components/search/handwritten-word";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
import { useLiveCatalogue, useOpenToday, type LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/** The terms the empty state offers back, from the `search` namespace. */
const SUGGESTED_TERMS = [
  "termTax",
  "termTaxPlanning",
  "termFreelanceTax",
  "termPersonalFinance",
  "termAccounting",
] as const;

const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "recommended", label: "sortRecommended" },
  { key: "newest", label: "sortNewest" },
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

const DESKTOP = "(min-width: 1024px)";

/** Whether the filter panel slides in from the side (desktop) or up from the bottom. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/**
 * The page's one chip: a 36px pill, the chosen one in the home hero's black.
 * `aria-pressed` carries the state for a screen reader.
 */
function Chip({
  active,
  onClick,
  className,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn(
        "h-8 shrink-0 rounded-full px-3 text-xs font-medium md:h-9 md:px-4 md:text-sm",
        className,
        active
          ? // The outline variant turns hover ink dark; the chosen chip keeps its white.
            "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
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

/** How many categories the desktop row shows before the rest fold away: two rows of chips. */
const CATEGORY_LIMIT = 7;

/**
 * The busiest categories under the search field (`categoriesOf` sorts them):
 * "all" and six more, two rows at most on a desktop, one sideways row on the
 * phone. Every category, these included, is in the filter panel; one chosen
 * there joins this row so the choice stays in view.
 */
function CategoryChips({
  categories,
  value,
  onChange,
}: {
  readonly categories: readonly string[];
  readonly value: string | null;
  readonly onChange: (category: string | null) => void;
}) {
  const t = useTranslations("search");
  const shown = categories.slice(0, CATEGORY_LIMIT);
  if (value && !shown.includes(value)) shown.push(value);

  return (
    <div className="-mx-5 flex w-screen max-w-none gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:w-full md:flex-wrap md:justify-center md:px-0">
      <Chip active={value === null} onClick={() => onChange(null)}>
        {t("allCategories")}
      </Chip>
      {shown.map((category) => (
        <Chip active={value === category} key={category} onClick={() => onChange(category)}>
          {category}
        </Chip>
      ))}
    </div>
  );
}

/** One filter group in the panel: a label over a list of radios, one per row. */
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
            className="-mx-2 flex h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-foreground transition-colors hover:bg-muted has-data-checked:font-semibold"
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
 * off: the filters live behind one button, so without these nobody can see
 * what is narrowing the list.
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
  if (filters.today) pills.push({ key: "today", label: t("availableToday") });
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
        onClick={() => onChange({ ...DEFAULT_FILTERS, category: filters.category })}
        type="button"
        variant="link"
      >
        {t("clearAll")}
      </Button>
    </div>
  );
}

/**
 * Every category (the chips under the field show only the most popular), then
 * price, length and score.
 */
function FilterPanel({
  filters,
  onChange,
  categories,
}: {
  readonly filters: Filters;
  readonly onChange: (next: Filters) => void;
  readonly categories: readonly string[];
}) {
  const t = useTranslations("search");
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <div className="flex flex-col gap-6">
      {/* Chips that wrap, not a radio per row: twelve rows of categories
          pushed the price and length a screen down the panel. */}
      <fieldset className="flex flex-col">
        <legend className="pb-3 text-sm font-semibold text-foreground">{t("categoryTitle")}</legend>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.category === null} onClick={() => set("category", null)}>
            {t("allCategories")}
          </Chip>
          {categories.map((category) => (
            <Chip active={filters.category === category} key={category} onClick={() => set("category", category)}>
              {category}
            </Chip>
          ))}
        </div>
      </fieldset>
      <label className="-mx-2 flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
        {t("availableToday")}
        <Switch checked={filters.today} onCheckedChange={(on) => set("today", on)} />
      </label>
      <OptionGroup onChange={(v) => set("price", v)} options={PRICES} title={t("priceTitle")} value={filters.price} />
      <OptionGroup onChange={(v) => set("length", v)} options={LENGTHS} title={t("durationTitle")} value={filters.length} />
      <OptionGroup onChange={(v) => set("rating", v)} options={RATINGS} title={t("ratingTitle")} value={filters.rating} />
    </div>
  );
}

/** The score, or "new" for an advisor nobody has reviewed yet. */
function Rating({ item }: { readonly item: LiveService }) {
  const t = useTranslations("search");
  if (item.rating === null) {
    return <span aria-hidden className="h-4 w-14 animate-pulse rounded-md bg-muted" />;
  }
  if (item.reviews === 0) {
    // Not "0 stars": a zero reads as the lowest score, and nobody has scored it.
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star aria-hidden className="size-3.5 text-muted-foreground" />
        {t("noReviews")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs">
      <Star aria-hidden className="size-3.5 fill-primary text-primary" />
      <span className="font-latin font-semibold text-foreground tabular-nums">{item.rating.toFixed(1)}</span>
      <span className="text-muted-foreground tabular-nums">({item.reviews})</span>
    </span>
  );
}

/** The advisor's face from their ring card, or their initial on the muted step. */
function AdvisorFace({ item }: { readonly item: LiveService }) {
  const face = "size-6 shrink-0 rounded-full";
  if (item.face) return <Image alt="" className={cn(face, "object-cover")} src={item.face} />;
  return (
    <span
      aria-hidden
      className={cn(face, "flex items-center justify-center bg-muted text-2xs font-semibold text-muted-foreground")}
    >
      {item.advisorName.slice(0, 1)}
    </span>
  );
}

/**
 * A result. What a client weighs, in the order they weigh it, and only what
 * the API actually knows: who (face, name, the verified mark every listed
 * advisor has earned, their line of work), what (the service, two lines),
 * how it has gone (score and reviews) and what it costs for how long.
 * Nothing invented to fill the card: there is no reply time or sales count
 * behind it, so neither is drawn. The whole card is the link to the service.
 */
export function ResultCard({ item }: { readonly item: LiveService }) {
  const t = useTranslations("search");
  const format = useFormatter();
  return (
    <Link
      className="group flex flex-col gap-3 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      href={item.href}
    >
      {/* The hero ring cards' own 2px shadow: just enough to lift the photo off white. */}
      <span className="overflow-hidden rounded-2xl bg-muted shadow-hero-card transition-shadow duration-200 group-hover:shadow-hero-card-hover">
        <Image
          alt=""
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          src={item.cover}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2 px-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <AdvisorFace item={item} />
          <span className="truncate text-xs font-medium text-foreground">{item.advisorName}</span>
        </span>
        {/* The title on one line and what it covers on two, both held at that
            height, so every card matches and a row's prices line up. */}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm leading-snug font-semibold text-foreground md:text-base">
            {item.title}
          </span>
          <span className="line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{item.description}</span>
        </span>
        <span className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
          <Rating item={item} />
          <span className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="font-latin text-sm font-bold text-foreground tabular-nums md:text-base">
              {format.number(item.price, { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-muted-foreground">{t("perSession", { minutes: item.minutes })}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

// Two across on the phone and on a tablet held upright (roomier there), and
// from `lg` the desktop's four, which a landscape tablet shows as the 1710
// frame scaled down (`doc-scale`) rather than as a layout of its own.
const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-14";

/** Twelve at a time: three full rows at the widest grid, enough to choose from at once. */
const PAGE_SIZE = 12;

/** The loaded grid's own shape, so nothing shifts when the list lands. */
function ResultsSkeleton() {
  return (
    <div aria-hidden className={GRID}>
      {Array.from({ length: 8 }, (_, i) => (
        <div className="flex flex-col gap-3" key={i}>
          <span className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted" />
          <span className="flex flex-col gap-2 px-0.5">
            <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
            <span className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
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
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
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
    <div className="flex flex-col items-center gap-5 px-6 py-16 text-center lg:py-32">
      {/* A plain glyph on the muted step, not an illustration: the page around
          it is photographs and type, and a drawn scene read as another site. */}
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <SearchX aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-xl font-bold text-foreground">
          {query ? t("emptyTitle", { query }) : t("noResults")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
      </div>
      {filtered ? (
        <Button className={cn(authPill(true), "w-auto")} onClick={onClear} type="button">
          {t("clearFilters")}
        </Button>
      ) : null}
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

/**
 * Every filter but the category, behind one button: a panel from the right on
 * a desktop, a sheet from the bottom on the phone. The button says how many
 * are on, and the panel ends on the number of results they leave.
 */
function FilterSheet({
  filters,
  onChange,
  resultCount,
  categories,
}: {
  readonly filters: Filters;
  readonly onChange: (next: Filters) => void;
  readonly resultCount: number;
  readonly categories: readonly string[];
}) {
  const t = useTranslations("search");
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const count = activeCount({ ...filters, category: DEFAULT_FILTERS.category });

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors md:h-10 md:gap-2 md:px-4 md:text-sm",
          count > 0
            ? "border-transparent bg-hero-action text-hero-action-foreground"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {count > 0 ? t("filtersCount", { count }) : t("filtersTitle")}
      </SheetTrigger>
      <SheetContent
        className={cn("gap-0 p-0", desktop ? "w-full sm:max-w-sm" : "max-h-[85dvh] rounded-t-3xl")}
        side={desktop ? "right" : "bottom"}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <SheetTitle className="text-lg font-bold">{t("filtersTitle")}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <FilterPanel categories={categories} filters={filters} onChange={onChange} />
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
        className="h-9! rounded-full border-border bg-card pr-2.5 pl-3 text-xs font-medium shadow-none md:h-10! md:pr-3 md:pl-4 md:text-sm"
      >
        <SelectValue />
      </SelectTrigger>
      {/* Opens below the pill, not over it: lining the chosen item up with the
          trigger hid the button the reader had just pressed. */}
      <SelectContent align="end" alignItemWithTrigger={false} sideOffset={8}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** What the results area shows: failed, loading, results, or none. */
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
  if (catalogue.error) return <LoadFailed message={catalogue.error.message} onRetry={catalogue.reload} />;
  if (catalogue.loading && catalogue.items.length === 0) return <ResultsSkeleton />;
  if (results.length === 0) return <EmptyResults filtered={filtered} onClear={onClear} query={query} />;
  // Keyed by what is listed, so a new search, filter or sort starts at page one.
  return <PagedResults key={results.map((item) => item.id).join(",")} results={results} />;
}

/**
 * The results twelve to a page, with numbered pages under the grid. Changing
 * page brings the top of the results back into view, so the reader starts the
 * new page at its first card rather than at the bottom of the old one. The
 * results are already narrowed and sorted on this page, so a new search or
 * filter remounts this (see `key` in `ResultsBody`) and starts again at one.
 */
function PagedResults({ results }: { readonly results: readonly LiveService[] }) {
  const t = useTranslations("search");
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = results.slice(start, start + PAGE_SIZE);

  const go = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className={cn(GRID, "scroll-mt-28")} ref={top}>
        {visible.map((item) => (
          <ResultCard item={item} key={item.id} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 pt-10">
        {pages > 1 ? (
          <nav aria-label={t("pagination")} className="flex items-center gap-1">
            <Button
              aria-label={t("previousPage")}
              className="size-10 rounded-full"
              disabled={page === 1}
              onClick={() => go(page - 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronLeft aria-hidden />
            </Button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "size-10 rounded-full font-latin text-sm tabular-nums",
                  n === page
                    ? "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
                    : "text-foreground",
                )}
                key={n}
                onClick={() => go(n)}
                size="icon"
                type="button"
                variant="ghost"
              >
                {n}
              </Button>
            ))}
            <Button
              aria-label={t("nextPage")}
              className="size-10 rounded-full"
              disabled={page === pages}
              onClick={() => go(page + 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight aria-hidden />
            </Button>
          </nav>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {t("showingOf", { from: start + 1, to: start + visible.length, total: results.length })}
        </p>
      </div>
    </>
  );
}

/**
 * `/search`: the live catalogue (`GET /services`, joined to advisors,
 * categories and ratings in `useLiveCatalogue`), matched against `?q=`,
 * narrowed by the filters and ordered by the sort, all on this page.
 *
 * Built like the home hero, because that is the page people already know how
 * to use: one heading, one search field in the middle, the categories under
 * it, and then the results. Everything else (price, length, score) waits
 * behind a single button, so the first screen asks for one thing only.
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
  const openToday = useOpenToday(filters.today);
  const results = applyFilters(matched, filters, sort, openToday);
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
    // Full width from `md`: a portrait tablet gets its own three-column grid,
    // not the phone frame centred between grey margins.
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="bg-card pb-18 lg:pb-0">
        <TopBar dock unreadNotifications />

        <div className="doc-scale mx-auto flex w-full max-w-300 flex-1 flex-col px-5 pt-3 pb-14 md:px-20 md:pt-4 lg:px-8 lg:pt-6 lg:pb-24">
          {/* The hero's own stack: heading, field, categories, centred. */}
          <header className="mx-auto flex w-full max-w-170 flex-col items-center gap-5 text-center lg:gap-6">
            <h1 className="font-hero text-2xl font-normal tracking-tight text-hero-ink md:text-hero">
              <span className="sr-only">{t("pageTitle")}</span>
              <span aria-hidden>
                {t("pageTitleLead")} <HandwrittenWord />
              </span>
            </h1>
            <div className="flex w-full">
              {/* Keyed by the query: a new search from this field is a new
                  page view, and the field should open holding it. */}
              {/* No categories in the suggestions here: the chips right under
                  the field are the categories, and the panel listed them again. */}
              <HeroSearch
                categories={[]}
                defaultValue={query}
                examples={examples}
                key={query}
                placeholder={t("browsePlaceholder")}
                submitLabel={c("search")}
                variant="page"
              />
            </div>
            {/* One row that scrolls sideways on the phone, wraps centred above it. */}
            <CategoryChips
              categories={categories}
              onChange={(category) => setFilters({ ...filters, category })}
              value={filters.category}
            />
          </header>

          <section aria-live="polite" className="mt-10 flex min-w-0 flex-col gap-4 lg:mt-14">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {/* The query is in the field right above; repeating it here is noise. */}
                <span className="font-medium text-foreground">{t("count", { count: results.length })}</span>
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <FilterSheet
                  categories={categories}
                  filters={filters}
                  onChange={setFilters}
                  resultCount={results.length}
                />
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

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
