import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type LinkListRow = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href: string;
  readonly badge?: ReactNode;
};

/**
 * A card of links, one 56px row each (64 from `lg`): the glyph in a soft
 * circle, the label, an optional count, the chevron. The profile's menu and
 * the work desk's tools are both one of these.
 */
export function LinkList({
  rows,
  label,
  className,
  children,
}: {
  readonly rows: readonly LinkListRow[];
  readonly label: string;
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  return (
    <nav aria-label={label} className={cn("rounded-2xl border border-border bg-card p-2", className)}>
      <ul className="flex flex-col">
        {rows.map(({ icon: Icon, label: text, href, badge }) => (
          <li key={href}>
            <Link
              className="flex h-14 items-center gap-3 rounded-xl px-3 text-base text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-13 lg:text-frame-body"
              href={href}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted lg:size-10">
                <Icon aria-hidden className="size-4.5 lg:size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{text}</span>
              {badge}
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </nav>
  );
}

/** The count a row carries: a small filled pill, read out by its own sentence. */
export function LinkListCount({ count, label }: { readonly count: number; readonly label: string }) {
  return (
    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 font-latin text-xs font-semibold text-primary-foreground tabular-nums">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
