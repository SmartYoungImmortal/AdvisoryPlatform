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
    // `data-wide="md"` lifts the cap a breakpoint earlier, for a screen whose
    // layout is a single column of text rather than a frame of arranged blocks.
    // A document has nothing to rearrange at 768px, so holding it to 448 there
    // left a tablet showing a phone with 320px of empty page either side. The
    // `lg` rule stays for every other wide screen: those do have blocks to place,
    // and giving them the full width before their `lg:` variants exist would
    // stretch a phone layout across a tablet.
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:has-[[data-wide='md']]:max-w-none lg:has-[[data-wide]]:max-w-none">
      {children}
    </div>
  );
}
