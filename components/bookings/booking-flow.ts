"use client";

import { useState, useSyncExternalStore } from "react";

import type { ApiBookingState } from "@/lib/api/types";
import type { StatusTone } from "@/components/mobile/status-pill";

/**
 * The parts the booking and payment screens share, in one place.
 *
 * Three of them, and each exists because of something the app's own shape forces
 * rather than because a helper felt tidy.
 *
 * ## Why the uuid arrives in a query string
 *
 * `output: "export"` emits exactly the routes `generateStaticParams` names, and
 * those lists come from `lib/catalogue/services` and `lib/catalogue/profiles` —
 * slugs like `/service/tax-freelance`. The API keys on uuid, and a uuid route
 * cannot be prerendered from an API the build never talks to. So the uuid rides
 * on an existing slug route as `?serviceId=` / `?advisorId=` / `?bookingId=`,
 * which every screen here reads through `useQueryValue`. The slug routes keep
 * rendering their fixtures untouched when the parameter is absent.
 *
 * `useSyncExternalStore` rather than `useSearchParams`: a static export has no
 * request to read, and `useSearchParams` in a prerendered page wants a Suspense
 * boundary and still hands back an empty set on the server pass. Subscribing to
 * `location` says out loud that this is a client-only read, hydrates from `""`
 * so the markup matches, and needs no boundary.
 *
 * ## Why the money helper is here and not in `lib/api`
 *
 * The API is satang everywhere and never divides. Dividing at the client
 * boundary would put rounding into every call site, so it happens once, at the
 * point of formatting — which is a screen concern, not a transport one.
 */

function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const readSearch = (): string => window.location.search;

/** Hydration reads this, so the first pass matches the prerendered markup. */
const noSearch = (): string => "";

/**
 * One query parameter, or null.
 *
 * Null on the server pass and on the hydrating render, then the real value — so a
 * screen treats "not there yet" and "not asked for" the same, and falls back to
 * whatever it rendered before the API existed.
 */
export function useQueryValue(name: string): string | null {
  const search = useSyncExternalStore(subscribeToLocation, readSearch, noSearch);
  return new URLSearchParams(search).get(name);
}

/**
 * The clock, read once per mount.
 *
 * `Date.now()` in a render body is impure and `react-hooks/purity` rejects it —
 * correctly, because a component that re-renders would silently re-decide which
 * booking is "next". A `useState` initialiser is the one place a mount-time read
 * belongs: it runs once, the value is stable for the life of the component, and
 * nothing here needs a ticking clock. A screen that did would subscribe to one.
 */
export function useMountTime(): number {
  const [now] = useState(() => Date.now());
  return now;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The value if it is a uuid, otherwise undefined.
 *
 * Every id the API takes goes through a `ParseUUIDPipe`, so a slug sent by
 * mistake is a 400 with a message about validation rather than a 404 the screen
 * could show as "not found". Checking here keeps a fixture slug from ever
 * becoming a request.
 */
export function asUuid(value: string | null | undefined): string | undefined {
  return value && UUID.test(value) ? value : undefined;
}

/**
 * The prerendered slug a `?serviceId=` / `?advisorId=` link hangs on.
 *
 * The query string only reaches a page that the export emitted, so an API-backed
 * link needs one slug out of `generateStaticParams` to sit on. These two are
 * arbitrary among their lists (`lib/catalogue/services` and
 * `lib/catalogue/profiles`) and named here so the arbitrariness is in one place
 * and disappears in one edit: the day `/service/[id]` prerenders uuids, or the app
 * stops being a static export, these become the plain `/service/${id}` they want
 * to be.
 */
export const LIVE_SERVICE_PATH = "/service/tax-freelance";
export const LIVE_ADVISOR_PATH = "/advisors/sarah-jenskins";

/** The link to one service's API-backed page. */
export function liveServiceHref(serviceId: string): string {
  return `${LIVE_SERVICE_PATH}?serviceId=${serviceId}`;
}

/** The link to one advisor's API-backed public profile. */
export function liveAdvisorHref(advisorId: string): string {
  return `${LIVE_ADVISOR_PATH}?advisorId=${advisorId}`;
}

/** Satang to baht, for `useFormatter().number(value, "baht")`. */
export function baht(satang: number): number {
  return satang / 100;
}

/** `YYYY-MM-DD` in the viewer's own zone — the shape `?from=` / `?to=` take. */
export function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today plus `days`, at the same clock time. */
export function addDays(date: Date, days: number): Date {
  const moved = new Date(date);
  moved.setDate(moved.getDate() + days);
  return moved;
}

/** The three tabs Figma 1326:18632 draws, which every state has to land in. */
export type BookingBucket = "upcoming" | "completed" | "cancelled";

/**
 * Which tab a state belongs under.
 *
 * `PENDING_PAYMENT` is upcoming because the time is held — the row says it is not
 * settled, which is a different fact from whether it is ahead of you.
 *
 * `NO_SHOW` sits with `COMPLETED`: the appointment happened and is over. It is
 * the one state with no word of its own in `messages/th.json`, so it currently
 * borrows "เสร็จสิ้น", which is true about the clock and silent about the reason.
 * A `bookings.stateNoShow` key would fix that; nothing can reach the state today
 * because only the advisor's side writes it.
 */
export const BOOKING_BUCKET: Record<ApiBookingState, BookingBucket> = {
  PENDING_PAYMENT: "upcoming",
  BOOKED: "upcoming",
  IN_PROGRESS: "upcoming",
  COMPLETED: "completed",
  NO_SHOW: "completed",
  CANCELLED: "cancelled",
};

/**
 * The colour each state is said in. The word is always printed beside it — see
 * `StatusPill`; colour doubles the status and never carries it alone.
 */
export const BOOKING_TONE: Record<ApiBookingState, StatusTone> = {
  // Money still owed on a held slot is the one thing on the list to act on.
  PENDING_PAYMENT: "warning",
  BOOKED: "accent",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  NO_SHOW: "neutral",
  CANCELLED: "neutral",
};

/** A booking the advisee can still call off — the API allows exactly these two. */
export function isCancellable(state: ApiBookingState): boolean {
  return state === "PENDING_PAYMENT" || state === "BOOKED";
}
