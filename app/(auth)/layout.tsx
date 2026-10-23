import type { ReactNode } from "react";

import { MobileViewport } from "@/components/mobile/viewport";
import { AccessGate } from "@/components/session/access-gate";

/**
 * Mobile-canvas chrome for this route group — see `MobileViewport`. Sign-in and
 * sign-up are public; advisor onboarding needs the account it is upgrading.
 */
export default function GroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MobileViewport>
      <AccessGate>{children}</AccessGate>
    </MobileViewport>
  );
}
