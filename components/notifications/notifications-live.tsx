"use client";

import {
  BadgeCheck,
  Bell,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useMountTime } from "@/components/bookings/booking-flow";
import { useElapsedLabel } from "@/components/mobile/live-state";
import {
  CATEGORY_ORDER,
  DayGroup,
  EmptyFeed,
  FeedFilters,
  FeedSkeleton,
  FilteredEmpty,
  NotificationCenterFrame,
  NotificationCenterScreen,
  NotificationRow,
  type FeedFilter,
} from "@/components/notifications/notification-center-screen";
import { DeviceAlertsCard, DeviceAlertsCardSkeleton } from "@/components/notifications/device-alerts-card";
import {
  loadMoreFeed,
  readAllNotifications,
  readNotification,
  retryFeed,
  useNotificationFeed,
  useNotificationPulse,
} from "@/components/notifications/notification-store";
import {
  groupByRecency,
  notificationCategory,
  notificationTarget,
  rememberNotification,
  type ApiNotification,
  type NotificationType,
  type Recency,
} from "@/components/notifications/notifications-data";
import { ApiErrorCard } from "@/components/service/parts";
import { isApiConfigured } from "@/lib/api/client";
import { useSession } from "@/lib/session";

/**
 * The line icon for each notification type. The API's record names no person
 * and carries no photo, so a live row always shows its kind's icon.
 */
const ICON: Record<NotificationType, LucideIcon> = {
  BOOKING_CONFIRMED: CalendarDays,
  BOOKING_RECEIVED: CalendarDays,
  SESSION_REMINDER: CalendarClock,
  PAYMENT_SUCCEEDED: CreditCard,
  PAYOUT_SENT: CreditCard,
  NEW_MESSAGE: MessageSquare,
  SCREENING_REQUESTED: FileText,
  SCREENING_DECIDED: FileText,
  REVIEW_RECEIVED: Star,
  VERIFICATION_DECIDED: BadgeCheck,
  POLICY_WARNING: ShieldAlert,
  WELCOME: Sparkles,
};

/**
 * A type's mark, else the bell: the API can learn a type before this app does
 * (the welcome did), and an unknown one must show as a notification, not take
 * the whole feed down with it.
 */
const iconFor = (type: NotificationType): LucideIcon => ICON[type] ?? Bell;

const RECENCY_LABEL = { today: "today", yesterday: "yesterday", earlier: "earlier" } as const satisfies Record<
  Recency,
  string
>;

/**
 * `/notifications`: uses the API whenever the build has one. Without an API it
 * shows the sample screen from the `/screens` index.
 */
export function NotificationsRoute() {
  return isApiConfigured ? <LiveNotificationCenter /> : <NotificationCenterScreen />;
}

/**
 * The signed-in user's notifications, newest first, grouped into today,
 * yesterday and earlier, and filtered on this page by state or kind. More
 * load as the user scrolls down. Tapping a row marks it read and opens what it
 * is about. The list comes from the shared store (`notification-store.ts`), so
 * changes show without a reload.
 */
