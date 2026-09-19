import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Figma "View Tabs" — a full-width muted track whose selected segment takes the
 * accent fill and a small lift. Every segment is a sibling route rather than client
 * state, which is how the prototype's tabbed screens stay free of a client boundary.
 *
 * Shared by the advisor's "งานของฉัน" hub and the public advisor profile, which the
 * frames draw with the same control.
 */
export function SegmentedTabs({
  label,
  items,
  current,
  className,
}: {
  readonly label: string;
  readonly items: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly href: string;
  }>;
  readonly current: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-start overflow-clip px-6",
        className,
      )}
    >
      {/* The track filled the frame because a phone frame is 402px wide. On a
          1200 column that gave three short words four hundred pixels each, and
          the control stopped reading as a control. It sizes to its labels once
          there is room, and the segments stop stretching with it. */}
      <nav
        aria-label={label}
        className="flex min-w-px flex-1 items-center rounded-card bg-muted p-1 lg:w-auto lg:flex-none"
      >
        {items.map((item) => (
          <Link
            aria-current={item.key === current ? "page" : undefined}
            className={cn(
              "flex min-h-8 min-w-px flex-1 items-center justify-center rounded-lg px-2.5 py-[5.5px] text-sm font-medium whitespace-nowrap transition-colors duration-150 lg:flex-none lg:px-4",
              item.key === current
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
