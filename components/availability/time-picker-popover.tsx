import { useTranslations } from "next-intl";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { surfaceClass } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";
import { endTimeOptions } from "@/lib/availability/editor";

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
export function TimePickerPopover({ start, value, onSelect, defaultOpen = false }: { readonly start: string; readonly value: string; readonly onSelect: (value: string) => void; readonly defaultOpen?: boolean }) {
  const t = useTranslations("availability");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={t("picker.endLabel")} className="-my-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronDown aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
      <Popover.Positioner align="end" sideOffset={4} className="z-50">
    <Popover.Popup aria-label={t("picker.endLabel")}
      className={cn(
        surfaceClass(),
        "flex w-52 flex-col overflow-clip shadow-panel outline-none",
      )}
    >
      <p className="shrink-0 px-3 pt-2.5 pb-1 text-xs font-normal text-muted-foreground">
        {t("picker.endLabel")}
      </p>
      <ul className="flex max-h-60 flex-col overflow-y-auto">
        {endTimeOptions(start).map((option) => (
          <li key={option.time}>
            <button type="button" aria-pressed={option.time === value} onClick={() => { onSelect(option.time); setOpen(false); }} className={cn(
              "flex w-full shrink-0 items-center gap-2 px-3 py-2 text-left hover:bg-muted",
              option.time === value ? "bg-accent-surface" : null,
            )}>
            <span className="min-w-px flex-1 font-latin text-sm font-normal text-foreground">
              {option.time}
            </span>
            <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
              {option.minutes < 60
                ? t("minutes", { count: option.minutes })
                : t("hoursDecimal", { hours: option.minutes / 60 })}
            </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="shrink-0 border-t border-border px-3 py-2 text-xs font-normal text-muted-foreground">
        {t("picker.scrollHint")}
      </p>
    </Popover.Popup>
      </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
