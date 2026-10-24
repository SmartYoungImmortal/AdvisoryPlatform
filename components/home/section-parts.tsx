import Image, { type StaticImageData } from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ThaiText } from "@/components/mobile/thai-text";
import { cn } from "@/lib/utils";

/**
 * The pieces every home section below the hero is built from.
 *
 * Those sections are drawn on the hero's 1710 frame and zoomed to the screen
 * (`[data-slot="home-hero-track"] ~ *` in `app/globals.css`), so `lg:` sizes
 * here are sizes on a 1710-wide screen. Below `lg` they are the phone's.
 */

/** The 1344 column of the 1710 frame (the footer's), with the phone's 24px inset below `lg`. */
export const FRAME = "w-full px-6 lg:mx-auto lg:max-w-336 lg:px-0";

/** A figure inside a sentence (`t.rich`'s `<n>`), set in the Latin face at full ink. */
export function latinFigure(chunks: ReactNode) {
  return <span className="font-latin font-semibold text-foreground tabular-nums">{chunks}</span>;
}

/**
 * A section's one headline: the hero's own Kanit at its regular weight, drawn
 * in a little and set in the hero's slate rather than the near-black of the
 * UI, so the page below reads as the same voice as the band above it.
 *
 * A plain string breaks only at its spaces (`ThaiText`): left to the browser's
 * dictionary, a phone width put "นี้" on a line of its own.
 */
export function SectionTitle({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    // 48 on the 1710 frame, which the zoom brings to 40 on a 1440 screen and
    // to 33 on a landscape tablet; `leading-tight` gives Thai's stacked marks
    // the room `text-5xl`'s own leading of 1 does not.
    <h2
      className={cn(
        "font-hero text-2xl font-normal tracking-tight text-hero-ink lg:text-5xl lg:leading-tight",
        className,
      )}
    >
      {typeof children === "string" ? <ThaiText>{children}</ThaiText> : children}
    </h2>
  );
}

/** The line under a section title: 18 on the 1710 frame, so it still reads as copy at 1440. */
export function SectionLead({
  children,
  className,
}: {
  readonly children: string;
  readonly className?: string;
}) {
  return (
    <p className={cn("text-base text-muted-foreground lg:text-lg", className)}>
      <ThaiText>{children}</ThaiText>
    </p>
  );
}

/** An advisor's portrait, or their initial on the muted step when the API has none. */
export function Face({
  face,
  name,
  className,
}: {
  readonly face: StaticImageData | null;
  readonly name: string;
  /** Size it here; the portrait fills whatever box it is given. */
  readonly className?: string;
}) {
  if (face) {
    return <Image alt="" className={cn("shrink-0 rounded-full object-cover", className)} src={face} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/**
 * What an hour costs and how long it is. The price leads in the Latin face with
 * tabular figures, the length follows it a step down, so a column of cards
 * lines up.
 */
export function Fee({
  price,
  minutes,
  className,
}: {
  readonly price: number;
  readonly minutes: number;
  readonly className?: string;
}) {
  const t = useTranslations("home");
  const format = useFormatter();
  return (
    <span className={cn("flex items-baseline gap-1.5 whitespace-nowrap", className)}>
      <span className="font-latin text-lg font-semibold text-foreground tabular-nums lg:text-xl">
        {format.number(price, "baht")}
      </span>
      <span className="text-sm text-muted-foreground lg:text-base">/ {t("duration", { minutes })}</span>
    </span>
  );
}
