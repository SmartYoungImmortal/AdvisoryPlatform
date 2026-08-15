import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Unifies the wireframe queue items — "Name Card" (1042:15150), "Refund Queue
 * Card" (1042:15199), "Report Queue Card" (1042:15227): title line, optional
 * subtitle, optional avatar chip, selected = the case open on the right.
 */
export function QueueCard({
  href,
  title,
  subtitle,
  avatarName,
  badge,
  selected = false,
}: {
  readonly href: string;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly avatarName?: string;
  readonly badge?: ReactNode;
  readonly selected?: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5",
        selected
          ? "border-primary/40 bg-card shadow-xs"
          : "border-border/60 bg-card/60 hover:bg-card hover:shadow-xs",
      )}
      href={href}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
        {badge}
      </span>
      {subtitle || avatarName ? (
        <span className="flex w-full items-center gap-1.5">
          {avatarName ? (
            <Avatar className="size-5">
              <AvatarFallback className="font-latin text-xs">
                {initials(avatarName)}
              </AvatarFallback>
            </Avatar>
          ) : null}
          {subtitle ? (
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
