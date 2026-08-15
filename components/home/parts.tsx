import Link from "next/link";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Figma "Search Field" — a 44px box on surface with a border-input hairline, a
 * 12px inset and a leading glyph. Taller and rounder than the shadcn default, so
 * the height and the radius are the only metrics restated; the focus ring and
 * placeholder colour come from the primitive.
 *
 * `href` is how the home frame reaches the results screen. There is nothing to
 * type into in the prototype, and an <a> may not wrap a form control, so the
 * link is a transparent overlay rather than a wrapper.
 */
export function SearchField({
  href,
  iconClassName = "size-4.5",
  linkLabel,
  overlay,
  ...inputProps
}: {
  readonly href?: string;
  readonly iconClassName?: string;
  readonly linkLabel?: string;
  /** Drawn over the control's own box — see `TypingPlaceholder`. */
  readonly overlay?: ReactNode;
} & ComponentProps<"input">) {
  return (
    <div className="relative flex min-w-px flex-1 items-start">
      <InputGroup className="h-11 gap-2 rounded-lg border-input bg-card px-3 shadow-none">
        <InputGroupAddon className="p-0 text-muted-foreground">
          <Search className={iconClassName} />
        </InputGroupAddon>
        {overlay ? (
          // The overlay is positioned against the control rather than the group,
          // so it starts where the placeholder starts, past the icon.
          <div className="relative flex min-w-px flex-1 items-center">
            <InputGroupInput className="px-0 text-sm" type="search" {...inputProps} />
            {overlay}
          </div>
        ) : (
          <InputGroupInput className="px-0 text-sm" type="search" {...inputProps} />
        )}
      </InputGroup>
      {href ? (
        <Link
          aria-label={linkLabel}
          className="absolute inset-0 rounded-lg"
          href={href}
        />
      ) : null}
    </div>
  );
}

/** Figma "Filter Button" — the 36px square that sits beside the search field. */
export function FilterButton({
  label,
  iconClassName = "size-4.5",
}: {
  readonly label: string;
  readonly iconClassName?: string;
}) {
  return (
    <Button
      aria-label={label}
      className="size-9 shrink-0 rounded-lg border-input bg-card shadow-none"
      size="icon"
      variant="outline"
    >
      <SlidersHorizontal className={iconClassName} />
    </Button>
  );
}

/**
 * Figma "Filter Chip" — a pill with a 12/18 label. The active one is the accent
 * fill, the rest are surface with a border hairline.
 *
 * That hairline is why the two differ in height: 26px for the active chip, 28px
 * for the others. The badge primitive keeps a transparent border on every
 * variant to stop exactly that shift, so the active chip drops it to land back
 * on the design's 26px.
 */
export function FilterChip({
  active = false,
  children,
}: {
  readonly active?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "h-auto shrink-0 rounded-full px-2.5 py-1 font-normal",
        active ? "border-0" : "bg-card text-muted-foreground",
      )}
      variant={active ? "default" : "outline"}
    >
      {children}
    </Badge>
  );
}

/** Figma "Section Head" — a 16/24 title with the accent "see all" link trailing. */
export function SectionHead({
  title,
  action,
  href,
  className,
}: {
  readonly title: ReactNode;
  readonly action: ReactNode;
  readonly href: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center overflow-clip px-6",
        className,
      )}
    >
      <p className="min-w-px flex-1 text-base font-semibold text-foreground">
        {title}
      </p>
      <Link
        className="shrink-0 text-sm font-medium whitespace-nowrap text-primary"
        href={href}
      >
        {action}
      </Link>
    </div>
  );
}

/**
 * Figma "Meta" — the 4px row that closes a service card: an outline star, the
 * score, the review count, then the price pushed to the far edge.
 */
export function ServiceMeta({
  rating,
  reviews,
  price,
  starClassName = "size-3.5",
}: {
  readonly rating: ReactNode;
  readonly reviews: ReactNode;
  readonly price: ReactNode;
  readonly starClassName?: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
      <Star className={cn("shrink-0 text-primary", starClassName)} />
      <p className="shrink-0 text-xs font-normal whitespace-nowrap text-foreground">
        {rating}
      </p>
      <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
        {reviews}
      </p>
      <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-foreground">
        {price}
      </p>
    </div>
  );
}

/** Figma "Icon Badge" — the 36px circle behind a category, step or card glyph. */
export function IconBadge({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-clip rounded-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
