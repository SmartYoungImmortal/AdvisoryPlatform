import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Root of a 402px-wide mobile frame: canvas background, vertical stack, and a
 * stacking context for the fixed tab bar / dialog scrims the design layers on top.
 */
export function MobileScreen({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        // No `flex-1` here: as a flex item it would take flex-basis 0 and grow past
        // the frame, so the tab bar / home indicator would slide off the viewport.
        "relative flex h-dvh w-full flex-col items-center overflow-hidden bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The region between the status bar and the tab bar / home indicator. Content that
 * outgrows the 874px frame scrolls here instead of pushing the chrome off-screen.
 */
export function ScreenBody({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Figma "Spacer" — the flexible gap that pushes the action block to the bottom. */
export function ScreenSpacer({ className }: { readonly className?: string }) {
  return <div className={cn("w-full min-h-px flex-1", className)} />;
}

/** Figma "Top Bar" — 402 x 44 with a 28px back chevron inset 16px from the left. */
export function ScreenTopBar({
  href,
  label = "ย้อนกลับ",
  className,
}: {
  readonly href?: string;
  readonly label?: string;
  readonly className?: string;
}) {
  const icon = <ChevronLeft className="size-7" />;
  const trigger =
    "relative flex size-7 shrink-0 items-center justify-center overflow-visible text-foreground before:absolute before:-inset-2 before:content-['']";

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center overflow-clip py-2 pl-4",
        className,
      )}
    >
      {href ? (
        <Link aria-label={label} className={trigger} href={href}>
          {icon}
        </Link>
      ) : (
        <button aria-label={label} className={trigger} type="button">
          {icon}
        </button>
      )}
    </div>
  );
}

/**
 * Figma "Heading" — 24px side padding, 28/40 Thai semibold title and an optional
 * 14/20 muted subtitle. Yields the 64px (title only) / 92px (with subtitle) blocks.
 */
export function ScreenHeading({
  title,
  subtitle,
  className,
}: {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start justify-center gap-2 overflow-clip px-6 pt-4 pb-2",
        className,
      )}
    >
      <h1 className="font-thai w-full text-[28px] leading-[40px] font-semibold text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="font-thai w-full text-[14px] leading-[20px] font-normal text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/** Figma "Actions" — bottom button stack, 24px side padding and a 12px gap. */
export function ScreenActions({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-center gap-3 overflow-clip px-6 pt-2 pb-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
