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

/** One screening question and what the Advisee answered before booking. */
export interface ScreeningAnswer {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

/**
 * One booked session, whole.
 *
 * The detail sheet used to be a fixture of its own (`SESSION_DETAIL`), which is how
 * it came to say 16:00 and "อีก 25 นาที" while the card that opened it said 10:00 and
 * "อีก 19 นาที". A session is one record now, so the list and the sheet cannot
 * disagree about a time again, and `/work/session?id=` picks the one that was tapped.
 */
export interface SessionFixture {
  readonly id: string;
  readonly adviseeName: string;
  /** The same portrait the catalogue pairs with this name, so the app never
   *  shows one person with two faces. */
  readonly avatar: StaticImageData;
  readonly serviceTitle: string;
  readonly range: string;
  /** Slots of 30 minutes this booking occupies — see `SLOT_MINUTES`. */
  readonly slots: number;
  readonly durationHours: number;
  /** Minutes until it starts. Only the next session has one; the rest are later. */
  readonly startsInMinutes?: number;
  readonly answers: readonly ScreeningAnswer[];
}

/**
 * Figma "Next Session" — the one card the screen is really about. Its countdown is
 * required, unlike the rest of the day's, which is what the type says.
 */
export const NEXT_SESSION: SessionFixture & { readonly startsInMinutes: number } = {
  id: "s-1000",
  adviseeName: "ธนกฤต ว.",
  avatar: christopherNolan,
  serviceTitle: "วางแผนภาษีสำหรับฟรีแลนซ์",
  range: "10:00 – 11:00",
  slots: 2,
  durationHours: 1,
  startsInMinutes: 19,
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
};

export const LATER_TODAY: readonly SessionFixture[] = [
  {
    id: "s-1300",
    adviseeName: "กัญญา พรหมมา",
    avatar: arayaS,
    serviceTitle: "ตรวจแผนภาษีก่อนยื่น",
    // 13:45 until now, which is a booking the platform cannot sell: slots are
    // fixed at 30 minutes (`SLOT_MINUTES`), so 45 of them is a slot and a half.
    range: "13:00 – 14:00",
    slots: 2,
    durationHours: 1,
    answers: [
      {
        id: "q1",
        question: "อยากปรึกษาเรื่องอะไรเป็นหลัก",
        answer:
          "ทำแผนภาษีไว้เองแล้ว อยากให้ช่วยตรวจว่ากรอกค่าลดหย่อนครบและถูกต้องไหมก่อนยื่น",
      },
      {
        id: "q2",
        question: "รายได้ต่อปีโดยประมาณ",
        answer: "600,000 – 900,000 บาท",
      },
      {
        id: "q3",
        question: "เคยยื่นภาษีเองมาก่อนหรือไม่",
        answer: "ยื่นเองมา 4 ปี ปีนี้มีรายได้จากต่างประเทศเพิ่มเข้ามา",
      },
    ],
  },
  {
    id: "s-1600",
    adviseeName: "วีรภัทร ก.",
    avatar: jamesGunn,
    serviceTitle: "ปรึกษาภาษีนิติบุคคล",
    range: "16:00 – 17:30",
    slots: 3,
    durationHours: 1.5,
    answers: [
      {
        id: "q1",
        question: "อยากปรึกษาเรื่องอะไรเป็นหลัก",
        answer:
          "เพิ่งจดทะเบียนบริษัทเมื่อต้นปี ยังไม่เข้าใจภาษีนิติบุคคลและรอบการยื่นงบการเงิน",
      },
      {
        id: "q2",
        question: "รายได้ต่อปีโดยประมาณ",
        answer: "2,000,000 – 3,000,000 บาท",
      },
      {
        id: "q3",
        question: "เคยยื่นภาษีเองมาก่อนหรือไม่",
        answer: "เคยยื่นแต่ภาษีบุคคลธรรมดา ของบริษัทยังไม่เคยยื่นเอง",
      },
    ],
  },
];

/** Every session today, the next one first — the calendar view lists all three. */
export const TODAY_SESSIONS: readonly SessionFixture[] = [
  NEXT_SESSION,
  ...LATER_TODAY,
];

/**
 * The session `/work/session?id=` was opened for. An unknown or absent id is the
 * next session, which is what the route showed when it had no id at all.
 */
export function sessionDetail(id?: string | null): SessionFixture {
  return TODAY_SESSIONS.find((session) => session.id === id) ?? NEXT_SESSION;
}

/** Figma "Pending" — what is waiting on the Advisor, and where each one lives. */
export const PENDING_ITEMS = [
  { id: "bookings", count: 2, href: "/screening/requests" },
  { id: "screening", count: 1, href: "/screening/review" },
  { id: "reviews", count: 3, href: "/reviews" },
] as const;

/** Everything waiting, as the dashboard's pending tile counts it. */
export const PENDING_TOTAL = PENDING_ITEMS.reduce(
  (sum, item) => sum + item.count,
  0,
);

/**
 * Sessions per day this month.
 *
 * It was a bare set of days that began on the 17th, while the same screen listed
 * three sessions today — a calendar that disagrees with the day it is drawing. Today
 * now reads its count from `TODAY_SESSIONS`, so the dot and the list move together,
 * and the counts are what the desktop cells show.
 */
export const SESSIONS_BY_DAY: ReadonlyMap<number, number> = new Map([
  [TODAY.day, TODAY_SESSIONS.length],
  [17, 2],
  [19, 1],
  [21, 2],
  [24, 1],
  [26, 3],
  [28, 1],
]);

/** Days in the month with at least one session, as the calendar dots them. */
export const SESSION_DAYS: ReadonlySet<number> = new Set(SESSIONS_BY_DAY.keys());

/** Every session in the month — the figure the month header never stated. */
export const MONTH_SESSION_COUNT = [...SESSIONS_BY_DAY.values()].reduce(
  (sum, count) => sum + count,
  0,
);

/** Figma "ช่วงเวลาว่าง" — the gaps left in today's schedule. */
export const FREE_GAPS = ["11:00", "14:00"] as const;

/**
 * Figma "การให้คำปรึกษาล่าสุด" — the two most recent paid sessions.
 *
 * `state` is the payout state, and it is what the row's status pill colours:
 * `pending` is money not yet cleared, `available` is money that can be withdrawn.
 */
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
