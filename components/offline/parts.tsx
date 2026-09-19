import { Clock, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/screening/parts";
import { cn } from "@/lib/utils";

/**
 * The pieces the six "Offline & connectivity" frames (1952:35955) build out of.
 *
 * Figma draws no desktop frame for this section, so the rule the drawn desktop
 * frames set elsewhere in the file stands in: the canvas opens up
 * (`MobileScreen wide`) and the content holds a readable column rather than a
 * 448px strip. 800px is the column the desktop notification centre
 * (1952:35428) settles its whole page on, and these screens are the same shape
 * — a heading over captioned cards — so they take the same one.
 */
export const OFFLINE_COLUMN = "lg:mx-auto lg:w-full lg:max-w-200";

/**
 * Figma "Divider" — the hairline between card rows. The borderless list on the
 * sync-queue frame separates rows at the muted step; the bordered cards on the
 * other frames match their own hairline, hence the override rather than two
 * components.
 */
export function OfflineDivider({ className }: { readonly className?: string }) {
  return <div className={cn("h-px w-full shrink-0 bg-muted", className)} />;
}

/** Figma section caption — the 12/18 muted line 8px above a card. */
export function SectionCaption({ children }: { readonly children: ReactNode }) {
  return (
    <p className="w-full text-xs font-normal text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Figma "Available Offline" (1952:36011), "Held Booking" (1952:36256),
 * "Bookings" (1952:36306) — one caption over one card, 8px apart. The same
 * block on four of the six frames.
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
      <Card className={cardClassName}>{children}</Card>
    </div>
  );
}

/**
 * Figma "Connectivity Banner" — surface-muted on a bottom hairline, 16px side
 * padding, a 16px glyph, the 14/20 state line and a trailing control.
 *
 * This is the whole of "ออฟไลน์ - แถบแจ้งเตือน" (1952:36279) and of "กลับมา
 * ออนไลน์ - กำลังซิงก์" (1952:36128): neither frame draws a screen of its own.
 * Both draw the app's cached page with this strip laid over it, so the strip is
 * the component and the frames are two states of it — see `ConnectivityScreen`,
 * which shows it in place the way `/chat/session-banner` does for the in-app
 * banner.
 *
 * The strip is full-bleed and only its content is capped, so from `lg` the
 * surface still crosses the page while the line sits on the reading column.
 */
export function ConnectivityBanner({
  icon: Icon,
  message,
  trailing,
  className,
}: {
  readonly icon: LucideIcon;
  readonly message: ReactNode;
  readonly trailing?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("w-full shrink-0 border-b border-border bg-muted", className)}>
      <div
        className={cn(
          "flex w-full items-center gap-2 overflow-clip px-4 py-2.5 lg:px-0",
          OFFLINE_COLUMN,
        )}
      >
        <Icon className="size-4 shrink-0 text-foreground" />
        <p className="min-w-px flex-1 text-sm font-normal text-foreground">
          {message}
        </p>
        {trailing}
      </div>
    </div>
  );
}

/**
 * Figma "Offline Strip" (1952:36053) — the banner's quieter sibling, the one
 * that sits inside a chat rather than under the nav: card surface, no hairline,
 * a 14px glyph and a 12/18 muted line.
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
        "flex w-full shrink-0 items-center gap-2 overflow-clip bg-card px-4 py-2",
        className,
      )}
    >
      <WifiOff className="size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
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
  readonly iconClassName?: string;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-3 overflow-clip px-3.5 py-3">
      <Icon className={cn("size-4 shrink-0 text-muted-foreground", iconClassName)} />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
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

/** The static half of a queue row's trailing slot — 12/18 muted, no affordance. */
export function QueueStatus({ children }: { readonly children: ReactNode }) {
  return (
    <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">
      {children}
    </span>
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
      <p className="shrink-0 text-right text-xs font-normal whitespace-nowrap text-muted-foreground">
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
      <p className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-foreground">
        {value}
      </p>
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
      <div className="flex shrink-0 flex-col items-end gap-1 overflow-clip">
        {/* Figma "Bubble" is 260px wide with the stroke drawn inside, so the
            hairline is part of the box rather than added to it. */}
        <div className="flex w-[260px] shrink-0 items-start overflow-clip rounded-xl border border-dashed border-dimmed bg-background px-3.5 py-2.5">
          <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
            {text}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 overflow-clip">
          <Clock className="size-3 shrink-0 text-muted-foreground" />
          <p className="text-right text-xs font-normal whitespace-nowrap text-muted-foreground">
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
