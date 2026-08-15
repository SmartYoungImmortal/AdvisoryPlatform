import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Page title band every console screen opens with (Figma 1042:15077 "Dashboard",
 * 1042:15081 "Users", …). Chrome belongs to the shell vocabulary, not to each
 * page — Nexus's route-meta-header pattern by props.
 */
export function AdminPageHeader({
  title,
  description,
  backHref,
  actions,
}: {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly backHref?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex w-full items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-2">
        {backHref ? (
          <Button
            aria-label="ย้อนกลับ"
            className="mt-0.5 shrink-0"
            render={<Link href={backHref} />}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="text-sm font-normal text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
