import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The desktop chrome Figma's "Desktop - Profile & account" (1787:25189) and
 * "Desktop - Reviews" (1787:26265) sections repeat on every frame: a back bar
 * under the app's nav, a white head band carrying the title, and the panel the
 * content sits in on the grey page.
 *
 * None of this is a second copy of a screen. Every screen in those sections is
 * still one file and one layout that answers to the viewport; these are only
 * the `lg:` parts that are identical across fourteen frames, kept in one place
 * the way `auth-chrome` holds the nav, footer and card the auth frames share.
 *
 * The reviews screens read this too — "my reviews" is reached from the profile
 * page and wears the same account chrome, so it states it once rather than
 * twice.
 */

/**
 * Figma's account column — the 800px measure the settings lists and forms
 * centre in the 1440 page. Blocks that spread it drop the phone's 24px inset,
 * which the column itself now provides.
 */
export const ACCOUNT_COLUMN = "lg:mx-auto lg:w-full lg:max-w-[800px] lg:px-0";

/** Figma's page column — 1200 wide, inset 120 from a 1440 page. */
export const ACCOUNT_PAGE = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-10 xl:px-30";

/**
 * Figma "Heading" inside the head band: 20px above the 28/40 title and 36px
 * below the block, which is what yields the band's 96px (title only) and 124px
 * (with subtitle) heights.
 */
export const ACCOUNT_HEADING = `${ACCOUNT_COLUMN} lg:pt-5 lg:pb-9`;

/**
 * Figma "Panel" — the white card the desktop frames float on the grey page.
 *
 * On the phone the same content is the screen itself, edge to edge, so this is
 * a set of `lg:` classes to spread onto the element that already wraps it
 * rather than a wrapper of its own. `lg:flex-none` releases the `flex-1` the
 * phone frame needs to push its action block to the bottom edge: the panel is
 * only as tall as its content.
 */
const PANEL =
  "lg:mx-auto lg:mt-12 lg:mb-24 lg:flex-none lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:shadow-[0_8px_24px_-4px_rgb(0_0_0/0.1),0_1px_2px_0_rgb(0_0_0/0.04)]";

/**
 * The 800px panel the two-column account forms sit in. Its 40px padding is the
 * whole inset, so the blocks inside drop their own — see `ACCOUNT_COLUMN`.
 */
export const ACCOUNT_FORM_PANEL = `${PANEL} lg:w-[800px] lg:p-10`;

/**
 * The 640px panel the confirmation screens sit in. Here the blocks keep the
 * phone's 24px inset — `WarningHero` carries its own and takes no class — so
 * the panel only adds the other 24 of Figma's 48.
 */
export const ACCOUNT_CONFIRM_PANEL = `${PANEL} lg:w-[640px] lg:px-6 lg:py-8`;

/**
 * Figma "Back Bar" — a 52px strip on the card surface below the nav: a 28px
 * chevron at the 120px page inset with its label 8px after it.
 *
 * Desktop only. The phone frames put the same control at the top of the screen
 * as a bare glyph outside the scroll container, which is `ScreenTopBar`; this
 * bar cannot be that element because it has to sit *under* the nav, inside the
 * scroller. So the two are one control drawn at two sizes, each hidden where
 * the other belongs.
 */
export function AccountBackBar({
  href,
  label,
  className,
}: {
  readonly href: string;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden w-full shrink-0 items-center bg-card lg:flex lg:h-13 lg:px-10 xl:px-30",
        className,
      )}
    >
      <Button
        className="h-auto shrink-0 gap-2 p-0 text-sm font-normal text-foreground hover:bg-transparent"
        // false only for the anchor form — this control is always a link.
        nativeButton={false}
        render={<Link href={href} />}
        variant="ghost"
      >
        <ChevronLeft className="size-7" />
        {label}
      </Button>
    </div>
  );
}

/**
 * Figma "Top Nav" on these frames is the app's own bar, which the phone frames
 * do not draw at all — they open on the back chevron. So it starts at `lg`.
 *
 * `TopBar` is a client component that observes `ScreenBody`; wrapping rather
 * than hiding it from the inside keeps that wiring intact and out of the phone
 * layout.
 */
export const ACCOUNT_NAV = "hidden w-full lg:block";
