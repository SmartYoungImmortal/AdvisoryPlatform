import {
  ArrowLeftRight,
  Banknote,
  Flag,
  LayoutDashboard,
  Radar,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The console's sidebar, in Nexus's shape: top-level links and collapsible groups
 * whose children carry the highlight bar. Labels resolve through `cms.nav.*`.
 * Group and item names follow Figma's admin sidebar (1952:36339): Dashboard,
 * User (ค้นหา, ยืนยันตัวตน), Marketplace (… คืนเงิน, รายงาน), plus the desks the
 * brief adds — off-platform detection, payouts and transactions.
 */
export type CmsNavKey =
  | "dashboard"
  | "user"
  | "users"
  | "verification"
  | "marketplace"
  | "services"
  | "catalog"
  | "refunds"
  | "reports"
  | "offPlatform"
  | "finance"
  | "payouts"
  | "transactions";

export type CmsNavItem = {
  readonly key: CmsNavKey;
  readonly icon: LucideIcon;
  readonly href?: string;
  readonly children?: ReadonlyArray<CmsNavItem>;
};

export const cmsNav: ReadonlyArray<CmsNavItem> = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    key: "user",
    icon: Users,
    children: [
      { key: "users", href: "/admin/users", icon: Search },
      { key: "verification", href: "/admin/verification", icon: ShieldCheck },
    ],
  },
  {
    key: "marketplace",
    icon: Store,
    children: [
      { key: "services", href: "/admin/services", icon: Store },
      { key: "catalog", href: "/admin/manage", icon: Tags },
      { key: "refunds", href: "/admin/refunds", icon: Receipt },
      { key: "reports", href: "/admin/reports", icon: Flag },
      { key: "offPlatform", href: "/admin/off-platform", icon: Radar },
    ],
  },
  {
    key: "finance",
    icon: Settings2,
    children: [
      { key: "payouts", href: "/admin/payouts", icon: Banknote },
      { key: "transactions", href: "/admin/transactions", icon: ArrowLeftRight },
    ],
  },
];

/** Nexus's `applyActive`: a link is active on its path or anything under it. */
export function isCmsNavActive(item: CmsNavItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
    return true;
  }
  return item.children?.some((child) => isCmsNavActive(child, pathname)) ?? false;
}
