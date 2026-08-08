import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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
      <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-[14px] bg-card px-[14px] py-3 ring-1 ring-destructive ring-inset">
        <Icon className="size-[18px] shrink-0 text-destructive" />
        <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
          <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
            {title}
          </p>
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
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
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip rounded-[14px] bg-card py-3 pr-[14px] pl-3">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-clip rounded-[100px] bg-[#ecfccb]">
          <Icon className="size-5 text-foreground" />
        </span>
        <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
          <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
            {title}
          </p>
          <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
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
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start overflow-clip rounded-[14px] bg-card p-[14px]",
        gap,
        className,
      )}
    >
      <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
        {caption}
      </p>
      {children}
    </div>
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
      <Icon className={cn("size-[14px] shrink-0 text-muted-foreground", iconClassName)} />
      <p className="font-thai min-w-px flex-1 text-[14px] leading-[20px] font-normal text-foreground">
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
    <div className="flex w-full shrink-0 items-start gap-[10px] overflow-clip">
      <Icon className={cn("size-4 shrink-0 text-muted-foreground", iconClassName)} />
      <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
        <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-foreground">
          {title}
        </p>
        <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
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
      <span className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-[28px] bg-muted">
        <Icon className="size-[26px] text-destructive" />
      </span>
      <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip">
        <h1 className="font-thai w-full text-[28px] leading-[40px] font-semibold text-foreground">
          {title}
        </h1>
        <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
