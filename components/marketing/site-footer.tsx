import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * Figma "Logo/Advisory" (225:10509) — a 214x90 lockup: the script over PLATFORM
 * at Outfit SemiBold 14 with 6px of tracking, 116px wide.
 *
 * The shared `logo` asset cannot supply that. Measured at 448px wide, its own
 * PLATFORM band runs 743 of 1000 device pixels — 74.3% of the lockup — against
 * the 54.2% (116/214) this frame draws, and that tracking is baked into the SVG
 * where no CSS can reach it. The asset is also proportionally taller, which is
 * what made the footer lockup read oversized.
 *
 * So the asset is clipped to its script band (ink runs y 8.85-40.2 of its 61-unit
 * viewBox, which lands at 16.9-76.8px once drawn 214px wide) and the word below
 * is set live in the project's own Latin face. Nothing is redrawn; the script is
 * still the shipped artwork, and `TopBar` keeps using the full lockup.
 *
 * The asset ships in #18181b, so `brightness-0 invert` reverses it rather than
 * shipping a second colourway.
 */
function Wordmark() {
  return (
    <div className="flex w-[182px] shrink-0 flex-col items-center">
      {/* Sized on the script's ink, not on the lockup box: the frame's script
          measures 51px tall, and this asset only lands there at 182px wide —
          drawn at the frame's 214 it came out 59.9px, which is what made the
          lockup look oversized.

          The clip has to land inside the 10px of clear asset between the
          script's ink and the asset's own PLATFORM band. Scanned at this exact
          width the script runs y 16-72.5 and the old word starts at 82.5, so 77
          sits mid-gap: 4.5px clear of the descender, 5.5px clear of the word.
          Earlier values of 66 and 70 were both inside the descender and shaved
          the tail of the "y".

          `z-10` keeps the script over the word below it, so the descender reads
          as crossing PLATFORM rather than being interrupted by it. */}
      <div className="relative z-10 h-[77px] w-full shrink-0 overflow-clip">
        <Image
          alt="Advisory Platform"
          className="h-auto w-full brightness-0 invert"
          src={logo}
        />
      </div>
      {/* Figma sets this at 6px of tracking, but that is Outfit; Geist is the
          wider face, and 6px took the word to 131px against the frame's 116.
          The measured width is what has to match, so the tracking is the value
          that lands on it. Trailing tracking adds air after the last letter, so
          the indent balances the word back to centre. */}
      <p className="mt-[1px] font-latin text-sm leading-tight font-semibold tracking-[4.35px] text-on-media/72">
        <span className="pl-1">PLATFORM</span>
      </p>
    </div>
  );
}

/**
 * Figma "social" — a 40px circle at 30% white with the brand mark centred. The
 * marks are the exact SVGs exported from the frame (`public/icons`), not
 * redrawn: Lucide dropped brand glyphs, so nothing in the project's icon set
 * carries them.
 *
 * Each is drawn at its own intrinsic size. The frame nests them in square boxes
 * (20px for X, 26.667px for Facebook) but insets the vector inside, and Facebook
 * is a 12.22x22.22 glyph — forcing it to fill a 26.667px square, as this did
 * before, stretched the mark half again as wide as it should be.
 */
function SocialMark({
  src,
  label,
  width,
  height,
}: {
  readonly src: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-clip rounded-full bg-on-media/30">
      <Image
        alt={label}
        className="block max-w-none"
        height={Math.round(height)}
        src={src}
        style={{ width, height }}
        width={Math.round(width)}
      />
    </span>
  );
}

/**
 * Figma "Footer" — 225:10503.
 *
 * A rewrite, not an edit: the previous footer was two columns of Thai labels
 * rendered as `<p>`. This frame is one centred column of eleven uppercase
 * links over a rule, then the contact block and the social marks. The labels
 * are English because the frame draws them in English.
 *
 * Substitutions the project forces, both flagged rather than hidden:
 * Mulish Bold / Outfit map onto `font-latin` (Geist), the only Latin family the
 * app ships; and the rule under the links is `#fffbee` in Figma, which no token
 * names, so it is drawn with the white token at the alpha that matches the
 * frame.
 */
