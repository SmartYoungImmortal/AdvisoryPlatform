import Link from "next/link";
import { BadgeCheck, Clock, Search, SlidersHorizontal, Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

import { formatDuration, type Slot } from "@/lib/catalogue/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { StatusPill } from "@/components/mobile/status-pill";
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
  groupClassName,
  iconClassName = "size-4.5",
  inputClassName,
  linkLabel,
  overlay,
  trailing,
  ...inputProps
}: {
  readonly href?: string;
  /** The box itself — how the desktop hero grows it to its 64px field. */
  readonly groupClassName?: string;
  readonly iconClassName?: string;
  readonly inputClassName?: string;
  readonly linkLabel?: string;
  /** Drawn over the control's own box — see `TypingPlaceholder`. */
  readonly overlay?: ReactNode;
  /** Sits inside the box at its trailing edge — the hero's search button. */
  readonly trailing?: ReactNode;
} & ComponentProps<"input">) {
  return (
    <div className="relative flex min-w-px flex-1 items-start">
      <InputGroup
        className={cn(
          "h-11 gap-2 rounded-lg border-input bg-card px-3 shadow-none",
          groupClassName,
        )}
      >
        <InputGroupAddon className="p-0 text-muted-foreground">
          <Search className={iconClassName} />
        </InputGroupAddon>
        {overlay ? (
          // The overlay is positioned against the control rather than the group,
          // so it starts where the placeholder starts, past the icon.
          <div className="relative flex min-w-px flex-1 items-center">
            <InputGroupInput
              className={cn("px-0 text-sm", inputClassName)}
              type="search"
              {...inputProps}
            />
            {overlay}
          </div>
        ) : (
          <InputGroupInput
            className={cn("px-0 text-sm", inputClassName)}
            type="search"
            {...inputProps}
          />
        )}
        {trailing}
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

/**
 * Figma "Filter Button" — the square that sits beside the search field.
 *
 * Figma draws it at 36px against a 44px field, which leaves it floating short of
 * the box it is paired with. It matches the field's height here and stays square,
 * so the row reads as one control and not as a button that fell off it.
 */
export function FilterButton({
  label,
  className,
  iconClassName = "size-4.5",
}: {
  readonly label: string;
  readonly className?: string;
  readonly iconClassName?: string;
}) {
  return (
    <Button
      aria-label={label}
      className={cn(
        "size-11 shrink-0 rounded-lg border-input bg-card shadow-none",
        className,
      )}
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
        "h-auto shrink-0 rounded-full px-2.5 py-1 font-normal transition-colors",
        active
          ? "border-0"
          : "bg-card text-muted-foreground hover:border-accented hover:text-foreground",
      )}
      variant={active ? "default" : "outline"}
    >
      {children}
    </Badge>
  );
}

/**
 * Figma "Section Head" — a 16/24 title with the accent "see all" link trailing.
 *
 * The desktop frames (e.g. 1564:24890) set the same head at 24/34 over a 1200
 * column, so the title carries a second size from `lg` rather than the page
 * having a head of its own.
 */
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
      <p className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-2xl">
        {title}
      </p>
      <Link
        className="shrink-0 text-sm font-medium whitespace-nowrap text-primary transition-colors hover:text-primary/75"
        href={href}
      >
        {action}
      </Link>
    </div>
  );
}

/**
 * Figma "Meta" was one row: star, score, review count, price at the far edge.
 * It is split in two here, because that single row was carrying the only two
 * jobs a card has and doing neither — the proof and the offer read as one
 * undifferentiated line of small grey text.
 *
 * The star is filled rather than outlined. A hollow star reads as a "save this"
 * control; a rating is a filled one, and at 14px the outline was mostly the
 * accent hairline anyway.
 *
 * The score is the one number in the line, so it is set in the Latin face with
 * tabular figures and a weight above the words around it. Before this a 4.9 and
 * the word "รีวิว" beside it were the same 12px grey, and a column of cards had
 * its scores landing a pixel apart per digit.
 */
export function ServiceProof({
  rating,
  reviews,
  bookings,
  starClassName = "size-3.5",
}: {
  readonly rating: string;
  readonly reviews: number;
  /** Consultations completed. Omitted where the card has no room for it. */
  readonly bookings?: number;
  readonly starClassName?: string;
}) {
  const t = useTranslations("service");

  return (
    <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
      <Star className={cn("shrink-0 fill-primary text-primary", starClassName)} />
      <span className="font-latin shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
        {rating}
      </span>
      <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
        {t("reviewCount", { count: reviews })}
      </span>
      {bookings !== undefined ? (
        <span className="min-w-px flex-1 truncate text-xs font-normal whitespace-nowrap text-muted-foreground">
          · {t("bookings", { count: bookings })}
        </span>
      ) : null}
    </div>
  );
}

/**
 * "Free today", where it is true.
 *
 * `slots[].day` has been in the catalogue since the home rail shipped and only
 * the detail page ever read it, so a card could not say the one thing that
 * decides a marketplace click: whether you can have this today. Two of the seven
 * services can, which is what makes the pill worth printing — a badge every card
 * carries is decoration.
 */
export function AvailabilityPill({
  slots,
  className,
}: {
  readonly slots: readonly Slot[];
  readonly className?: string;
}) {
  const t = useTranslations("search");

  if (!slots.some((slot) => slot.day === "today")) return null;

  return (
    <StatusPill className={className} icon={Clock} tone="success">
      {t("filterToday")}
    </StatusPill>
  );
}

/**
 * The offer line: how long the consultation runs, and what it costs. Duration is
 * the half that kept going missing — the catalogue sells hours, so a bare
 * "฿1,200" cannot be read as expensive or cheap.
 *
 * The price was set at the same 14px as the duration beside it, which on a card
 * whose whole job is to sell an hour is the one thing that must not be a tie. It
 * leads the line now — 16px semibold, Latin face, tabular figures — and the
 * duration drops to the 12px every other meta line on the card uses.
 */
export function ServicePrice({
  minutes,
  price,
  from = false,
}: {
  readonly minutes?: number;
  readonly price: number;
  /** "starting at", for a card that stands for several services. */
  readonly from?: boolean;
}) {
  const t = useTranslations("service");
  const format = useFormatter();

  return (
    // Without a duration there is nothing to push the price away from, so the
    // row shrinks to its content and lets the card align it — a lone price held
    // to the right edge of a centred advisor card looked like a mistake.
    <div
      className={cn(
        "flex shrink-0 items-baseline gap-1 overflow-clip",
        minutes !== undefined && "w-full",
      )}
    >
      {minutes !== undefined ? (
        <span className="min-w-px flex-1 text-xs font-normal whitespace-nowrap text-muted-foreground">
          {formatDuration(minutes)}
        </span>
      ) : null}
      {from ? (
        <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
          {t("priceFrom")}
        </span>
      ) : null}
      <span className="font-latin shrink-0 text-base font-semibold tabular-nums whitespace-nowrap text-foreground">
        {format.number(price, "baht")}
      </span>
    </div>
  );
}

/**
 * The identity-checked tick. `advisor.verified` has been in the copy since the
 * onboarding flow shipped; the cards just never showed it. Compact by default
 * because on a 240px rail card the full pill would take the row to itself.
 */
export function VerifiedTick({ className }: { readonly className?: string }) {
  const t = useTranslations("service");

  return (
    <BadgeCheck
      aria-label={t("verified")}
      className={cn("size-3.5 shrink-0 text-success", className)}
      role="img"
    />
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
