import { api, type Paginated } from "@/lib/api/client";
import type { ApiServicePackage } from "@/lib/api/types";

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
  /** The other services this one's page shows, in order; empty lets the page choose. */
  readonly relatedServiceIds?: readonly string[];
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
  readonly relatedServiceIds?: readonly string[];
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

export function getAdvisorServiceImages(id: string, signal?: AbortSignal): Promise<{ images: string[] }> {
  return api.get(`advisors/me/services/${encodeURIComponent(id)}/images`, { signal });
}

export function uploadAdvisorServiceImage(id: string, file: File): Promise<{ images: string[] }> {
  const body = new FormData();
  body.append("file", file);
  return api.post(`advisors/me/services/${encodeURIComponent(id)}/images`, { body });
}

/** `DELETE .../images/:index` — takes one photograph out of the carousel; answers the rest. */
export function removeAdvisorServiceImage(id: string, index: number): Promise<{ images: string[] }> {
  return api.delete(`advisors/me/services/${encodeURIComponent(id)}/images/${index}`);
}

/** The most photographs a service may have (`MAX_SERVICE_IMAGES`). */
export const MAX_SERVICE_IMAGES = 6;

/** The most of the advisor's other services a service's page may be set to show (`MAX_RELATED_SERVICES`). */
export const MAX_RELATED_SERVICES = 3;

/** A package as `PUT .../packages` takes it: an `id` keeps an existing one, none adds one. */
export interface ServicePackageInput {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly durationMinutes: number;
  readonly priceSatang: number;
}

/** The most packages a service may be sold in (`MAX_SERVICE_PACKAGES`). */
export const MAX_SERVICE_PACKAGES = 5;

/** `GET /advisors/me/services/:id/packages` — the owner's packages, published or not. */
export function listMyServicePackages(id: string, signal?: AbortSignal): Promise<ApiServicePackage[]> {
  return api.get(`advisors/me/services/${encodeURIComponent(id)}/packages`, { signal });
}

/** `PUT /advisors/me/services/:id/packages` — the whole list, in order; one left out is removed. */
export function replaceMyServicePackages(
  id: string,
  packages: readonly ServicePackageInput[],
  signal?: AbortSignal,
): Promise<ApiServicePackage[]> {
  return api.put(`advisors/me/services/${encodeURIComponent(id)}/packages`, { body: { packages }, signal });
}
