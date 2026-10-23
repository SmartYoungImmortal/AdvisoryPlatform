"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { roleHome, useSession } from "@/lib/session";
import { canAccess, requiredAccess, type Access } from "@/lib/session/access";

/**
 * Keeps signed-out and wrong-role visitors off the routes `requiredAccess` guards.
 *
 * There is no server to redirect from — the site is a static export — so this
 * runs in the browser: the page renders nothing until the session is known, then
 * either shows itself or replaces the URL. Signed-out visitors go to `loginHref`
 * with `?next=` so the login screen can bring them back.
 */
export function AccessGate({
  children,
  access: fixed,
  loginHref = "/login",
}: {
  readonly children: ReactNode;
  /** Overrides the path table — the admin console guards everything it holds. */
  readonly access?: Access;
  readonly loginHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const access = fixed ?? requiredAccess(pathname);
  const role = session.status === "authenticated" ? session.account.role : null;
  const allowed = canAccess(access, role);
  const decided = access === "public" || session.status !== "loading";

  useEffect(() => {
    if (!decided || allowed) return;
    if (role) {
      router.replace(roleHome(role));
    } else {
      router.replace(`${loginHref}?next=${encodeURIComponent(pathname)}`);
    }
  }, [allowed, decided, loginHref, pathname, role, router]);

  if (!decided || !allowed) return null;
  return children;
}
