"use client";

import type { ReactNode } from "react";

import { MobileViewport } from "@/components/mobile/viewport";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/client";

/** Mobile-canvas chrome for this route group — see `MobileViewport`. */
export default function GroupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileViewport>{children}</MobileViewport>
    </QueryClientProvider>
  );
}
