import type { StaticImageData } from "next/image";
import { useCallback } from "react";

import { addDays, isoDay, liveAdvisorHref, useMountTime } from "@/components/bookings/booking-flow";
import type { Paginated } from "@/lib/api/client";
import { listServices } from "@/lib/api/resources";
import type { ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { heroCards } from "@/lib/assets/r2";
import { DEFAULT_FILTERS, applyFilters, categoriesOf } from "@/lib/catalogue/filters";
import type { LiveService } from "@/lib/catalogue/live";

/**
 * What the home sections read off the live catalogue (`useLiveCatalogue`):
 * the same services, advisors and ratings `/search` lists, arranged for a
 * page that shows a little of everything rather than all of one thing.
 */

/** The catalogue in `/search`'s "recommended" order: most reviewed, then best rated. */
export function recommended(items: readonly LiveService[]): readonly LiveService[] {
  return applyFilters(items, DEFAULT_FILTERS, "recommended");
}

/** One advisor, folded out of the services they list. */
export type HomeAdvisor = {
  readonly id: string;
  readonly name: string;
  readonly headline: string;
  readonly face: StaticImageData | null;
  /**
   * A photograph of their work: their hero ring card's, or the cover of their
   * most reviewed service for an advisor the ring does not carry.
   */
  readonly photo: StaticImageData;
  /** Their published services, the most reviewed first. */
  readonly offers: readonly LiveService[];
  /** Their cheapest service, in baht. */
  readonly from: number;
  /** `null` while the summaries load; 0 reviews is "no reviews yet". */
  readonly rating: number | null;
  readonly reviews: number;
  readonly href: string;
};

/** Every advisor in the catalogue, the most reviewed first, as `/search` would rank their services. */
export function advisorsOf(items: readonly LiveService[]): readonly HomeAdvisor[] {
  const byId = new Map<string, LiveService[]>();
  for (const item of recommended(items)) {
    const offers = byId.get(item.advisorId);
    if (offers) offers.push(item);
    else byId.set(item.advisorId, [item]);
  }
  return [...byId.values()].map((offers) => {
    const lead = offers[0];
    return {
      id: lead.advisorId,
      name: lead.advisorName,
      headline: lead.advisorHeadline,
      face: lead.face,
      photo: lead.card ? heroCards[lead.card].photo : lead.cover,
      offers,
      from: Math.min(...offers.map((offer) => offer.price)),
      rating: lead.rating,
      reviews: lead.reviews,
      href: liveAdvisorHref(lead.advisorId),
    };
  });
}

/** A category, with how much is filed under it and the photograph of its most reviewed service. */
export type HomeCategory = {
  readonly name: string;
  readonly count: number;
  readonly cover: StaticImageData;
  /** The titles of its most reviewed services: what people actually come to ask. */
  readonly examples: readonly string[];
  readonly href: string;
};

/**
 * The categories, the busiest first (`categoriesOf`). Each opens `/search` on
 * its own name: the query is matched against a service's category as well as
 * its title, so the results are that category.
 */
export function categoryIndex(items: readonly LiveService[]): readonly HomeCategory[] {
  const ranked = recommended(items);
  return categoriesOf(items).flatMap((name) => {
    const filed = ranked.filter((item) => item.category === name);
    const lead = filed[0];
    return lead
      ? [
          {
            name,
            count: filed.length,
            cover: lead.cover,
            examples: filed.slice(0, 2).map((item) => item.title),
            href: `/search?q=${encodeURIComponent(name)}`,
          },
        ]
      : [];
  });
}

/**
 * Three real services that show the range of prices: the cheapest, one from
 * the middle and the dearest, from three different advisors where the
 * catalogue allows. Cheapest first, so the column reads as a scale.
 */
export function priceLadder(items: readonly LiveService[]): readonly LiveService[] {
  const byPrice = items.toSorted((a, b) => a.price - b.price || b.reviews - a.reviews);
  if (byPrice.length <= 3) return byPrice;
  const low = byPrice[0];
  // More than three here, so `.at(-1)` is always there.
  const high = byPrice.findLast((item) => item.advisorId !== low.advisorId) ?? byPrice.at(-1) ?? low;
  const middle = byPrice.slice(Math.floor(byPrice.length / 3), Math.ceil((byPrice.length * 2) / 3));
  const mid =
    middle.find((item) => item.advisorId !== low.advisorId && item.advisorId !== high.advisorId && item.price !== low.price && item.price !== high.price) ??
    middle[Math.floor(middle.length / 2)];
  return [low, mid, high].filter((item, i, all) => all.indexOf(item) === i);
}

/** The lowest and highest price in the catalogue, in baht. */
export function priceRange(items: readonly LiveService[]): { readonly min: number; readonly max: number } | null {
  if (items.length === 0) return null;
  const prices = items.map((item) => item.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** The soonest day anything can be booked, within the coming week. */
export type OpenDay =
  | { readonly state: "loading" }
  /** Nothing open this week, or the question could not be asked. */
  | { readonly state: "none" }
  | {
      readonly state: "open";
      /** Days from today: 0 is today. */
      readonly offset: number;
      readonly date: Date;
      readonly ids: ReadonlySet<string>;
    };

/** How far ahead to look for an open day before giving up on the section. */
const LOOKAHEAD = 7;

/**
 * Today's open services, or, when today has none (the seed's advisors keep
 * weekdays), the first day of the coming week that has some.
 *
 * Today is asked under the exact key `useOpenToday` uses, so `/search`'s
 * "available today" filter and this share one request. It is read through
 * `useResource` here rather than `useOpenToday` because that hook answers
 * `null` both while loading and after a failure, and this section has to
 * tell a skeleton from a section to fold away.
 */
export function useSoonestOpen(): OpenDay {
  const now = useMountTime();
  const today = isoDay(new Date(now));

  const first = useResource<Paginated<ApiPublicService>>(
    `services?limit=100&availableOn=${today}`,
    useCallback((signal: AbortSignal) => listServices({ limit: 100, availableOn: today }, signal), [today]),
  );
  const closedToday = first.data?.items.length === 0;

  // One resource for the rest of the week, asked a day at a time and only
  // as far as the first open one.
  const later = useResource<{ readonly offset: number; readonly ids: readonly string[] } | null>(
    closedToday ? `services:next-open-after:${today}` : "services:next-open:off",
    useCallback(
      async (signal: AbortSignal) => {
        if (!closedToday) return null;
        for (let offset = 1; offset < LOOKAHEAD; offset += 1) {
          const day = isoDay(addDays(new Date(now), offset));
          const page = await listServices({ limit: 100, availableOn: day }, signal);
          if (page.items.length > 0) return { offset, ids: page.items.map((service) => service.id) };
        }
        return null;
      },
      [closedToday, now],
    ),
  );

  if (first.error) return { state: "none" };
  if (first.data && first.data.items.length > 0) {
    return {
      state: "open",
      offset: 0,
      date: new Date(now),
      ids: new Set(first.data.items.map((service) => service.id)),
    };
  }
  if (!closedToday || later.loading) return { state: "loading" };
  if (!later.data) return { state: "none" };
  return {
    state: "open",
    offset: later.data.offset,
    date: addDays(new Date(now), later.data.offset),
    ids: new Set(later.data.ids),
  };
}
