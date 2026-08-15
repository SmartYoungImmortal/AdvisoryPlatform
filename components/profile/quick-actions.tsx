import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickAction = {
  readonly icon: LucideIcon;
  readonly label: string;
  /** Omit for destinations that have no design yet — renders a plain button. */
  readonly href?: string;
};

/**
 * Figma "Quick Actions" — equal-width surface tiles with a 12px radius, 12px/8px
 * padding, a 6px gap, a 20px glyph and a 12/18 Thai medium label.
 */
export function QuickActions({
  actions,
  className,
}: {
  readonly actions: readonly QuickAction[];
  readonly className?: string;
}) {
  // `h-auto` because the tile is two stacked lines rather than the primitive's
  // single 36px row; everything else it already provides.
  const tile =
    "h-auto min-w-px flex-1 flex-col gap-1.5 overflow-clip rounded-[12px] bg-card px-2 py-3 whitespace-normal";

  return (
    <div className={cn("flex w-full shrink-0 items-start gap-2.5 overflow-clip", className)}>
      {actions.map(({ icon: Icon, label, href }) => (
        <Button
          className={tile}
          key={label}
          // false only for the anchor form; the fallback really is a native button.
          nativeButton={!href}
          render={href ? <Link href={href} /> : undefined}
          variant="ghost"
        >
          <Icon className="size-5 shrink-0 text-muted-foreground" />
          <span className="w-full text-center text-xs font-medium text-foreground">
            {label}
          </span>
        </Button>
      ))}
    </div>
  );
}
