import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

/**
 * The lockup the footer opens on: the brand mark over the typeset PLATFORM.
 *
 * The lockup carries its own wordmark, so there is nothing to clip — the asset
 * is drawn whole and PLATFORM is set live below it in the project's own Latin
 * face, which is what gives that word its tracking; it is baked into no asset.
 *
 * The lockup ships in its brand colours, so `brightness-0 invert` reverses it
 * for the dark ground rather than shipping a second colourway.
 */
function Wordmark() {
  return (
    <div className="flex w-[182px] shrink-0 flex-col items-start">
      <Image
        alt="Advisory Platform"
        className="h-auto w-[150px] brightness-0 invert"
        src={logo}
      />
      {/* Figma sets this at 6px of tracking, but that is Outfit; Geist is the
          wider face, and 6px took the word to 131px against the frame's 116.
          The measured width is what has to match, so the tracking is the value
          that lands on it. */}
      <p className="mt-[1px] font-latin text-sm leading-tight font-semibold tracking-[4.35px] text-on-media/72">
        PLATFORM
      </p>
    </div>
  );
}

/**
 * A 44px circular button with a 16px glyph — the floor for a tap target, which
 * a 36px circle misses. The target grows; the drawing does not.
 */
function SocialButton({
  href,
  label,
  children,
}: {
  readonly href: string;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-on-media/10 text-on-media/80 transition-colors duration-200 hover:bg-on-media/20 hover:text-on-media motion-reduce:transition-none"
      href={href}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

/** A footer link with the small triangle that nudges forward on hover. */
function FooterLink({ href, label }: { readonly href: string; readonly label: string }) {
  const className = cn(
    "relative inline-block pl-[1.35rem] text-sm leading-6 text-on-media/70",
    "transition-colors duration-200 hover:text-primary motion-reduce:transition-none",
    "before:absolute before:top-[0.45em] before:left-0 before:content-['']",
    "before:border-y-[0.32em] before:border-l-[0.45em] before:border-y-transparent before:border-l-primary",
    "before:transition-transform before:duration-200 hover:before:translate-x-[3px] motion-reduce:before:transition-none",
  );
  return href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http") ? (
    <a className={className} href={href}>
      {label}
    </a>
  ) : (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

function FooterHeading({ children, className }: { readonly children: React.ReactNode; readonly className?: string }) {
  return (
    <p className={cn("text-base leading-6 font-bold text-on-media", className)}>{children}</p>
  );
}

/**
 * The site footer, in the shape the Systronic reference uses: one grid for
 * every width — the brand column with the tagline, the address as the link to
 * the map and the social buttons, then the menu, then what the platform offers,
 * then the ways to reach a person — closing on a centred legal line.
 *
 * It is one layout rather than the phone stack and desktop grid this file
 * carried before. The columns collapse at `sm` and again below it, which is
 * what the reference does; two separate trees were how the two ends of the same
 * page drifted apart in the first place.
 */
export function SiteFooter({ className }: { readonly className?: string }) {
  const t = useTranslations("landing");

  const menu = [
    { label: t("footerHome"), href: "/" },
    { label: t("footerSearch"), href: "/search" },
    { label: t("footerCategories"), href: "/search/browse" },
    { label: t("footerHowItWorks"), href: "/landing#how-it-works" },
    { label: t("footerAbout"), href: "/landing#about" },
  ];

  const forAdvisees = [
    { label: t("footerLinkSearch"), href: "/search" },
    { label: t("footerLinkPricing"), href: "/landing#good-to-know" },
    { label: t("footerHelp"), href: "/landing#faq" },
  ];

  const forAdvisors = [
    { label: t("footerLinkBecomeAdvisor"), href: "/advisor/apply" },
    { label: t("footerLinkHowItWorks"), href: "/landing#how-it-works" },
  ];

  const legal = [
    { label: t("footerLinkPrivacy"), href: "/privacy-policy" },
    { label: t("footerLinkTerms"), href: "/terms" },
  ];

  return (
    <footer
      className={cn(
        "relative isolate w-full shrink-0 border-t border-on-media/10 bg-footer-surface text-on-media",
        className,
      )}
    >
      <div className="mx-auto grid max-w-[1296px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1.3fr] lg:px-8 lg:py-14 xl:px-12">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-xs text-sm leading-6 text-on-media/70">
            {t("footerTagline")}
          </p>
          {/* The address is the link, not a "view map" line beside it: the
              address is what someone presses when they want the map, and a
              second label would only repeat it. `inline-block` so the underline
              follows the wrapped lines rather than running as one rule. */}
          <a
            className="mt-4 inline-block max-w-xs text-sm leading-6 text-on-media/70 underline decoration-on-media/25 underline-offset-4 transition-colors duration-200 hover:text-primary hover:decoration-primary motion-reduce:transition-none"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${t("footerAddress1")} ${t("footerAddress2")}`,
            )}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("footerAddress1")}
            <br />
            {t("footerAddress2")}
          </a>
          <div className="mt-6 flex items-center gap-2">
            <SocialButton href={`mailto:${t("footerEmailAddress")}`} label={t("footerEmail")}>
              <svg
                aria-hidden
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <rect height="16" rx="2" width="20" x="2" y="4" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </SocialButton>
            <SocialButton href={`tel:${t("footerPhoneNumber")}`} label={t("footerPhone")}>
              <svg
                aria-hidden
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
              </svg>
            </SocialButton>
            {/* The frame carries no account URLs for these two, so they point at
                the brand's own pages rather than at a guessed handle. */}
            <SocialButton href="/landing#about" label={t("footerX")}>
              <Image alt="" className="size-4" height={18} src="/icons/x.svg" width={20} />
            </SocialButton>
            <SocialButton href="/landing#about" label={t("footerFacebook")}>
              {/* The Facebook mark is a solid fill whose path spans less of its
                  own box than the stroked glyphs beside it, so it is drawn a
                  step larger to read the same size, not a bigger one. */}
              <Image alt="" className="h-5 w-auto" height={22} src="/icons/facebook.svg" width={13} />
            </SocialButton>
          </div>
        </div>

        <div>
          <FooterHeading>{t("footerColumnCompany")}</FooterHeading>
          <ul className="mt-4 flex flex-col gap-2.5">
            {menu.map(({ label, href }) => (
              <li key={label}>
                <FooterLink href={href} label={label} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>{t("footerColumnService")}</FooterHeading>
          <ul className="mt-4 flex flex-col gap-2.5">
            {forAdvisees.map(({ label, href }) => (
              <li key={label}>
                <FooterLink href={href} label={label} />
              </li>
            ))}
          </ul>

          <FooterHeading className="mt-8">{t("footerColumnAdvisor")}</FooterHeading>
          <ul className="mt-4 flex flex-col gap-2.5">
            {forAdvisors.map(({ label, href }) => (
              <li key={label}>
                <FooterLink href={href} label={label} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>{t("footerContact")}</FooterHeading>
          {/* The label states what the line is; the value under it is the
              control. The reference sets the pair at the same size with the
              label in full ink and the number a step down. */}
          <ul className="mt-4 flex flex-col gap-3 text-sm leading-6">
            <li>
              <p className="font-bold text-on-media/90">{t("footerEmailLabel")}</p>
              <a
                className="font-latin text-on-media/60 transition-colors duration-200 hover:text-primary motion-reduce:transition-none"
                href={`mailto:${t("footerEmailAddress")}`}
              >
                {t("footerEmailAddress")}
              </a>
            </li>
            <li>
              <p className="font-bold text-on-media/90">{t("footerPhoneLabel")}</p>
              <a
                className="font-latin text-on-media/60 transition-colors duration-200 hover:text-primary motion-reduce:transition-none"
                href={`tel:${t("footerPhoneNumber")}`}
              >
                {t("footerPhone").replace("Phone: ", "")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-on-media/10 px-5 py-4 text-center text-xs leading-5 text-on-media/45">
        <p className="font-latin">{t("footerCopyright")}</p>
        {/* The legal pages close the page, separated by a middle dot — they are
            not a column of their own in the reference either. */}
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {legal.map(({ label, href }, index) => (
            <span className="flex items-center gap-x-2" key={label}>
              {index > 0 ? <span aria-hidden>·</span> : null}
              <Link
                className="underline decoration-on-media/30 underline-offset-2 transition-colors duration-200 hover:text-primary hover:decoration-primary motion-reduce:transition-none"
                href={href}
              >
                {label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
