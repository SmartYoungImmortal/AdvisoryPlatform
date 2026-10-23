import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SurfaceList } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";

/**
 * Figma card wrapper — one card with its rows stacked flush.
 *
 * It is `SurfaceList`, so the 12px radius, the hairline, the resting elevation
 * and the rules between the rows all come from the one card component. Before
 * this it was a borderless white box on a near-white page with a hand-placed
 * `CardDivider` between every pair of rows.
 */
export function Card({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <SurfaceList className={className}>{children}</SurfaceList>;
}

/**
 * Figma 64px card row — 16px glyph, a title/body stack, and an optional trailing
 * slot (chevron, relative time, unread dot).
 *
 * The glyph sits in a chip, the title stops sharing its weight with the muted
 * line under it, and a row that leads somewhere says so under the pointer. The
 * fixed 64px goes: three of these rows carry a full answer to a screening
 * question, and at 402px that answer was clipped.
 */
export function StackRow({
  icon: Icon,
  iconClassName,
  title,
  body,
  trailing,
  href,
}: {
  readonly icon: LucideIcon;
  /** The chip's tint, where the row's kind has a colour. */
  readonly iconClassName?: string;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly trailing?: ReactNode;
  readonly href?: string;
}) {
  const rowClass = "flex min-h-16 w-full shrink-0 items-center gap-3 p-3.5";
  const content = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          iconClassName,
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5">
        <p className="w-full text-sm font-semibold text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );

  return href ? (
    <Link
      className={cn(
        rowClass,
        "transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
      )}
      href={href}
    >
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}

/** Figma "Meta" cluster — relative time plus an optional 8px unread dot. */
export function TimeMeta({
  time,
  unread = false,
}: {
  readonly time: string;
  readonly unread?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-latin text-xs font-normal tabular-nums whitespace-nowrap text-muted-foreground">
        {time}
      </span>
      {unread ? (
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
      ) : null}
    </div>
  );
}

/**
 * Figma hero — a round badge above a 28/40 title and 14/20 muted subtitle.
 *
 * The title and the badge step up once there is room: on a 1200 column the phone
 * frame's 28/40 is the same size as a card heading two blocks below it, which is
 * why these outcome pages read flat — the call `ScreenHeading` already made.
 */
export function StatusHero({
  icon: Icon,
  title,
  subtitle,
  badgeClassName,
  iconClassName,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly subtitle: ReactNode;
  readonly badgeClassName?: string;
  readonly iconClassName?: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center px-6 pt-14 lg:pt-12">
      <span
        className={cn(
          "flex size-22 shrink-0 items-center justify-center rounded-full bg-muted lg:size-26",
          badgeClassName,
        )}
      >
        <Icon className={cn("size-10 text-muted-foreground lg:size-11", iconClassName)} />
      </span>
      <p className="mt-5 w-full text-center text-heading font-semibold text-foreground lg:text-heading-lg">
        {title}
      </p>
      <p className="mt-2 w-full text-center text-sm font-normal text-muted-foreground lg:text-lg">
        {subtitle}
      </p>
    </div>
  );
}

/**
 * Figma detail row — 16px glyph, label, right-aligned value.
 *
 * The fixed 20px height goes: the value slot now takes a `StatusPill` on the
 * screening outcomes, and a pill is 26px tall. `tabular-nums` is on the base
 * because most values here are a time, an amount or an id.
 */
export function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  readonly icon: LucideIcon;
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly valueClassName?: string;
}) {
  return (
    <div className="flex min-h-5 w-full shrink-0 items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center justify-end text-sm font-medium tabular-nums whitespace-nowrap text-foreground",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Figma "Rights Note" — a 14px glyph beside a 12/18 muted line. */
export function FootNote({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2 px-6 pt-4">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
