"use client";

import type { ReactNode } from "react";

import type { RailKey } from "@/components/account/app-frame";
import { WorkFrame } from "@/components/work/work-frame";
import type { WorkTab } from "@/lib/work";

/** The desk's place a page opened from, read off where its chevron goes back to. */
function placeOf(backHref: string): WorkTab | null {
  if (backHref.startsWith("/advisor/services")) return "services";
  if (backHref.startsWith("/availability")) return "availability";
  if (backHref.startsWith("/screening")) return "requests";
  if (backHref.startsWith("/work/earnings") || backHref.startsWith("/earnings")) return "earnings";
  if (backHref.startsWith("/work/calendar")) return "calendar";
  if (backHref.startsWith("/work")) return "today";
  return null;
}

/**
 * A page one of the desk's places opens — a session, a service's schedule, a
 * set of hours, the payout account — in the desk's frame (`WorkFrame`): the
 * menu stays at the left with the place it came from marked, and the page
 * has the chevron back to it at every width, its title, a line under it,
 * and its one action at the right. The advisor page's facts belong to the
 * profile (`rail="profile"`) and have no desk menu.
 */
export function DeskPage({
  title,
  subtitle,
  action,
  backHref = "/work",
  rail = "work",
  children,
}: {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly action?: ReactNode;
  readonly backHref?: string;
  /** The rail's place this page belongs to: the desk's, or the profile's for the advisor page's facts. */
  readonly rail?: RailKey;
  readonly children: ReactNode;
}) {
  return (
    <WorkFrame action={action} backHref={backHref} place={rail === "work" ? placeOf(backHref) : null} rail={rail} subtitle={subtitle} title={title}>
      {children}
    </WorkFrame>
  );
}

/** The capsule a desk page's action wears: solid ink, at the frame's step from `lg`. */
export const DESK_PILL =
  "h-10 w-auto shrink-0 px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

/** A hairline box, the approved pages' one container. */
export const DESK_BOX = "rounded-2xl border border-border bg-card";

/** A row in a desk list: the transactions row's measure, with its hover. */
export const DESK_ROW =
  "-mx-3 flex items-start gap-3 rounded-card px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:-mx-4 lg:gap-5 lg:px-4 lg:py-3.5";

/** The soft circle a row's glyph sits in. */
export const DESK_GLYPH =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground lg:size-12";
