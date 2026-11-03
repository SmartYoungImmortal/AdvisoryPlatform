import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A status, as the site's transaction rows print theirs ("ชำระแล้ว"): words in
 * the status's colour with no capsule or tint behind them, a dot of the same
 * colour before them so a column of statuses reads at a glance.
 */
export const cmsBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 text-sm font-medium whitespace-nowrap before:size-1.5 before:shrink-0 before:rounded-full before:bg-current",
  {
    variants: {
      color: {
        neutral: "text-muted-foreground",
        primary: "text-primary",
        action: "text-action",
        error: "text-destructive",
        success: "text-success",
        warning: "text-warning",
        info: "text-info",
      },
    },
    defaultVariants: { color: "neutral" },
  },
);

export type CmsBadgeColor = NonNullable<VariantProps<typeof cmsBadgeVariants>["color"]>;

export function CmsBadge({
  color,
  className,
  children,
}: VariantProps<typeof cmsBadgeVariants> & {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return <span className={cn(cmsBadgeVariants({ color }), className)}>{children}</span>;
}
