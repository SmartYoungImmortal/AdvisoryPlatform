import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { WEEKDAYS, type Weekday } from "@/lib/availability/profiles";

/**
 * Figma "Week" — one muted card of seven rows, read-only.
 *
 * A day with no window is closed, and the frame says so twice over: the name is
 * struck through *and* both halves drop to the muted tone. Worth keeping both —
 * strike-through alone reads as "removed", while the muted pair says "configured,
 * and configured as unavailable".
 *
 * Shared by the profile list and the advisor's service detail, which show the same
 * week from two different screens.
 */
export function WeekTable({
  windows,
  className,
}: {
  readonly windows: Partial<Record<Weekday, string>>;
  readonly className?: string;
}) {
  const t = useTranslations("availability");

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start overflow-clip rounded-lg bg-muted",
        className,
      )}
    >
      {WEEKDAYS.map((day, index) => {
        const window = windows[day];

        return (
          <div className="w-full" key={day}>
            {index > 0 ? <div className="h-px w-full bg-border" /> : null}
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip px-3 py-2.5">
              <p
                className={cn(
                  "shrink-0 text-sm font-medium whitespace-nowrap",
                  window
                    ? "text-foreground"
                    : "text-muted-foreground line-through",
                )}
              >
                {t(`weekday.${day}`)}
              </p>
              <div className="h-px min-w-px flex-1" />
              <p
                className={cn(
                  "shrink-0 text-right text-sm font-normal whitespace-nowrap",
                  window ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {window ?? t("dayClosed")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
