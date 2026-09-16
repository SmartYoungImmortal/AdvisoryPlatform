import type { ReactNode } from "react";

import { MobileViewport } from "@/components/mobile/viewport";
import { AccessGate } from "@/components/session/access-gate";

/**
 * Mobile-canvas chrome for this route group — see `MobileViewport`. The gate
 * holds back the routes that need a session; see `lib/session/access`.
 */
export default function GroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MobileViewport>
      <AccessGate>{children}</AccessGate>
    </MobileViewport>
  );
}
