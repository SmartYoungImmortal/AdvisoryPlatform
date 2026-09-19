import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/**
 * The shape both legal pages are set in.
 *
 * The text layout is lifted from the Buono Group site (`app/pages/terms.vue`,
 * `app/pages/policy.vue` and its `SharedLegalSections`), which is a real legal
 * document rather than the five-card stack these two screens used to be. What is
 * taken from it is only the typography and the rhythm:
 *
 * - a title page: h1, then the effective date, then a lead paragraph that says
 *   what the document is and who the parties are;
 * - numbered sections where the numeral is its own muted column beside the
 *   heading, so the reader can scan the ordinals without reading the titles;
 * - one reading column, centred, holding the whole document at one measure;
 * - 16px between paragraphs, 16px from a heading to its first paragraph, and
 *   four times that between sections, which is what makes a wall of clauses
 *   legible;
 * - bullets as a real `<ul>`, indented past the prose, 8px apart;
 * - a rule and a line of small print to close.
 *
 * Nothing else comes across. Its colours, its fonts, its 848px literal, its
 * centred text and its Vue idioms are all replaced by this app's own tokens,
 * `READING_COLUMN` and primitives. Its "Country-Specific Information" band is
 * deliberately absent: this product sells advice in one market.
 */

/** One numbered clause: a heading, its paragraphs, and an optional list. */
export type LegalSectionData = {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
};

/**
 * The measure, at all three widths.
 *
 * On the phone the document is the screen, so the column is the frame minus the
 * 24px gutter every other screen uses. At `md` the gutter opens to 32 — the
 * route group's canvas is still capped at 448px there (see `MobileViewport`), so
 * the tablet gains margin rather than measure. From `lg` the cap lifts and
 * `READING_COLUMN` takes over: 800px centred in whatever the page is, which is
 * the closest thing this app has to the reference's 848.
 */
const COLUMN = cn("w-full shrink-0 px-6 md:px-8", "lg:mx-auto lg:max-w-212");

/**
 * The title page's own, narrower measure.
 *
 * The reference sets its hero in 652 and its clauses in 848, so the title sits
 * in a tighter column than the text under it. Both are on this app's spacing
 * scale exactly — 163 and 212 quarter-rem steps — so neither needs an arbitrary
 * value.
 */
const HERO_COLUMN = cn("w-full shrink-0 px-6 md:px-8", "lg:mx-auto lg:max-w-163");

