import type { StaticImageData } from "next/image";

import {
  arayaS,
  christopherNolan,
  deskPhoto,
  jamesGunn,
  sarahJenskins,
  serviceAdvisorsDesk,
  serviceAdvisorsReview,
  serviceLaptopCode,
} from "@/lib/assets/r2";

/**
 * The consulting catalogue — the services the home rails, the search results and
 * `/service/[id]` all read from.
 *
 * Before this, home and search each spelled their own copy of the same records
 * into `messages/th.json` (`home.s1Title` and `search.r1Title` were the same
 * string), which is why nothing could link anywhere: there was no id to link to.
 * Ids here double as the `generateStaticParams` list for `/service/[id]`, the
 * way `chatThreadIds` does for `/chat/[id]`.
 *
 * Copy lives in the fixture rather than in a message namespace, following
 * `lib/admin/users.ts`. Message keys are typed as a literal union, so a record
 * looked up by id cannot reach its own copy through `t()` without a cast; the
 * UI *labels* around these records do stay in `messages/th.json` under
 * `service`.
 *
 * Ratings, review counts, verification and response time sit on the advisor
 * because that is how the fixtures already read them (Sarah scored 4.9 (124) on
 * every one of her services). Bookings, duration and price sit on the service.
 */
export type Advisor = {
  readonly id: string;
  readonly name: string;
  readonly field: string;
  readonly avatar: StaticImageData;
  /** `ChatAvatar` re-frames its default portrait; the others are already square. */
  readonly crop: boolean;
  readonly rating: string;
  readonly reviews: number;
  /** Cleared identity and credential review — `advisor.verified` in the copy. */
  readonly verified: boolean;
  /** Typical time to answer a consultation request, in minutes. */
  readonly responseMinutes: number;
  /**
   * The licence, not the category: `field` groups an advisor into a rail
   * ("ภาษีและบัญชี"), this is what they are qualified as, which is the half the
   * detail card leads with.
   */
  readonly credential: string;
  /** Two lines of credentials — the advisor card on `/service/[id]`. */
  readonly bio: string;
  /** Consultations delivered. Sits beside the score in the card's stat row. */
  readonly consultations: number;
  /**
   * Reviews actually written. Lower than `reviews` — that counts everyone who
   * left a score, and most of them never type anything.
   */
  readonly writtenReviews: number;
  /** Share of ratings at 5, 4, 3, 2, 1 stars, as percentages of the bar track. */
  readonly ratingBreakdown: readonly [number, number, number, number, number];
};

export type Slot = {
  /** Day in the reader's terms; the fixtures have no clock to resolve a date against. */
  readonly day: "today" | "tomorrow";
  readonly time: string;
  /** Places left on this slot. One is worth saying out loud, five is not. */
  readonly seatsLeft?: number;
};

export type Service = {
  readonly id: string;
  readonly title: string;
  readonly advisorId: string;
  readonly cover: StaticImageData;
  /**
   * The hero gallery, cover first. `cover` stays the single still the cards on
   * home and `/search` show; this is what the detail screen pages through.
   */
  readonly gallery: readonly StaticImageData[];
  /** Where the service sits in the catalogue — the middle crumb. */
  readonly category: string;
  readonly minutes: number;
  readonly price: number;
  /** What can actually be asked in the hour, as chips under the summary. */
  readonly topics: readonly string[];
  /** Consultations completed — the volume proof the card was missing. */
  readonly bookings: number;
  readonly summary: string;
  /** What the reader walks away with. Three lines, no more. */
  readonly includes: readonly string[];
  readonly slots: readonly Slot[];
};

export type Review = {
  readonly serviceId: string;
  readonly name: string;
  readonly avatar: StaticImageData;
  readonly date: string;
  /** The score this reader left, one decimal — "5.0", not "5". */
  readonly rating: string;
  readonly body: string;
};

