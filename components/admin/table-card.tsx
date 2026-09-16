import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Nexus CmsTable's three-band anatomy as a surface: toolbar (search +
 * actions), table body, footer (row count). Tables never float bare on the
 * canvas — they live in this card.
 */
export function TableCard({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Card className={cn("w-full gap-0 overflow-hidden p-0", className)}>
      {children}
    </Card>
  );
}

export function TableCardToolbar({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-border px-4 py-3">
      {children}
    </div>
  );
}

export function TableCardFooter({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
