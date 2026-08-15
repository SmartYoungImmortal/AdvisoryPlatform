import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/sidebar";
import { cn } from "@/lib/utils";

/**
 * Console frame — Figma "Admin Dashboard" (1042:15074): a 240px sidebar rail
 * beside a scrolling main column. The rail is sticky so only content scrolls.
 */
export function AdminShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-stretch">
      <AdminSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

/** Content gutter — 32px sides, capped so tables stay readable on ultrawide. */
export function AdminContent({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-6xl flex-col gap-6 px-8 py-6", className)}>
      {children}
    </div>
  );
}
