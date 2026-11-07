import { Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LanguageSwitch } from "@/components/topbar";
import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";

type FooterItem = { readonly label: string; readonly href: string };

/** A footer link: ink at 14, underlined under the pointer. */
function FooterLink({ href, label }: FooterItem) {
  const className = "text-sm text-foreground underline-offset-2 hover:underline";
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

/**
 * A column: its head at 14 medium, then its links 16 apart. On the phone the
 * columns stack, each a band of 24 above and below, centred and unruled; from
 * `md` they stand side by side, still centred on an upright tablet, and from
 * `lg` they read from the left as the desktop's do.
 */
function FooterColumn({ title, items }: { readonly title: string; readonly items: readonly FooterItem[] }) {
  return (
    <section className="py-6 text-center md:py-0 lg:text-left">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {/* 14 on the list too, so each row's line is the link's own 20 and
          the links step 36 rather than the body's 24-high line. */}
      <ul className="mt-4 flex flex-col gap-4 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <FooterLink {...item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A way to reach us: the 16 glyph in ink, on a 40 target it does not draw. */
function SocialLink({ href, label, children }: { readonly href: string; readonly label: string; readonly children: React.ReactNode }) {
  return (
    <a
      aria-label={label}
      className="relative flex size-4 items-center justify-center before:absolute before:-inset-3 before:content-['']"
      href={href}
    >
      {children}
    </a>
  );
}

/**
 * The site footer: the page's floor in a neutral near-white, the logo and
 * three equal columns of links, then the legal line and the controls. On the
 * phone everything is stacked and centred; an upright tablet centres the logo
 * over the columns and each column in its third; from `lg` the logo is the
 * first of four columns at the left. From `lg` the last row is one line, the
 * copyright and the legal pages at the left and the language and the social
 * marks at the right; under it the controls come first, then the copyright
 * over the legal pages, as a phone reads them.
 *
 * 24 in from the edges on the phone and tablet, every size the screen's own.
 * From `lg` it is the desktop footer, 48 in from the edges, drawn at its 1440
 * size and zoomed by the width below that (`.footer-scale`), so a landscape
 * tablet sees the desktop footer made smaller rather than reflowed.
 */
export function SiteFooter({ className }: { readonly className?: string }) {
  const t = useTranslations("landing");

  const services: readonly FooterItem[] = [
    { label: t("footerLinkSearch"), href: "/search" },
    { label: t("footerLinkCategories"), href: "/search" },
    { label: t("footerLinkPricing"), href: "/#pricing" },
    { label: t("footerLinkHelp"), href: "/#faq" },
  ];
  const advisors: readonly FooterItem[] = [
    { label: t("footerLinkBecomeAdvisor"), href: "/advisor/apply" },
    { label: t("footerLinkHowItWorks"), href: "/about" },
  ];
  const company: readonly FooterItem[] = [
    { label: t("footerLinkHome"), href: "/" },
    { label: t("footerLinkAbout"), href: "/about" },
    { label: t("footerLinkContact"), href: `mailto:${t("footerEmailAddress")}` },
  ];
  const legal: readonly FooterItem[] = [
    { label: t("footerLinkPrivacy"), href: "/privacy-policy" },
    { label: t("footerLinkTerms"), href: "/terms" },
  ];

  return (
    <footer className={cn("footer-scale flex w-full shrink-0 flex-col bg-footer-ground text-foreground", className)}>
      <div className="mx-auto w-full max-w-[1920px] px-6 lg:px-12">
        <div className="md:grid md:grid-cols-3 md:gap-4 md:pt-10 md:pb-12 lg:grid-cols-4 lg:pt-12">
          {/* The logo heads the footer: centred over the columns until `lg`,
              then the first of four, at the left. */}
          <div className="flex justify-center pt-12 pb-2 md:col-span-3 md:pt-0 md:pb-8 lg:col-span-1 lg:justify-start lg:pb-0">
            <Link aria-label={t("footerLinkHome")} className="inline-flex" href="/">
              <Image alt="Advisory Platform" className="h-8 w-auto md:h-10 lg:h-8" src={logo} />
            </Link>
          </div>
          <FooterColumn items={services} title={t("footerColumnService")} />
          <FooterColumn items={advisors} title={t("footerColumnAdvisor")} />
          <FooterColumn items={company} title={t("footerColumnCompany")} />
        </div>

        {/* On a phone the language and social row sits over the copyright.
            On an upright tablet a two-row grid: the copyright centred on top,
            and under it the legal links and the language and social row side
            by side (the copyright block is `contents` there, so its two parts
            are the grid's own items). From `lg` one line, ends apart. */}
        <div className="flex flex-col-reverse gap-5 py-6 md:grid md:grid-cols-[auto_auto] md:items-center md:justify-center md:gap-x-8 md:gap-y-2 md:pt-0 md:pb-0 lg:flex lg:flex-row lg:items-center lg:justify-between lg:pt-6 lg:pb-6">
          {/* The copyright over the legal pages, centred, on a phone; one line
              from `lg`: a middle dot never opens a wrapped line. */}
          <div className="flex flex-col items-center gap-1 text-center text-sm md:contents lg:flex lg:flex-row lg:gap-0 lg:text-left">
            <span className="md:col-span-2">{t("footerCopyright")}</span>
            <ul className="flex items-center">
              {legal.map((item, i) => (
                <li className="flex items-center" key={item.label}>
                  <span aria-hidden className={cn("mx-2", i === 0 && "hidden lg:inline")}>
                    ·
                  </span>
                  <FooterLink {...item} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between lg:gap-5">
            <span className="flex h-7.5 items-center gap-2 text-sm font-medium">
              <Globe aria-hidden className="size-4" />
              <LanguageSwitch className="h-auto gap-1 px-0 text-sm font-medium" />
            </span>
            <nav aria-label={t("footerSocial")}>
              {/* No account URLs exist for these two yet, so they open the
                  about page rather than a guessed handle. The marks ship in
                  white; `brightness-0` takes them to ink. */}
              <ul className="flex items-center gap-6">
                <li>
                  <SocialLink href="/about" label={t("footerFacebook")}>
                    <Image alt="" className="h-4 w-auto brightness-0 dark:invert" height={22} src="/icons/facebook.svg" width={13} />
                  </SocialLink>
                </li>
                <li>
                  <SocialLink href="/about" label={t("footerX")}>
                    <Image alt="" className="size-4 brightness-0 dark:invert" height={18} src="/icons/x.svg" width={20} />
                  </SocialLink>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
