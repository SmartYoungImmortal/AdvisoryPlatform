import { api, type Paginated } from "@/lib/api/client";

/** Shapes returned by `AdvisoryPlatformAPI/modules/availability`. */
export interface GlobalAvailability {
  readonly advisorId: string;
  readonly slotIntervalMinutes: number;
  readonly bufferMinutes: number;
  readonly bookingHorizonDays: number;
  readonly minimumBookingNoticeMinutes: number;
  readonly dailyConsultationLimitMinutes: number | null;
}

export interface AvailabilityTimeWindow {
  readonly startTime: string;
  readonly endTime: string;
}

export interface WeeklyAvailabilityWindow extends AvailabilityTimeWindow {
  readonly dayOfWeek: number;
}

export interface SpecificAvailabilityWindow extends AvailabilityTimeWindow {
  readonly availableDate: string;
}

export interface BlockedAvailabilityPeriod {
  readonly blockedDate: string;
  readonly startTime?: string;
  readonly endTime?: string;
}

export interface AvailabilityProfile {
  readonly id: string;
  readonly advisorId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly weeklyWindows: readonly WeeklyAvailabilityWindow[];
  readonly specificWindows: readonly SpecificAvailabilityWindow[];
  readonly blockedPeriods: readonly BlockedAvailabilityPeriod[];
}

interface AdvisorServiceUsageRow {
  readonly availabilityProfileId: string | null;
}

export interface UpsertAvailabilityProfile {
  readonly name: string;
  readonly weeklyWindows: readonly WeeklyAvailabilityWindow[];
  readonly specificWindows: readonly SpecificAvailabilityWindow[];
  readonly blockedPeriods: readonly BlockedAvailabilityPeriod[];
}

export const availabilityApi = {
  getGlobal: () => api.get<GlobalAvailability>("advisors/me/availability/global"),
  saveGlobal: (values: Partial<Omit<GlobalAvailability, "advisorId" | "slotIntervalMinutes">>) =>
    api.put<GlobalAvailability>("advisors/me/availability/global", { body: values }),
  getProfiles: (signal?: AbortSignal) => api.get<AvailabilityProfile[]>("advisors/me/availability/profiles", { signal }),
  createProfile: (values: UpsertAvailabilityProfile) =>
    api.post<AvailabilityProfile>("advisors/me/availability/profiles", { body: values }),
  updateProfile: (id: string, values: UpsertAvailabilityProfile) =>
    api.patch<AvailabilityProfile>(`advisors/me/availability/profiles/${encodeURIComponent(id)}`, { body: values }),
  deleteProfile: (id: string) =>
    api.delete<AvailabilityProfile>(`advisors/me/availability/profiles/${encodeURIComponent(id)}`),
  getProfileServiceUsage: async (signal?: AbortSignal) => {
    const usage = new Map<string, number>();
    let page = 1;
    let totalPages = 1;
    do {
      const result = await api.get<Paginated<AdvisorServiceUsageRow>>("advisors/me/services", {
        query: { page, limit: 100 },
        signal,
      });
      totalPages = result.totalPages;
      result.items.forEach(({ availabilityProfileId }) => {
        if (availabilityProfileId) usage.set(availabilityProfileId, (usage.get(availabilityProfileId) ?? 0) + 1);
      });
      page += 1;
    } while (page <= totalPages);
    return usage;
  },
};
