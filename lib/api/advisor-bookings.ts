import { z } from "zod";
import { api } from "@/lib/api/client";

const advisorBookingSchema = z.object({
  id: z.uuid(),
  serviceId: z.uuid(),
  advisorId: z.uuid(),
  adviseeId: z.uuid(),
  packageId: z.uuid().nullable(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  unavailableUntil: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  state: z.enum([
    "PENDING_PAYMENT",
    "BOOKED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
  blocksAvailability: z.boolean(),
  cancelledAt: z.iso.datetime().nullable(),
  cancelledByUserId: z.uuid().nullable(),
  adviseeName: z.string(),
  serviceName: z.string(),
  // The advisee's picture and the service's first photograph, as fetchable URLs;
  // null without one, and absent from an API that predates them.
  adviseeAvatarUrl: z.string().nullable().default(null),
  serviceImageUrl: z.string().nullable().default(null),
});
const detailSchema = advisorBookingSchema.extend({
  chatRoomId: z.uuid().nullable(),
  latestScreeningRequestId: z.uuid().nullable(),
});
const pageSchema = z.object({
  items: z.array(advisorBookingSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  totalPages: z.number().int().nonnegative(),
});
const screeningSchema = z.object({
  id: z.uuid(),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"]),
  createdAt: z.iso.datetime(),
  answers: z.array(
    z.object({
      questionId: z.uuid(),
      questionText: z.string(),
      answer: z.string(),
    }),
  ),
});

export type AdvisorBooking = z.infer<typeof advisorBookingSchema>;
export type AdvisorBookingDetail = z.infer<typeof detailSchema>;
export type AdvisorBookingScreening = z.infer<typeof screeningSchema>;

/** Read every page: a calendar must not silently stop at the default list limit. */
export async function listAllAdvisorBookings(
  signal?: AbortSignal,
): Promise<AdvisorBooking[]> {
  const first = pageSchema.parse(
    await api.get<unknown>("advisors/me/bookings", {
      query: { page: 1, limit: 100 },
      signal,
    }),
  );
  const items = new Map(first.items.map((item) => [item.id, item]));
  for (let page = 2; page <= first.totalPages; page++) {
    const result = pageSchema.parse(
      await api.get<unknown>("advisors/me/bookings", {
        query: { page, limit: 100 },
        signal,
      }),
    );
    for (const item of result.items) items.set(item.id, item);
  }
  return [...items.values()];
}

export async function getAdvisorBooking(
  id: string,
  signal?: AbortSignal,
): Promise<AdvisorBookingDetail> {
  return detailSchema.parse(
    await api.get<unknown>(`advisors/me/bookings/${id}`, { signal }),
  );
}

export async function getAdvisorBookingScreening(
  id: string,
  signal?: AbortSignal,
): Promise<AdvisorBookingScreening> {
  return screeningSchema.parse(
    await api.get<unknown>(`advisors/me/screening-requests/${id}`, { signal }),
  );
}
