import { advisorList, services as catalogueServices } from "@/lib/catalogue/services";
import type {
  Account,
  AvatarKey,
  Category,
  Database,
  IdentityRequest,
  MarketService,
  OffPlatformFlag,
  Payout,
  RefundRequest,
  ReportCategory,
  Skill,
  SkillProof,
  Transaction,
  UserReport,
} from "@/lib/mock-db/types";

/**
 * Bump when the seed's shape or content changes: a stored database with an older
 * version is discarded and reseeded instead of being read with missing fields.
 */
export const SEED_VERSION = 2;

/** The clock the fixtures are written against — the prototype's "today". */
const NOW = Date.parse("2026-09-16T09:00:00+07:00");
const DAY = 86_400_000;

function daysAgo(days: number, hour = 10): string {
  const date = new Date(NOW - days * DAY);
  date.setUTCHours(hour - 7, (days * 7) % 60, 0, 0);
  // An evening hour "today" would be later than the clock; push it to yesterday.
  if (date.getTime() > NOW) date.setTime(date.getTime() - DAY);
  return date.toISOString();
}

/**
 * mulberry32 — a fixed stream, so the "random" half of the seed is the same on
 * the server render and in every browser, and ids stay stable across reloads.
 */
function prng(seed: number): () => number {
  let state = seed;
  return () => {
    // Unsigned rather than `| 0`: the XOR and `Math.imul` below read the same bits.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = prng(20260916);

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(random() * list.length)] as T;
}

