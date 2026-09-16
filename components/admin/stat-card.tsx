import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

/**
 * Dashboard KPI tile (net-new design — the wireframe dashboard frame is
 * empty): tinted icon chip, big value, optional hint. Links into the queue it
 * counts.
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
    <Card className="h-full w-full flex-row items-center gap-4 p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-normal text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl leading-8 font-semibold text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="truncate text-xs font-normal text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  );

  if (!href) return card;
  return (
    <Link
      className="min-w-0 flex-1 rounded-xl transition-shadow hover:shadow-sm"
      href={href}
    >
      {card}
    </Link>
  );
}
