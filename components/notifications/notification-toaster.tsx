"use client";

import { Bell, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  dismissFresh,
  useNotificationPulse,
} from "@/components/notifications/notification-store";
import {
  notificationTarget,
  rememberNotification,
} from "@/components/notifications/notifications-data";
import { ToastCard, ToastViewport, useCountdown } from "@/components/mobile/toast";
import { isApiConfigured } from "@/lib/api/client";
import { useSession } from "@/lib/session";

/** How long the toast stays on screen. */
const TOAST_MS = 6_000;

/**
 * What just arrived, in the app's one toast (`ToastCard`): a blue bubble
 * tile for a message (the dark bell for anything else), the notification's
 * title with "เมื่อสักครู่" beside it and its first line; the card itself
 * opens it, with no button of its own. It waits while it is read, closes
 * from its corner or with a push sideways, and shows the newest notification
 * found by the shared check on every page except the notification center.
 *
 * The in-app banner (the session reminder) is separate, mobile only, and waits
 * until the server can send reminders.
 */
export function NotificationToaster() {
  const c = useTranslations("common");
  const pathname = usePathname();
  const signedIn = useSession().status === "authenticated";
  const { fresh } = useNotificationPulse(isApiConfigured && signedIn);
  const [paused, setPaused] = useState(false);

  // A static host may serve the page with a trailing slash.
  // The feed, or one notification opened from it (`/notifications/view`).
  const onFeed = /^\/notifications(\/|$)/.test(pathname);
  const show = fresh !== null && !onFeed;

  useCountdown(show ? fresh.id : null, TOAST_MS, paused, dismissFresh);

  const message = fresh?.type === "NEW_MESSAGE";

  return (
    <ToastViewport>
      {show ? (
        <ToastCard
          countdownKey={fresh.id}
          detail={fresh.content ?? undefined}
          duration={TOAST_MS}
          href={notificationTarget(fresh)}
          icon={message ? MessageSquare : Bell}
          meta={c("justNow")}
          onClose={dismissFresh}
          onOpen={() => {
            rememberNotification(fresh);
            dismissFresh();
          }}
          onPause={setPaused}
          paused={paused}
          title={fresh.title}
          tone={message ? "message" : "notice"}
        />
      ) : null}
    </ToastViewport>
  );
}