function between(min: number, max: number): number {
  return Math.floor(min + random() * (max - min + 1));
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * The value of the first band `index` falls under — how the fixtures split a
 * generated list into "the first seven are pending, the next five approved…".
 */
function band<T>(index: number, bands: ReadonlyArray<readonly [number, T]>, rest: T): T {
  return bands.find(([below]) => index < below)?.[1] ?? rest;
}

// ── Accounts ──────────────────────────────────────────────────────────────

/**
 * The demo sign-ins, printed on the login screens on purpose. Both pass the
 * register screen's own rules: 8+ characters, a digit, a symbol.
 */
export const DEMO_LOGIN = "Advisory@123";
export const ADMIN_LOGIN = "Admin@1234";

type AccountInput = Partial<Account> &
  Pick<Account, "id" | "name" | "fullName" | "email" | "role">;

function account(input: AccountInput): Account {
  const createdAt = input.createdAt ?? daysAgo(120);
  return {
    password: DEMO_LOGIN,
    phone: "081-234-5678",
    status: "active",
    avatar: null,
    updatedAt: createdAt,
    lastLoginAt: null,
    failedLogins: 0,
    suspension: null,
    advisor: null,
    stats: { sessions: 0, bookings: 0, reviews: 0 },
    ...input,
    createdAt,
  };
}

const AVATAR_BY_CATALOGUE: Record<string, AvatarKey> = {
  "sarah-jenskins": "sarah",
  "thanakrit-w": "christopher",
  "weerapat-k": "james",
};

/** The accounts the login screens offer, plus the fixtures the console already named. */
const NAMED_ACCOUNTS: readonly Account[] = [
  account({
    id: "admin",
    name: "ผู้ดูแลระบบ",
    fullName: "สมชาย ใจดี",
    email: "admin@advisory.test",
    password: ADMIN_LOGIN,
    phone: "02-123-4567",
    role: "admin",
    createdAt: daysAgo(260),
    lastLoginAt: daysAgo(1, 9),
  }),
  account({
    id: "araya-s",
    name: "อารยา ส.",
    fullName: "อารยา สมบูรณ์ชัย",
    email: "araya.s@kmitl.ac.th",
    phone: "089-555-0142",
    role: "advisee",
    avatar: "araya",
    createdAt: daysAgo(210),
    lastLoginAt: daysAgo(2, 20),
    stats: { sessions: 12, bookings: 1, reviews: 8 },
  }),
  ...advisorList.map((entry, index) =>
    account({
      id: entry.id,
      name: entry.name,
      fullName:
        entry.id === "sarah-jenskins" ? "ซาร่า เจนสกินส์" : `${entry.name.split(" ")[0]} วงศ์ทอง`,
      email:
        entry.id === "sarah-jenskins"
          ? "sarah@advisory.test"
          : `${entry.id.replace("-", ".")}@advisory.test`,
      phone: `08${index + 1}-410-22${pad(index, 2)}`,
      role: "advisor",
      avatar: AVATAR_BY_CATALOGUE[entry.id] ?? "advisor",
      createdAt: daysAgo(230 - index * 20),
      lastLoginAt: daysAgo(index, 8 + index),
      advisor: {
        field: entry.field,
        credential: entry.credential,
        identity: "verified",
        level: entry.id === "sarah-jenskins" ? 3 : 2,
        rating: Number(entry.rating),
        catalogueId: entry.id,
      },
      stats: {
        sessions: entry.consultations,
        bookings: 3 + index,
        reviews: entry.writtenReviews,
      },
    }),
  ),
  account({
    id: "john-minecraft",
    name: "John Minecraft",
    fullName: "จอห์น ไมน์คราฟต์",
    email: "john.minecraft@example.com",
    role: "advisor",
    avatar: "advisor",
    createdAt: daysAgo(186),
    lastLoginAt: daysAgo(3, 14),
    advisor: {
      field: "ติวเตอร์เกม",
      credential: "โค้ชเกมมืออาชีพ",
      identity: "submitted",
      level: 1,
      rating: 4.6,
      catalogueId: null,
    },
    stats: { sessions: 41, bookings: 5, reviews: 17 },
  }),
  account({
    id: "john-buyeronly",
    name: "John BuyerOnly",
    fullName: "จอห์น บายเออร์",
    email: "john.buyer@example.com",
    role: "advisee",
    createdAt: daysAgo(137),
    lastLoginAt: daysAgo(6, 19),
    stats: { sessions: 4, bookings: 2, reviews: 1 },
  }),
  account({
    id: "christopher-line",
    name: "Christopher",
    fullName: "คริสโตเฟอร์ สาย",
    email: "chris.line@example.com",
    role: "advisor",
    status: "suspended",
    avatar: "christopher",
    createdAt: daysAgo(219),
    lastLoginAt: daysAgo(20, 11),
    suspension: {
      reason: "ชักชวนผู้ใช้ไปทำธุรกรรมนอกแพลตฟอร์ม (CF-08)",
      until: "2026-10-09T00:00:00.000Z",
      at: daysAgo(7),
      by: "admin",
    },
    advisor: {
      field: "การเงินส่วนบุคคล",
      credential: "นักวางแผนการเงิน CFP",
      identity: "verified",
      level: 2,
      rating: 4.2,
      catalogueId: null,
    },
    stats: { sessions: 58, bookings: 0, reviews: 22 },
  }),
  account({
    id: "locked-demo",
    name: "ปวีณา ล.",
    fullName: "ปวีณา ล็อกไว้",
    email: "locked@advisory.test",
    role: "advisee",
    status: "locked",
    failedLogins: 5,
    createdAt: daysAgo(64),
    lastLoginAt: daysAgo(30, 21),
  }),
];

const FIRST_NAMES = [
  ["กัญญา", "kanya"],
  ["ธนภัทร", "thanaphat"],
  ["พิมพ์ชนก", "pimchanok"],
  ["ศิรประภา", "siraprapa"],
  ["วรินทร", "warintorn"],
  ["เมธาวี", "methawee"],
  ["ณัฐวุฒิ", "nattawut"],
  ["ชุติมา", "chutima"],
  ["อนุชา", "anucha"],
  ["สุภาวดี", "supawadee"],
  ["กิตติพัทธ์", "kittipat"],
  ["ธีรวัฒน์", "teerawat"],
  ["นภัสสร", "napatsorn"],
  ["วิทยา", "wittaya"],
  ["อรอุมา", "onuma"],
  ["ภานุวัฒน์", "panuwat"],
  ["จิราพร", "jiraporn"],
  ["ศุภชัย", "suppachai"],
  ["รัชนี", "ratchanee"],
  ["พงศกร", "pongsakorn"],
  ["มณีรัตน์", "maneerat"],
  ["ชยพล", "chayapol"],
  ["ปาริชาต", "parichat"],
  ["ณัฐธิดา", "nattida"],
  ["อัครพล", "akkarapol"],
  ["วิไลวรรณ", "wilaiwan"],
  ["ธนากร", "thanakorn"],
  ["สิริกร", "sirikorn"],
  ["ปรเมศวร์", "poramate"],
  ["ปิยะพงศ์", "piyapong"],
  ["ลลิตา", "lalita"],
  ["เอกชัย", "ekkachai"],
] as const;

const LAST_NAMES = [
  ["ศรีสุข", "s"],
  ["ทองมา", "t"],
  ["แก้วประเสริฐ", "k"],
  ["บุญเรือง", "b"],
  ["สุวรรณชาติ", "s"],
  ["วงศ์ไทย", "w"],
  ["พรหมมา", "p"],
  ["จันทร์เพ็ญ", "c"],
  ["รัตนพันธ์", "r"],
  ["มั่นคง", "m"],
  ["ประเสริฐสุข", "p"],
  ["เพชรรัตน์", "p"],
] as const;

const ADVISOR_FIELDS = [
  ["ภาษีและบัญชี", "นักบัญชีรับอนุญาต"],
  ["กฎหมาย", "ทนายความ"],
  ["การเงินส่วนบุคคล", "นักวางแผนการเงิน CFP"],
  ["วิชาการ", "อาจารย์มหาวิทยาลัย"],
  ["สุขภาพใจ", "นักจิตวิทยาการปรึกษา"],
  ["สายอาชีพและการทำงาน", "HR Business Partner"],
  ["เทคโนโลยี", "วิศวกรซอฟต์แวร์"],
] as const;

const GENERATED_ACCOUNTS: readonly Account[] = FIRST_NAMES.map(
  ([first, roman], index) => {
    const [last, lastRoman] = LAST_NAMES[index % LAST_NAMES.length] ?? LAST_NAMES[0];
    const isAdvisor = index % 3 === 1;
    const created = between(5, 250);
    const suspended = index === 9 || index === 22;
    const [field, credential] = pick(ADVISOR_FIELDS);
    const identity = isAdvisor
      ? pick(["submitted", "submitted", "verified", "verified", "verified", "rejected"] as const)
      : "none";

    return account({
      id: `u-${pad(index + 1, 4)}`,
      name: `${first} ${last.slice(0, 1)}.`,
      fullName: `${first} ${last}`,
      email: `${roman}.${lastRoman}${index + 1}@example.com`,
      phone: `0${pick(["8", "9", "6"])}${between(1, 9)}-${pad(between(0, 999), 3)}-${pad(between(0, 9999), 4)}`,
      role: isAdvisor ? "advisor" : "advisee",
      status: suspended ? "suspended" : "active",
      createdAt: daysAgo(created),
      updatedAt: daysAgo(Math.max(0, created - between(0, 30))),
      lastLoginAt: daysAgo(between(0, Math.min(created, 40)), between(7, 22)),
      suspension: suspended
        ? {
            reason:
              index === 9
                ? "ส่งข้อความหลอกลวงให้โอนเงินนอกระบบ"
                : "ใช้ถ้อยคำคุกคามผู้ให้คำปรึกษาซ้ำหลายครั้ง",
            until: index === 9 ? null : "2026-10-01T00:00:00.000Z",
            at: daysAgo(between(1, 12)),
            by: "admin",
          }
        : null,
      advisor: isAdvisor
        ? {
            field,
            credential,
            identity,
            level: pick([1, 1, 2, 2, 3] as const),
            rating: Math.round((4 + random()) * 10) / 10,
            catalogueId: null,
          }
        : null,
      stats: {
        sessions: between(0, 60),
        bookings: between(0, 4),
        reviews: between(0, 20),
      },
    });
  },
);

const ACCOUNTS: readonly Account[] = [...NAMED_ACCOUNTS, ...GENERATED_ACCOUNTS];

const advisorIds = ACCOUNTS.filter((a) => a.role === "advisor").map((a) => a.id);
const adviseeIds = ACCOUNTS.filter((a) => a.role === "advisee").map((a) => a.id);

// ── Verification ──────────────────────────────────────────────────────────

const IDENTITY_REQUESTS: readonly IdentityRequest[] = ACCOUNTS.filter(
  (a) => a.advisor && a.advisor.identity !== "none",
).map((a, index) => {
  const identity = a.advisor?.identity;
  const status = identity === "submitted" || identity === "rejected" ? identity : "verified";
  const submittedDays = status === "submitted" ? between(0, 6) : between(8, 90);
  return {
    id: `idv-${pad(index + 1, 4)}`,
    accountId: a.id,
    fullName: a.fullName,
    birthDate: `19${between(70, 99)}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`,
    nationalIdLast4: pad(between(0, 9999), 4),
    field: a.advisor?.field ?? "",
    credential: a.advisor?.credential ?? "",
    submittedAt: daysAgo(submittedDays, between(8, 20)),
    status,
    decision:
      status === "submitted"
        ? null
        : {
            at: daysAgo(submittedDays - 1),
            by: "admin",
            note:
              status === "rejected"
                ? "รูปบัตรประชาชนไม่ชัด อ่านเลขบัตรไม่ได้ กรุณาอัปโหลดใหม่"
                : null,
          },
  };
});

const SKILL_NAMES = [
  "ภาษีเงินได้บุคคลธรรมดา",
  "ภาษีนิติบุคคล",
  "สัญญาเช่าและซื้อขาย",
  "วางแผนเกษียณ",
  "ระเบียบวิธีวิจัย",
  "สถิติสำหรับงานวิจัย",
  "การเขียนบทความวิชาการ",
  "สัมภาษณ์งานสายเทค",
  "จัดการความเครียด",
  "Minecraft Redstone",
] as const;

const SKILL_PROOFS: readonly SkillProof[] = Array.from({ length: 14 }, (_, index) => {
  const status = band<SkillProof["status"]>(index, [[7, "pending"], [12, "approved"]], "rejected");
  const days = status === "pending" ? between(0, 5) : between(6, 60);
  const skill = SKILL_NAMES[index % SKILL_NAMES.length] ?? SKILL_NAMES[0];
  return {
    id: `skp-${pad(index + 1, 4)}`,
    accountId: advisorIds[index % advisorIds.length] ?? "sarah-jenskins",
    skill,
    documentName: `${pick(["cert", "transcript", "license", "portfolio"])}-${index + 1}.pdf`,
    submittedAt: daysAgo(days, between(8, 20)),
    status,
    decision:
      status === "pending"
        ? null
        : {
            at: daysAgo(days - 1),
            by: "admin",
            note: status === "rejected" ? "เอกสารหมดอายุแล้ว" : null,
          },
  };
});

// ── Marketplace ───────────────────────────────────────────────────────────

const CATEGORY_NAMES = [
  ["ภาษีและบัญชี", "tax-accounting"],
  ["ธุรกิจและการตลาด", "business-marketing"],
  ["กฎหมาย", "law"],
  ["การเงินส่วนบุคคล", "personal-finance"],
  ["สายอาชีพและการทำงาน", "career"],
  ["เทคโนโลยี", "technology"],
  ["สุขภาพใจ", "mental-health"],
  ["วิชาการ", "academic"],
  ["ติวเตอร์เกม", "game-tutor"],
] as const;

const CATEGORIES: readonly Category[] = CATEGORY_NAMES.map(([name, slug], index) => ({
  id: `cat-${slug}`,
  name,
  slug,
  status: index === 8 ? "hidden" : "published",
  createdAt: daysAgo(300 - index * 5),
  updatedAt: daysAgo(40 - index),
}));

function categoryId(name: string): string {
  return CATEGORIES.find((c) => c.name === name)?.id ?? "cat-business-marketing";
}

const SKILLS: readonly Skill[] = SKILL_NAMES.map((name, index) => ({
  id: `skill-${pad(index + 1, 3)}`,
  name,
  categoryId: (CATEGORIES[index % CATEGORIES.length] ?? CATEGORIES[0]).id,
  createdAt: daysAgo(200 - index * 3),
  updatedAt: daysAgo(30 - index),
}));

const EXTRA_SERVICE_TITLES = [
  ["ตรวจสัญญาเช่าก่อนเซ็น", "กฎหมาย"],
  ["ปรึกษาคดีแรงงานเบื้องต้น", "กฎหมาย"],
  ["วางแผนเกษียณสำหรับวัยทำงาน", "การเงินส่วนบุคคล"],
  ["จัดพอร์ตกองทุนลดหย่อนภาษี", "การเงินส่วนบุคคล"],
  ["ที่ปรึกษาวิทยานิพนธ์บทที่ 3", "วิชาการ"],
  ["วิเคราะห์สถิติงานวิจัยด้วย SPSS", "วิชาการ"],
  ["ปรับ Resume ให้ผ่าน ATS", "สายอาชีพและการทำงาน"],
  ["ซ้อมสัมภาษณ์งานภาษาอังกฤษ", "สายอาชีพและการทำงาน"],
  ["ออกแบบระบบหลังบ้านสำหรับ SME", "เทคโนโลยี"],
  ["ปรึกษาเลือก Cloud ให้ธุรกิจ", "เทคโนโลยี"],
  ["พูดคุยจัดการความเครียดจากงาน", "สุขภาพใจ"],
  ["ปรึกษาความสัมพันธ์ในครอบครัว", "สุขภาพใจ"],
  ["Minecraft Tutorial", "ติวเตอร์เกม"],
  ["สอนสร้าง Redstone Farm", "ติวเตอร์เกม"],
  ["วางแผนการตลาดออนไลน์ 90 วัน", "ธุรกิจและการตลาด"],
  ["ทำบัญชีร้านค้าออนไลน์", "ภาษีและบัญชี"],
  ["ยื่นภาษีสำหรับ YouTuber", "ภาษีและบัญชี"],
  ["ตรวจงบการเงินก่อนกู้ธนาคาร", "ภาษีและบัญชี"],
] as const;

const SERVICES: readonly MarketService[] = [
  ...catalogueServices.map((service, index) => ({
    id: `svc-${service.id}`,
    title: service.title,
    advisorId: service.advisorId,
    categoryId: categoryId(service.category),
    priceSatang: service.price * 100,
    minutes: service.minutes,
    bookings: service.bookings,
    rating: Number(advisorList.find((a) => a.id === service.advisorId)?.rating ?? 4.8),
    status: "published" as const,
    hiddenReason: null,
    catalogueId: service.id,
    createdAt: daysAgo(180 - index * 9),
    updatedAt: daysAgo(12 - index),
  })),
  ...EXTRA_SERVICE_TITLES.map(([title, category], index) => {
    const advisorId =
      title.startsWith("Minecraft") || title.includes("Redstone")
        ? "john-minecraft"
        : (advisorIds[(index + 4) % advisorIds.length] ?? "sarah-jenskins");
    const hidden = index === 1 || index === 10 || index === 13;
    return {
      id: `svc-${pad(index + 1, 4)}`,
      title,
      advisorId,
      categoryId: categoryId(category),
      priceSatang: between(5, 30) * 10_000,
      minutes: pick([30, 45, 60, 90]),
      bookings: between(0, 140),
      rating: Math.round((4 + random()) * 10) / 10,
      status: hidden ? ("hidden" as const) : ("published" as const),
      hiddenReason: hidden ? "รายละเอียดบริการชวนให้ติดต่อนอกแพลตฟอร์ม" : null,
      catalogueId: null,
      createdAt: daysAgo(between(10, 160)),
      updatedAt: daysAgo(between(0, 9)),
    };
  }),
];

// ── Refunds ───────────────────────────────────────────────────────────────

const REFUND_REASONS = [
  ["ไม่ได้รับบริการจากผู้ให้คำปรึกษา", "ผู้ให้บริการไม่เข้า Video Call ตามเวลาที่นัด รอ 20 นาทีแล้วไม่มีการติดต่อกลับ"],
  ["ผู้ให้คำปรึกษายกเลิกกะทันหัน", "ได้รับแจ้งยกเลิกก่อนเริ่ม 10 นาที และไม่มีการเสนอเวลาใหม่"],
  ["เซสชันจบก่อนเวลา", "เซสชันจบก่อนเวลา 40 นาทีโดยไม่มีการชดเชย"],
  ["คุณภาพเสียง/ภาพใช้งานไม่ได้", "ภาพค้างตลอดเซสชัน ฝั่งผู้ให้คำปรึกษาไม่ได้ยินเสียง"],
  ["เนื้อหาไม่ตรงกับที่ประกาศไว้", "บริการระบุว่าช่วยวางแผนภาษี แต่ผู้ให้คำปรึกษาไม่ได้เตรียมข้อมูลมาเลย"],
] as const;

const REFUNDS: readonly RefundRequest[] = Array.from({ length: 16 }, (_, index) => {
  const service = SERVICES[index % SERVICES.length] ?? SERVICES[0];
  const [reason, detail] = REFUND_REASONS[index % REFUND_REASONS.length] ?? REFUND_REASONS[0];
  const status = band<RefundRequest["status"]>(index, [[7, "pending"], [12, "approved"]], "rejected");
  const days = status === "pending" ? between(0, 4) : between(5, 45);
  // Every other approval gave half back — the session had run for half its time.
  const partial = index % 2 === 1;
  const approvedNote = partial ? "คืนครึ่งหนึ่ง เพราะเซสชันดำเนินไปแล้วครึ่งเวลา" : null;
  return {
    id: `rf-${pad(index + 1, 4)}`,
    bookingRef: `BK-2026-${pad(between(1, 12), 2)}${pad(between(1, 28), 2)}-${pad(between(1, 9999), 4)}`,
    requesterId: adviseeIds[index % adviseeIds.length] ?? "araya-s",
    advisorId: service.advisorId,
    serviceTitle: service.title,
    sessionAt: daysAgo(days + 1, between(9, 18)),
    paidSatang: service.priceSatang,
    reason,
    detail,
    evidenceCount: between(1, 3),
    requestedAt: daysAgo(days, between(8, 22)),
    status,
    refundedSatang:
      status === "approved"
        ? Math.round(service.priceSatang / (partial ? 2 : 1))
        : null,
    decision:
      status === "pending"
        ? null
        : {
            at: daysAgo(days - 1),
            by: "admin",
            note: status === "rejected" ? "บันทึกการโทรแสดงว่าเซสชันครบเวลา" : approvedNote,
          },
  };
});

// ── Reports and off-platform detection ────────────────────────────────────

const REPORT_TEMPLATES: ReadonlyArray<{
  readonly category: ReportCategory;
  readonly detail: string;
  readonly excerpt: readonly string[];
}> = [
  {
    category: "off-platform",
    detail: "ผู้ให้คำปรึกษาขอให้ย้ายไปคุยทางไลน์และโอนเงินตรง",
    excerpt: ["ติดต่อผมทาง Line ID: johnminecraft นะครับ", "โอนตรงถูกกว่า ไม่ต้องผ่านระบบ"],
  },
  {
    category: "scam",
    detail: "ขอให้โอนมัดจำเพิ่ม อ้างว่าระบบเก็บเงินไม่ครบ",
    excerpt: ["ระบบตัดเงินไม่ครบครับ รบกวนโอนเพิ่ม 300 บาทเข้าทรูมันนี่"],
  },
  {
    category: "harassment",
    detail: "ใช้คำพูดไม่สุภาพหลังจากถูกปฏิเสธการนัดเพิ่ม",
    excerpt: ["ถามแค่นี้ก็ไม่รู้ จะมาปรึกษาทำไม"],
  },
  {
    category: "spam",
    detail: "ส่งข้อความโฆษณาคอร์สซ้ำ ๆ วันละหลายรอบ",
    excerpt: ["คอร์สลับรวยเร็ว ลด 90% วันนี้เท่านั้น!!", "คอร์สลับรวยเร็ว ลด 90% วันนี้เท่านั้น!!"],
  },
  {
    category: "misrepresentation",
    detail: "อ้างว่าเป็นทนายความ แต่ตรวจสอบเลขใบอนุญาตแล้วไม่พบ",
    excerpt: ["ผมเป็นทนายมา 15 ปีแล้วครับ ไม่ต้องห่วง"],
  },
  {
    category: "other",
    detail: "ผู้ใช้ส่งไฟล์ที่ไม่เกี่ยวข้องกับการปรึกษา",
    excerpt: ["[ไฟล์แนบ] document-final-final.zip"],
  },
];

const REPORTS: readonly UserReport[] = Array.from({ length: 18 }, (_, index) => {
  const template = REPORT_TEMPLATES[index % REPORT_TEMPLATES.length] ?? REPORT_TEMPLATES[0];
  const status = index < 9 ? "open" : pick(["dismissed", "warned", "suspended"] as const);
  const days = status === "open" ? between(0, 5) : between(6, 50);
  const reportedId =
    template.category === "off-platform" && index % 2 === 0
      ? "john-minecraft"
      : (advisorIds[(index + 2) % advisorIds.length] ?? "christopher-line");
  return {
    id: `rpt-${pad(index + 1, 4)}`,
    category: template.category,
    reporterId: adviseeIds[(index + 3) % adviseeIds.length] ?? "araya-s",
    reportedId,
    detail: template.detail,
    excerpt: template.excerpt,
    createdAt: daysAgo(days, between(8, 23)),
    status,
    decision:
      status === "open"
        ? null
        : { at: daysAgo(days - 1), by: "admin", note: null },
  };
});

const FLAG_MESSAGES: ReadonlyArray<Pick<OffPlatformFlag, "message" | "matches" | "risk">> = [
  {
    message: "ถ้าสะดวกแอดไลน์มาคุยต่อได้เลยครับ @tax.consult.th",
    matches: [{ signal: "line", text: "@tax.consult.th" }],
    risk: "medium",
  },
  {
    message: "โอนตรงเข้าบัญชีกสิกร 123-4-56789-0 ได้ส่วนลด 20% ครับ",
    matches: [{ signal: "bank", text: "123-4-56789-0" }],
    risk: "high",
  },
  {
    message: "โทรหาผมได้ที่ 081-234-5678 นอกเวลานัดก็ได้",
    matches: [{ signal: "phone", text: "081-234-5678" }],
    risk: "medium",
  },
  {
    message: "จองผ่านเว็บผมถูกกว่า https://my-consult.site/booking",
    matches: [{ signal: "link", text: "https://my-consult.site/booking" }],
    risk: "high",
  },
  {
    message: "ส่งเอกสารมาที่ lawyer.private@gmail.com นะครับ",
    matches: [{ signal: "email", text: "lawyer.private@gmail.com" }],
    risk: "low",
  },
  {
    message: "ไลน์ไอดี johnminecraft โอนพร้อมเพย์ 0891234567 ได้เลย",
    matches: [
      { signal: "line", text: "johnminecraft" },
      { signal: "phone", text: "0891234567" },
    ],
    risk: "high",
  },
  {
    message: "เบอร์ผม 09-8765-4321 ครับ ไว้คุยเรื่องเอกสาร",
    matches: [{ signal: "phone", text: "09-8765-4321" }],
    risk: "low",
  },
];

const OFF_PLATFORM_FLAGS: readonly OffPlatformFlag[] = Array.from({ length: 21 }, (_, index) => {
  const template = FLAG_MESSAGES[index % FLAG_MESSAGES.length] ?? FLAG_MESSAGES[0];
  const status = index < 11 ? "open" : pick(["dismissed", "warned", "suspended"] as const);
  const days = status === "open" ? between(0, 3) : between(4, 40);
  const senderId =
    template.message.includes("johnminecraft")
      ? "john-minecraft"
      : (advisorIds[(index + 1) % advisorIds.length] ?? "christopher-line");
  return {
    id: `opf-${pad(index + 1, 4)}`,
    conversationId: `conv-${pad(between(1, 400), 4)}`,
    senderId,
    recipientId: adviseeIds[index % adviseeIds.length] ?? "araya-s",
    message: template.message,
    matches: template.matches,
    risk: template.risk,
    detectedAt: daysAgo(days, between(7, 23)),
    status,
    decision:
      status === "open"
        ? null
        : {
            at: daysAgo(days - 1),
            by: "admin",
            note: status === "dismissed" ? "เบอร์ติดต่อของบริษัทที่ประกาศไว้แล้ว" : null,
          },
  };
});

// ── Money ─────────────────────────────────────────────────────────────────

const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรี"] as const;

function payoutStatus(index: number): Payout["status"] {
  if (index < 6) return "pending";
  return index === 6 || index === 11 ? "failed" : "paid";
}

function transactionStatus(index: number): Transaction["status"] {
  if (index % 11 === 3) return "refunded";
  return index % 13 === 5 ? "failed" : "paid";
}

const PAYOUTS: readonly Payout[] = Array.from({ length: 18 }, (_, index) => {
  const status = payoutStatus(index);
  const days = status === "pending" ? between(0, 3) : between(4, 80);
  return {
    id: `PO-2026-${pad(between(1, 9), 2)}${pad(between(1, 28), 2)}-${pad(index + 1, 4)}`,
    advisorId: advisorIds[index % advisorIds.length] ?? "sarah-jenskins",
    bank: pick(BANKS),
    accountLast4: pad(between(0, 9999), 4),
    amountSatang: between(8, 60) * 10_000,
    invoiceCount: between(1, 6),
    requestedAt: daysAgo(days, between(8, 18)),
    status,
    paidAt: status === "paid" ? daysAgo(days - 1, 15) : null,
    failureReason:
      status === "failed" ? "ชื่อบัญชีไม่ตรงกับชื่อผู้ให้คำปรึกษา (ธนาคารแจ้ง)" : null,
  };
});

const TRANSACTIONS: readonly Transaction[] = Array.from({ length: 40 }, (_, index) => {
  const service = SERVICES[index % SERVICES.length] ?? SERVICES[0];
  const status = transactionStatus(index);
  return {
    id: `TX-${pad(index + 1, 5)}`,
    bookingRef: `BK-2026-${pad(between(1, 9), 2)}${pad(between(1, 28), 2)}-${pad(between(1, 9999), 4)}`,
    payerId: adviseeIds[index % adviseeIds.length] ?? "araya-s",
    advisorId: service.advisorId,
    serviceTitle: service.title,
    amountSatang: service.priceSatang,
    feeSatang: Math.round(service.priceSatang * 0.05),
    method: index % 3 === 0 ? "promptpay" : "card",
    status,
    createdAt: daysAgo(between(0, 120), between(7, 23)),
  };
});

/** Stable ordering for any list the console shows: newest first. */
function newestFirst<T>(list: readonly T[], at: (item: T) => string): readonly T[] {
  return [...list].sort((a, b) => at(b).localeCompare(at(a)));
}

export function createSeed(): Database {
  return {
    version: SEED_VERSION,
    accounts: ACCOUNTS,
    identityRequests: newestFirst(IDENTITY_REQUESTS, (r) => r.submittedAt),
    skillProofs: newestFirst(SKILL_PROOFS, (r) => r.submittedAt),
    services: newestFirst(SERVICES, (s) => s.updatedAt),
    categories: CATEGORIES,
    skills: SKILLS,
    refunds: newestFirst(REFUNDS, (r) => r.requestedAt),
    reports: newestFirst(REPORTS, (r) => r.createdAt),
    offPlatformFlags: newestFirst(OFF_PLATFORM_FLAGS, (f) => f.detectedAt),
    payouts: newestFirst(PAYOUTS, (p) => p.requestedAt),
    transactions: newestFirst(TRANSACTIONS, (t) => t.createdAt),
    audit: [],
  };
}
