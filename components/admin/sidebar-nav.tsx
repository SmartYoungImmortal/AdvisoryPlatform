"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  adminNav,
  isAdminNavActive,
  type AdminNavItem,
} from "@/lib/navigation/admin";
import { cn } from "@/lib/utils";

/**
 * Figma "Sidebar Item" (1042:15273). Section headers (User / Marketplace)
 * render as muted group labels; leaf rows get the accent pill when active —
 * the recursive rule from `lib/navigation/admin.ts` lights the whole path.
 */
export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full flex-col gap-4">
      {adminNav.map((item) =>
        item.children ? (
          <div className="flex w-full flex-col gap-0.5" key={item.key}>
            <SectionLabel item={item} />
            {item.children.map((child) => (
              <LeafRow
                active={isAdminNavActive(child, pathname)}
                item={child}
                key={child.key}
              />
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-0.5" key={item.key}>
            <LeafRow active={isAdminNavActive(item, pathname)} item={item} />
          </div>
        ),
      )}
    </nav>
  );
}

function SectionLabel({ item }: { readonly item: AdminNavItem }) {
  const t = useTranslations("admin");

  return (
    <p className="font-latin px-2 pb-1 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
      {t(`nav.${item.key}`)}
    </p>
  );
}

function LeafRow({
  item,
  active,
}: {
  readonly item: AdminNavItem;
  readonly active: boolean;
}) {
  const t = useTranslations("admin");
  const Icon = item.icon;

  return (
    <Link
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
      href={item.href ?? "/admin/dashboard"}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/50",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{t(`nav.${item.key}`)}</span>
    </Link>
  );
}
