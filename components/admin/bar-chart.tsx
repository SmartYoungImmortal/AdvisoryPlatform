import { cn } from "@/lib/utils";

/**
 * Dep-free grouped bar chart on the `--chart-*` tokens (their first consumer).
 * Heights are inline percentages of the series max — a static mock doesn't
 * earn a charting dependency; recharts stays the documented upgrade path.
 */
export function MiniBarChart({
  series,
  primaryLabel,
  secondaryLabel,
}: {
  readonly series: ReadonlyArray<{
    readonly label: string;
    readonly primary: number;
    readonly secondary?: number;
  }>;
  readonly primaryLabel: string;
  readonly secondaryLabel?: string;
}) {
  const max = Math.max(
    ...series.map((point) => Math.max(point.primary, point.secondary ?? 0)),
    1,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex h-40 w-full items-end gap-4">
        {series.map((point) => (
          <div
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-1"
            key={point.label}
          >
            {point.secondary === undefined ? null : (
              <Bar className="bg-chart-1/30" ratio={point.secondary / max} />
            )}
            <Bar className="bg-chart-2" ratio={point.primary / max} />
          </div>
        ))}
      </div>
      <div className="flex w-full gap-4">
        {series.map((point) => (
          <p
            className="min-w-0 flex-1 text-center text-xs font-normal text-muted-foreground"
            key={point.label}
          >
            {point.label}
          </p>
        ))}
      </div>
      <div className="flex w-full items-center gap-4">
        <LegendChip className="bg-chart-2" label={primaryLabel} />
        {secondaryLabel ? (
          <LegendChip className="bg-chart-1/30" label={secondaryLabel} />
        ) : null}
      </div>
    </div>
  );
}

function Bar({
  ratio,
  className,
}: {
  readonly ratio: number;
  readonly className: string;
}) {
  return (
    <div
      className={cn("w-4 rounded-t-sm", className)}
      style={{ height: `${Math.max(Math.round(ratio * 100), 2)}%` }}
    />
  );
}

function LegendChip({
  label,
  className,
}: {
  readonly label: string;
  readonly className: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
      <span className={cn("size-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}
