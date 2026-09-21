import {
  ArrowLeftRight,
  Banknote,
  FileBadge,
  Flag,
  LayoutDashboard,
  Radar,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Database } from "@/lib/mock-db/types";

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
  | "skillProofs"
  | "marketplace"
  | "services"
  | "catalog"
  | "skills"
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
  /** How many items wait on this desk — the badge beside the label. */
  readonly pending?: (db: Database) => number;
};

export const cmsNav: ReadonlyArray<CmsNavItem> = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    key: "user",
    icon: Users,
    children: [
      { key: "users", href: "/admin/users", icon: Search },
      {
        key: "verification",
        href: "/admin/verification",
        icon: ShieldCheck,
        pending: (db) => db.identityRequests.filter((r) => r.status === "submitted").length,
      },
      {
        key: "skillProofs",
        href: "/admin/skill-proofs",
        icon: FileBadge,
        pending: (db) => db.skillProofs.filter((p) => p.status === "pending").length,
      },
    ],
  },
  {
    key: "marketplace",
    icon: Store,
    children: [
      { key: "services", href: "/admin/services", icon: Store },
      { key: "catalog", href: "/admin/manage", icon: Tags },
      { key: "skills", href: "/admin/skills", icon: Sparkles },
      {
        key: "refunds",
        href: "/admin/refunds",
        icon: Receipt,
        pending: (db) => db.refunds.filter((r) => r.status === "pending").length,
      },
      {
        key: "reports",
        href: "/admin/reports",
        icon: Flag,
        pending: (db) => db.reports.filter((r) => r.status === "open").length,
      },
      {
        key: "offPlatform",
        href: "/admin/off-platform",
        icon: Radar,
        pending: (db) => db.offPlatformFlags.filter((f) => f.status === "open").length,
      },
    ],
  },
  {
    key: "finance",
    icon: Settings2,
    children: [
      {
        key: "payouts",
        href: "/admin/payouts",
        icon: Banknote,
        pending: (db) => db.payouts.filter((p) => p.status !== "paid").length,
      },
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
