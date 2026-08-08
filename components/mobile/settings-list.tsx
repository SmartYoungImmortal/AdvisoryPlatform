import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Figma "Section" — 24px side padding, 20px top padding and an 8px gap between the
 * muted section label and its card.
 */
export function SettingsSection({
  label,
  children,
  className,
}: {
  readonly label?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 pt-5",
        className,
      )}
    >
      {label ? (
        <p className="font-thai w-full text-[14px] leading-[20px] font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Figma "Card" — surface, 14px radius, rows stacked with hairline dividers. */
export function SettingsCard({
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

/** Figma "Divider" — 1px of surface-muted between card rows. */
export function SettingsDivider() {
  return <div className="h-px w-full shrink-0 bg-muted" />;
}

/**
 * Figma settings row — 48px tall: 14px padding, 12px gaps, 16px leading glyph,
 * 14/20 medium label, optional trailing value and 16px chevron.
 */
export function SettingsRow({
  icon: Icon,
  iconClassName,
  label,
  labelClassName,
  value,
  href,
  showChevron = true,
}: {
  readonly icon: LucideIcon;
  readonly iconClassName?: string;
  readonly label: ReactNode;
  readonly labelClassName?: string;
  readonly value?: ReactNode;
  readonly href?: string;
  readonly showChevron?: boolean;
}) {
  const content = (
    <>
      <Icon className={cn("size-4 shrink-0 text-muted-foreground", iconClassName)} />
      <span
        className={cn(
          "font-thai min-w-px flex-1 text-left text-[14px] leading-[20px] font-medium text-foreground",
          labelClassName,
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="font-latin shrink-0 text-[14px] leading-[20px] font-normal text-muted-foreground">
          {value}
        </span>
      ) : null}
      {showChevron ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  const rowClassName =
    "flex w-full shrink-0 items-center gap-3 overflow-clip p-[14px]";

  if (href) {
    return (
      <Link className={rowClassName} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={rowClassName} type="button">
      {content}
    </button>
  );
}
