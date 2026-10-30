import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One titled part of a page, flat on the white panel the way the settings
 * page's categories are: a 16px semibold heading with an optional muted line
 * under it, then the content. No box of its own: parts are told apart by the
 * space between them and by the hairlines of the rows inside.
 */
export function CmsSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)}>
      {title !== undefined || actions !== undefined ? (
        <header className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {title !== undefined ? (
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            ) : null}
            {description !== undefined ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Nothing to show, said the way the site's own empty states say it (`Notice`
 * on the service page, an empty transaction history): the subject's glyph in
 * a soft grey disc, one semibold line, a muted one under it, and the way on
 * when there is one. Centred, and no frame of its own.
 */
export function CmsEmpty({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly body?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-hero-ink/75">
        <Icon aria-hidden className="size-6" strokeWidth={1.5} />
      </span>
      <div className="flex max-w-sm flex-col items-center gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {body ? <p className="text-sm text-balance text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
