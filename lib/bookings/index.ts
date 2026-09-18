import type { StaticImageData } from "next/image";

import {
  arayaS,
  christopherNolan,
  jamesGunn,
  sarahJenskins,
} from "@/lib/assets/r2";

/**
 * The bookings behind the `การจอง` tab.
 *
 * A fixture module in the shape of `lib/admin/users.ts`: ids double as the
 * `generateStaticParams` list once `/bookings/[id]` lands, and the copy lives
 * here rather than in a message namespace because a record looked up by id
 * cannot reach its own strings through next-intl's literal-union key type.
 *
 * Every string is the one Figma 1326:18632 draws, including the dates — the
 * frame is dated August 2569 and the fixtures have no clock to resolve a real
 * "today" against, so `when` is written the way the design writes it rather
 * than derived.
 */
export type BookingStatus = "upcoming" | "completed" | "cancelled";

export type Booking = {
  readonly id: string;
  readonly title: string;
  readonly advisor: string;
  readonly avatar: StaticImageData;
  /** `ChatAvatar` re-frames its default portrait; the others are square already. */
  readonly crop: boolean;
  /** Day and range as one line — "วันนี้ · 14:00 – 14:45". */
  readonly when: string;
  /** Amount and settlement as one line — "฿840 · ชำระแล้ว". */
  readonly payment: string;
  readonly status: BookingStatus;
};

/**
 * The one session close enough to join, which the frame lifts out of the list
 * into its own accented card. Separate from `bookings` because it is a
 * different card, not a flag on the same one.
 */
export const nextSession = {
  id: "sarah-hour-today",
  title: "ปรึกษา 1 ชั่วโมง",
  advisor: "Sarah Jenskins",
  avatar: sarahJenskins,
  crop: true,
  when: "วันนี้ 10:00 – 11:00",
  countdown: "อีก 19 นาที",
} as const;

export const bookings: ReadonlyArray<Booking> = [
  {
    id: "thesis-review",
    title: "ตรวจวิทยานิพนธ์",
    advisor: "กัญญา พรหมมา",
    avatar: arayaS,
    crop: false,
    when: "วันนี้ · 14:00 – 14:45",
    payment: "฿840 · ชำระแล้ว",
    status: "upcoming",
  },
  {
    id: "sarah-hour-17",
    title: "ปรึกษา 1 ชั่วโมง",
    advisor: "Sarah Jenskins",
    avatar: sarahJenskins,
    crop: true,
    when: "อา. 17 ส.ค. 2569 · 10:00 – 11:00",
    payment: "฿1,260 · ชำระแล้ว",
    status: "upcoming",
  },
  {
    id: "portfolio-review",
    title: "ตรวจพอร์ตโฟลิโอ",
    advisor: "James Gunn",
    avatar: jamesGunn,
    crop: false,
    when: "อ. 19 ส.ค. 2569 · 13:00 – 13:45",
    payment: "฿630 · ชำระแล้ว",
    status: "upcoming",
  },
  {
    id: "sarah-hour-21",
    title: "ปรึกษา 1 ชั่วโมง",
    advisor: "Sarah Jenskins",
    avatar: sarahJenskins,
    crop: true,
    when: "พฤ. 21 ส.ค. 2569 · 16:00 – 17:00",
    payment: "฿1,260 · ชำระแล้ว",
    status: "upcoming",
  },
  {
    id: "pitch-review-done",
    title: "ตรวจแผนธุรกิจก่อนพิตช์",
    advisor: "ธนกฤต ว.",
    avatar: christopherNolan,
    crop: false,
    when: "จ. 4 ส.ค. 2569 · 11:00 – 12:00",
    payment: "฿1,575 · ชำระแล้ว",
    status: "completed",
  },
  {
    id: "tax-personal-cancelled",
    title: "ให้คำปรึกษาภาษีเงินได้บุคคลธรรมดา",
    advisor: "Sarah Jenskins",
    avatar: sarahJenskins,
    crop: true,
    when: "ศ. 1 ส.ค. 2569 · 09:00 – 09:30",
    payment: "฿630 · คืนเงินแล้ว",
    status: "cancelled",
  },
];

export const bookingIds = bookings.map(({ id }) => id);

export function bookingsByStatus(status: BookingStatus): ReadonlyArray<Booking> {
  return bookings.filter((booking) => booking.status === status);
}

/** What the heading counts: the lifted session plus everything still upcoming. */
export const upcomingCount = bookingsByStatus("upcoming").length + 1;
