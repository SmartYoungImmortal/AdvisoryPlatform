import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one card.
 *
 * Before this the app drew the same object three ways — `rounded-xl bg-card`
 * (36 times, no edge at all), `rounded-xl border bg-card` (12) and
 * `rounded-xl border border-border bg-card` (19) — on a page ground two per
 * cent away from the card's own white. Nothing read as raised, and nothing read
 * as deliberately flat either; it was just inconsistent.
 *
 * Three tiers, and every card on screen is one of them:
 *
 * - `flat` — a hairline, no shadow. Rows and panels that sit *inside* something
 *   else, where a shadow would stack on a shadow.
 * - `raised` (the default) — hairline plus `--shadow-card`. The card as an
 *   object on the page.
 * - `well` — the muted inset, for a block that belongs *under* the surface it
 *   sits on: a summary inside a form, a quote inside a review.
 *
 * `interactive` adds the hover lift and the press. It is only for a card that
 * is genuinely a link or a button; a static card that lifts under the pointer
 * is a lie about what a click will do.
 */
export type SurfaceTier = "flat" | "raised" | "well";

const TIERS: Record<SurfaceTier, string> = {
  flat: "border border-border bg-card",
  raised: "border border-border bg-card shadow-card",
  well: "bg-muted",
};

export function surfaceClass({
  tier = "raised",
  interactive = false,
}: {
  readonly tier?: SurfaceTier;
  readonly interactive?: boolean;
} = {}): string {
  return cn(
    "rounded-card",
    TIERS[tier],
    interactive &&
      "transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-accented hover:shadow-card-hover active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0",
  );
}

/** The card itself, when it is a plain container. */
export function Surface({
  tier,
  interactive,
  className,
  children,
}: {
  readonly tier?: SurfaceTier;
  readonly interactive?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn(surfaceClass({ tier, interactive }), className)}>
      {children}
    </div>
  );
}

/**
 * A list drawn as one card with hairlines between its rows, rather than as a
 * stack of separate cards — the shape the settings lists, the session lists and
 * the ledger all want and each rebuilt by hand with `divide-y`.
 */
export function SurfaceList({
  tier,
  className,
  children,
}: {
  readonly tier?: SurfaceTier;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={cn(
        surfaceClass({ tier }),
        "flex w-full flex-col divide-y divide-border overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
