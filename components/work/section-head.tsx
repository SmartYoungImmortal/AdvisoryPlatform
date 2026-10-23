import type { ReactNode } from "react";

/**
 * Figma section head — a semibold title with a muted count or link trailing.
 *
 * It lives in a module of its own rather than in `work-hub` because the session
 * sheet is a client component: importing it from the hub would drag the app bar,
 * the tab bar and the site footer into that bundle with it.
 *
 * 16/24 against a phone frame, 18/28 once there is a 1200 column to fill — at the
 * phone size a desktop section head was the same weight as the body copy under it.
 */
export function WorkSectionHead({
  title,
  trailing,
}: {
  readonly title: ReactNode;
  readonly trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground lg:text-lg">
        {title}
      </h2>
      {trailing}
    </div>
  );
}
