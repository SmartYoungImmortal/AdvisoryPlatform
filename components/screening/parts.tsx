import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Figma card wrapper — surface, 14px radius, hairline-separated rows. */
export function Card({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start overflow-clip rounded-[14px] bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardDivider() {
  return <div className="h-px w-full shrink-0 bg-muted" />;
}

/**
 * Figma 64px card row — 16px glyph, a title/body stack, and an optional trailing
 * slot (chevron, relative time, unread dot).
 */
export function StackRow({
  icon: Icon,
  title,
  body,
  trailing,
  centerIcon = false,
  href,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly trailing?: ReactNode;
  readonly centerIcon?: boolean;
  readonly href?: string;
}) {
  const rowClass = "flex h-16 w-full shrink-0 items-start gap-3 overflow-clip p-[14px]";
  const content = (
    <>
      <Icon
        className={cn("size-4 shrink-0 text-muted-foreground", centerIcon && "mt-[10px]")}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-[2px] overflow-clip">
        <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-foreground">
          {title}
        </p>
        <p className="font-thai w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );

  return href ? (
    <Link className={rowClass} href={href}>
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
    <div className="mt-[10px] flex items-center gap-2">
      <span className="font-thai text-[12px] leading-[18px] font-normal whitespace-nowrap text-muted-foreground">
        {time}
      </span>
      {unread ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : null}
    </div>
  );
}

/** Figma hero — a round badge above a 28/40 title and 14/20 muted subtitle. */
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
    <div className="flex w-full shrink-0 flex-col items-center px-6 pt-14">
      <span
        className={cn(
          "flex size-[88px] shrink-0 items-center justify-center rounded-full bg-muted",
          badgeClassName,
        )}
      >
        <Icon className={cn("size-10 text-muted-foreground", iconClassName)} />
      </span>
      <p className="font-thai mt-[20px] w-full text-center text-[28px] leading-[40px] font-semibold text-foreground">
        {title}
      </p>
      <p className="font-thai mt-2 w-full text-center text-[14px] leading-[20px] font-normal text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

/** Figma detail row — 16px glyph, label, right-aligned value. */
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
    <div className="flex h-5 w-full shrink-0 items-center gap-[10px]">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-thai min-w-px flex-1 text-[14px] leading-[20px] font-normal text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-thai shrink-0 text-[14px] leading-[20px] font-medium whitespace-nowrap text-foreground",
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
      <Icon className="size-[14px] shrink-0 text-muted-foreground" />
      <p className="font-thai min-w-px flex-1 text-[12px] leading-[18px] font-normal text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
