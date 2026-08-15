import type { ReactNode } from "react";

import { MobileViewport } from "@/components/mobile/viewport";

/** Mobile-canvas chrome for this route group — see `MobileViewport`. */
export default function GroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MobileViewport>{children}</MobileViewport>;
}
