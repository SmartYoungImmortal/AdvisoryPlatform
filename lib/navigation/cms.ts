import {
  Banknote,
  Flag,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The console's sidebar: one flat list of desks under three small headings,
 * labels from `cms.nav.*`.
 *
 * Seven desks, where there were twelve under three collapsible groups. The
 * near-duplicates became tabs of one page: identity checks and skill
 * documents are both "verify an advisor" (`/admin/verification`), user reports
 * and the scanner's off-platform flags are both "a case to rule on"
 * (`/admin/reports`), and categories and skills are both one-field lists of
 * names (`/admin/manage`). The transactions screen is gone: no API route lists
 * a payment, so it could only ever show fixture rows.
 */
export type CmsNavKey =
  | "dashboard"
  | "users"
  | "verification"
  | "reports"
  | "services"
  | "catalog"
  | "refunds"
  | "payouts";

export type CmsNavGroupKey = "overview" | "people" | "marketplace" | "finance";

/** Which waiting count (`useDashboardCounts`) a desk shows beside its name. */
export type CmsNavCount = "verification" | "cases" | "refunds" | "payouts";

export type CmsNavItem = {
  readonly key: CmsNavKey;
  readonly icon: LucideIcon;
  readonly href: string;
  readonly count?: CmsNavCount;
};

export type CmsNavGroup = {
  readonly key: CmsNavGroupKey;
  /** The overview opens the list on its own, with no heading over it. */
  readonly titled: boolean;
  readonly items: ReadonlyArray<CmsNavItem>;
};

export const cmsNav: ReadonlyArray<CmsNavGroup> = [
  {
    key: "overview",
    titled: false,
    items: [{ key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    key: "people",
    titled: true,
    items: [
      { key: "users", href: "/admin/users", icon: Users },
      { key: "verification", href: "/admin/verification", icon: ShieldCheck, count: "verification" },
      { key: "reports", href: "/admin/reports", icon: Flag, count: "cases" },
    ],
  },
  {
    key: "marketplace",
    titled: true,
    items: [
      { key: "services", href: "/admin/services", icon: Store },
      { key: "catalog", href: "/admin/manage", icon: Tags },
    ],
  },
  {
    key: "finance",
    titled: true,
    items: [
      { key: "refunds", href: "/admin/refunds", icon: Receipt, count: "refunds" },
      { key: "payouts", href: "/admin/payouts", icon: Banknote, count: "payouts" },
    ],
  },
];

/** A desk is current on its own path and on every record page under it. */
export function isCmsNavActive(item: CmsNavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
