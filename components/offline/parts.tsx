import { Clock, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/mobile/status-pill";
import { SurfaceList } from "@/components/mobile/surface";
import { READING_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * The pieces the six "Offline & connectivity" frames (1952:35955) build out of.
 *
 * Figma draws no desktop frame for this section, so the rule the drawn desktop
 * frames set elsewhere in the file stands in: the canvas opens up
 * (`MobileScreen wide`) and the content holds a readable column rather than a
 * 448px strip — `READING_COLUMN` in `lib/layout`, which is the 800px measure the
 * desktop notification centre (1952:35428) settles its whole page on. This file
 * used to spell that string out itself as `OFFLINE_COLUMN`.
 */

/** Figma section caption — the line above a card, and a real section head now. */
export function SectionCaption({ children }: { readonly children: ReactNode }) {
  return (
    <p className="w-full text-base font-semibold text-foreground lg:text-lg">
      {children}
    </p>
  );
}

/**
 * Figma "Available Offline" (1952:36011), "Held Booking" (1952:36256),
 * "Bookings" (1952:36306) — one caption over one card, 8px apart. The same
 * block on four of the six frames.
 *
 * The card is `SurfaceList`, so the hairline, the elevation *and* the rules
 * between the rows come with it: every caller used to pass its own
 * `border border-border` and hand-place an `OfflineDivider` between each pair.
 */
export function CaptionedCard({
  caption,
  children,
  cardClassName,
  className,
}: {
  readonly caption: ReactNode;
  readonly children: ReactNode;
  readonly cardClassName?: string;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start gap-2", className)}>
      <SectionCaption>{caption}</SectionCaption>
      <SurfaceList className={cardClassName}>{children}</SurfaceList>
    </div>
  );
}

/**
 * Figma "Connectivity Banner" — a strip on a bottom hairline, 16px side padding,
 * a 16px glyph, the 14/20 state line and a trailing control.
 *
 * This is the whole of "ออฟไลน์ - แถบแจ้งเตือน" (1952:36279) and of "กลับมา
 * ออนไลน์ - กำลังซิงก์" (1952:36128): neither frame draws a screen of its own.
 * Both draw the app's cached page with this strip laid over it, so the strip is
 * the component and the frames are two states of it — see `ConnectivityScreen`,
 * which shows it in place the way `/chat/session-banner` does for the in-app
 * banner.
 *
 * Both states were the same `bg-muted`, which is now the page's own well step, so
 * "you are offline" and "you are back" looked identical and neither looked like a
 * state. They take a tone: amber while the network is gone, the accent's
 * informational blue while it catches up. The word still carries it — the tone
 * only says so faster.
 *
 * The strip is full-bleed and only its content is capped, so from `lg` the
 * surface still crosses the page while the line sits on the reading column.
 */
const BANNER_TONES = {
  warning: { band: "bg-warning/15", glyph: "text-warning" },
  info: { band: "bg-info/10", glyph: "text-info" },
} as const;

export function ConnectivityBanner({
  icon: Icon,
  message,
  tone = "warning",
  trailing,
  className,
}: {
  readonly icon: LucideIcon;
  readonly message: ReactNode;
  readonly tone?: keyof typeof BANNER_TONES;
  readonly trailing?: ReactNode;
  readonly className?: string;
}) {
  const tones = BANNER_TONES[tone];

  return (
    <div
      className={cn("w-full shrink-0 border-b border-border", tones.band, className)}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2.5 overflow-clip px-4 py-2.5 lg:px-0",
          READING_COLUMN,
        )}
      >
        <Icon aria-hidden className={cn("size-4 shrink-0", tones.glyph)} />
        <p className="min-w-px flex-1 text-sm font-medium text-foreground">
          {message}
        </p>
        {trailing}
      </div>
    </div>
  );
}

/**
 * Figma "Offline Strip" (1952:36053) — the banner's quieter sibling, the one
 * that sits inside a chat rather than under the nav: a 14px glyph and a 12/18
 * line, directly above the compose row.
 *
 * It was `bg-card`, which is now exactly what the compose row under it is, so the
 * strip disappeared into the chrome. It takes the banner's amber, quietly.
 */
export function OfflineStrip({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-2 overflow-clip border-t border-border bg-warning/15 px-4 py-2",
        className,
      )}
    >
      <WifiOff aria-hidden className="size-3.5 shrink-0 text-warning" />
      <p className="min-w-px flex-1 text-xs font-medium text-foreground">
        {children}
      </p>
    </div>
  );
}

/**
 * Figma queue row (1952:36080) — a 16px status glyph, a 14/20 title over a
 * 12/18 muted line, and a trailing slot that is either the static "รอส่ง" or a
 * real retry control.
 */
export function QueuedItemRow({
  icon: Icon,
  iconClassName,
  title,
  body,
  trailing,
}: {
  readonly icon: LucideIcon;
  /** The chip's tint — what kind of wait this row is. */
  readonly iconClassName?: string;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip px-3.5 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          iconClassName,
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-semibold tabular-nums text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}

/**
 * Figma cached record row (1952:36309) — what the two banner frames show behind
 * the strip: a 14/20 name over a 12/18 muted line, with a relative time held
 * against the right edge. No glyph; the card's caption already names the kind.
 */
export function CachedRecordRow({
  title,
  body,
  time,
}: {
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly time: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip py-3">
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full truncate text-sm font-semibold text-foreground">
          {title}
        </p>
        <p className="w-full truncate text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      <p className="font-latin shrink-0 text-right text-xs font-normal tabular-nums whitespace-nowrap text-muted-foreground">
        {time}
      </p>
    </div>
  );
}

/**
 * Figma info-card row (1952:36014) — a 14/20 muted label, a flexible gap and a
 * 14/20 semibold value against the right edge. Figma spells the gap out as a
 * "Spacer" child; here it is the label's own `flex-1` neighbour.
 */
export function LabelValueRow({
  label,
  value,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip py-3">
      <p className="shrink-0 text-sm font-normal text-muted-foreground">
        {label}
      </p>
      <div className="min-w-px flex-1" />
      <div className="flex shrink-0 items-center justify-end text-right text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
        {value}
      </div>
    </div>
  );
}

/**
 * Figma "Queued Message" (1952:36047) — the chat's failed bubble with the alarm
 * taken out of it: the same 260px box and 14px radius, but a dashed hairline in
 * place of the destructive one, and a clock over a muted line rather than a
 * warning triangle. It is a message that has not gone yet, not one that broke.
 */
export function QueuedMessage({
  text,
  meta,
}: {
  readonly text: ReactNode;
  readonly meta: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start justify-end overflow-clip px-4">
      <div className="flex shrink-0 flex-col items-end gap-1.5 overflow-clip">
        {/* Figma "Bubble" is 260px wide with the stroke drawn inside, so the
            hairline is part of the box rather than added to it. The fill was
            `bg-background` — the thread's own ground, which left a dashed outline
            round nothing; on the card surface the bubble is an object that has
            not gone yet. It takes the same corners as a sent one. */}
        <div className="flex w-[260px] shrink-0 items-start overflow-clip rounded-tl-card rounded-tr-card rounded-bl-card border border-dashed border-accented bg-card px-3.5 py-2.5">
          <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
            {text}
          </p>
        </div>
        <StatusPill icon={Clock} tone="warning">
          {meta}
        </StatusPill>
      </div>
    </div>
  );
}
