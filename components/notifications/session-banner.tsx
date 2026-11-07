"use client";

import { Video } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useBookingMeeting } from "@/components/bookings/use-booking-meeting";
import {
  getUpcomingSession,
  type ApiUpcomingSession,
} from "@/components/notifications/notifications-data";
import { isApiConfigured } from "@/lib/api/client";
import { useSession } from "@/lib/session";

/** How often a signed-in app asks whether a session is about to start. */
const CHECK_MS = 60_000;

/** How often the countdown in the title moves on. */
const TICK_MS = 15_000;

/** The banner shows from this many minutes before the start, as Figma words it. */
const SHOW_MINUTES_BEFORE = 5;

/**
 * Figma "In-app banner (Light)" (1962:32859): a light strip under the top bar —
 * "เซสชันเริ่มใน 5 นาที", who it is with and when, and "เข้าร่วม", which opens
 * the session's video call. Phones only: on desktop the browser shows its own
 * notifications.
 *
 * It asks the API for the user's next session (`/notifications/upcoming-session`)
 * when the page opens, every minute while the tab is visible, and when the tab
 * comes back, and shows from 5 minutes before the start until the session ends.
 */
export function SessionBanner() {
  const signedIn = useSession().status === "authenticated";
  return isApiConfigured && signedIn ? <UpcomingSessionWatcher /> : null;
}

function UpcomingSessionWatcher() {
  const [session, setSession] = useState<ApiUpcomingSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let controller: AbortController | null = null;
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      try {
        setSession(await getUpcomingSession(controller.signal));
      } catch {
        // Offline, or the request was replaced: keep what is on screen; the next check tries again.
      }
    };
    const onVisible = () => void check();
    void check();
    const checkTimer = setInterval(() => void check(), CHECK_MS);
    const tickTimer = setInterval(() => setNow(Date.now()), TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller?.abort();
      clearInterval(checkTimer);
      clearInterval(tickTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!session) return null;
  const start = Date.parse(session.startTime);
  const minutesLeft = Math.ceil((start - now) / 60_000);
  const visible = now < Date.parse(session.endTime) && minutesLeft <= SHOW_MINUTES_BEFORE;
  return visible ? <Banner minutesLeft={minutesLeft} now={now} session={session} /> : null;
}

function Banner({
  session,
  minutesLeft,
  now,
}: {
  readonly session: ApiUpcomingSession;
  readonly minutesLeft: number;
  readonly now: number;
}) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const call = useBookingMeeting(
    {
      id: session.bookingId,
      state: session.state,
      startTime: session.startTime,
      endTime: session.endTime,
    },
    now,
  );
  const time = format.dateTime(new Date(session.startTime), { hour: "2-digit", minute: "2-digit" });

  return (
    <div aria-live="polite" className="fixed inset-x-0 top-20 z-40 mx-auto w-full max-w-md px-4 lg:hidden" role="status">
      <div className="flex items-center gap-3 rounded-card bg-accent-surface px-4 py-3 shadow-card">
        <Video aria-hidden className="size-5 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-semibold text-foreground">
            {minutesLeft > 0
              ? t("sessionBannerTitleIn", { minutes: minutesLeft })
              : t("sessionBannerTitleStarted")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("sessionBannerBodyLive", { name: session.counterpartName, time })}
          </p>
          {call.problem ? <p className="text-xs text-destructive">{call.problem}</p> : null}
        </div>
        <button
          className="shrink-0 text-sm font-semibold text-primary disabled:opacity-50"
          disabled={!call.open || call.joining}
          onClick={() => void call.join()}
          type="button"
        >
          {t("sessionBannerAction")}
        </button>
      </div>
    </div>
  );
}
