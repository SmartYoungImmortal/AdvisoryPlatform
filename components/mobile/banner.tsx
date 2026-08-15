import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Metrics every banner shares: Figma's 14px radius, 14/12 padding and 12px gap. */
const bannerShell = "gap-y-0.5 rounded-xl px-3.5 py-3 shadow-none has-[>svg]:gap-x-3";

/**
 * Figma "Alert Banner" — surface card with a 14px radius, a destructive hairline,
 * 14/12 padding, a 12px gap, an 18px destructive glyph, a 14/20 medium title and a
 * 12/18 muted body. The hairline is an inset ring: Figma strokes frames inside, so
 * a real border would add 2px to the banner height.
 */
export function AlertBanner({
  icon: Icon,
  title,
  body,
  className,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start px-6 pt-2", className)}>
      {/* The hairline is an inset ring rather than a border: Figma strokes frames
          inside, so a real border would add 2px to the banner height. */}
      <Alert
        className={cn(bannerShell, "border-0 ring-1 ring-destructive ring-inset")}
        variant="destructive"
      >
        <Icon className="size-4.5" />
        <AlertTitle className="text-foreground">{title}</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">{body}</AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Figma "Success Banner" — surface card with a 36px lime badge (success-surface
 * #ecfccb) holding a 20px check, then the same title/body stack.
 */
export function SuccessBanner({
  icon: Icon,
  title,
  body,
  className,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full shrink-0 flex-col items-start px-6 pt-1", className)}>
      {/* Figma's 36px lime badge is the glyph's own box — padding on the svg gives
          the 20px icon inside the circle without an extra wrapper element. */}
      <Alert className={cn(bannerShell, "items-center border-0 pl-3 *:[svg]:translate-y-0")}>
        <Icon className="size-9 rounded-full bg-success-surface p-2 text-foreground" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="text-xs">{body}</AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Figma "Requirements Card" / "Loss Card" — surface card, 14px radius and padding,
 * a 12/18 muted caption then icon + 14/20 rows.
 */
export function InfoCard({
  caption,
  children,
  gap = "gap-2",
  className,
}: {
  readonly caption: ReactNode;
  readonly children: ReactNode;
  readonly gap?: string;
  readonly className?: string;
}) {
  return (
    <Card
      className={cn(
        "w-full shrink-0 items-start p-3.5 shadow-none ring-0 [--card-spacing:0]",
        gap,
        className,
      )}
    >
      <p className="w-full text-xs font-normal text-muted-foreground">
        {caption}
      </p>
      {children}
    </Card>
  );
}

/** A single icon + label row inside {@link InfoCard}. */
export function InfoRow({
  icon: Icon,
  iconClassName,
  children,
  align = "items-center",
}: {
  readonly icon: LucideIcon;
  readonly iconClassName?: string;
  readonly children: ReactNode;
  readonly align?: string;
}) {
  return (
    <div className={cn("flex w-full shrink-0 gap-2 overflow-clip", align)}>
      <Icon className={cn("size-3.5 shrink-0 text-muted-foreground", iconClassName)} />
      <p className="min-w-px flex-1 text-sm font-normal text-foreground">
        {children}
      </p>
    </div>
  );
}

/** Two-line variant used by the blocked delete-account screen. */
export function InfoStackRow({
  icon: Icon,
  iconClassName,
  title,
  body,
}: {
  readonly icon: LucideIcon;
  readonly iconClassName?: string;
  readonly title: ReactNode;
  readonly body: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2.5 overflow-clip">
      <Icon className={cn("size-4 shrink-0 text-muted-foreground", iconClassName)} />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-normal text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

/**
 * Figma "Warning Hero" — 56px surface-muted circle with a 26px destructive glyph,
 * then the 28/40 title and 14/20 muted subtitle.
 */
export function WarningHero({
  icon: Icon,
  title,
  subtitle,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly subtitle: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-4 px-6 pt-4">
      <span className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-muted">
        <Icon className="size-6.5 text-destructive" />
      </span>
      <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
        <h1 className="w-full text-heading font-semibold text-foreground">
          {title}
        </h1>
        <p className="w-full text-sm font-normal text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
