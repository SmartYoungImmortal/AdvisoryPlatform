import Image, { type StaticImageData } from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * What a list says when it has nothing to show.
 *
 * The console answers this everywhere; the consumer screens answered it twice
 * (the chat inbox and the review list) and everywhere else mapped a fixture
 * that is never empty — so the day the data is real, those screens render an
 * empty rounded box. This is the shape they should all take: a mark, a line
 * that says what is missing, a line that says what to do, and the action.
 *
 * The mark is an illustration where one exists — `lib/assets/r2` ships six that
 * only two screens use — and a glyph in a muted circle where none does.
 */
export function EmptyState({
  illustration,
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  readonly illustration?: StaticImageData;
  readonly icon?: LucideIcon;
  readonly title: ReactNode;
  readonly body?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      {illustration ? (
        <Image alt="" className="size-40 shrink-0 lg:size-48" src={illustration} />
      ) : Icon ? (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon aria-hidden className="size-7 text-muted-foreground" />
        </span>
      ) : null}
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {body ? (
        <p className="max-w-80 text-sm font-normal text-muted-foreground">{body}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
