"use client";

import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquare,
  ShieldAlert,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useMountTime } from "@/components/bookings/booking-flow";
import {
  LoadErrorNotice,
  LoadingBlock,
  loadErrorKind,
  useElapsedLabel,
} from "@/components/mobile/live-state";
import {
  DayGroup,
  EmptyFeed,
  NotificationCenterFrame,
  NotificationCenterScreen,
  NotificationRow,
  type NotificationKind,
} from "@/components/notifications/notification-center-screen";
import {
  loadMoreFeed,
  readAllNotifications,
  readNotification,
  retryFeed,
  useNotificationFeed,
} from "@/components/notifications/notification-store";
import {
  dayKey,
  groupByDay,
  notificationHref,
  type NotificationType,
} from "@/components/notifications/notifications-data";
import { isApiConfigured } from "@/lib/api/client";
import { READING_COLUMN } from "@/lib/layout";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** The icon and color for each notification type (colors come from `KINDS`). */
const LOOK: Record<NotificationType, { readonly icon: LucideIcon; readonly kind: NotificationKind }> = {
  BOOKING_CONFIRMED: { icon: CalendarDays, kind: "booking" },
  BOOKING_RECEIVED: { icon: CalendarDays, kind: "booking" },
  SESSION_REMINDER: { icon: CalendarClock, kind: "booking" },
  PAYMENT_SUCCEEDED: { icon: CreditCard, kind: "money" },
  PAYOUT_SENT: { icon: CreditCard, kind: "money" },
  NEW_MESSAGE: { icon: MessageSquare, kind: "message" },
  SCREENING_REQUESTED: { icon: FileText, kind: "request" },
  SCREENING_DECIDED: { icon: FileText, kind: "request" },
  REVIEW_RECEIVED: { icon: Star, kind: "review" },
  VERIFICATION_DECIDED: { icon: BadgeCheck, kind: "verified" },
  POLICY_WARNING: { icon: ShieldAlert, kind: "request" },
};

/**
 * `/notifications`: uses the API whenever the build has one. Without an API it
 * shows the sample screen from the `/screens` index.
 */
export function NotificationsRoute() {
  return isApiConfigured ? <LiveNotificationCenter /> : <NotificationCenterScreen />;
}

/**
 * The signed-in user's notifications, newest first, grouped by day. More load as
 * the user scrolls down. Tapping a row marks it read and opens what it is about.
 * The list comes from the shared store (`notification-store.ts`), so changes show
 * without a reload.
 */
function LiveNotificationCenter() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const session = useSession();
  const advisor = session.status === "authenticated" && session.account.role === "advisor";
  const now = useMountTime();
  const elapsed = useElapsedLabel(now);
  const feed = useNotificationFeed();

  const hasMore = feed.status === "ready" && feed.nextCursor !== null;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMoreFeed();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  const today = dayKey(new Date(now));
  const yesterday = dayKey(new Date(now - 24 * 60 * 60 * 1000));
  const dayLabel = (day: string, date: Date) => {
    if (day === today) return t("today");
    if (day === yesterday) return t("yesterday");
    return format.dateTime(date, { day: "numeric", month: "long" });
  };

  // The loading and error blocks have the phone's 24px side padding; on desktop
  // they sit in the same 800px column as the list.
  const column = cn("w-full shrink-0 lg:pt-2 lg:*:px-0", READING_COLUMN);

  let body;
  if (feed.status === "loading") {
    body = (
      <div className={column}>
        <LoadingBlock />
      </div>
    );
  } else if (feed.status === "failed") {
    body = (
      <div className={column}>
        <LoadErrorNotice kind={loadErrorKind(feed.error)} onRetry={retryFeed} />
      </div>
    );
  } else if (feed.items.length === 0) {
    body = <EmptyFeed />;
  } else {
    body = (
      <>
        {groupByDay(feed.items).map((group) => (
          <DayGroup key={group.day} label={dayLabel(group.day, group.date)}>
            {group.items.map((item) => (
              <NotificationRow
                body={item.content ?? ""}
                href={notificationHref(item)}
                icon={LOOK[item.type].icon}
                key={item.id}
                kind={LOOK[item.type].kind}
                onClick={item.isRead ? undefined : () => void readNotification(item.id)}
                time={elapsed(item.createdAt)}
                title={item.title}
                unread={!item.isRead}
              />
            ))}
          </DayGroup>
        ))}
        <div aria-hidden className="h-px w-full shrink-0" ref={sentinel} />
      </>
    );
  }

  return (
    <NotificationCenterFrame
      advisor={advisor}
      markAllDisabled={feed.status !== "ready" || feed.items.every((item) => item.isRead)}
      onMarkAllRead={() => void readAllNotifications()}
    >
      {body}
    </NotificationCenterFrame>
  );
}
