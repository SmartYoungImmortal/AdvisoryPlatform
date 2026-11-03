"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

import { useStanding } from "@/components/bookings/booking-sheet";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { cn } from "@/lib/utils";

/**
 * One session on the advisor's desk, shaped like a transaction or a
 * notification row: who in a soft circle, the service over the advisee, then
 * the time over where the booking stands at the right edge. It opens the
 * session (`/work/session`). Times are in the advisor's own zone.
 */
export function SessionRow({
  booking,
  now,
  timeZone,
}: {
  readonly booking: AdvisorBooking;
  readonly now: number;
  readonly timeZone: string;
}) {
  const locale = useLocale();
  const standing = useStanding()(booking, now);
  const clock = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  return (
    <li>
      <Link
        className="-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5"
        href={`/work/session?id=${booking.id}`}
      >
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground lg:size-12 lg:text-frame-body"
        >
          {booking.adviseeName.trim().slice(0, 1)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-body">{booking.serviceName}</span>
          <span className="truncate text-xs text-muted-foreground lg:text-frame-meta">{booking.adviseeName}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
          <span className="font-latin text-sm font-semibold whitespace-nowrap text-foreground tabular-nums lg:text-frame-meta">
            {clock.format(new Date(booking.startTime))}–{clock.format(new Date(booking.endTime))}
          </span>
          <span className={cn("text-xs whitespace-nowrap lg:text-frame-label", standing.ink)}>{standing.label}</span>
        </span>
      </Link>
    </li>
  );
}
