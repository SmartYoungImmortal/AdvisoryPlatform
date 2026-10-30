import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The console's button, in the site's capsule shapes (`authPill`, the
 * settings rows' grey actions): fully round, the thing being done filled in
 * ink, the way out a white capsule on a hairline or the soft grey, and what
 * cannot be undone in red.
 *
 * 36 tall from `md` (a toolbar's height at 1440, drawn under `cms-scale`), 44
 * on a phone so every press clears the touch minimum. `sm` and `xs` are for
 * a row's own inline actions and the selection strip, 32 and 28 from `md`
 * (40 and 36 on a phone).
 */
export const cmsButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The thing being done: ink, as the home hero's button. */
        primary: "bg-primary text-primary-foreground hover:bg-primary/85",
        /** A white capsule on a hairline, for the way out or a second choice. */
        secondary: "border border-border bg-card text-foreground hover:bg-muted",
        /** The settings rows' grey capsule. */
        soft: "bg-muted text-foreground hover:bg-muted/70",
        /** What cannot be undone, filled. */
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** A destructive choice offered beside a safer one: red on its tint. */
        "danger-soft": "bg-destructive/10 text-destructive hover:bg-destructive/15",
        ghost: "text-foreground hover:bg-muted",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-9 gap-1 px-2.5 text-xs md:h-7 [&_svg]:size-3.5",
        sm: "h-10 gap-1.5 px-3 text-sm md:h-8 [&_svg]:size-4",
        md: "h-11 gap-2 px-4 text-sm md:h-9 [&_svg]:size-4",
        lg: "h-11 gap-2 px-5 text-sm md:h-10 [&_svg]:size-4.5",
      },
      square: {
        true: "px-0",
        false: "",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    compoundVariants: [
      // After the sizes, so the link's own height wins over theirs.
      { variant: "link", class: "h-auto px-0 md:h-auto" },
      { square: true, size: "xs", class: "w-9 md:w-7" },
      { square: true, size: "sm", class: "w-10 md:w-8" },
      { square: true, size: "md", class: "w-11 md:w-9" },
      { square: true, size: "lg", class: "w-11 md:w-10" },
    ],
    defaultVariants: {
      variant: "primary",
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
        <LeadingIcon aria-hidden className={cn(loading && "animate-spin")} />
      ) : null}
      {/* A plain label truncates; composed content lays itself out. */}
      {typeof children === "string" || typeof children === "number" ? (
        <span className="truncate">{children}</span>
      ) : (
        children
      )}
      {TrailingIcon ? <TrailingIcon aria-hidden className="ms-auto" /> : null}
    </ButtonPrimitive>
  );
}
