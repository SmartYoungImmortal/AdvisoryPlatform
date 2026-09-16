import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/shell";

/** Everything except `/admin` + `/admin/login` renders inside the sidebar shell. */
export default function ConsoleLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
