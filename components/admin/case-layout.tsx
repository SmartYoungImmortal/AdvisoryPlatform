import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Case-desk archetype — Figma verification/refunds/reports (1042:15142,
 * 1042:15191, 1042:15219): left queue rail, right detail column, footer
 * action bar pinned bottom-right.
 */
export function CaseLayout({ children }: { readonly children: ReactNode }) {
  return <div className="flex min-h-0 w-full flex-1 items-stretch gap-6">{children}</div>;
}

export function CaseQueue({
  title,
  children,
}: {
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 border-r border-border pr-6">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function CaseDetail({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-6", className)}>
      {children}
    </div>
  );
}

export function CaseSection({
  title,
  children,
}: {
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

/**
 * One action box per desk (Nexus publish-box rule): primary right-most,
 * destructive beside it, both 160px like the wireframe footer buttons.
 */
export function CaseActionBar({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-auto flex w-full items-center justify-end gap-4 border-t border-border pt-4">
      {children}
    </div>
  );
}
