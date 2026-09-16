import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminSidebarNav } from "@/components/admin/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logo } from "@/lib/assets/r2";

/**
 * Figma "Sidebar" (1042:15272), styled past the wireframe: brand row, the
 * two-level nav, and a Nexus-CmsUserMenu-style footer (avatar + identity +
 * sign-out). First consumer of the `--sidebar-*` token set.
 */
export function AdminSidebar() {
  const t = useTranslations("admin");

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="flex items-center gap-2 px-2 pt-1">
        <Image alt="Advisory Platform" className="h-6 w-auto" src={logo} />
        <p className="font-latin text-sm font-semibold text-sidebar-foreground">
          {t("nav.console")}
        </p>
      </div>
      <AdminSidebarNav />
      <div className="mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-2 pt-3">
        <Avatar className="size-8">
          <AvatarFallback className="font-latin text-xs">AD</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {t("nav.adminRole")}
          </p>
          <p className="font-latin truncate text-xs text-sidebar-foreground/60">
            admin@advisory.co.th
          </p>
        </div>
        <Button
          aria-label={t("nav.signOut")}
          render={<Link href="/admin/login" />}
          nativeButton={false}
          size="icon-sm"
          variant="ghost"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
