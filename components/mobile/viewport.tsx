import type { ReactNode } from "react";

/**
 * The 448px mobile canvas that used to live on `<body>` (`max-w-md w-full flex
 * flex-col mx-auto`). Hoisted into a wrapper so the admin console can render
 * desktop-wide under the same root layout. `min-h-dvh` stands in for the old
 * `min-h-full`: the parent chain no longer guarantees a resolvable %-height.
 */
export function MobileViewport({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {children}
    </div>
  );
}
