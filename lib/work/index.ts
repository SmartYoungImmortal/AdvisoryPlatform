import type { StaticImageData } from "next/image";

import { weekdayOf } from "@/lib/calendar";
import { arayaS, christopherNolan, jamesGunn } from "@/lib/assets/r2";

/**
 * Figma "Advisor - Home" (1374:20712) and "Session detail - advisor" (1961:32956) —
 * the Advisor's working day: what is on today, the month it sits in, what it has
 * earned, and one session opened up.
 *
 * "งานของฉัน" replaces the old earnings tab in the Advisor's tab bar. Earnings did
 * not go away; it became one of this hub's three views, next to today and the
 * calendar.
 */

export type WorkTab = "today" | "calendar" | "earnings";

export const WORK_TAB_HREF: Record<WorkTab, string> = {
  today: "/work",
  calendar: "/work/calendar",
  earnings: "/work/earnings",
};

/**
 * The prototype's "today". Its weekday is derived, not typed: the frames call this
 * day a Saturday, but 16 August 2026 is a Sunday — see `lib/calendar`.
 */
export const TODAY = { year: 2026, month: 8, day: 16 } as const;
export const TODAY_WEEKDAY = weekdayOf(TODAY.year, TODAY.month, TODAY.day);

export interface SessionFixture {
  readonly id: string;
  readonly adviseeName: string;
  /** The same portrait the catalogue pairs with this name, so the app never
   *  shows one person with two faces. */
  readonly avatar: StaticImageData;
  readonly serviceTitle: string;
  readonly range: string;
}

/** Figma "Next Session" — the one card the screen is really about. */
export const NEXT_SESSION = {
  id: "s-1000",
  adviseeName: "ธนกฤต ว.",
  avatar: christopherNolan,
  serviceTitle: "วางแผนภาษีสำหรับฟรีแลนซ์",
  range: "10:00 – 11:00",
  durationHours: 1,
  startsInMinutes: 19,
} as const;

export const LATER_TODAY: readonly SessionFixture[] = [
  {
    id: "s-1300",
    adviseeName: "กัญญา พรหมมา",
    avatar: arayaS,
    serviceTitle: "ตรวจแผนภาษีก่อนยื่น",
    range: "13:00 – 13:45",
  },
  {
    id: "s-1600",
    adviseeName: "วีรภัทร ก.",
    avatar: jamesGunn,
    serviceTitle: "ปรึกษาภาษีนิติบุคคล",
    range: "16:00 – 17:30",
  },
];

/** Every session today, the next one first — the calendar view lists all three. */
export const TODAY_SESSIONS: readonly SessionFixture[] = [
  NEXT_SESSION,
  ...LATER_TODAY,
];

/** Figma "Pending" — what is waiting on the Advisor, and where each one lives. */
export const PENDING_ITEMS = [
  { id: "bookings", count: 2, href: "/screening/requests" },
  { id: "screening", count: 1, href: "/screening/review" },
  { id: "reviews", count: 3, href: "/reviews" },
] as const;

/** Days in the month with at least one session, as the calendar dots them. */
export const SESSION_DAYS: ReadonlySet<number> = new Set([
  17, 19, 21, 24, 26, 28,
]);

/** Figma "ช่วงเวลาว่าง" — the gaps left in today's schedule. */
export const FREE_GAPS = ["11:00", "14:00"] as const;

/** Figma "การให้คำปรึกษาล่าสุด" — the two most recent paid sessions. */
export const RECENT_CONSULTATIONS = [
  {
    id: "c-araya",
    name: "อารยา ส.",
    avatar: arayaS,
    meta: "ปรึกษา 1 ชั่วโมง · 3 ส.ค.",
    amount: "฿1,200",
    state: "pending",
  },
  {
    id: "c-natthapong",
    name: "ณัฐพงษ์ ส.",
    avatar: jamesGunn,
    meta: "ตรวจวิทยานิพนธ์ · 28 ก.ค.",
    amount: "฿1,200",
    state: "available",
  },
] as const;

export const PAYOUT_ACCOUNT = "ธนาคารกรุงเทพ ••7841";

/**
 * Figma "Session detail - advisor" — the answers the Advisee gave to the service's
 * screening questions before booking. The Advisor reads these before walking in.
 */
export const SESSION_DETAIL = {
  startsInMinutes: 25,
  range: "16:00 – 17:00",
  adviseeName: "ธนกฤต ว.",
  avatar: christopherNolan,
  serviceTitle: "วางแผนภาษีสำหรับฟรีแลนซ์",
  slots: 2,
  durationHours: 1,
  answers: [
    {
      id: "q1",
      question: "อยากปรึกษาเรื่องอะไรเป็นหลัก",
      answer:
        "มีรายได้จากงานประจำและรับงานฟรีแลนซ์เพิ่ม ไม่แน่ใจว่าต้องยื่นแบบไหนและใช้ค่าลดหย่อนอะไรได้บ้าง",
    },
    {
      id: "q2",
      question: "รายได้ต่อปีโดยประมาณ",
      answer: "900,000 – 1,200,000 บาท",
    },
    {
      id: "q3",
      question: "เคยยื่นภาษีเองมาก่อนหรือไม่",
      answer: "เคยยื่นเอง 2 ปี แต่ไม่เคยวางแผนล่วงหน้า",
    },
  ],
} as const;
