"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { AutoScrollRail } from "@/components/home/auto-scroll-rail";
import type { OpenDay } from "@/components/home/home-data";
import { FRAME, SectionTitle } from "@/components/home/section-parts";
import { ServiceCard } from "@/components/home/service-card";
import { CountUp, Rise } from "@/components/motion";
import type { LiveService } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/** Enough to fill the widest screen twice over and no more: the rail doubles them for its loop. */
const TICKETS = 10;

/** A rail card: the home page's one service card, laid on its side to run in a row. */
function Ticket({ item, clone = false }: { readonly item: LiveService; readonly clone?: boolean }) {
  return (
    <ServiceCard
      className="w-80 shrink-0 lg:w-120"
      clone={clone}
      item={item}
      photoClassName="w-28 lg:w-44"
      tilt={false}
      variant="wide"
    />
  );
}

/** Rail-card-shaped muted blocks while the day is being asked about. */
function TicketsSkeleton() {
  return (
    <div aria-hidden className="flex gap-3 overflow-hidden lg:gap-5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          className="flex h-36 w-80 shrink-0 overflow-hidden rounded-card border border-hero-card-border lg:h-44 lg:w-120"
          key={i}
        >
          <span className="w-28 shrink-0 animate-pulse bg-muted lg:w-44" />
          <span className="flex flex-1 flex-col justify-center gap-3 p-4 lg:p-6">
            <span className="h-5 w-4/5 animate-pulse rounded-md bg-muted" />
            <span className="h-5 w-1/3 animate-pulse rounded-md bg-muted" />
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Who can be booked today, as a strip that keeps moving: the one marquee on
 * the page, because the point it makes is how much is open, and a row that
 * keeps bringing more in says that better than a count alone. It holds still
 * under a pointer or a thumb (`AutoScrollRail`).
 *
 * When today has nothing (the seed's advisors keep weekdays) it shows the
 * first day of the week that does, under that day's name. With no open day
 * this week, or no answer from the API, it shows nothing.
 *
 * `compact` sets its heading a step under a chapter's title, for a strip that
 * answers part of a question rather than standing as a section of its own.
 */
export function OpenTodayStrip({
  items,
  open,
  loading,
  compact = false,
}: {
  /** The live catalogue, to look the open ids up in. */
  readonly items: readonly LiveService[];
  readonly open: OpenDay;
  readonly loading: boolean;
  readonly compact?: boolean;
}) {
  const t = useTranslations("home");
  const format = useFormatter();
  const listed = open.state === "open" ? items.filter((item) => open.ids.has(item.id)) : [];
  const tickets = listed.slice(0, TICKETS);
  const waiting = loading || open.state === "loading";
  if (!waiting && tickets.length === 0) return null;

  let title = t("openTodayTitle");
  if (open.state === "open" && open.offset === 1) title = t("openTomorrowTitle");
  else if (open.state === "open" && open.offset > 1) {
    title = t("openDayTitle", { day: format.dateTime(open.date, { weekday: "long" }) });
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-10">
      <Rise className={cn(FRAME, "flex flex-wrap items-end justify-between gap-x-6 gap-y-2")}>
        <div className="flex items-center gap-3 lg:gap-4">
          {/* A real flag, not decoration: there is time to book today. On
              another day's list there is nothing live to signal. */}
          {open.state === "open" && open.offset === 0 ? (
            <span aria-hidden className="relative flex size-2.5 lg:size-3">
              <span className="absolute inset-0 rounded-full bg-success/40 motion-safe:animate-ping" />
              <span className="relative size-full rounded-full bg-success" />
            </span>
          ) : null}
          {compact ? (
            <h3 className="font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-4xl lg:leading-tight">
              {title}
            </h3>
          ) : (
            <SectionTitle>{title}</SectionTitle>
          )}
        </div>
        {tickets.length > 0 ? (
          <div className="flex items-center gap-5 text-base text-muted-foreground lg:text-lg">
            <span>
              <CountUp className="font-latin font-semibold text-foreground" value={listed.length} />{" "}
              {t("openCount", { count: listed.length })}
            </span>
            <Link className="group/all flex h-11 items-center gap-1.5 font-medium text-foreground lg:h-12" href="/search">
              <span className="underline-offset-4 group-hover/all:underline">{t("seeAll")}</span>
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-300 group-hover/all:translate-x-1 motion-reduce:transition-none lg:size-5"
              />
            </Link>
          </div>
        ) : null}
      </Rise>
      {tickets.length > 0 ? (
        // No inset on the scroller: padding there would show at the seam
        // where the loop restarts. The edges fade instead.
        <AutoScrollRail
          className="py-3 mask-x-from-90% lg:mask-x-from-85%"
          clone={tickets.map((item) => (
            <Ticket clone item={item} key={item.id} />
          ))}
          gap="lg"
          label={title}
        >
          {tickets.map((item) => (
            <Ticket item={item} key={item.id} />
          ))}
        </AutoScrollRail>
      ) : (
        <TicketsSkeleton />
      )}
    </div>
  );
}
