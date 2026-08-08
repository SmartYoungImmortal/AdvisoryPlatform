import Link from "next/link";
import type { LucideIcon } from "lucide-react";

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
  const tile =
    "flex min-w-px flex-1 flex-col items-center gap-[6px] overflow-clip rounded-[12px] bg-card px-2 py-3";

  return (
    <div className={cn("flex w-full shrink-0 items-start gap-[10px] overflow-clip", className)}>
      {actions.map(({ icon: Icon, label, href }) => {
        const body = (
          <>
            <Icon className="size-5 shrink-0 text-muted-foreground" />
            <span className="font-thai w-full text-center text-[12px] leading-[18px] font-medium text-foreground">
              {label}
            </span>
          </>
        );
        return href ? (
          <Link className={tile} href={href} key={label}>
            {body}
          </Link>
        ) : (
          <button className={tile} key={label} type="button">
            {body}
          </button>
        );
      })}
    </div>
  );
}
