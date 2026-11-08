import type { StaticImageData } from "next/image";
import { useCallback } from "react";

import { liveServiceHref } from "@/components/bookings/booking-flow";
import type { Paginated } from "@/lib/api/client";
import {
  getAdvisorRatingSummaries,
  listAdvisors,
  listServiceCategories,
  listServices,
} from "@/lib/api/resources";
import type {
  ApiNamedRecord,
  ApiPublicAdvisor,
  ApiPublicService,
  ApiPublicServiceQuery,
  ApiRatingSummary,
} from "@/lib/api/types";
import { useLastAnswer, useResource } from "@/lib/api/use-resource";
import { matchesLength, type LengthBand } from "@/lib/catalogue/filters";
import {
  deskPhoto,
  heroCards,
  heroGround,
  serviceAdvisorsReview,
  serviceBusinessBoard,
  serviceCareerNotes,
  serviceCompanyBooks,
  serviceCondoRoom,
  serviceContractMeeting,
  serviceCreditCard,
  serviceExcelNumbers,
  serviceFirstHome,
  serviceFreelanceDeal,
  serviceFreelanceRate,
  serviceHiringTable,
  serviceLoanPapers,
  servicePayStructure,
  servicePriceTags,
  serviceRefinance,
  serviceResumeRead,
  serviceShopParcel,
  serviceCompanyStart,
  serviceCompanyForm,
  serviceJobContract,
  serviceFirstInvest,
  serviceTaxFund,
  serviceSocialAds,
  serviceTechPortfolio,
  serviceYearEndBinders,
  serviceFreelanceCalculator,
  serviceInterviewPractice,
  serviceLaptopCode,
  serviceShopOwner,
  serviceTaxReview,
} from "@/lib/assets/r2";
import th from "@/messages/th.json";

/**
 * The live catalogue: published services from `GET /services`, joined to
 * their advisor, category and rating, in the shape `/search`'s cards and the
 * home hero's ring both read.
 *
 * One cache key per request (`useResource`), so the hero and `/search` share
 * the same three lists and the ratings are fetched once.
 */
export type LiveService = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  /** The category's id; its name above is in the page's language. */
  readonly categoryId: string;
  /** The categories it is also found under, beside `categoryId`. */
  readonly extraCategoryIds?: readonly string[];
  /** Baht, from the API's satang. */
  readonly price: number;
  readonly minutes: number;
  readonly advisorId: string;
  readonly advisorName: string;
  readonly advisorHeadline: string;
  /** The home-hero card this advisor stands on, if they stand on one. */
  readonly card: number | null;
  readonly cover: StaticImageData;
  readonly face: StaticImageData | null;
  /** `null` until the summaries land, then the average or 0 for none yet. */
  readonly rating: number | null;
  readonly reviews: number;
  /** Whether the API marks the advisor verified; absent from an API that predates it. */
  readonly verified?: boolean;
  readonly href: string;
  /** Epoch ms the service was listed, for "newest first". */
  readonly listedAt: number;
  /**
   * The API's photographs for this service, as absolute URLs in carousel order:
   * the gallery, which follows `cover` (the API's, or chosen here for a service
   * without one, and always first). Empty until `service_images` has rows for it.
   */
  readonly images: readonly string[];
};

const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Which hero card an advisor is, by the card's Thai name: the names are the
 * seed's display names (`AdvisoryPlatformAPI/src/database/seed.ts`), and read
 * from the Thai messages whatever language the page is in.
 */
const CARD_BY_NAME = new Map<string, number>(
  CARD_NUMBERS.map((n) => [th.home[`card${n}Name`], n]),
);

export function heroCardFor(displayName: string): number | null {
  return CARD_BY_NAME.get(displayName) ?? null;
}

/**
 * A picture of what the service is about, for the seeded services whose
 * advisor is not on the ring, keyed by the seed's Thai service name
 * (`AdvisoryPlatformAPI/src/database/seed.ts`). With the twelve ring photos
 * every one of the seed's services has its own.
 */
