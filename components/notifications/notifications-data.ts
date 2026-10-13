/**
 * API calls for notifications (`AdvisoryPlatformAPI/src/modules/notifications`).
 *
 * Kept next to the screens, like `components/screening/screening-data.ts`, so it
 * can be moved into the shared `lib/api/resources.ts` later without changes.
 *
 * Each user only sees their own notifications. Other features create them on the
 * server (screening now; booking, payment, chat and reviews once they call
 * `NotificationsService.notify()`), so this file only reads them and marks them as
 * read.
 */

import { api, type CursorPage } from "@/lib/api/client";

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
  /** Thai text, written by the feature that sent it. */
  readonly title: string;
  readonly content: string | null;
  /**
   * The id of the record it is about; `type` tells what kind (see
   * `notificationHref`).
   */
  readonly resourceId: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
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

/** `PATCH /notifications/:id/read`: returns 404 for someone else's notification. */
export function markNotificationRead(
  notificationId: string,
  signal?: AbortSignal,
): Promise<ApiNotification> {
  return api.patch(`notifications/${notificationId}/read`, { signal });
}

/** `PATCH /notifications/read-all`: returns how many were changed. */
export function markAllNotificationsRead(
  signal?: AbortSignal,
): Promise<{ readonly count: number }> {
  return api.patch("notifications/read-all", { signal });
}

/* ------------------------------------------------------------------ routing */

/**
 * Where tapping a notification goes: the record itself if it has one, otherwise its
 * list. A screening decision opens the outcome page, which redirects to the
 * request's real status.
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
      // POLICY_WARNING: open the user's profile.
      return "/profile";
  }
}

/* --------------------------------------------------------------------- dates */

/**
 * The local calendar day, so "วันนี้" means today for the user, not today in UTC.
 */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Groups a newest-first list by local day, keeping the order. */
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
