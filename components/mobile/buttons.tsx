import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Figma buttons are 36px tall with 16px horizontal padding, an 8px radius, an 8px
 * gap and a 14/20 Thai medium label. Their shadow token is fully transparent, hence
 * `shadow-none`.
 */
const base =
  "font-thai h-9 min-h-9 w-full gap-2 rounded-[8px] px-4 py-2 text-[14px] leading-[20px] font-medium shadow-none";

// Filled buttons: the shadcn base pairs a 1px transparent border with
// `bg-clip-padding`, which would clip the fill to 34px instead of Figma's 36px.
const filled = `${base} border-0`;

/** Classes shared by the link form so it matches the real button exactly. */
const linkBase =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none";

type ActionProps = ComponentProps<typeof Button> & {
  /** Render as a link so the prototype can be clicked through. */
  readonly href?: string;
};

function Action({
  href,
  className,
  children,
  ...props
}: ActionProps & { readonly className: string }) {
  if (href) {
    return (
      <Link className={cn(linkBase, className)} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <Button className={className} {...props}>
      {children}
    </Button>
  );
}

/** Figma "ButtonPrimary" — accent #2563eb on white. */
export function PrimaryButton({ className, ...props }: ActionProps) {
  return (
    <Action
      className={cn(filled, "bg-primary text-primary-foreground", className)}
      {...props}
    />
  );
}

/** Figma "ButtonNeutral" — surface with a border hairline. */
export function NeutralButton({ className, ...props }: ActionProps) {
  return (
    <Action
      className={cn(base, "border border-border bg-card text-foreground", className)}
      variant="outline"
      {...props}
    />
  );
}

/** Figma destructive primary — used by the delete-account confirmation. */
export function DestructiveButton({ className, ...props }: ActionProps) {
  return (
    <Action className={cn(filled, "bg-destructive text-white", className)} {...props} />
  );
}
