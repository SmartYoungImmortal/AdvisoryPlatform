import {
  ArrowLeftRight,
  Banknote,
  Flag,
  LayoutDashboard,
  LucideIcon,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

/**
 * Admin Console sidebar tree — Figma "Sidebar" (1042:15272). Nexus-style
 * config-driven nav: structure lives here, labels resolve through the
 * `admin.nav.*` i18n namespace, routes derive from `href`. `payouts` and
 * `transactions` extend the wireframe per the ER's manual-payout gap.
 */
export const adminNavKeys = [
  "dashboard",
  "user",
  "userSearch",
  "verification",
  "marketplace",
  "services",
  "manage",
  "refunds",
  "reports",
  "payouts",
  "transactions",
] as const;

export type AdminNavKeys = (typeof adminNavKeys)[number];

export type AdminNavItem = {
  readonly key: AdminNavKeys;
  /** Section headers (`user`, `marketplace`) have no destination. */
  readonly href?: string;
  readonly icon: LucideIcon;
  readonly children?: ReadonlyArray<AdminNavItem>;
};

export const adminNav: ReadonlyArray<AdminNavItem> = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    key: "user",
    icon: Users,
    children: [
      { key: "userSearch", href: "/admin/users", icon: Search },
      { key: "verification", href: "/admin/verification", icon: ShieldCheck },
    ],
  },
  {
    key: "marketplace",
    icon: Store,
    children: [
      { key: "services", href: "/admin/services", icon: Search },
      { key: "manage", href: "/admin/manage", icon: Settings },
      { key: "refunds", href: "/admin/refunds", icon: Receipt },
      { key: "reports", href: "/admin/reports", icon: Flag },
      { key: "payouts", href: "/admin/payouts", icon: Banknote },
      { key: "transactions", href: "/admin/transactions", icon: ArrowLeftRight },
    ],
  },
] as const;

/**
 * Nexus `applyActive` translated: a node is active when the path is its href or
 * sits underneath it, or when any descendant is active (lights up the section
 * header). Dashboard lives at `/admin/dashboard`, so the plain prefix rule
 * needs no `/admin` special case.
 */
export function isAdminNavActive(
  item: AdminNavItem,
  pathname: string,
): boolean {
  if (
    item.href &&
    (pathname === item.href || pathname.startsWith(`${item.href}/`))
  ) {
    return true;
  }
  return item.children?.some((child) => isAdminNavActive(child, pathname)) ?? false;
}
