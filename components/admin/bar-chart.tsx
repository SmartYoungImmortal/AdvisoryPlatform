import { cn } from "@/lib/utils";

/**
 * Dep-free bar chart on the `--chart-*` tokens. Single-series by design: fee
 * (5%) and GMV differ by 20x, so charting them on one scale renders the fee
 * invisible — the dashboard charts fee and reports GMV as a headline number
 * instead. recharts stays the documented upgrade path.
 */
export function MiniBarChart({
  series,
  formatValue,
}: {
  readonly series: ReadonlyArray<{
    readonly label: string;
    readonly value: number;
  }>;
  readonly formatValue: (value: number) => string;
}) {
  const max = Math.max(...series.map((point) => point.value), 1);

  return (
    <div className="flex h-48 w-full items-end gap-3">
      {series.map((point) => (
        <div
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
          key={point.label}
        >
          <p className="font-latin text-xs font-medium text-foreground">
            {formatValue(point.value)}
          </p>
          <div
            className="w-full max-w-12 rounded-t-md bg-chart-2"
            style={{ height: `${Math.max((point.value / max) * 100, 3)}%` }}
          />
          <p className="text-xs font-normal text-muted-foreground">
            {point.label}
          </p>
        </div>
      ))}
    </div>
  );
}
