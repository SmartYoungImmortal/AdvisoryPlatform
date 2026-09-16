import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Route-based tabs (Figma sub-sidebar in 1042:15172, rendered as a tab strip):
 * each tab is a sibling route, so this is a row of links, not stateful Tabs —
 * matching the house rule that a URL owns each visible state.
 */
export function TabLinkNav({
  tabs,
}: {
  readonly tabs: ReadonlyArray<{
    readonly href: string;
    readonly label: string;
    readonly active?: boolean;
  }>;
}) {
  return (
    <div className="flex w-full items-center gap-6 border-b border-border">
      {tabs.map((tab) => (
        <Link
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm",
            tab.active
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
