import type { StaticImageData } from "next/image";
import { useCallback, useMemo } from "react";

import { liveServiceHref } from "@/components/bookings/booking-flow";
import type { Paginated } from "@/lib/api/client";
import {
  getAdvisorRatingSummary,
  listAdvisors,
  listServiceCategories,
  listServices,
} from "@/lib/api/resources";
import type {
  ApiNamedRecord,
  ApiPublicAdvisor,
  ApiPublicService,
  ApiRatingSummary,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
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
  readonly href: string;
  /** Epoch ms the service was listed, for "newest first". */
  readonly listedAt: number;
  /**
   * The API's photographs for this service, as absolute URLs in carousel order:
   * the gallery, which follows `cover` (still chosen here, and always first).
   * Empty until `service_images` has rows for it.
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

/**
 * Gives each service its picture, in three passes so no two cards share one:
 * the picture chosen for that service, then the ring card's photo for one
 * service of each advisor on the ring, then a spare nobody has yet (cycling
 * only once every spare is in use).
 * Ordered by id first, so a service keeps its picture from one load to the next.
 */
function assignCovers(items: readonly LiveService[]): readonly LiveService[] {
  const sorted = items.toSorted((a, b) => a.id.localeCompare(b.id));
  const covers = new Map<string, StaticImageData>();
  for (const item of sorted) {
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

function join(
  service: ApiPublicService,
  advisors: ReadonlyMap<string, ApiPublicAdvisor>,
  categories: ReadonlyMap<string, string>,
  ratings: ReadonlyMap<string, ApiRatingSummary> | undefined,
): LiveService | null {
  const advisor = advisors.get(service.advisorId);
  if (!advisor) return null;
  const card = heroCardFor(advisor.displayName);
  const category = categories.get(service.categoryId) ?? "";
  const summary = ratings?.get(advisor.id);
  return {
    id: service.id,
    title: service.name,
    description: service.description,
    category,
    price: service.priceSatang / 100,
    minutes: service.durationMinutes,
    advisorId: advisor.id,
    advisorName: advisor.displayName,
    advisorHeadline: advisor.headline,
    card,
    // Placeholder; `assignCovers` sets the real one once the whole list is in.
    cover: serviceAdvisorsReview,
    face: card ? heroCards[card].face : portrait(advisor.image),
    rating: ratings ? (summary?.average ?? 0) : null,
    reviews: summary?.total ?? 0,
    href: liveServiceHref(service.id),
    listedAt: Date.parse(service.createdAt) || 0,
    images: service.images ?? [],
  };
}

/** The reader's own calendar date, `YYYY-MM-DD`: "today" is theirs, not the server's. */
function localDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The services with a bookable slot left today, as a set of ids, for the
 * "available today" filter. Availability is derived from each advisor's
 * schedule on the server (`availableOn`), so this is its own request, asked
 * only while the filter is on; `null` while it is off or still loading.
 */
export function useOpenToday(enabled: boolean): ReadonlySet<string> | null {
  const today = localDate();
  const open = useResource<Paginated<ApiPublicService> | null>(
    enabled ? `services?limit=100&availableOn=${today}` : "services:open-today:off",
    useCallback(
      (signal: AbortSignal) =>
        enabled ? listServices({ limit: 100, availableOn: today }, signal) : Promise.resolve(null),
      [enabled, today],
    ),
  );
  return useMemo(
    () => (enabled && open.data ? new Set(open.data.items.map((service) => service.id)) : null),
    [enabled, open.data],
  );
}

export function useLiveCatalogue(): {
  readonly items: readonly LiveService[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly reload: () => void;
} {
  const services = useResource<Paginated<ApiPublicService>>(
    "services?limit=100",
    useCallback((signal: AbortSignal) => listServices({ limit: 100 }, signal), []),
  );
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    useCallback((signal: AbortSignal) => listAdvisors({ limit: 100 }, signal), []),
  );
  const categories = useResource<Paginated<ApiNamedRecord>>(
    "service-categories",
    useCallback((signal: AbortSignal) => listServiceCategories(signal), []),
  );

  // Every advisor's summary, as one resource keyed by who is in the list.
  const ids = (advisors.data?.items ?? []).map((advisor) => advisor.id);
  const idKey = ids.join(",");
  const ratings = useResource<ReadonlyMap<string, ApiRatingSummary>>(
    idKey ? `ratings:${idKey}` : "ratings:none",
    useCallback(
      async (signal: AbortSignal) => {
        const pairs = await Promise.all(
          (idKey ? idKey.split(",") : []).map(async (id) => {
            try {
              return [id, await getAdvisorRatingSummary(id, signal)] as const;
            } catch {
              // No summary is "no reviews yet", not a page that fails.
              return null;
            }
          }),
        );
        return new Map(pairs.filter((pair) => pair !== null));
      },
      [idKey],
    ),
  );

  const advisorMap = new Map((advisors.data?.items ?? []).map((a) => [a.id, a]));
  const categoryMap = new Map((categories.data?.items ?? []).map((c) => [c.id, c.name]));
  const items = assignCovers(
    (services.data?.items ?? [])
      .map((service) => join(service, advisorMap, categoryMap, ids.length ? ratings.data : undefined))
      .filter((item): item is LiveService => item !== null),
  );

  return {
    items,
    loading: services.loading || advisors.loading,
    error: services.error ?? advisors.error,
    reload: () => {
      services.reload();
      advisors.reload();
    },
  };
}