const ADVISOR_LIST: ReadonlyArray<Advisor> = [
  {
    id: "sarah-jenskins",
    name: "Sarah Jenskins",
    field: "ภาษีและบัญชี",
    credential: "นักบัญชีรับอนุญาต",
    avatar: sarahJenskins,
    crop: true,
    rating: "4.9",
    reviews: 124,
    verified: true,
    responseMinutes: 120,
    bio: "ที่ปรึกษาด้านภาษีและบัญชีมากกว่า 10 ปี เคยดูแลผู้ประกอบการรายย่อยและฟรีแลนซ์มาแล้วกว่า 300 ราย",
    consultations: 124,
    writtenReviews: 118,
    ratingBreakdown: [82.7, 13.3, 3.1, 0.9, 0.9],
  },
  {
    id: "thanakrit-w",
    name: "ธนกฤต ว.",
    field: "กลยุทธ์ธุรกิจ",
    credential: "ที่ปรึกษาธุรกิจ",
    avatar: christopherNolan,
    crop: false,
    rating: "4.8",
    reviews: 87,
    verified: true,
    responseMinutes: 30,
    bio: "ที่ปรึกษาด้านกลยุทธ์และการเงินธุรกิจกว่า 8 ปี เคยวางแผนเปิดกิจการให้ผู้ประกอบการรายย่อยมาแล้วกว่า 150 ราย",
    consultations: 87,
    writtenReviews: 79,
    ratingBreakdown: [74.4, 18.6, 4.7, 1.2, 1.1],
  },
  {
    id: "weerapat-k",
    name: "วีรภัทร ก.",
    field: "สายอาชีพเทค",
    credential: "วิศวกรซอฟต์แวร์อาวุโส",
    avatar: jamesGunn,
    crop: false,
    rating: "5.0",
    reviews: 46,
    verified: true,
    responseMinutes: 300,
    bio: "วิศวกรซอฟต์แวร์และผู้สัมภาษณ์ในบริษัทเทคกว่า 9 ปี เคยติวเตรียมสัมภาษณ์ให้ผู้สมัครมาแล้วกว่า 120 ราย",
    consultations: 46,
    writtenReviews: 41,
    ratingBreakdown: [93.5, 6.5, 0, 0, 0],
  },
];

export const advisors: ReadonlyMap<string, Advisor> = new Map(
  ADVISOR_LIST.map((a) => [a.id, a]),
);

