"use client";

import type { ReactNode } from "react";

import type { RailKey } from "@/components/account/app-frame";
import { cn } from "@/lib/utils";

/**
 * The page's column inside the app frame's white panel (`AppFrame`, in
 * `app-frame.tsx`): the 1710 design space zoomed by `app-scale` (0.842 from
 * 1440 up, so it renders at the same pixel on every desktop width), an inset
 * from the panel's edge, and a width the eye can follow on
 * a wide screen. Type inside it with the `text-frame-*` steps.
 *
 * It used to carry the account's sidebar too; that is now the frame's rail,
 * which sits outside the scroller. So a framed page is:
 *
 * ```tsx
 * <MobileScreen className="pb-0" wide="md">
 *   <AppFrame active="settings">
 *     <ScreenBody className="bg-card">
 *       <div className={PHONE_BAR}><TopBar dock unreadNotifications /></div>
 *       <AccountShell active="settings">{...the page...}</AccountShell>
 *     </ScreenBody>
 *   </AppFrame>
 * </MobileScreen>
 * ```
 *
 * - **Below `lg` nothing changes**: the box is `display: contents`, so the
 *   page's own blocks are `ScreenBody`'s children exactly as before, and only
 *   `lg:` classes in `className` have any effect.
 * - **From `lg`** it is a flex column, laid out in the 1710 space and zoomed
 *   by `app-scale`, so do not add `PAGE`, `doc-scale`, `app-scale` or a
 *   centring width inside it.
 * - **Height.** It grows to fill the panel (`lg:grow`). A page that fills the
 *   screen and scrolls inside its own pane (chat) passes
 *   `className="lg:min-h-0 lg:shrink lg:basis-0"`: the column then takes
 *   exactly the panel's height, and the pane inside takes
 *   `lg:min-h-0 lg:flex-1` and scrolls itself.
 * - **`compact`** gives the page the whole panel, edge to edge (chat).
 * - **`active`** is kept so pages written for the sidebar still compile; the
 *   rail's current item is `AppFrame`'s own `active`.
 */
export function AccountShell({
  children,
  compact = false,
  className,
}: {
  /** Kept for the pages written against the sidebar; see `AppFrame`'s `active`. */
  readonly active?: AccountSection;
  readonly children: ReactNode;
  /** The whole panel, edge to edge, for a page that needs the room (chat). */
  readonly compact?: boolean;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        // The page column: 36px in from the panel's edges and 40
        // down, and at most 1434 wide, centred in the panel once the panel is
        // wider than that (measured at 1440 and 1728, written at x1.1875).
        "app-scale contents lg:flex lg:w-full lg:max-w-[1702.875px] lg:shrink-0 lg:grow lg:flex-col lg:px-[42.75px] lg:pt-[47.5px] lg:pb-16",
        compact && "lg:max-w-none lg:p-0",
        className,
      )}
      data-slot="account-shell"
    >
      {children}
    </div>
  );
}

/** The account's places, as the pages written for the old sidebar name them. */
export type AccountSection = Extract<RailKey, "profile" | "bookings" | "chat" | "notifications" | "settings"> | "transactions";

/**
 * Kept for pages written against the old sidebar layout, which showed their
 * `TopBar` from `lg` only. The frame has no top bar at all on a desktop, so
 * this now renders nothing; use `PHONE_BAR` from `app-frame` for the phone's.
 */
export const DESKTOP_BAR = "hidden";

/**
 * For a page whose insides are still phone-sized, until it is redesigned for
 * the frame: inside the column's zoom (`app-scale`, 0.842) its 12 and 14px
 * type would land at 10 and 12 and its 32px buttons at 27, so from `lg` this
 * sets them on the frame's steps instead (a label at 12, a supporting line at
 * 14, a 40px button). Put it on a wrapper around the page's blocks
 * (`contents` keeps the layout as it was); descendant selectors, so the
 * shared primitives stay untouched.
 */
export const DESKTOP_TYPE_LIFT =
  "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm]:text-frame-meta lg:[&_[data-slot=button]]:h-12 lg:[&_[data-slot=button]]:px-4";