const COVER_BY_TITLE = new Map<string, StaticImageData>([
  ["วางแผนภาษีสำหรับฟรีแลนซ์", serviceFreelanceCalculator],
  ["ตรวจแผนภาษีก่อนยื่น", serviceTaxReview],
  ["ปิดงบบริษัทเล็กครั้งแรก", serviceCompanyBooks],
  ["ทบทวนเส้นทางอาชีพ", serviceCareerNotes],
  ["ตรวจสุขภาพการตลาดของร้าน", serviceShopOwner],
  ["คุยเรื่องความเครียดจากงาน", deskPhoto],
  ["วางแผนเปิดธุรกิจใหม่", serviceBusinessBoard],
  ["เลือกสแตกให้โปรเจกต์แรก", serviceLaptopCode],
  ["ตรวจสัญญาก่อนเซ็น", serviceContractMeeting],
  ["ซ้อมสัมภาษณ์งานสายเทค", serviceInterviewPractice],
  ["วางแผนซื้อบ้านหลังแรก", serviceFirstHome],
  ["ปลดหนี้บัตรเครดิตอย่างมีแผน", serviceCreditCard],
  ["รีไฟแนนซ์บ้านให้ดอกเบี้ยลด", serviceRefinance],
  ["เตรียมเอกสารขอสินเชื่อบ้าน", serviceLoanPapers],
  ["ตรวจสัญญาเช่าคอนโดก่อนเซ็น", serviceCondoRoom],
  ["ร่างสัญญาจ้างงานฟรีแลนซ์", serviceFreelanceDeal],
  ["ออกแบบโครงสร้างเงินเดือนพนักงาน", servicePayStructure],
  ["เขียน JD และวางขั้นตอนสัมภาษณ์", serviceHiringTable],
  ["เตรียมเอกสารก่อนปิดงบปี", serviceYearEndBinders],
  ["วางระบบบัญชีร้านเล็กด้วย Excel", serviceExcelNumbers],
  ["ตั้งราคางานฟรีแลนซ์ให้คุ้ม", serviceFreelanceRate],
  ["เปิดร้านออนไลน์ให้ถูกภาษี", serviceShopParcel],
  ["ยิงแอดร้านออนไลน์ให้คุ้มงบ", serviceSocialAds],
  ["ตั้งราคาสินค้าและคำนวณกำไรต่อชิ้น", servicePriceTags],
  ["ทำพอร์ตให้ได้งานสายเทค", serviceTechPortfolio],
  ["รีวิวเรซูเม่ภาษาอังกฤษ", serviceResumeRead],
  ["จดทะเบียนบริษัทครั้งแรก", serviceCompanyStart],
  ["เลือกจดบริษัทหรือห้างหุ้นส่วน", serviceCompanyForm],
  ["รีวิวสัญญาจ้างก่อนเซ็น", serviceJobContract],
  ["เริ่มลงทุนด้วยเงินก้อนแรก", serviceFirstInvest],
  ["เลือกกองทุนลดหย่อนภาษีให้เหมาะกับตัวเอง", serviceTaxFund],
]);

/**
 * Covers for a service nobody has picked a picture for (one an advisor adds
 * after the seed), handed out in order so neighbours differ; past the end
 * the list starts over.
 */
// Only photographs that differ from each other. `serviceAdvisorsDesk`,
// `landingCtaBand`, `landingHeroPoster` and `advisor` are all the
// `serviceAdvisorsReview` shoot under other crops, and side by side the cards
// came out identical. `documentPreview` is a screenshot of a letter, and
// `sarahJenskins` carries a stock watermark.
const SPARE_COVERS: readonly StaticImageData[] = [
  serviceAdvisorsReview,
  serviceLaptopCode,
  deskPhoto,
  heroGround,
];