function LiveNotificationCenter() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const session = useSession();
  const signedIn = session.status === "authenticated";
  const advisor = signedIn && session.account.role === "advisor";
  const now = useMountTime();
  const elapsed = useElapsedLabel(now);
  const feed = useNotificationFeed();
  // The server's own count: it also covers unread rows on pages not loaded yet.
  const pulse = useNotificationPulse(signedIn);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const hasMore = feed.status === "ready" && feed.nextCursor !== null;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMoreFeed();
      },
      // The page scrolls inside `ScreenBody`, not the window.
      { root: node.closest('[data-slot="screen-body"]'), rootMargin: "0px 0px 240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  // Today's rows say how long ago; yesterday's the time of day; earlier ones
  // the date, since their heading does not name the day.
  const when = (recency: Recency, iso: string) => {
    if (recency === "today") return elapsed(iso);
    const date = new Date(iso);
    return recency === "yesterday"
      ? format.dateTime(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      : format.dateTime(date, { day: "numeric", month: "short" });
  };
  const matches = (item: ApiNotification) => {
    if (filter === "all") return true;
    return notificationCategory(item.type) === filter;
  };

  let body;
  let unread: number | null = null;
  let filters = null;
  if (feed.status === "loading") {
    body = <FeedSkeleton />;
  } else if (feed.status === "failed") {
    // The API's own sentence: it tells "signed out" apart from "the server is
    // down". The card is drawn at phone sizes; from `lg` it takes the frame's
    // type steps, since the column is zoomed down from 1710 there.
    body = (
      <ApiErrorCard
        className="lg:gap-4 lg:p-7 lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-5 lg:[&_[data-slot=button]]:text-frame-meta lg:[&_p]:text-frame-meta lg:[&_p:first-child]:text-frame-figure"
        error={feed.error}
        onRetry={retryFeed}
        title={t("loadFailed")}
      />
    );
  } else if (feed.items.length === 0) {
    body = <EmptyFeed />;
  } else {
    const loadedUnread = feed.items.filter((item) => !item.isRead).length;
    unread = Math.max(pulse.unread ?? 0, loadedUnread);
    const kinds = CATEGORY_ORDER.filter((kind) =>
      feed.items.some((item) => notificationCategory(item.type) === kind),
    );
    filters = <FeedFilters kinds={kinds} onChange={setFilter} value={filter} />;
    const visible = feed.items.filter(matches);
    body = (
      <>
        {/* What the filter left, for a reader who cannot see the list change. */}
        <p aria-live="polite" className="sr-only">
          {t("showing", { count: visible.length })}
        </p>
        {visible.length === 0 ? (
          <FilteredEmpty onShowAll={() => setFilter("all")} />
        ) : (
          // A hairline between the stretches of the feed, none between rows.
          <div className="flex flex-col divide-y divide-border">
            {groupByRecency(visible, now).map((group) => (
              <DayGroup key={group.recency} label={t(RECENCY_LABEL[group.recency])}>
                {group.items.map((item) => (
                  <NotificationRow
                    body={item.content}
                    href={notificationTarget(item)}
                    icon={iconFor(item.type)}
                    key={item.id}
                    onClick={() => {
                      rememberNotification(item);
                      if (!item.isRead) void readNotification(item.id);
                    }}
                    time={when(group.recency, item.createdAt)}
                    title={item.title}
                    unread={!item.isRead}
                  />
                ))}
              </DayGroup>
            ))}
          </div>
        )}
        {feed.loadingMore ? (
          <div aria-busy className="flex items-center gap-4 py-4 lg:gap-5 lg:py-6">
            <span className="sr-only">{t("loading")}</span>
            <span aria-hidden className="size-5 shrink-0 animate-pulse rounded bg-muted motion-reduce:animate-none lg:size-6" />
            <span aria-hidden className="h-4 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ) : null}
        {hasMore ? <div aria-hidden className="h-px w-full shrink-0" ref={sentinel} /> : null}
      </>
    );
  }

  // Held (disabled) while the list loads so the heading does not shift when it
  // lands; gone when there is nothing to mark, empty or failed.
  const offerMarkAll = feed.status === "loading" || (feed.status === "ready" && feed.items.length > 0);
  // An empty feed is the page's one box, the full width and height of the
  // column: the device-alerts card stands beside a feed, not beside nothing.
  // While the feed loads it is the card's skeleton, nothing yet to press.
  const empty = feed.status === "ready" && feed.items.length === 0;
  let aside = null;
  if (feed.status === "loading") aside = <DeviceAlertsCardSkeleton />;
  else if (!empty) aside = <DeviceAlertsCard />;

  return (
    <NotificationCenterFrame
      advisor={advisor}
      aside={aside}
      fill={empty}
      filters={filters}
      onMarkAllRead={offerMarkAll ? () => void readAllNotifications() : undefined}
      unread={unread}
    >
      {body}
    </NotificationCenterFrame>
  );
}
