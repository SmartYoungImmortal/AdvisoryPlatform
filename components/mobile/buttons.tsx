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
 */
const metrics = "h-9 w-full gap-2 px-4 shadow-none";

/**
 * The filled variants drop the border: shadcn pairs a 1px transparent border with
 * `bg-clip-padding`, which would inset the fill to 34px instead of Figma's 36px.
 */
const filled = `${metrics} border-0`;

type ActionProps = ComponentProps<typeof Button> & {
  /** Render as a link so the prototype can be clicked through. */
  readonly href?: string;
};

function Action({ href, ...props }: ActionProps) {
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

/** Figma "ButtonPrimary" — accent on white; the primitive's default variant. */
export function PrimaryButton({ className, ...props }: ActionProps) {
  return <Action className={cn(filled, className)} {...props} />;
}

/** Figma "ButtonNeutral" — surface with a border hairline. */
export function NeutralButton({ className, ...props }: ActionProps) {
  return <Action className={cn(metrics, "bg-card", className)} variant="outline" {...props} />;
}

/**
 * Figma destructive primary — the delete-account and log-out confirmations.
 * shadcn's `destructive` variant is the *tinted* treatment, so the solid fill is
 * spelled out against the token pair rather than a literal white.
 */
export function DestructiveButton({ className, ...props }: ActionProps) {
  return (
    <Action
      className={cn(
        filled,
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className,
      )}
      {...props}
    />
  );
}
