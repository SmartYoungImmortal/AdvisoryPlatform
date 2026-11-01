import {
  listAdvisors,
  listMyBookings,
  listServices,
} from "@/lib/api/resources";
import type { Paginated } from "@/lib/api/client";
import type {
  ApiBooking,
  ApiPublicAdvisor,
  ApiPublicService,
} from "@/lib/api/types";

async function allPages<T extends { readonly id: string }>(
  read: (page?: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await read();
  const items = new Map(first.items.map((item) => [item.id, item]));
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await read(page);
    for (const item of next.items) items.set(item.id, item);
  }
  return [...items.values()];
}

/** A complete timeline needs its later appointments and their lookup data. */
export function listAllMyBookings(signal?: AbortSignal): Promise<ApiBooking[]> {
  return allPages((page) => listMyBookings({ limit: 50, page }, signal));
}
export function listBookingServices(
  signal?: AbortSignal,
): Promise<ApiPublicService[]> {
  return allPages((page) => listServices({ limit: 100, page }, signal));
}
export function listBookingAdvisors(
  signal?: AbortSignal,
): Promise<ApiPublicAdvisor[]> {
  return allPages((page) => listAdvisors({ limit: 100, page }, signal));
}
