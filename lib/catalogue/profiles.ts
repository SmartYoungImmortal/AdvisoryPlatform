import type { StaticImageData } from "next/image";

import {
  christopherNolan,
  jamesGunn,
  serviceAdvisorsDesk,
  serviceAdvisorsReview,
  serviceLaptopCode,
} from "@/lib/assets/r2";
import {
  advisorList,
  getAdvisor,
  getService,
  services,
  type Advisor,
} from "@/lib/catalogue/services";

/** Every advisor gets a profile page — see the note below. */
export const profileAdvisorIds = advisorList.map(({ id }) => id);

/**
 * Figma "Advisor public profile" (1564:22619) — what a visitor sees of an advisor.
 *
 * The header reads the catalogue's `Advisor` record directly: name, credential,
 * field, score, consultations, written reviews and the rating breakdown are all
 * already there, and a second copy would drift. What lives here is only what the
 * catalogue has no field for — the level badge, the longer about text, verified
 * skills, the public listing and the review excerpts.
 *
 * Only Sarah Jenskins has a drawn profile. Every other advisor still gets a working
 * page built from the catalogue alone, because every service detail links to its
 * advisor and a link must never 404.
 */

export type ProfileTab = "services" | "about" | "reviews";

export interface ListingEntry {
  readonly title: string;
  readonly rating: string;
  readonly ratingCount: number;
  /** Baht per 30-minute slot. */
  readonly price: number;
  readonly cover: StaticImageData;
  /**
   * Set only when a catalogue service is this same listing — same advisor, same
   * title. A listing that pointed anywhere else would open a detail page with a
   * different face or a different name on it.
   */
  readonly serviceId?: string;
}

export interface ProfileReview {
  readonly id: string;
  readonly name: string;
  readonly avatar: StaticImageData;
  readonly date: string;
  readonly stars: string;
  readonly service: string;
  readonly body: string;
}

interface ProfileExtension {
  readonly level: number;
  readonly levelTitle: string;
  readonly about: string;
  readonly skills: readonly string[];
  readonly listing: readonly ListingEntry[];
  readonly reviews: readonly ProfileReview[];
}

const EXTENSIONS: Readonly<Record<string, ProfileExtension>> = {
  "sarah-jenskins": {
    level: 3,
    levelTitle: "ผู้เชี่ยวชาญอาวุโส",
    about:
      "ที่ปรึกษาด้านภาษีและบัญชีมากกว่า 10 ปี เคยดูแลผู้ประกอบการรายย่อยและฟรีแลนซ์มาแล้วกว่า 300 ราย ถนัดเรื่องการวางแผนภาษีสำหรับคนที่มีรายได้หลายทาง และการเตรียมเอกสารก่อนยื่น",
    skills: [
      "ผู้สอบบัญชีรับอนุญาต (CPA)",
      "วางแผนภาษีบุคคลธรรมดา",
      "บัญชีสำหรับธุรกิจขนาดเล็ก",
    ],
    listing: [
      {
        title: "วางแผนภาษีสำหรับฟรีแลนซ์",
        rating: "4.9",
        ratingCount: 124,
        price: 600,
        cover: serviceAdvisorsDesk,
        serviceId: "tax-freelance",
      },
      {
        title: "ตรวจแผนภาษีก่อนยื่น",
        rating: "4.8",
        ratingCount: 87,
        price: 450,
        cover: serviceAdvisorsReview,
      },
      {
        title: "ปรึกษาภาษีนิติบุคคล",
        rating: "5.0",
        ratingCount: 46,
        price: 900,
        cover: serviceLaptopCode,
      },
      {
        title: "วางแผนค่าลดหย่อนประจำปี",
        rating: "4.9",
        ratingCount: 96,
        price: 700,
        cover: serviceAdvisorsDesk,
      },
      {
        title: "ภาษีสำหรับธุรกิจออนไลน์",
        rating: "4.6",
        ratingCount: 31,
        price: 400,
        cover: serviceLaptopCode,
      },
      {
        title: "ทำบัญชีสำหรับธุรกิจขนาดเล็ก",
        rating: "4.9",
        ratingCount: 88,
        price: 600,
        cover: serviceAdvisorsReview,
      },
      {
        title: "ตรวจเอกสารก่อนยื่นภาษี",
        rating: "4.7",
        ratingCount: 52,
        price: 550,
        cover: serviceAdvisorsDesk,
      },
    ],
    reviews: [
      {
        id: "r-thanakrit",
        name: "ธนกฤต ว.",
        avatar: christopherNolan,
        date: "10 ส.ค. 2569",
        stars: "5.0",
        service: "วางแผนภาษีสำหรับฟรีแลนซ์",
        body: "อธิบายเข้าใจง่ายมาก ช่วยไล่ดูรายรับทีละก้อนจริง ๆ ได้ค่าลดหย่อนที่ไม่เคยรู้มาก่อน",
      },
      {
        id: "r-weerapat",
        name: "วีรภัทร ก.",
        avatar: jamesGunn,
        date: "2 ส.ค. 2569",
        stars: "5.0",
        service: "ตรวจแผนภาษีก่อนยื่น",
        body: "ตรงเวลา เตรียมข้อมูลมาดี จบใน 1 ชั่วโมงแล้วได้แผนภาษีปีหน้าไปเลย",
      },
    ],
  },
};

/** How many listings the services tab shows before "ดูบริการทั้งหมด". */
export const LISTING_PREVIEW = 4;

export interface PublicProfile {
  readonly advisor: Advisor;
  readonly level?: { readonly number: number; readonly title: string };
  readonly about: string;
  readonly skills: readonly string[];
  readonly listing: readonly ListingEntry[];
  readonly reviews: readonly ProfileReview[];
}

/** The catalogue services an advisor owns, as listings — the fallback profile. */
function catalogueListing(advisorId: string): ListingEntry[] {
  return services
    .filter((service) => service.advisorId === advisorId)
    .map((service) => ({
      title: service.title,
      rating: getAdvisor(advisorId)?.rating ?? "",
      ratingCount: service.bookings,
      price: service.price,
      cover: service.cover,
      serviceId: service.id,
    }));
}

export function publicProfile(advisorId: string): PublicProfile | undefined {
  const advisor = getAdvisor(advisorId);
  if (!advisor) return undefined;
  const extension = EXTENSIONS[advisorId];

  const listing = (extension?.listing ?? catalogueListing(advisorId)).map(
    (entry) => {
      if (!entry.serviceId) return entry;
      const service = getService(entry.serviceId);
      const same =
        service?.advisorId === advisorId && service.title === entry.title;
      return same ? entry : { ...entry, serviceId: undefined };
    },
  );

  return {
    advisor,
    level: extension
      ? { number: extension.level, title: extension.levelTitle }
      : undefined,
    about: extension?.about ?? advisor.bio,
    skills: extension?.skills ?? [],
    listing,
    reviews: extension?.reviews ?? [],
  };
}

/** Level badge for the signed-in advisor's own profile, which is Sarah. */
export function advisorLevel(advisorId: string) {
  const extension = EXTENSIONS[advisorId];
  return extension
    ? { number: extension.level, title: extension.levelTitle }
    : undefined;
}
