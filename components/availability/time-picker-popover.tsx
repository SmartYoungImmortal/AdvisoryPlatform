import { useTranslations } from "next-intl";

import { surfaceClass } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";
import {
  END_TIME_OPTIONS,
  PICKED_END_TIME,
} from "@/lib/availability/editor";

/**
 * Figma "Availability - Profile / Time picker" (1594:31672) — the list that drops
 * from an end-time trigger.
 *
 * Each row pairs the time with the length the range would become, because that is
 * the number an Advisor is really choosing by: "three hours" is the decision,
 * "12:00" is how it is spelled.
 *
 * Positioned absolutely under its trigger and allowed to overlap what follows,
 * exactly as the frame draws it. The list scrolls rather than growing the page.
 *
 * The card is the `raised` surface with `--shadow-panel` over it: a popover is one
 * of the things that shadow exists for, and it replaces the wide `shadow-lift`
 * wash, which is the hero treatment and read as fog under a 208px list.
 */
export function TimePickerPopover() {
  const t = useTranslations("availability");

  return (
    <div
      className={cn(
        surfaceClass(),
        "absolute top-full right-0 z-10 mt-1 flex w-52 flex-col overflow-clip shadow-panel",
      )}
    >
      <p className="shrink-0 px-3 pt-2.5 pb-1 text-xs font-normal text-muted-foreground">
        {t("picker.endLabel")}
      </p>
      <ul className="flex max-h-60 flex-col overflow-y-auto">
        {END_TIME_OPTIONS.map((option) => (
          <li
            className={cn(
              "flex shrink-0 items-center gap-2 px-3 py-2",
              option.time === PICKED_END_TIME ? "bg-accent-surface" : null,
            )}
            key={option.time}
          >
            <span className="min-w-px flex-1 font-latin text-sm font-normal text-foreground">
              {option.time}
            </span>
            <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
              {option.minutes < 60
                ? t("minutes", { count: option.minutes })
                : t("hoursDecimal", { hours: option.minutes / 60 })}
            </span>
          </li>
        ))}
      </ul>
      <p className="shrink-0 border-t border-border px-3 py-2 text-xs font-normal text-muted-foreground">
        {t("picker.scrollHint")}
      </p>
    </div>
  );
}
