import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Nuxt UI's `UBadge` at md — Nexus's status column renders these `soft`. */
export const cmsBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      color: {
        neutral: "",
        primary: "",
        action: "",
        error: "",
        success: "",
        warning: "",
        info: "",
      },
      variant: {
        soft: "",
        subtle: "ring-1 ring-inset",
        outline: "ring-1 ring-inset",
        solid: "",
      },
    },
    compoundVariants: [
      { variant: ["soft", "subtle"], color: "neutral", class: "bg-muted text-foreground ring-accented" },
      { variant: ["soft", "subtle"], color: "primary", class: "bg-primary/10 text-primary ring-primary/25" },
      { variant: ["soft", "subtle"], color: "action", class: "bg-action/10 text-action ring-action/25" },
      { variant: ["soft", "subtle"], color: "error", class: "bg-destructive/10 text-destructive ring-destructive/25" },
      { variant: ["soft", "subtle"], color: "success", class: "bg-success/10 text-success ring-success/25" },
      { variant: ["soft", "subtle"], color: "warning", class: "bg-warning/10 text-warning ring-warning/25" },
      { variant: ["soft", "subtle"], color: "info", class: "bg-info/10 text-info ring-info/25" },
      { variant: "outline", color: "neutral", class: "bg-card text-foreground ring-accented" },
      { variant: "outline", color: "error", class: "text-destructive ring-destructive/50" },
      { variant: "solid", color: "neutral", class: "bg-primary text-primary-foreground" },
      { variant: "solid", color: "error", class: "bg-destructive text-destructive-foreground" },
      { variant: "solid", color: "action", class: "bg-action text-action-foreground" },
    ],
    defaultVariants: { color: "neutral", variant: "soft" },
  },
);

export type CmsBadgeColor = NonNullable<VariantProps<typeof cmsBadgeVariants>["color"]>;

export function CmsBadge({
  color,
  variant,
  className,
  children,
}: VariantProps<typeof cmsBadgeVariants> & {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <span className={cn(cmsBadgeVariants({ color, variant }), className)}>{children}</span>
  );
}
