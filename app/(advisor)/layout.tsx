import type { ReactNode } from "react";

import { MobileViewport } from "@/components/mobile/viewport";
import { NotificationToaster } from "@/components/notifications/notification-toaster";
import { AccessGate } from "@/components/session/access-gate";

/**
 * Mobile-canvas chrome for this route group — see `MobileViewport`. Every route
 * here is the advisor's workspace, so the gate needs an advisor session.
 */
export default function GroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MobileViewport>
      <AccessGate access="advisor">{children}</AccessGate>
      <NotificationToaster />
    </MobileViewport>
  );
}
