/**
 * What `/search` narrows and orders the catalogue by. Every field has an
 * "any" value, so the empty state is `DEFAULT_FILTERS` and "how many filters
 * are on" is a count of the fields that differ from it.
 *
 * Only what the API can answer: the bundled catalogue also knew who was free
 * today and who was verified, the live one does not say, so those filters went
 * rather than filter on nothing.
 */
export type PriceBand = "any" | "under" | "mid" | "over";
export type LengthBand = "any" | "short" | "hour" | "long";
export type MinRating = "any" | "4.5" | "4.8";
export type SortKey = "recommended" | "priceLow" | "priceHigh" | "rating";

export type Filters = {
  readonly category: string | null;
  readonly price: PriceBand;
  readonly length: LengthBand;
  readonly rating: MinRating;
};

export const DEFAULT_FILTERS: Filters = {
  category: null,
  price: "any",
  length: "any",
  rating: "any",
};

/** The fields a result has to carry to be filtered and sorted. */
export type Filterable = {
  readonly category: string;
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

function matches(item: Filterable, filters: Filters): boolean {
  return (
    (filters.category === null || item.category === filters.category) &&
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
  priceLow: (a, b) => a.price - b.price,
  priceHigh: (a, b) => b.price - a.price,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviews - a.reviews,
};

export function applyFilters<T extends Filterable>(
  list: readonly T[],
  filters: Filters,
  sort: SortKey,
): readonly T[] {
  return list.filter((item) => matches(item, filters)).toSorted(ORDER[sort]);
}

/** How many filters are set, for the phone's "Filters (2)" button. */
export function activeCount(filters: Filters): number {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).filter(
    (key) => filters[key] !== DEFAULT_FILTERS[key],
  ).length;
}

/** The categories the list actually holds, in the order it first names them. */
export function categoriesOf(list: readonly { readonly category: string }[]): readonly string[] {
  return [...new Set(list.map((item) => item.category).filter(Boolean))];
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