export function SiteFooter({ className }: { readonly className?: string }) {
  const t = useTranslations("landing");

  // Figma splits the eleven into three stacks, but every gap inside and between
  // them is the same 24px, so they lay out as one column.
  const links = [
    { label: t("footerHome"), href: "/" },
    { label: t("footerSearch"), href: "/search" },
    { label: t("footerCategories"), href: "/search" },
    { label: t("footerHowItWorks"), href: "/landing#how-it-works" },
    { label: t("footerAbout"), href: "/landing#about" },
    { label: t("footerBecomeAdvisor"), href: "/advisor/apply" },
    { label: t("footerPricing"), href: "/landing#good-to-know" },
    { label: t("footerContactNav"), href: `mailto:${t("footerEmailAddress")}` },
    { label: t("footerHelp"), href: "/landing#faq" },
    { label: t("footerTerms"), href: "/terms" },
    { label: t("footerPrivacy"), href: "/pdpa" },
  ];

  return (
    <footer
      className={cn(
        "relative isolate flex w-full shrink-0 flex-col items-center gap-9 bg-footer-surface px-4 pt-12 pb-[29px]",
        className,
      )}
    >
      {/* The glow the frame inherits from the page layer behind it. Its own
          layer rather than a background on the footer, so the footer keeps a
          flat ground underneath and the copy is never sitting on the gradient's
          colour-mix. `-z-10` under an `isolate` parent keeps it off the text
          without leaking behind the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-footer-glow"
      />

      <div className="flex w-full shrink-0 flex-col items-center gap-12">
        <Wordmark />

        <nav className="flex w-full shrink-0 flex-col items-center gap-6 border-b border-on-media/20 pb-[45px] font-latin text-base leading-5 font-bold whitespace-nowrap text-background">
          {links.map(({ label, href }) =>
            href.startsWith("mailto:") ? (
              <a href={href} key={label}>
                {label}
              </a>
            ) : (
              <Link href={href} key={label}>
                {label}
              </Link>
            ),
          )}
        </nav>
      </div>

      {/* Figma "Contact" (225:10527) — x=28 in a 390 frame, so it is inset a
          further 12px past the footer's own 16px. Every text node in it is
          `text-box-trim: trim-both` on a cap-alphabetic edge, which is why the
          frame measures 24px copy at 17px and 16px copy at 11px; without the
          trim the block stands ~30px taller than the 182px Figma reports. */}
      <div className="flex w-full shrink-0 flex-col items-start gap-6 px-3">
        <p className="font-latin text-2xl leading-6 font-bold whitespace-nowrap text-on-media [text-box:trim-both_cap_alphabetic]">
          {t("footerContact")}
        </p>

        <div className="flex shrink-0 flex-col items-start gap-3 font-latin text-base font-medium text-on-media [&_a]:block [&>*]:[text-box:trim-both_cap_alphabetic] [&_a]:[text-box:trim-both_cap_alphabetic] [&_p]:[text-box:trim-both_cap_alphabetic]">
          <p className="shrink-0">
            {t("footerAddress1")}
            <br />
            {t("footerAddress2")}
          </p>
          <a
            className="shrink-0 whitespace-nowrap"
            href={`mailto:${t("footerEmailAddress")}`}
          >
            {t("footerEmail")}
          </a>
          <a
            className="shrink-0 whitespace-nowrap"
            href={`tel:${t("footerPhoneNumber")}`}
          >
            {t("footerPhone")}
          </a>
        </div>

        {/* The frame carries no destinations for these, so they are marks, not
            links, until the real account URLs land. */}
        <div className="flex w-full shrink-0 items-center gap-4">
          <SocialMark
            height={18.0775}
            label={t("footerX")}
            src="/icons/x.svg"
            width={20}
          />
          <SocialMark
            height={22.2222}
            label={t("footerFacebook")}
            src="/icons/facebook.svg"
            width={12.2222}
          />
        </div>
      </div>
    </footer>
  );
}
