export function SummaryLine({
  label,
  value,
  strong = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
  readonly className?: string
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3">
      <span
        className={`min-w-px flex-1 ${
          strong ? "font-medium text-foreground text-base" : "font-normal text-sm text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-latin shrink-0 whitespace-nowrap ${
          strong ? "font-semibold text-foreground text-base" : "font-normal text-sm text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
