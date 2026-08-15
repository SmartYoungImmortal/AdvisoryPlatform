import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

/**
 * Dashboard KPI tile (net-new design — the wireframe dashboard frame is
 * empty). Links into the queue it counts, per the "stat cards are doors"
 * pattern.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
  readonly hint?: ReactNode;
  readonly icon: LucideIcon;
  readonly href?: string;
}) {
  const card = (
    <Card className="h-full w-full gap-2 p-5">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="text-sm font-normal text-muted-foreground">{label}</p>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {hint ? (
        <p className="text-xs font-normal text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );

  if (!href) return card;
  return (
    <Link className="min-w-0 flex-1 rounded-xl transition-opacity hover:opacity-80" href={href}>
      {card}
    </Link>
  );
}
