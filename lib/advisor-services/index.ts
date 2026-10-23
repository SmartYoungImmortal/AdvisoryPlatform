import { getService, type Service } from "@/lib/catalogue/services";
import type { Weekday } from "@/lib/availability/profiles";

/**
 * Figma "Advisor - Service" (1594:29454) — the Advisor's own view of the services
 * they sell, as opposed to `lib/catalogue/services`, which is the public record a
 * visitor browses.
 *
 * The two are deliberately joined by id rather than duplicated: the title, the cover
 * and the gallery belong to the service itself and are read from the catalogue, so
 * an Advisor's card and a visitor's card can never drift apart. What lives here is
 * only what the catalogue has no business knowing — whether the service is published,
 * which Availability Profile it runs on, and what it earns.
 *
 * The three services are the ones the frames draw. They are named explicitly rather
 * than filtered by the catalogue's `advisorId`, because that field describes who
 * appears on the public listing and these frames are about one signed-in Advisor.
 */

export type ServiceStatus = "published" | "hidden";

export interface AdvisorServiceFixture {
  readonly serviceId: string;
  readonly status: ServiceStatus;
  /** The Availability Profile this service draws its slots from. */
  readonly profileName: string;
  /** Price of the 30-minute session, in baht, as the cards show it. */
  readonly shortPrice: number;
}

export const ADVISOR_SERVICES: readonly AdvisorServiceFixture[] = [
  {
    serviceId: "tax-freelance",
    status: "published",
    profileName: "งานให้คำปรึกษาทั่วไป",
    shortPrice: 600,
  },
  {
    serviceId: "tax-review",
    status: "published",
    profileName: "งานให้คำปรึกษาทั่วไป",
    shortPrice: 450,
  },
  {
    serviceId: "tax-corporate",
    status: "hidden",
    profileName: "Career coaching",
    shortPrice: 900,
  },
];

export const ADVISOR_SERVICE_IDS = ADVISOR_SERVICES.map(
  ({ serviceId }) => serviceId,
);

/** The slot length every service is sold in — fixed by the scheduling rules. */
export const SLOT_MINUTES = 30;

export interface AdvisorServiceRecord extends AdvisorServiceFixture {
  readonly service: Service;
}

/** Joins a fixture to its catalogue record, dropping any id the catalogue lost. */
export function advisorServices(): readonly AdvisorServiceRecord[] {
  return ADVISOR_SERVICES.flatMap((fixture) => {
    const service = getService(fixture.serviceId);
    return service ? [{ ...fixture, service }] : [];
  });
}

export function advisorService(
  serviceId: string,
): AdvisorServiceRecord | undefined {
  return advisorServices().find(
    (record) => record.serviceId === serviceId,
  );
}

/** Figma "Stats" — the three counts above the list. */
export function serviceCounts() {
  const all = advisorServices();
  return {
    total: all.length,
    published: all.filter((record) => record.status === "published").length,
    profiles: new Set(all.map((record) => record.profileName)).size,
  };
}

/**
 * Figma "Service detail - advisor" (1998:29813) — what one service looks like from
 * the inside: how many slots it opened, how many sold, and who booked them.
 */
export interface ServiceSlotStats {
  readonly openedSlots: number;
  readonly booked: number;
  readonly free: number;
  readonly horizonDays: number;
}

export const SERVICE_SLOT_STATS: ServiceSlotStats = {
  openedSlots: 12,
  booked: 4,
  free: 8,
  horizonDays: 30,
};

/** The weekly shape this service's profile exposes, as the detail card lists it. */
export const SERVICE_WEEK: Partial<Record<Weekday, string>> = {
  mon: "09:00–12:00, 14:00–16:00, 18:00–20:00",
  wed: "13:00–17:00",
};

/** Figma "ช่วงเวลาที่จองได้ถัดไป" — already formatted; see lib/availability/editor. */
export const NEXT_SLOTS = [
  { id: "mon-21", label: "จันทร์ 21 ก.ย.", times: "09:00, 09:30, 10:00, 11:30" },
  { id: "wed-23", label: "พุธ 23 ก.ย.", times: "13:00, 13:30, 14:00" },
] as const;

export type BookingState = "upcoming" | "completed";

export interface ServiceBookingFixture {
  readonly id: string;
  /** Advisee ids are catalogue advisor ids only because the fixtures share portraits. */
  readonly name: string;
  readonly avatarId: string;
  readonly when: string;
  readonly state: BookingState;
}

export const SERVICE_BOOKINGS: readonly ServiceBookingFixture[] = [
  {
    id: "b1",
    name: "ธนกฤต ว.",
    avatarId: "thanakrit-w",
    when: "อ. 22 ก.ย. · 09:00 – 10:00",
    state: "upcoming",
  },
  {
    id: "b2",
    name: "วีรภัทร ก.",
    avatarId: "weerapat-k",
    when: "อ. 22 ก.ย. · 16:00 – 17:00",
    state: "upcoming",
  },
  {
    id: "b3",
    name: "ปุณยวีร์ ท.",
    avatarId: "sarah-jenskins",
    when: "ศ. 18 ก.ย. · 13:00 – 14:00",
    state: "completed",
  },
];
