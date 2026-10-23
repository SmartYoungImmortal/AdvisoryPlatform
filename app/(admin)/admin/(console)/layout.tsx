import { Suspense, type ReactNode } from "react";

import { CmsDashboard } from "@/components/cms/layout";
import { AccessGate } from "@/components/session/access-gate";

/**
 * Everything except `/admin` and `/admin/login` sits in the sidebar shell, and
 * only an admin session gets in — Nexus's `admin-auth` middleware, run in the
 * browser because the export has no server.
 *
 * The Suspense boundary is for the list screens, which keep their filters in the
 * query string through `useSearchParams`.
 */
export default function ConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AccessGate access="admin" loginHref="/admin/login">
      <CmsDashboard>
        <Suspense fallback={null}>{children}</Suspense>
      </CmsDashboard>
    </AccessGate>
  );
}