/** An API photograph as a cover, at the size the cards draw it. */
function photo(src: string): StaticImageData {
  return { src, width: 1600, height: 1200 };
}

/**
 * Gives each service its picture. A service with a cover in the API wears it,
 * and one with photographs but no cover the first of them, so a card shows
 * what the service's page and its editor show. The rest get a picture of the
 * site's in three passes so no two cards share one: the picture chosen for
 * that service, then the ring card's photo for one service of each advisor on
 * the ring, then a spare nobody has yet (cycling only once every spare is in
 * use).
 * Ordered by id first, so a service keeps its picture from one load to the next.
 */
function assignCovers(
  items: readonly LiveService[],
  apiCovers: ReadonlyMap<string, string>,
): readonly LiveService[] {
  const sorted = items.toSorted((a, b) => a.id.localeCompare(b.id));
  const covers = new Map<string, StaticImageData>();
  for (const item of sorted) {
    const own = apiCovers.get(item.id) ?? item.images[0];
    if (own) covers.set(item.id, photo(own));
  }
  for (const item of sorted) {
    if (covers.has(item.id)) continue;
    const own = COVER_BY_TITLE.get(item.title);
    if (own) covers.set(item.id, own);
  }
  const cardUsed = new Set<number>();
  for (const item of sorted) {
    if (covers.has(item.id) || !item.card || cardUsed.has(item.card)) continue;
    cardUsed.add(item.card);
    covers.set(item.id, heroCards[item.card].photo);
  }
  const taken = new Set(covers.values());
  const spares = [...SPARE_COVERS.filter((cover) => !taken.has(cover)), ...SPARE_COVERS];
  let next = 0;
  for (const item of sorted) {
    if (covers.has(item.id)) continue;
    covers.set(item.id, spares[next % spares.length]);
    next += 1;
  }
  return sorted.map((item) => ({ ...item, cover: covers.get(item.id) ?? item.cover }));
}

/**
 * The advisor's own portrait from the API, sized for the 32px face it fills.
 * The ring's advisors keep the photo their card shows, so one person has one face.
 */
function portrait(image: string | null | undefined): StaticImageData | null {
  return image ? { src: image, width: 128, height: 128 } : null;
}

/**
 * One service as a card. Who gives it, their face, score and mark come with
 * the service (`advisor`) from an API that sends them; from one that does not,
 * from the advisor list and the rating summaries, and a service whose advisor
 * is in neither is left out. The headline is only on the advisor list.
 */
function join(
  service: ApiPublicService,
  advisors: ReadonlyMap<string, ApiPublicAdvisor>,
  categories: ReadonlyMap<string, string>,
  ratings: ReadonlyMap<string, ApiRatingSummary> | undefined,
): LiveService | null {
  const own = service.advisor ?? null;
  const listed = advisors.get(service.advisorId);
  const name = own?.name ?? listed?.displayName;
  if (name === undefined) return null;
  const card = heroCardFor(name);
  const category = categories.get(service.categoryId) ?? "";
  const summary = ratings?.get(service.advisorId);
  return {
    id: service.id,
    title: service.name,
    description: service.description,
    category,
    categoryId: service.categoryId,
    extraCategoryIds: service.extraCategoryIds ?? [],
    price: service.priceSatang / 100,
    minutes: service.durationMinutes,
    advisorId: service.advisorId,
    advisorName: name,
    advisorHeadline: listed?.headline ?? "",
    card,
    // Placeholder; `assignCovers` sets the real one once the whole list is in.
    cover: serviceAdvisorsReview,
    face: card ? heroCards[card].face : portrait(own?.avatarUrl ?? listed?.image),
    rating: own ? (own.rating ?? 0) : ratings ? (summary?.average ?? 0) : null,
    reviews: own ? own.reviewCount : (summary?.total ?? 0),
    verified: own?.verified,
    href: liveServiceHref(service.id),
    listedAt: Date.parse(service.createdAt) || 0,
    images: service.images ?? [],
  };
}