/** A block on the document's measure — for anything a page adds of its own. */
export function LegalColumn({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={cn(COLUMN, className)}>{children}</div>;
}

/**
 * `TYPE_LADDER` — the one place the sizes are decided, so they can be checked.
 *
 * | element        | 402 | 768 | 1280 |
 * |----------------|-----|-----|------|
 * | h1 (title)     |  30 |  36 |   48 |
 * | effective date |  14 |  16 |   18 |
 * | h2 (clause)    |  20 |  24 |   24 |
 * | body, bullets  |  16 |  18 |   18 |
 *
 * Strictly descending in every column, which is the property the reference does
 * not have: it sets its h1 at 18 and its clause headings at 22, so on a phone the
 * document's own title is smaller than every heading inside it.
 */

/** The type the prose is set in, shared by paragraphs and list items. */
/**
 * The prose, at the reference's own weight.
 *
 * Its body is `#364153` — a dark slate, not a muted grey — and it steps to 18px
 * at the tablet, not at the desktop. Both matter: a legal document is the one
 * place where the body text *is* the page, and setting it in
 * `text-muted-foreground` made the whole document read as secondary to nothing.
 */
const PROSE = "text-base leading-relaxed font-normal text-foreground md:text-lg";

function LegalSection({
  number,
  section,
}: {
  readonly number: number;
  readonly section: LegalSectionData;
}) {
  return (
    <section className={cn(COLUMN, "flex flex-col items-start")}>
      {/* The numeral is a sibling of the heading rather than a `::marker` or a
          prefix baked into the string: it has to be able to carry its own
          colour, and the copy has to stay renumberable without editing every
          key. Both take the same three type steps so their baselines agree. */}
      <div className="flex w-full items-start gap-3">
        {/* `lg:min-w-11` turns the numerals into a column so every title starts
            at the same x whether its ordinal is one digit or two, and 44 + the
            12px gap is where `lg:pl-14` below puts the prose. A min-width rather
            than a width: a numeral wider than the column pushes its own title
            across instead of overlapping it. Below `lg` the numeral sizes to
            itself — the prose is not indented there, so there is no column to
            hold, and a 402px measure cannot spare 44px to a "1.". */}
        <span className="shrink-0 font-latin text-xl font-bold tabular-nums text-muted-foreground md:text-2xl">
          {`${number}.`}
        </span>
        {/* No `ThaiText` here, deliberately. It renders each space-delimited run
            as a `whitespace-nowrap` span, and these titles have no spaces at all
            ("สถานะของแพลตฟอร์มและความสัมพันธ์กับที่ปรึกษา" is one 44-character
            run) — at 402px that run is wider than the column and would overflow
            rather than wrap. There is no Figma frame to match a break point to,
            so Chrome's dictionary segmentation is the right behaviour. */}
        <h2 className="min-w-px flex-1 text-xl font-bold text-foreground md:text-2xl">
          {section.title}
        </h2>
      </div>

      {/* From `lg` the body hangs under the title instead of under the numeral,
          which is what turns the ordinals into a scannable column. On the phone
          and the tablet there is no width to give away, so the prose keeps the
          full measure. */}
      {/* The reference hangs the body under the title from the tablet up, at a
          flat 32px, and leaves it on the full measure below that. */}
      <div className="flex w-full flex-col items-start gap-4 pt-4 md:pl-8">
        {section.paragraphs.map((paragraph) => (
          <p className={cn("w-full", PROSE)} key={paragraph}>
            {paragraph}
          </p>
        ))}
        {section.bullets?.length ? (
          <ul className={cn("flex w-full list-outside list-disc flex-col gap-2 pl-5", PROSE)}>
            {section.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/**
 * A legal page: chrome, title page, numbered sections, then whatever the page
 * closes on.
 *
 * The chrome is the site's, not the sign-up flow's. These two routes are public
 * documents linked from the footer of every page, so they wear `TopBar` and
 * `SiteFooter`, the same pair `/landing` wears, rather than the `AuthTopNav` /
 * `AuthFooter` pair. That pair is chrome for a 448px form panel and only exists
 * from `lg`, which is why the phone and tablet frames of these two pages had no
 * header and no footer at all.
 *
 * `login` for the same reason `/landing` passes it: the trailing slot is a bell
 * to `/notifications` otherwise, and that route is `signed-in`, so a reader who
 * arrived here from the sign-up form or from the footer would be bounced to the
 * login screen by their own nav bar. The cost is that a signed-in reader sees a
 * sign-in link on a page they reached from their own settings; `/landing`
 * already makes the same trade, and a dead end is the worse of the two.
 */
export function LegalDocument({
  title,
  effective,
  lead,
  sections,
  children,
}: {
  readonly title: string;
  readonly effective: string;
  readonly lead: string;
  readonly sections: readonly LegalSectionData[];
  /** What the document closes on — one sentence and a contact address. */
  readonly children?: ReactNode;
}) {
  return (
    // `"md"` rather than `true`: a document is one column of text, so there is
    // nothing for the 448px cap to protect at 768px — it only produced a
    // phone-width page floating in an empty tablet. See `MobileViewport`.
    <MobileScreen wide="md">
      <ScreenBody>
        <TopBar login />
        {/* `flex-1` so a short document still pushes the footer to the bottom
            edge rather than leaving it floating mid-page. */}
        <article className="flex w-full flex-1 flex-col items-center pb-12 lg:pb-20">
          {/* The reference gives its title page 96px of air above the h1. It can:
              nothing sits above it. Here the sticky bar already holds that band,
              so the title starts at the gutter's own rhythm and takes its room
              below instead. */}
          {/* Centred, like the reference's title page: the h1 and the effective
              date sit on their own narrower measure, and only the clauses below
              are flush left. */}
          <header
            className={cn(
              HERO_COLUMN,
              "flex flex-col items-center gap-6 pt-8 pb-10 text-center lg:pt-14 lg:pb-14",
            )}
          >
            {/* The reference sets its own h1 at 18px on the phone, which is
                *smaller* than the 22px it gives each clause heading — the title
                of the document ends up the third-largest thing on it. That is a
                flaw in the reference, not a house style, so the ladder here is
                monotonic at every width instead: see `TYPE_LADDER` below. */}
            <h1 className="font-latin w-full text-3xl font-bold text-foreground md:text-4xl md:tracking-tight lg:text-5xl">
              {title}
            </h1>
            <p className="w-full text-sm font-bold text-muted-foreground md:text-base lg:text-lg">
              {effective}
            </p>
          </header>

          {/* The lead is prose, so it belongs on the document's measure and
              reads left, not under the centred title. */}
          <div className={cn(COLUMN, "pb-10 lg:pb-14")}>
            <p className={cn("w-full", PROSE)}>{lead}</p>
          </div>

          {/* 48px between clauses at every width, as the reference sets it. */}
          <div className="flex w-full flex-col items-center gap-12">
            {sections.map((section, index) => (
              <LegalSection key={section.title} number={index + 1} section={section} />
            ))}
          </div>

          {children}
        </article>
        <SiteFooter />
      </ScreenBody>
    </MobileScreen>
  );
}

/**
 * The rule and the small print the reference closes its terms page on, as a
 * block a page can put its own contact details in.
 *
 * The rule is inside the measure, not across the gutter, so it reads as the end
 * of the text rather than as a page divider.
 */
export function LegalClose({ children }: { readonly children: ReactNode }) {
  return (
    <LegalColumn className="pt-16">
      {/* Centred, as the reference sets its closing line. */}
      <div className="flex w-full flex-col items-center gap-2 border-t border-border pt-8 text-center">
        {children}
      </div>
    </LegalColumn>
  );
}
