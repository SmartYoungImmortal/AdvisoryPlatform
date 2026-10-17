import { api, type Paginated } from "@/lib/api/client";

/** Advisor-owned service DTO from GET /advisors/me/services. */
export interface AdvisorService {
  readonly id: string;
  readonly advisorId: string;
  readonly categoryId: string;
  readonly availabilityProfileId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly priceSatang: number;
  readonly durationMinutes: number;
  readonly dailyConsultationLimitMinutes: number | null;
  readonly isPublished: boolean;
  readonly screeningRequired: boolean;
  readonly trialEnabled: boolean;
  readonly trialDurationMinutes: number | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
}

export interface AvailabilityProfile {
  readonly id: string;
  readonly advisorId: string;
  readonly name: string;
  readonly weeklyWindows: readonly {
    readonly dayOfWeek: number;
    readonly startTime: string;
    readonly endTime: string;
  }[];
  readonly specificWindows: readonly {
    readonly availableDate: string;
    readonly startTime: string;
    readonly endTime: string;
  }[];
  readonly blockedPeriods: readonly {
    readonly blockedDate: string;
    readonly startTime?: string;
    readonly endTime?: string;
  }[];
}

export interface ServiceCategory {
  readonly id: string;
  readonly name: string;
}

export type AdvisorServicesPage = Paginated<AdvisorService>;

export function listMyAdvisorServices(signal?: AbortSignal): Promise<AdvisorServicesPage> {
  return api.get("advisors/me/services", { query: { page: 1, limit: 100 }, signal });
}

export function getMyAdvisorService(id: string, signal?: AbortSignal): Promise<AdvisorService> {
  return api.get(`advisors/me/services/${id}`, { signal });
}

export function createAdvisorService(input: {
  readonly categoryId: string;
  readonly availabilityProfileId: string;
  readonly name: string;
  readonly description?: string;
  readonly priceSatang: number;
  readonly durationMinutes: number;
  readonly dailyConsultationLimitMinutes?: number | null;
  readonly isPublished?: boolean;
  readonly screeningRequired?: boolean;
  readonly trialEnabled?: boolean;
  readonly trialDurationMinutes?: number;
}, signal?: AbortSignal): Promise<AdvisorService> {
  return api.post("advisors/me/services", { body: input, signal });
}

export function updateAdvisorService(id: string, changes: Partial<Parameters<typeof createAdvisorService>[0]>, signal?: AbortSignal): Promise<AdvisorService> {
  return api.patch(`advisors/me/services/${id}`, { body: changes, signal });
}

export function deleteAdvisorService(id: string, signal?: AbortSignal): Promise<AdvisorService> {
  return api.delete(`advisors/me/services/${id}`, { signal });
}

export function listMyAvailabilityProfiles(signal?: AbortSignal): Promise<readonly AvailabilityProfile[]> {
  return api.get("advisors/me/availability/profiles", { signal });
}

export function listServiceCategories(signal?: AbortSignal): Promise<Paginated<ServiceCategory>> {
  return api.get("service-categories", { signal });
}
