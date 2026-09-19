import type { ReactNode } from "react";

import { CmsFeedbackProvider } from "@/components/cms/feedback";
import { CmsThemeScope } from "@/components/cms/layout";

/**
 * The admin console — Nexus's CMS ported to React. Full width, unlike the 448px
 * `MobileViewport` the consumer groups wrap themselves in, and themed with
 * Nexus's black/white `.cms-admin` tokens (see `app/globals.css`).
 */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <CmsThemeScope>
      <CmsFeedbackProvider>{children}</CmsFeedbackProvider>
    </CmsThemeScope>
  );
}