/** Each service's cover from the API, for the services that have one. */
function apiCoversOf(services: readonly ApiPublicService[]): ReadonlyMap<string, string> {
  return new Map(services.flatMap((service) => (service.cover ? [[service.id, service.cover] as const] : [])));
}

/** The reader's own calendar date, `YYYY-MM-DD`: "today" is theirs, not the server's. */
export function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * What a service is joined to for its card: the advisor list, the categories
 * and every advisor's rating summary, read once for every list that joins.
 */
function useJoins(): {
  readonly join: (service: ApiPublicService) => LiveService | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
} {
  // Every page: a catalogue of more than a hundred advisors left the rest
  // without a name or a rating on their cards.
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?all",
    useCallback((signal: AbortSignal) => listEveryAdvisor(signal), []),
  );
  const categories = useResource<Paginated<ApiNamedRecord>>(
    "service-categories",
    useCallback((signal: AbortSignal) => listServiceCategories(signal), []),
  );

  // Every advisor's summary, as one resource keyed by who is in the list, read
  // in one batch. An advisor missing from the answer (or a batch that fails)
  // is "no reviews yet", not a page that fails, as it was one by one.
  const ids = (advisors.data?.items ?? []).map((advisor) => advisor.id);
  const idKey = ids.join(",");
  const ratings = useResource<ReadonlyMap<string, ApiRatingSummary>>(
    idKey ? `ratings:${idKey}` : "ratings:none",
    useCallback(
      async (signal: AbortSignal) => {
        if (!idKey) return new Map();
        try {
          // A hundred ids a request, the most the API reads at once.
          const all = idKey.split(",");
          const batches = Array.from({ length: Math.ceil(all.length / API_PAGE_LIMIT) }, (_, index) =>
            all.slice(index * API_PAGE_LIMIT, (index + 1) * API_PAGE_LIMIT),
          );
          const answers = await Promise.all(batches.map((batch) => getAdvisorRatingSummaries(batch, signal)));
          return new Map(answers.flatMap(({ items }) => items.map((item) => [item.advisorId, item] as const)));
        } catch (cause) {
          if (signal.aborted) throw cause;
          return new Map();
        }
      },
      [idKey],
    ),
  );

  const advisorMap = new Map((advisors.data?.items ?? []).map((a) => [a.id, a]));
  const categoryMap = new Map((categories.data?.items ?? []).map((c) => [c.id, c.name]));
  const summaries = ids.length ? ratings.data : undefined;

  return {
    join: (service) => join(service, advisorMap, categoryMap, summaries),
    loading: advisors.loading,
    error: advisors.error,
    reload: advisors.reload,
  };
}

function joinAll(
  services: readonly ApiPublicService[],
  joinOne: (service: ApiPublicService) => LiveService | null,
): LiveService[] {
  return services.map(joinOne).filter((item): item is LiveService => item !== null);
}

export function useLiveCatalogue(): {
  readonly items: readonly LiveService[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
} {
  // Every page, not the first hundred: matching names services from the whole
  // catalogue, and one past the first page had no card to draw.
  const services = useResource<readonly ApiPublicService[]>(
    "services?all",
    useCallback((signal: AbortSignal) => listEveryPage({}, signal), []),
  );
  const joins = useJoins();
  const listed = services.data ?? [];
  const items = assignCovers(joinAll(listed, joins.join), apiCoversOf(listed));

  return {
    items,
    loading: services.loading || joins.loading,
    error: services.error ?? joins.error,
    reload: () => {
      services.reload();
      joins.reload();
    },
  };
}

/** The most `GET /services` lists at once. */
const API_PAGE_LIMIT = 100;

/** Every page of one search, in the API's order, for the one filter it cannot answer itself. */
async function listEveryPage(query: ApiPublicServiceQuery, signal: AbortSignal): Promise<ApiPublicService[]> {
  const first = await listServices({ ...query, page: 1, limit: API_PAGE_LIMIT }, signal);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    items.push(...(await listServices({ ...query, page, limit: API_PAGE_LIMIT }, signal)).items);
  }
  return items;
}

