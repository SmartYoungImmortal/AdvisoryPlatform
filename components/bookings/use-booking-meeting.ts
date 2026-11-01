"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { openBookingMeeting } from "@/lib/api/resources";
import type { ApiBooking } from "@/lib/api/types";

/** Matches the API: booked calls open ten minutes early; in-progress calls remain open. */
export function bookingCallWindow(booking: ApiBooking, at: number) {
  if (booking.state === "IN_PROGRESS") return { open: true, opensAt: null };
  if (booking.state !== "BOOKED" || at >= Date.parse(booking.endTime))
    return { open: false, opensAt: null };
  const opens = Date.parse(booking.startTime) - 10 * 60_000;
  return at >= opens
    ? { open: true, opensAt: null }
    : { open: false, opensAt: new Date(opens) };
}

export function useBookingMeeting(booking: ApiBooking, from: number) {
  const t = useTranslations("bookings");
  const [tick, setTick] = useState(from);
  const [joining, setJoining] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  async function join() {
    if (joining) return;
    const tab = window.open("", "_blank");
    setJoining(true);
    setProblem(null);
    try {
      const { url } = await openBookingMeeting(booking.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.location.assign(url);
    } catch {
      tab?.close();
      setProblem(t("joinFailed"));
    } finally {
      setJoining(false);
    }
  }
  return {
    ...bookingCallWindow(booking, Math.max(tick, from)),
    join,
    joining,
    problem,
  };
}
