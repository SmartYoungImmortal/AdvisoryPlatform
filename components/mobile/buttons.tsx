import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Figma's mobile actions are the shadcn button re-proportioned: full width, 36px
 * tall, 16px of horizontal padding and an 8px gap. Their shadow token is fully
 * transparent, hence `shadow-none`. Everything the primitive already provides —
 * the focus ring, the disabled state, the active press, the 8px radius — is left
 * to it instead of being restated here.
 *
 * Two things changed once these screens had to hold a 1200px page.
 *
 * Width: `w-full` was baked into all three variants, so a desktop screen ended
 * on a 1200×36 accent slab. A button that wide is not a button, it is a banner.
 * It stays full width on the phone, where the frame asks for it, and sizes to
 * its label from `lg` — unless the layout says otherwise with `block`.
 *
 * Height: 36px is right against a phone's thumb and short against a desktop
 * pointer, so `size` exists. `md` — the default — grows to 40px at `lg`.
 */
const SIZES = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 lg:h-10",
  lg: "h-11 gap-2 px-5 text-base",
} as const;

export type ActionSize = keyof typeof SIZES;

function metrics(size: ActionSize, block: boolean): string {
  return cn(
    SIZES[size],
    "shadow-none",
    block ? "w-full" : "w-full lg:w-auto",
  );
}

/** What reaches the primitive: its own props, minus the size this file owns. */
type ButtonProps = Omit<ComponentProps<typeof Button>, "size">;

type ActionProps = ButtonProps & {
  /** Render as a link so the prototype can be clicked through. */
  readonly href?: string;
  readonly size?: ActionSize;
  /** Keep the full width at every size — for a card's single, primary action. */
  readonly block?: boolean;
};

function Action({ href, ...props }: ButtonProps & { readonly href?: string }) {
  // `render` hands the button's classes, ref and interaction wiring to the anchor,
  // so the link form keeps the focus ring and press state. Re-declaring a subset of
  // the classes on a bare <Link> — the previous approach — silently dropped both.
  //
  // `nativeButton` tells Base UI which element it actually ended up on. It defaults
  // to true, so leaving it off an anchor makes the primitive skip the keyboard and
  // ARIA handling a non-<button> needs — the very thing `render` is here to keep.
  return href ? (
    <Button nativeButton={false} render={<Link href={href} />} {...props} />
  ) : (
    <Button {...props} />
  );
}

/**
 * Figma "ButtonPrimary" — accent on white; the primitive's default variant.
 *
 * The filled variants drop the border: shadcn pairs a 1px transparent border
 * with `bg-clip-padding`, which would inset the fill to 34px instead of 36.
 */
export function PrimaryButton({
  className,
  size = "md",
  block = false,
  ...props
}: ActionProps) {
  return (
    <Action
      className={cn(metrics(size, block), "border-0", className)}
      {...props}
    />
  );
}

/** Figma "ButtonNeutral" — surface with a border hairline. */
export function NeutralButton({
  className,
  size = "md",
  block = false,
  ...props
}: ActionProps) {
  return (
    <Action
      className={cn(metrics(size, block), "bg-card", className)}
      variant="outline"
      {...props}
    />
  );
}

/**
 * Figma destructive primary — the delete-account and log-out confirmations.
 * shadcn's `destructive` variant is the *tinted* treatment, so the solid fill is
 * spelled out against the token pair rather than a literal white.
 */
export function DestructiveButton({
  className,
  size = "md",
  block = false,
  ...props
}: ActionProps) {
  return (
    <Action
      className={cn(
        metrics(size, block),
        "border-0 bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className,
      )}
      {...props}
    />
  );
}
