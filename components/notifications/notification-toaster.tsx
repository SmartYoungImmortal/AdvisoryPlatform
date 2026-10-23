"use client";

import { Bell, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import {
  dismissFresh,
  useNotificationPulse,
} from "@/components/notifications/notification-store";
import { notificationHref } from "@/components/notifications/notifications-data";
import { isApiConfigured } from "@/lib/api/client";
import { useSession } from "@/lib/session";

/** How long the toast stays on screen. */
const TOAST_MS = 6_000;

/**
 * Figma "In-app toast" (995:11035, desktop 1952:35853): a dark bar above the tab
 * bar with an icon, what arrived, and "ดูข้อความ" for a message. It shows the
 * newest notification found by the shared check, on every page except the
 * notification center.
 *
 * The in-app banner (the session reminder) is separate, mobile only, and waits
 * until the server can send reminders.
 */
export function NotificationToaster() {
  const t = useTranslations("notifications");
  const pathname = usePathname();
  const signedIn = useSession().status === "authenticated";
  const { fresh } = useNotificationPulse(isApiConfigured && signedIn);

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(dismissFresh, TOAST_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  // A static host may serve the page with a trailing slash.
  const onFeed = pathname.replace(/\/$/, "") === "/notifications";
  const show = fresh !== null && !onFeed;
  const Icon = fresh?.type === "NEW_MESSAGE" ? MessageSquare : Bell;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 lg:bottom-8"
      role="status"
    >
      {show ? (
        <Link
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card bg-foreground px-4 py-3 text-background shadow-card"
          href={notificationHref(fresh)}
          onClick={dismissFresh}
        >
          <Icon aria-hidden className="size-4.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm">{fresh.title}</span>
          {fresh.type === "NEW_MESSAGE" ? (
            <span className="shrink-0 text-sm font-semibold text-primary">
              {t("toastViewMessage")}
            </span>
          ) : null}
        </Link>
      ) : null}
    </div>
  );
}
