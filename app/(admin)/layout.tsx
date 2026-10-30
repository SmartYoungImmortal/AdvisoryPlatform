import type { ReactNode } from "react";

import { CmsFeedbackProvider } from "@/components/cms/feedback";
import { CmsThemeScope } from "@/components/cms/layout";

/**
 * The admin console. Full width, unlike the 448px `MobileViewport` the consumer
 * groups wrap themselves in, and themed by `.cms-admin` (see `app/globals.css`):
 * the site's own neutral greys and ink, scoped to the console.
 */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <CmsThemeScope>
      <CmsFeedbackProvider>{children}</CmsFeedbackProvider>
    </CmsThemeScope>
  );
}
