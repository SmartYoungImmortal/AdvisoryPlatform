import {
  getMyAdvisorService,
  getAdvisorServiceImages,
} from "@/lib/advisor-services/api";
import { listAllAdvisorBookings } from "@/lib/api/advisor-bookings";
import { getOwnProfile } from "@/lib/api/resources";
import {
  availabilityApi,
  type AvailabilityProfile,
} from "@/lib/availability/api";
import { WEEKDAYS, type Weekday } from "@/lib/availability/profiles";

export async function readServiceDetail(
  serviceId: string,
  signal: AbortSignal,
) {
  const service = await getMyAdvisorService(serviceId, signal);
  const [bookings, profiles, global, owner, gallery] = await Promise.all([
    listAllAdvisorBookings(signal),
    availabilityApi.getProfiles(signal),
    availabilityApi.getGlobal(signal),
    getOwnProfile(signal),
    getAdvisorServiceImages(serviceId, signal),
  ]);
  return {
    service,
    global,
    owner,
    images: gallery.images,
    profile: profiles.find(
      (profile) => profile.id === service.availabilityProfileId,
    ),
    bookings: bookings
      .filter((booking) => booking.serviceId === serviceId)
      .toSorted((a, b) => a.startTime.localeCompare(b.startTime)),
  };
}

export type ServiceDetail = Awaited<ReturnType<typeof readServiceDetail>>;

export function profileWeek(
  profile: AvailabilityProfile,
): Partial<Record<Weekday, string>> {
  const result: Partial<Record<Weekday, string>> = {};
  WEEKDAYS.forEach((day, index) => {
    const ranges = profile.weeklyWindows
      .filter((window) => window.dayOfWeek === index + 1)
      .toSorted((a, b) => a.startTime.localeCompare(b.startTime));
    if (ranges.length)
      result[day] = ranges
        .map(
          (window) =>
            `${window.startTime.slice(0, 5)}–${window.endTime.slice(0, 5)}`,
        )
        .join(", ");
  });
  return result;
}
