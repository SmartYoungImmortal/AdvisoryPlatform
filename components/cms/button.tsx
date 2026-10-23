import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Nuxt UI's `UButton`, which every Nexus screen is built from: 6px radius,
 * `px-2.5 py-1.5` at md, colour × variant from the theme's compound table.
 * `action` is Nexus's blue `secondary`; `primary` and `neutral` are its black.
 */
export const cmsButtonVariants = cva(
  "inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-75 aria-disabled:cursor-not-allowed aria-disabled:opacity-75",
  {
    variants: {
      color: {
        primary: "focus-visible:outline-primary",
        action: "focus-visible:outline-action",
        neutral: "focus-visible:outline-primary",
        error: "focus-visible:outline-destructive",
        success: "focus-visible:outline-success",
        warning: "focus-visible:outline-warning",
      },
      variant: {
        solid: "",
        outline: "",
        soft: "",
        ghost: "",
        link: "",
      },
      size: {
        xs: "gap-1 px-2 py-1 text-xs [&_svg]:size-4",
        sm: "gap-1.5 px-2.5 py-1.5 text-xs [&_svg]:size-4",
        md: "gap-1.5 px-2.5 py-1.5 text-sm [&_svg]:size-5",
        lg: "gap-2 px-3 py-2 text-sm [&_svg]:size-5",
      },
      square: {
        true: "",
        false: "",
      },
      block: {
        true: "w-full justify-center",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "solid", color: ["primary", "neutral"], class: "bg-primary text-primary-foreground hover:bg-primary/75" },
      { variant: "solid", color: "action", class: "bg-action text-action-foreground hover:bg-action/75" },
      { variant: "solid", color: "error", class: "bg-destructive text-destructive-foreground hover:bg-destructive/75" },
      { variant: "solid", color: "success", class: "bg-success text-success-foreground hover:bg-success/75" },
      { variant: "solid", color: "warning", class: "bg-warning text-primary-foreground hover:bg-warning/75" },

      { variant: "outline", color: "neutral", class: "bg-card text-foreground ring-1 ring-accented ring-inset hover:bg-muted" },
      { variant: "outline", color: "primary", class: "text-primary ring-1 ring-primary/50 ring-inset hover:bg-primary/10" },
      { variant: "outline", color: "action", class: "text-action ring-1 ring-action/50 ring-inset hover:bg-action/10" },
      { variant: "outline", color: "error", class: "text-destructive ring-1 ring-destructive/50 ring-inset hover:bg-destructive/10" },
      { variant: "outline", color: "success", class: "text-success ring-1 ring-success/50 ring-inset hover:bg-success/10" },
      { variant: "outline", color: "warning", class: "text-warning ring-1 ring-warning/50 ring-inset hover:bg-warning/10" },

      { variant: "soft", color: "neutral", class: "bg-muted text-foreground hover:bg-accented/75" },
      { variant: "soft", color: "primary", class: "bg-primary/10 text-primary hover:bg-primary/15" },
      { variant: "soft", color: "action", class: "bg-action/10 text-action hover:bg-action/15" },
      { variant: "soft", color: "error", class: "bg-destructive/10 text-destructive hover:bg-destructive/15" },
      { variant: "soft", color: "success", class: "bg-success/10 text-success hover:bg-success/15" },
      { variant: "soft", color: "warning", class: "bg-warning/10 text-warning hover:bg-warning/15" },

      { variant: "ghost", color: "neutral", class: "text-foreground hover:bg-muted" },
      { variant: "ghost", color: "primary", class: "text-primary hover:bg-primary/10" },
      { variant: "ghost", color: "action", class: "text-action hover:bg-action/10" },
      { variant: "ghost", color: "error", class: "text-destructive hover:bg-destructive/10" },
      { variant: "ghost", color: "success", class: "text-success hover:bg-success/10" },
      { variant: "ghost", color: "warning", class: "text-warning hover:bg-warning/10" },

      { variant: "link", color: "neutral", class: "px-0 text-muted-foreground hover:text-foreground" },
      { variant: "link", color: "primary", class: "px-0 text-primary hover:text-primary/75" },
      { variant: "link", color: "action", class: "px-0 text-action hover:text-action/75" },
      { variant: "link", color: "error", class: "px-0 text-destructive hover:text-destructive/75" },

      { square: true, size: "xs", class: "p-1" },
      { square: true, size: "sm", class: "p-1.5" },
      { square: true, size: "md", class: "p-1.5" },
      { square: true, size: "lg", class: "p-2" },
    ],
    defaultVariants: {
      color: "primary",
      variant: "solid",
      size: "md",
      square: false,
      block: false,
    },
  },
);

export type CmsButtonProps = Omit<ButtonPrimitive.Props, "color"> &
  Omit<VariantProps<typeof cmsButtonVariants>, "square"> & {
    readonly icon?: LucideIcon;
    readonly trailingIcon?: LucideIcon;
    readonly loading?: boolean;
    readonly children?: ReactNode;
  };

export function CmsButton({
  className,
  color,
  variant,
  size,
  block,
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  disabled,
  children,
  ...props
}: CmsButtonProps) {
  const LeadingIcon = loading ? Loader2 : Icon;
  return (
    <ButtonPrimitive
      className={cn(
        cmsButtonVariants({
          color,
          variant,
          size,
          block,
          square: !children && Boolean(Icon),
        }),
        className,
      )}
      data-slot="cms-button"
      disabled={disabled || loading}
      {...props}
    >
      {LeadingIcon ? (
        <LeadingIcon aria-hidden className={cn("shrink-0", loading && "animate-spin")} />
      ) : null}
      {/* A plain label truncates like Nuxt UI's; composed content lays itself out. */}
      {typeof children === "string" || typeof children === "number" ? (
        <span className="truncate">{children}</span>
      ) : (
        children
      )}
      {TrailingIcon ? <TrailingIcon aria-hidden className="ms-auto shrink-0" /> : null}
    </ButtonPrimitive>
  );
}
