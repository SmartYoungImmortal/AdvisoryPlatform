/**
 * The widths the desktop layouts share, in one place.
 *
 * They were spelled out per file until now — `SECTION`, `ACCOUNT_PAGE` and
 * `PAGE_BAND` carried the same 1440/1200 string in three components, 800
 * appeared as both `lg:max-w-[800px]` and `lg:max-w-200`, and the footer stated
 * 1200 directly while everything else derived it from 1440 minus the inset. A
 * page inset is a decision, not a per-file detail, so it lives here.
 *
 * The inset itself is Figma's 120px, measured on a 1440 frame; below `xl` that
 * would eat the column, so it waits and `lg` takes 40.
 */

/**
 * The page: a 1440 frame, inset 32px at the tablet and 48 at the desktop.
 *
 * Figma draws a 1200 column inside a 1440 frame, which leaves 120px per side, and
 * that is what this used to spell (`xl:px-30`). Measured against the four shipped
 * frontends in this account, 120 is two to five times more inset than any of them:
 *
 *   everyday-cat-clinic-v2  max-w-[1440px] px-6 lg:px-12      24 → 48
 *   buddygroup-fe           mx-auto px-6 sm:px-12             24 → 48
 *   mochiice-fe             fixed inset-x-0 px-6              24, no max width
 *   buonogroup-fe           max-w-420 px-4 sm:px-8 lg:px-12 xl:px-16   16 → 64
 *
 * At 1440 the old value pinned everything a fifth of the viewport from the edge,
 * which read as a narrow document rather than a page. 48 matches two of the four
 * exactly and sits inside the range of all four. The 1440 cap stays, so the
 * content column is now 1344 rather than 1200.
 */
export const PAGE = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8 xl:px-12";

/**
 * The page, for a band whose blocks keep their own 24px inset — the remaining
 * 96 lands the content on the same 1200 column.
 */
export const PAGE_INSET_BLOCKS = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-4 xl:px-24";

/** A reading column: settings, feeds, documents — 800px centred in the page. */
export const READING_COLUMN = "lg:mx-auto lg:w-full lg:max-w-200";

/** A form or confirmation panel — 640px, the narrowest column that still holds a field row. */
export const NARROW_COLUMN = "lg:mx-auto lg:w-full lg:max-w-160";

/** The two-column split the detail pages use: content, then a sticky aside. */
export const SPLIT_WITH_ASIDE =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6";

/** The same split with the narrower rail the dashboards use. */
export const SPLIT_WITH_RAIL =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6";

/**
 * Room for the fixed tab bar, for a footer that ends a scrolling page under it.
 *
 * `BottomBar` is `h-18` (72px) and absolutely positioned, so it paints over
 * whatever the page ends on. The footer's own closing padding is 29px, and this
 * replaces it: 29 + 72 = 101. It was spelled as a bare `pb-[101px]` at one call
 * site, next to a `pb-[144px]` at another, with nothing saying where either number
 * came from — so the arithmetic lives here once instead.
 *
 * Only a page that both shows its footer on the phone *and* carries a tab bar
 * needs it. Most screens render the footer `hidden lg:flex`, where the tab bar and
 * the footer never meet.
 */
export const FOOTER_ABOVE_TAB_BAR = "pb-[101px] lg:pb-0";
