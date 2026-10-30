/**
 * What `/search` narrows and orders the catalogue by. Every field has an
 * "any" value, so the empty state is `DEFAULT_FILTERS` and "how many filters
 * are on" is a count of the fields that differ from it.
 *
 * Only what the API can answer. Who is verified is not a filter because the API
 * lists verified advisors only; who is free today comes from the API's
 * `availableOn` search (`useOpenToday`) and is passed in as a set of ids.
 */
export type PriceBand = "any" | "under" | "mid" | "over";
export type LengthBand = "any" | "short" | "hour" | "long";
export type MinRating = "any" | "4.5" | "4.8";
export type SortKey = "recommended" | "newest" | "priceLow" | "priceHigh" | "rating";

export type Filters = {
  /**
   * The category's id, not its name: the name is in the page's language, and
   * a choice kept by name stayed behind, in the old language, when the
   * language changed.
   */
  readonly category: string | null;
  readonly price: PriceBand;
  readonly length: LengthBand;
  readonly rating: MinRating;
  /** Only services with a slot left today. */
  readonly today: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  category: null,
  price: "any",
  length: "any",
  rating: "any",
  today: false,
};

/** The fields a result has to carry to be filtered and sorted. */
export type Filterable = {
  readonly id: string;
  /** Epoch ms the service was listed. */
  readonly listedAt: number;
  readonly category: string;
  readonly categoryId: string;
  /** Baht. */
  readonly price: number;
  readonly minutes: number;
  /** `null` while the ratings are still loading. */
  readonly rating: number | null;
  readonly reviews: number;
};

/** The bands, in baht and minutes. 800 and 1,500 split the catalogue in thirds. */
const PRICE: Readonly<Record<PriceBand, (price: number) => boolean>> = {
  any: () => true,
  under: (price) => price <= 800,
  mid: (price) => price > 800 && price <= 1500,
  over: (price) => price > 1500,
};

const LENGTH: Readonly<Record<LengthBand, (minutes: number) => boolean>> = {
  any: () => true,
  short: (minutes) => minutes <= 45,
  hour: (minutes) => minutes > 45 && minutes <= 60,
  long: (minutes) => minutes > 60,
};

function matches(
  item: Filterable,
  filters: Filters,
  openToday: ReadonlySet<string> | null,
): boolean {
  return (
    // While today's answer is still loading the list is left as it is, rather
    // than emptied and then refilled.
    (!filters.today || openToday === null || openToday.has(item.id)) &&
    (filters.category === null || item.categoryId === filters.category) &&
    PRICE[filters.price](item.price) &&
    LENGTH[filters.length](item.minutes) &&
    (filters.rating === "any" || (item.rating ?? 0) >= Number(filters.rating))
  );
}

/**
 * "Recommended" is the most-reviewed first, which is the closest the API comes
 * to "what people book", then the better rated.
 */
const ORDER: Readonly<Record<SortKey, (a: Filterable, b: Filterable) => number>> = {
  recommended: (a, b) => b.reviews - a.reviews || (b.rating ?? 0) - (a.rating ?? 0),
  newest: (a, b) => b.listedAt - a.listedAt,
  priceLow: (a, b) => a.price - b.price,
  priceHigh: (a, b) => b.price - a.price,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews,
};

export function applyFilters<T extends Filterable>(
  list: readonly T[],
  filters: Filters,
  sort: SortKey,
  openToday: ReadonlySet<string> | null = null,
): readonly T[] {
  return list.filter((item) => matches(item, filters, openToday)).toSorted(ORDER[sort]);
}

/** How many filters are set, for the phone's "Filters (2)" button. */
export function activeCount(filters: Filters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter(
    (key) => filters[key] !== DEFAULT_FILTERS[key],
  ).length;
}

/** The categories the list actually holds, in the order it first names them. */
/**
 * The categories the list holds, the busiest first (most services, then by
 * name), so a row of chips cut short still leads with where most of the
 * catalogue is.
 */
export function categoriesOf(list: readonly { readonly category: string }[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const { category } of list) {
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .toSorted(([a, x], [b, y]) => y - x || a.localeCompare(b, "th"))
    .map(([category]) => category);
}

/** A category to choose by: its id, which a filter keeps, and its name in the page's language. */
export type CategoryOption = { readonly id: string; readonly name: string };

/** `categoriesOf`'s order, each category with its id. */
export function categoryOptionsOf(
  list: readonly { readonly category: string; readonly categoryId: string }[],
): readonly CategoryOption[] {
  const ids = new Map<string, string>();
  for (const { category, categoryId } of list) if (category && !ids.has(category)) ids.set(category, categoryId);
  return categoriesOf(list).map((name) => ({ id: ids.get(name) ?? name, name }));
}

/**
 * The query, matched as a plain folded substring against the service's title,
 * description and category and its advisor's name and headline: Thai has no
 * word breaks to tokenise on.
 */
export function matchQuery<
  T extends {
    readonly title: string;
    readonly description: string;
    readonly category: string;
    readonly advisorName: string;
    readonly advisorHeadline: string;
  },
>(list: readonly T[], query: string): readonly T[] {
  const q = query.trim().toLocaleLowerCase("th");
  if (!q) return list;
  return list.filter((item) =>
    [item.title, item.description, item.category, item.advisorName, item.advisorHeadline].some(
      (field) => field.toLocaleLowerCase("th").includes(q),
    ),
  );
}