/** Every listed advisor, all pages, as one page. */
async function listEveryAdvisor(signal: AbortSignal): Promise<Paginated<ApiPublicAdvisor>> {
  const first = await listAdvisors({ page: 1, limit: API_PAGE_LIMIT }, signal);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    items.push(...(await listAdvisors({ page, limit: API_PAGE_LIMIT }, signal)).items);
  }
  return { ...first, items, page: 1, totalPages: 1 };
}

/** The query as a cache key: every parameter that changes the answer, in a fixed order. */
function searchKey(query: ApiPublicServiceQuery): string {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]): [string, string] => [key, String(value)])
    .toSorted(([a], [b]) => a.localeCompare(b));
  return `services?${new URLSearchParams(params).toString()}`;
}

export type CatalogueSearch = {
  /** The page asked for, as cards. */
  readonly items: readonly LiveService[];
  /** Every match, across all pages. */
  readonly total: number;
  readonly totalPages: number;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
};

/**
 * `/search`'s results: one page of `GET /services`, narrowed, ordered and
 * paged on the server (`serviceQuery` in `./filters` builds the query), as
 * the catalogue's cards. A service wears its own cover from the API; one
 * without wears the picture the catalogue gave it, so it looks the same here
 * as on the home page.
 *
 * The length of a session is the one filter the API has no parameter for.
 * While it is on, every page of the rest of the search is read and the length
 * is narrowed, counted and paged here instead.
 *
 * While the next answer is read, the last one stays in view, so changing page
 * or a filter does not blink the grid to its skeleton.
 */
export function useCatalogueSearch(
  query: ApiPublicServiceQuery,
  length: LengthBand,
  page: number,
  pageSize: number,
): CatalogueSearch {
  const local = length !== "any";
  const asked: ApiPublicServiceQuery = local ? query : { ...query, page, limit: pageSize };
  const key = local ? `${searchKey(query)}&length=${length}` : searchKey(asked);
  // The key names every parameter, so the fetcher needs no memo of its own.
  const resource = useResource<Paginated<ApiPublicService>>(key, async (signal: AbortSignal) => {
    if (!local) return listServices(asked, signal);
    const kept = (await listEveryPage(asked, signal)).filter((service) =>
      matchesLength(length, service.durationMinutes),
    );
    return { items: kept, total: kept.length, page: 1, limit: kept.length, totalPages: 1 };
  });
  const answer = useLastAnswer(resource);
  const catalogue = useLiveCatalogue();
  const joins = useJoins();

  const all = answer?.items ?? [];
  const listed = local ? all.slice((page - 1) * pageSize, page * pageSize) : all;
  const total = answer?.total ?? 0;
  const pictured = new Map(catalogue.items.map((item) => [item.id, item.cover] as const));
  const apiCovers = apiCoversOf(listed);
  // Held until the catalogue is in, so a card does not change picture as it lands.
  const items = catalogue.loading
    ? []
    : joinAll(listed, joins.join).map((item) => {
        const own = apiCovers.get(item.id);
        if (own) return { ...item, cover: photo(own) };
        return { ...item, cover: pictured.get(item.id) ?? assignCovers([item], apiCovers)[0].cover };
      });

  return {
    items,
    total,
    totalPages: local ? Math.ceil(total / pageSize) : (answer?.totalPages ?? 0),
    // The catalogue as well: its pictures are the covers of a service without one.
    loading: resource.loading || catalogue.loading,
    error: resource.error ?? catalogue.error,
    reload: () => {
      resource.reload();
      catalogue.reload();
    },
  };
}
