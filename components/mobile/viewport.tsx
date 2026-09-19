import type { ReactNode } from "react";

/**
 * The 448px mobile canvas that used to live on `<body>` (`max-w-md w-full flex
 * flex-col mx-auto`). Hoisted into a wrapper so the admin console can render
 * desktop-wide under the same root layout. `min-h-dvh` stands in for the old
 * `min-h-full`: the parent chain no longer guarantees a resolvable %-height.
 *
 * A screen that has its own wide layout (Figma's "Desktop / …" frames) lifts the
 * cap from here by marking itself `data-wide` — `MobileScreen`'s `wide` prop.
 * The cap is on this wrapper, so the screen cannot grow past it on its own; the
 * `:has()` test is what lets one route be responsive while the rest of the group
 * stays on the phone canvas, without a second layout file to put it in.
 */
export function MobileViewport({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:has-[[data-wide]]:max-w-none">
      {children}
    </div>
  );
}