export const services: ReadonlyArray<Service> = [
  {
    id: "tax-freelance",
    title: "วางแผนภาษีสำหรับฟรีแลนซ์",
    advisorId: "sarah-jenskins",
    cover: serviceAdvisorsDesk,
    gallery: [serviceAdvisorsDesk, serviceAdvisorsReview, deskPhoto],
    category: "ภาษีและบัญชี",
    minutes: 60,
    price: 1200,
    bookings: 312,
    topics: [
      "ภาษีเงินได้บุคคลธรรมดา",
      "ค่าลดหย่อน",
      "ยื่นภาษีออนไลน์",
      "รายได้หลายทาง",
    ],
    summary:
      "เหมาะกับฟรีแลนซ์และผู้มีรายได้หลายทางที่ไม่แน่ใจว่าต้องยื่นภาษีแบบไหน เราจะไล่ดูรายรับของคุณทีละก้อน หาค่าลดหย่อนที่ใช้ได้จริง แล้ววางแผนภาษีสำหรับปีถัดไปให้ชัดเจน",
    includes: [
      "ประเมินว่าควรยื่นแบบเหมาจ่ายหรือหักตามจริง",
      "รายการค่าใช้จ่ายที่หักได้ในงานของคุณ",
      "ปฏิทินกำหนดยื่นและเอกสารที่ต้องเตรียม",
    ],
    slots: [
      { day: "tomorrow", time: "09:00" },
      { day: "tomorrow", time: "15:30", seatsLeft: 1 },
    ],
  },
  {
    id: "sme-start",
    title: "ปรึกษาเริ่มต้นธุรกิจ SME",
    advisorId: "thanakrit-w",
    cover: serviceAdvisorsReview,
    gallery: [serviceAdvisorsReview, serviceAdvisorsDesk, deskPhoto],
    category: "ธุรกิจและการตลาด",
    minutes: 60,
    price: 1500,
    bookings: 194,
    topics: ["จดทะเบียนธุรกิจ", "โครงสร้างต้นทุน", "จุดคุ้มทุน", "แผนหกเดือนแรก"],
    summary:
      "คุยตั้งแต่รูปแบบธุรกิจ โครงสร้างต้นทุน ไปจนถึงลำดับที่ควรลงทุนก่อนหลังในหกเดือนแรก",
    includes: [
      "เลือกระหว่างบุคคลธรรมดากับนิติบุคคล",
      "ประมาณการต้นทุนและจุดคุ้มทุน",
      "ลำดับงานสามเดือนแรกที่ทำได้จริง",
    ],
    slots: [{ day: "tomorrow", time: "11:00" }],
  },
  {
    id: "tech-interview",
    title: "เตรียมสัมภาษณ์งานสายเทค",
    advisorId: "weerapat-k",
    cover: serviceLaptopCode,
    gallery: [serviceLaptopCode, deskPhoto, serviceAdvisorsReview],
    category: "สายอาชีพและการทำงาน",
    minutes: 45,
    price: 900,
    bookings: 68,
    topics: ["ซ้อมสัมภาษณ์", "System design", "รีวิวเรซูเม่", "เล่าโปรเจกต์"],
    summary:
      "ซ้อมสัมภาษณ์เหมือนของจริง แล้วรีวิวคำตอบทีละข้อว่าตรงกับสิ่งที่ผู้สัมภาษณ์อยากได้ยินหรือยัง",
    includes: [
      "ซ้อมคำถามระบบและโค้ดตามระดับที่สมัคร",
      "รีวิวเรซูเม่และการเล่าโปรเจกต์",
      "สรุปจุดที่ต้องแก้ก่อนสัมภาษณ์จริง",
    ],
    slots: [
      { day: "tomorrow", time: "13:00" },
      { day: "tomorrow", time: "19:00" },
    ],
  },
  {
    id: "pitch-review",
    title: "ตรวจแผนธุรกิจก่อนพิตช์",
    advisorId: "thanakrit-w",
    cover: serviceAdvisorsReview,
    gallery: [serviceAdvisorsReview, deskPhoto, serviceLaptopCode],
    category: "ธุรกิจและการตลาด",
    minutes: 60,
    price: 1500,
    bookings: 96,
    topics: ["แผนธุรกิจ", "ตัวเลขและสมมติฐาน", "เรียงสไลด์", "ซ้อมตอบคำถาม"],
    summary:
      "อ่านแผนและเด็คของคุณล่วงหน้า แล้วไล่ทีละหน้าว่านักลงทุนจะสะดุดตรงไหนก่อน",
    includes: [
      "ตรวจตรรกะของตัวเลขและสมมติฐาน",
      "จัดลำดับสไลด์ใหม่ให้เล่าเป็นเรื่อง",
      "ซ้อมตอบคำถามที่มักโดนถาม",
    ],
    slots: [{ day: "today", time: "16:00", seatsLeft: 1 }],
  },
  {
    id: "tax-review",
    title: "ตรวจแผนภาษีก่อนยื่น",
    advisorId: "thanakrit-w",
    cover: serviceAdvisorsReview,
    gallery: [serviceAdvisorsReview, serviceAdvisorsDesk, deskPhoto],
    category: "ภาษีและบัญชี",
    minutes: 45,
    price: 900,
    bookings: 121,
    topics: ["ตรวจแบบ ภ.ง.ด.", "ค่าลดหย่อนที่ตกหล่น", "เอกสารแนบ"],
    summary:
      "ส่งแบบที่กรอกไว้มาก่อน แล้วไล่ดูด้วยกันว่ามีช่องไหนกรอกพลาดหรือหักได้แต่ยังไม่ได้หัก",
    includes: [
      "ตรวจแบบที่กรอกไว้ทีละช่อง",
      "หาค่าลดหย่อนที่ตกหล่น",
      "เช็กเอกสารแนบก่อนกดยื่น",
    ],
    slots: [{ day: "tomorrow", time: "10:00" }],
  },
  {
    id: "tax-corporate",
    title: "วางแผนภาษีนิติบุคคล",
    advisorId: "weerapat-k",
    cover: serviceLaptopCode,
    gallery: [serviceLaptopCode, serviceAdvisorsDesk, deskPhoto],
    category: "ภาษีและบัญชี",
    minutes: 90,
    price: 1800,
    bookings: 54,
    topics: ["ภาษีนิติบุคคล", "รอบบัญชี", "เงินเดือนกรรมการ", "ภาษีกลางปี"],
    summary:
      "วางโครงภาษีของบริษัททั้งปี ตั้งแต่รอบบัญชี การตั้งเงินเดือนกรรมการ ไปจนถึงภาษีกลางปี",
    includes: [
      "วางรอบบัญชีและประมาณการภาษี",
      "โครงสร้างเงินเดือนและเงินปันผล",
      "จุดที่มักโดนประเมินย้อนหลัง",
    ],
    slots: [{ day: "tomorrow", time: "14:00" }],
  },
  {
    id: "tax-personal",
    title: "ให้คำปรึกษาภาษีเงินได้บุคคลธรรมดา",
    advisorId: "sarah-jenskins",
    cover: serviceAdvisorsDesk,
    gallery: [serviceAdvisorsDesk, deskPhoto, serviceAdvisorsReview],
    category: "ภาษีและบัญชี",
    minutes: 30,
    price: 600,
    bookings: 268,
    topics: ["ภาษีเงินได้บุคคลธรรมดา", "สิทธิลดหย่อน", "ขั้นตอนการยื่น"],
    summary:
      "คำถามสั้น ๆ เรื่องภาษีเงินได้ที่อยากได้คำตอบชัด ๆ ภายในครึ่งชั่วโมง",
    includes: [
      "ตอบคำถามภาษีเงินได้ที่ค้างอยู่",
      "เช็กสิทธิลดหย่อนที่ใช้ได้",
      "บอกขั้นตอนถัดไปที่ต้องทำ",
    ],
    slots: [{ day: "today", time: "20:00" }],
  },
];

