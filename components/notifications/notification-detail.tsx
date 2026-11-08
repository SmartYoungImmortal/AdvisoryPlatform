"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";

import { authPill } from "@/components/auth/auth-split";
import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import { Figures } from "@/components/figures";
import { loadErrorKind } from "@/components/mobile/live-state";
import {
  FEED_COLUMN,
  GUTTER,
  NotificationsShell,
} from "@/components/notifications/notification-center-screen";
import { readNotification, useNotificationFeed } from "@/components/notifications/notification-store";
import {
  getNotification,
  notificationAction,
  rememberedNotification,
  type ApiNotification,
} from "@/components/notifications/notifications-data";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/notifications/view?id=`: one notification on its own page — the title,
 * when, the whole message, then the way on as a capsule (the chat, the
 * booking, the receipt: `notificationAction`), so the reader reads it before
 * choosing to go. Every row of the feed opens it, having already marked it
 * read and remembered it (`rememberNotification`). A notification that is not
 * in memory or in the feed's first page (a reload, an older one, a shared
 * link) is read from the API, and opening it marks it read.
 */
export function NotificationDetailRoute() {
  const t = useTranslations("notifications");
  const c = useTranslations("common");
  const format = useFormatter();
  const id = asUuid(useQueryValue("id"));
  const feed = useNotificationFeed();
  const local =
    (id ? rememberedNotification(id) : null) ??
    (id && feed.status === "ready" ? (feed.items.find((n) => n.id === id) ?? null) : null);

  // Not in memory or in the feed's first page: ask the API for this one notification.
  const needed = id !== undefined && local === null && feed.status !== "loading";
  const fetched = useResource<ApiNotification | null>(
    needed ? `notifications/${id}` : "notifications/one:off",
    useCallback(
      (signal: AbortSignal) => (needed ? getNotification(id, signal) : Promise.resolve(null)),
      [needed, id],
    ),
  );
  const item = local ?? fetched.data ?? null;
  const failure = needed && fetched.error ? loadErrorKind(fetched.error) : null;
  const loading = !item && !failure && (feed.status === "loading" || (needed && fetched.loading));
  const action = item ? notificationAction(item) : null;

  // Opening a notification counts as reading it, as tapping its row in the feed does.
  const unreadId = item && !item.isRead ? item.id : null;
  useEffect(() => {
    if (unreadId) void readNotification(unreadId);
  }, [unreadId]);

  return (
    <NotificationsShell>
      <article className={cn("flex w-full flex-col pt-6 pb-12 lg:pt-0 lg:pb-0", FEED_COLUMN, GUTTER)}>
        <Button
          aria-label={c("back")}
          className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-[''] lg:-ml-2 lg:size-10"
          nativeButton={false}
          render={<Link href="/notifications" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft aria-hidden className="size-6 lg:size-7" />
        </Button>
        {item ? (
          <>
            <h1 className="mt-3 text-lg font-semibold text-foreground lg:mt-6 lg:text-frame-heading">{item.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground lg:mt-2 lg:text-frame-meta">
              <Figures>{format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" })}</Figures>
            </p>
            {item.content ? (
              <p className="mt-5 text-sm leading-relaxed whitespace-pre-line text-foreground lg:mt-8 lg:max-w-3xl lg:text-frame-body">
                {item.content}
              </p>
            ) : null}
            {action ? (
              <Button
                className={cn(
                  authPill(true),
                  "mt-6 h-10 w-auto self-start px-4 text-sm md:h-10 md:px-5 md:text-sm lg:mt-10 lg:h-12 lg:px-6 lg:text-frame-body",
                )}
                nativeButton={false}
                render={<Link href={action.href} />}
              >
                {t(action.label)}
              </Button>
            ) : null}
          </>
        ) : null}
        {!item && fetched.error && failure !== "notFound" ? (
          <ApiErrorCard className="mt-6" error={fetched.error} onRetry={fetched.reload} title={t("loadFailed")} />
        ) : null}
        {!item && !loading && (!failure || failure === "notFound") ? (
          <p className="mt-6 text-sm text-muted-foreground lg:text-frame-body">{t("detailMissing")}</p>
        ) : null}
        {loading ? (
          <div aria-busy className="mt-4 flex flex-col gap-3 lg:mt-6">
            <span className="h-5 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <span className="h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <span className="mt-3 h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ) : null}
      </article>
    </NotificationsShell>
  );
}
