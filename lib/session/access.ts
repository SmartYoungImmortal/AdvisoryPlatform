import type { Role } from "@/lib/mock-db/types";

/**
 * Who may open a consumer route. Route groups do not line up with this — the
 * advisor's review inbox (`/reviews`) and screening desk live in the advisee
 * group because that is where their frames were filed — so it is a table of
 * path prefixes rather than one rule per group.
 */
export type Access = "public" | "signed-in" | Role;

const RULES: ReadonlyArray<{ readonly prefix: string; readonly exact?: boolean; readonly access: Access }> = [
  // Advisor workspace.
  { prefix: "/work", access: "advisor" },
  { prefix: "/advisor/profile", access: "advisor" },
  { prefix: "/advisor/edit", access: "advisor" },
  { prefix: "/advisor/services", access: "advisor" },
  { prefix: "/advisor/skills", access: "advisor" },
  { prefix: "/availability", access: "advisor" },
  { prefix: "/earnings", access: "advisor" },
  { prefix: "/screening/requests", access: "advisor" },
  { prefix: "/screening/review", access: "advisor" },
  { prefix: "/screening/setup", access: "advisor" },
  { prefix: "/reviews", exact: true, access: "advisor" },
  { prefix: "/reviews/empty", access: "advisor" },
  // Anything that is someone's own data.
  { prefix: "/profile", access: "signed-in" },
  { prefix: "/settings", access: "signed-in" },
  { prefix: "/chat", access: "signed-in" },
  { prefix: "/bookings", access: "signed-in" },
  { prefix: "/transactions", access: "signed-in" },
  { prefix: "/checkout", access: "signed-in" },
  { prefix: "/notifications", access: "signed-in" },
  { prefix: "/screening", access: "signed-in" },
  { prefix: "/reviews", access: "signed-in" },
  { prefix: "/advisor/apply", access: "signed-in" },
  { prefix: "/advisor-onboarding", access: "signed-in" },
];

function matches(pathname: string, prefix: string, exact: boolean): boolean {
  if (pathname === prefix) return true;
  return !exact && pathname.startsWith(`${prefix}/`);
}

export function requiredAccess(pathname: string): Access {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const rule = RULES.find((r) => matches(path, r.prefix, r.exact ?? false));
  return rule?.access ?? "public";
}

/** An admin may look at anything a user can; nobody else crosses roles. */
export function canAccess(access: Access, role: Role | null): boolean {
  if (access === "public") return true;
  if (!role) return false;
  if (access === "signed-in" || role === "admin") return true;
  return access === role;
}