export const reviews: ReadonlyArray<Review> = [
  {
    serviceId: "tax-freelance",
    name: "ธนกฤต ว.",
    avatar: arayaS,
    date: "10 ส.ค. 2569",
    rating: "5.0",
    body: "อธิบายเข้าใจง่ายมาก ช่วยไล่ดูรายรับทีละก้อนจริง ๆ ได้ค่าลดหย่อนที่ไม่เคยรู้มาก่อนสองสามตัว",
  },
  {
    serviceId: "tax-freelance",
    name: "วีรภัทร ก.",
    avatar: christopherNolan,
    date: "2 ส.ค. 2569",
    rating: "5.0",
    body: "ตรงเวลา เตรียมข้อมูลมาดี จบใน 1 ชั่วโมงแล้วได้แผนภาษีปีหน้าไปเลย",
  },
  {
    serviceId: "tax-freelance",
    name: "ปุณยวีร์ ท.",
    avatar: jamesGunn,
    date: "28 ก.ค. 2569",
    rating: "4.0",
    body: "ได้คำตอบครบตามที่ถาม อยากให้มีเอกสารสรุปส่งหลังคุยด้วยจะดีมาก",
  },
  {
    serviceId: "sme-start",
    name: "กัญญา พ.",
    avatar: arayaS,
    date: "19 ก.ค. 2569",
    rating: "5.0",
    body: "ช่วยตัดสินใจว่ายังไม่ต้องจดบริษัทตอนนี้ พร้อมเหตุผลเป็นตัวเลขให้ดู",
  },
  {
    serviceId: "sme-start",
    name: "ธนภัทร ว.",
    avatar: christopherNolan,
    date: "11 ก.ค. 2569",
    rating: "4.0",
    body: "ได้ลำดับงานสามเดือนแรกที่ทำตามได้จริง ไม่ใช่แผนสวย ๆ ที่ทำไม่ได้",
  },
  {
    serviceId: "tech-interview",
    name: "พิมพ์ชนก ก.",
    avatar: arayaS,
    date: "2 ส.ค. 2569",
    rating: "5.0",
    body: "ซ้อมรอบเดียวแล้วรู้เลยว่าเล่าโปรเจกต์ยาวเกินไป รอบสัมภาษณ์จริงผ่านฉลุย",
  },
  {
    serviceId: "pitch-review",
    name: "ศิรประภา ต.",
    avatar: arayaS,
    date: "5 ส.ค. 2569",
    rating: "5.0",
    body: "ไล่เด็คทีละหน้าจนเจอว่าสมมติฐานรายได้กระโดดเกินไป แก้ทันก่อนพิตช์",
  },
  {
    serviceId: "tax-review",
    name: "วรินทร ม.",
    avatar: christopherNolan,
    date: "30 ก.ค. 2569",
    rating: "5.0",
    body: "เจอค่าลดหย่อนที่ลืมไปสองรายการภายในยี่สิบนาทีแรก",
  },
  {
    serviceId: "tax-corporate",
    name: "ปิยะพงศ์ จ.",
    avatar: jamesGunn,
    date: "16 ก.ค. 2569",
    rating: "5.0",
    body: "อธิบายเรื่องเงินเดือนกรรมการกับปันผลจนเข้าใจว่าทำไมต้องตั้งแบบนั้น",
  },
  {
    serviceId: "tax-personal",
    name: "เมธาวี ค.",
    avatar: arayaS,
    date: "9 ส.ค. 2569",
    rating: "5.0",
    body: "ครึ่งชั่วโมงตอบครบทุกคำถามที่ค้างมาทั้งปี",
  },
];

