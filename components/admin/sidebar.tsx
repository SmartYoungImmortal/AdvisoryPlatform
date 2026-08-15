import { useTranslations } from "next-intl";

import { AdminSidebarNav } from "@/components/admin/sidebar-nav";

/**
 * Figma "Sidebar" (1042:15272) — 240px rail on the `--sidebar-*` token set
 * (this is their first consumer). Static frame is a server component; only the
 * pathname-aware nav underneath is a client leaf.
 */
export function AdminSidebar() {
  const t = useTranslations("admin");

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground">
      <p className="font-latin px-2 text-base font-semibold text-sidebar-foreground">
        {t("nav.console")}
      </p>
      <AdminSidebarNav />
    </aside>
  );
}
