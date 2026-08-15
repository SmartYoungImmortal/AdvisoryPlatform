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
 * Figma "Sidebar Item" (1042:15273, Level=Default/Level2). Two-level tree,
 * always expanded like the wireframe; hierarchy reads through indent plus the
 * Level2 guide line. Active state follows the recursive Nexus rule from
 * `lib/navigation/admin.ts`.
 */
export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full flex-col gap-1">
      {adminNav.map((item) => (
        <div className="flex w-full flex-col gap-1" key={item.key}>
          <NavRow active={isAdminNavActive(item, pathname)} item={item} />
          {item.children ? (
            <div className="mb-1 ml-4 flex flex-col gap-1 border-l border-sidebar-border pl-2">
              {item.children.map((child) => (
                <NavRow
                  active={isAdminNavActive(child, pathname)}
                  item={child}
                  key={child.key}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function NavRow({
  item,
  active,
}: {
  readonly item: AdminNavItem;
  readonly active: boolean;
}) {
  const t = useTranslations("admin");
  const Icon = item.icon;
  const rowClass = cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
    active ? "font-medium text-sidebar-primary" : "text-sidebar-foreground/70",
    active && item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
    !item.href && "font-medium text-sidebar-foreground",
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{t(`nav.${item.key}`)}</span>
    </>
  );

  if (!item.href) {
    return <p className={rowClass}>{content}</p>;
  }
  return (
    <Link className={cn(rowClass, "hover:bg-sidebar-accent")} href={item.href}>
      {content}
    </Link>
  );
}