export const serviceIds = services.map(({ id }) => id);

/** Advisors in catalogue order — the "top advisors" rail. */
export const advisorList: ReadonlyArray<Advisor> = ADVISOR_LIST;

export function getService(id: string): Service | undefined {
  return services.find((service) => service.id === id);
}

export function getAdvisor(id: string): Advisor | undefined {
  return advisors.get(id);
}

export function getReviews(serviceId: string): ReadonlyArray<Review> {
  return reviews.filter((review) => review.serviceId === serviceId);
}

/**
 * The next few consultations anyone can take, soonest first — what the home
 * "available soon" list is. Sorting on (day, time) is enough because the
 * fixtures only ever say today or tomorrow.
 */
export function soonestSlots(
  limit: number,
): ReadonlyArray<{ readonly service: Service; readonly slot: Slot }> {
  return services
    .flatMap((service) => service.slots.map((slot) => ({ service, slot })))
    .sort((a, b) => {
      const day = Number(a.slot.day === "tomorrow") - Number(b.slot.day === "tomorrow");
      return day !== 0 ? day : a.slot.time.localeCompare(b.slot.time);
    })
    .slice(0, limit);
}

/** The cheapest thing an advisor sells — what "starting at" means on their card. */
export function priceFrom(advisorId: string): number {
  return Math.min(
    ...services.filter((s) => s.advisorId === advisorId).map((s) => s.price),
  );
}

/**
 * Where an advisor's card should land. There is no public advisor profile route
 * yet, so it points at their most-booked consultation, which is the thing the
 * reader was going to open anyway.
 */
export function leadService(advisorId: string): Service | undefined {
  return services
    .filter((s) => s.advisorId === advisorId)
    .sort((a, b) => b.bookings - a.bookings)[0];
}

/**
 * A length of the same consultation, at its own price.
 *
 * `key` is the tier, not a name: the three labels are UI copy and live in
 * `messages/th.json` like every other label. `extras` is what the longer tier
 * adds on top of `service.includes` — the shorter one takes the first line of it
 * and nothing else, which is exactly what half the time buys.
 */
export type ServicePackage = {
  readonly key: "brief" | "standard" | "deep";
  readonly minutes: number;
  readonly price: number;
  readonly includes: readonly string[];
  /** The tier the card leads with — Figma's "แนะนำ" badge. */
  readonly recommended: boolean;
};

/** Prices land on 50-baht steps; anything finer reads as a quote, not a menu. */
function roundPrice(value: number): number {
  return Math.round(value / 50) * 50;
}

/**
 * The three tiers of a service, derived rather than written out.
 *
 * The catalogue sells one thing per record — an hour with an advisor — and a
 * tier is that hour at half or half-again the length. Spelling all three into
 * the fixture would have been the same three lines of `includes` copied twice
 * per service, and the copies would drift the first time one was edited.
 */
export function packagesFor(service: Service): ReadonlyArray<ServicePackage> {
  return [
    {
      key: "brief",
      minutes: Math.round(service.minutes / 2 / 15) * 15,
      price: roundPrice(service.price * 0.55),
      includes: service.includes.slice(0, 1),
      recommended: false,
    },
    {
      key: "standard",
      minutes: service.minutes,
      price: service.price,
      includes: service.includes,
      recommended: true,
    },
    {
      key: "deep",
      minutes: Math.round((service.minutes * 1.5) / 15) * 15,
      price: roundPrice(service.price * 1.5),
      includes: [
        ...service.includes,
        "สรุปประเด็นและขั้นตอนถัดไปเป็นเอกสารหลังคุย",
        "ถามต่อทางแชทได้อีก 7 วัน",
      ],
      recommended: false,
    },
  ];
}

/**
 * The fixtures write a full hour as "1 ชั่วโมง" and everything else in minutes,
 * which is how the search results already read.
 */
export function formatDuration(minutes: number): string {
  return minutes === 60 ? "1 ชั่วโมง" : `${minutes} นาที`;
}

/** Response time in the same shape the screening queue uses: "30 นาที", "2 ชม." */
export function formatResponse(minutes: number): string {
  return minutes < 60 ? `${minutes} นาที` : `${Math.round(minutes / 60)} ชม.`;
}
