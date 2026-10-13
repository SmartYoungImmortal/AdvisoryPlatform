/**
 * The notifications half of the API — `AdvisoryPlatformAPI/src/modules/notifications`.
 *
 * Kept beside the screens, the way `components/screening/screening-data.ts` keeps
 * its own: `lib/api/resources.ts` is shared, and every export here is written to
 * be moved there verbatim.
 *
 * The feed is the signed-in user's own. Other features write into it on the
 * server (screening today; booking, payment, chat and reviews once their owners
 * call `NotificationsService.notify()`), so this side only reads and marks.
 */

import { api } from "@/lib/api/client";

/** How often an open tab asks whether anything new arrived. */
export const NOTIFICATION_POLL_MS = 30_000;

/* -------------------------------------------------------------------- shapes */

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_RECEIVED"
  | "PAYMENT_SUCCEEDED"
  | "PAYOUT_SENT"
  | "SESSION_REMINDER"
  | "NEW_MESSAGE"
  | "SCREENING_REQUESTED"
  | "SCREENING_DECIDED"
  | "REVIEW_RECEIVED"
  | "VERIFICATION_DECIDED"
  | "POLICY_WARNING";

/** `NotificationResponseDto` */
export interface ApiNotification {
  readonly id: string;
  readonly type: NotificationType;
  /** Thai, written by the feature that sent it. */
  readonly title: string;
  readonly content: string | null;
  /** The record it is about; what kind follows from `type` — see `notificationHref`. */
  readonly resourceId: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
}

/** A cursor page, exactly as the API's `CursorPaginatedResult<T>` is shaped. */
export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly limit: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/* --------------------------------------------------------------------- reads */

/** `GET /notifications` — newest first. */
export function listNotifications(
  query: { readonly cursor?: string; readonly limit?: number } = {},
  signal?: AbortSignal,
): Promise<CursorPage<ApiNotification>> {
  return api.get("notifications", { query: { ...query }, signal });
}

/** `GET /notifications/unread-count` */
export function countUnreadNotifications(
  signal?: AbortSignal,
): Promise<{ readonly count: number }> {
  return api.get("notifications/unread-count", { signal });
}

/* -------------------------------------------------------------------- writes */

/** `PATCH /notifications/:id/read` — 404 for someone else's. */
export function markNotificationRead(
  notificationId: string,
  signal?: AbortSignal,
): Promise<ApiNotification> {
  return api.patch(`notifications/${notificationId}/read`, { signal });
}

/** `PATCH /notifications/read-all` — answers how many changed. */
export function markAllNotificationsRead(
  signal?: AbortSignal,
): Promise<{ readonly count: number }> {
  return api.patch("notifications/read-all", { signal });
}

/* ------------------------------------------------------------------ routing */

/**
 * Where tapping a notification goes: the record when it carries one, otherwise
 * the list it belongs to. A screening decision lands on the outcome route, which
 * forwards to whichever state the request is really in.
 */
export function notificationHref(notification: ApiNotification): string {
  const id = notification.resourceId;
  switch (notification.type) {
    case "SCREENING_REQUESTED":
      return id ? `/screening/review?requestId=${id}` : "/screening/requests";
    case "SCREENING_DECIDED":
      return id ? `/screening/accepted?serviceId=${id}` : "/bookings";
    case "NEW_MESSAGE":
      return "/chat";
    case "BOOKING_CONFIRMED":
    case "SESSION_REMINDER":
      return "/bookings";
    case "BOOKING_RECEIVED":
      return "/work/calendar";
    case "PAYMENT_SUCCEEDED":
      return "/transactions";
    case "PAYOUT_SENT":
      return "/earnings";
    case "REVIEW_RECEIVED":
      return "/reviews";
    case "VERIFICATION_DECIDED":
      return "/advisor/profile";
    default:
      // POLICY_WARNING: the account it was about.
      return "/profile";
  }
}

/* --------------------------------------------------------------------- dates */

/** Local calendar day, so "วันนี้" means the reader's today rather than UTC's. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Groups a newest-first feed into runs of the same local day, in order. */
export function groupByDay(
  items: readonly ApiNotification[],
): readonly { readonly day: string; readonly date: Date; readonly items: ApiNotification[] }[] {
  const groups: { day: string; date: Date; items: ApiNotification[] }[] = [];
  for (const item of items) {
    const date = new Date(item.createdAt);
    const day = dayKey(date);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, date, items: [item] });
  }
  return groups;
}
