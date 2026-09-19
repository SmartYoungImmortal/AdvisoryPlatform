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

/** The page: a 1440 frame with the 120px inset, giving the 1200 content column. */
export const PAGE = "lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-10 xl:px-30";

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
