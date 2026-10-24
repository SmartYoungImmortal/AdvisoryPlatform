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
 * Where tapping a notification goes, only when there is something to do
 * next: a message to answer (its room; `resourceId` is the chat room), a
 * session to get ready for, a request to decide, a new booking to see on the
 * calendar. Null for the ones that only inform (a confirmed booking, a
 * payment, a payout, a review, a decision, a warning): opening a whole list
 * for them added nothing, so they open their own page (`notificationTarget`).
 */
export function notificationHref(notification: ApiNotification): string | null {
  const id = notification.resourceId;
  switch (notification.type) {
    case "NEW_MESSAGE":
      return id ? `/chat/room?id=${id}` : "/chat";
    case "SESSION_REMINDER":
      return "/bookings";
    case "SCREENING_REQUESTED":
      return id ? `/screening/review?requestId=${id}` : "/screening/requests";
    case "BOOKING_RECEIVED":
      return "/work/calendar";
    default:
      return null;
  }
}

/**
 * Where a notification opens: what `notificationHref` names, otherwise its own
 * page (`/notifications/view`), the title and the whole message, for the ones
 * that only inform and may run longer than the row shows.
 */
export function notificationTarget(notification: ApiNotification): string {
  return notificationHref(notification) ?? `/notifications/view?id=${notification.id}`;
}

/**
 * The notifications opened this visit, by id, so their page shows at once
 * (and for one that came in on a later page of the feed) instead of waiting
 * for the first page to load again. The API has no single-notification read.
 */
const opened = new Map<string, ApiNotification>();

export function rememberNotification(notification: ApiNotification): void {
  opened.set(notification.id, notification);
}

export function rememberedNotification(id: string): ApiNotification | null {
  return opened.get(id) ?? null;
}

/* --------------------------------------------------------------------- dates */

/**
 * The local calendar day, so "วันนี้" means today for the user, not today in UTC.
 */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** How far back a notification is, in the reader's own calendar. */
export type Recency = "today" | "yesterday" | "earlier";

/** Today, yesterday or earlier than that, for a notification made at `iso`. */
export function recencyOf(iso: string, now: number): Recency {
  const day = dayKey(new Date(iso));
  if (day === dayKey(new Date(now))) return "today";
  if (day === dayKey(new Date(now - 24 * 60 * 60 * 1000))) return "yesterday";
  return "earlier";
}

/** Groups a newest-first list into today, yesterday and earlier, keeping the order. */
export function groupByRecency(
  items: readonly ApiNotification[],
  now: number,
): readonly { readonly recency: Recency; readonly items: ApiNotification[] }[] {
  const groups: { recency: Recency; items: ApiNotification[] }[] = [];
  for (const item of items) {
    const recency = recencyOf(item.createdAt, now);
    const last = groups.at(-1);
    if (last?.recency === recency) last.items.push(item);
    else groups.push({ recency, items: [item] });
  }
  return groups;
}

/* ---------------------------------------------------------------- filtering */

/** What the feed's filter pills sort a notification under; the other types are under "all" only. */
export type NotificationCategory = "booking" | "message" | "payment";

const CATEGORY: Partial<Record<NotificationType, NotificationCategory>> = {
  BOOKING_CONFIRMED: "booking",
  BOOKING_RECEIVED: "booking",
  SESSION_REMINDER: "booking",
  NEW_MESSAGE: "message",
  PAYMENT_SUCCEEDED: "payment",
  PAYOUT_SENT: "payment",
};

export function notificationCategory(type: NotificationType): NotificationCategory | null {
  return CATEGORY[type] ?? null;
}
