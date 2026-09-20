import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Surface } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";

/**
 * A number worth looking at, and what it is.
 *
 * The console has stat cards; the consumer app had none, so every figure it
 * shows — an advisor's balance, a session count, a rating — was set at the same
 * 14px as the row it sat next to. A dashboard that never raises its voice reads
 * as a list of settings.
 *
 * The figure is `font-latin tabular-nums`: Geist for the numerals, and tabular
 * so a column of them lines up. 167 places in this app opt into the Latin face
 * for numbers and three of them ask for tabular figures — which is why money in
 * a list used to wander by a pixel per digit.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /** A second line under the figure — a delta, a period, a count. */
  readonly hint?: ReactNode;
  readonly icon?: LucideIcon;
  /** `accent` tints the glyph chip for the one figure that leads the page. */
  readonly tone?: "neutral" | "accent";
  readonly className?: string;
}) {
  return (
    <Surface className={cn("flex items-start gap-3 p-4", className)}>
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "accent" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon aria-hidden className="size-4.5" />
        </span>
      ) : null}
      <span className="flex min-w-px flex-1 flex-col gap-0.5">
        <span className="text-xs font-normal text-muted-foreground">{label}</span>
        <span className="font-latin text-xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {hint ? (
          <span className="text-xs font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </Surface>
  );
}
