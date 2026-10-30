import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A status, as the site's small pills are drawn (the topic chips, the
 * countdown on a booking): a capsule 24 tall, 12px medium type, the colour
 * carried by the text on its own faint tint and never by a fill.
 */
export const cmsBadgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      color: {
        neutral: "bg-muted text-foreground",
        primary: "bg-primary/8 text-primary",
        action: "bg-action/10 text-action",
        error: "bg-destructive/10 text-destructive",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
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
