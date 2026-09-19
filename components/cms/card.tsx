import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Nuxt UI's `UCard`: white, a 1px ring, 8px radius, hairlines between header,
 * body and footer, `p-4 sm:p-6` in the body.
 */
export function CmsCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly footer?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
}) {
  const hasHeader = title !== undefined || actions !== undefined;
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col divide-y divide-border overflow-hidden rounded-lg bg-card ring-1 ring-border",
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            {title !== undefined ? (
              <h2 className="truncate text-base font-semibold text-highlighted">{title}</h2>
            ) : null}
            {description !== undefined ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children !== undefined ? (
        <div className={cn("p-4 sm:p-6", bodyClassName)}>{children}</div>
      ) : null}
      {footer !== undefined ? <footer className="px-4 py-3 sm:px-6">{footer}</footer> : null}
    </section>
  );
}
