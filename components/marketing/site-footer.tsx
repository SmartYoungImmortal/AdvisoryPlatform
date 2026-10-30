import { Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { LanguageSwitch } from "@/components/topbar";
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
 * columns stack, each a band of 24 above and below, ruled off from the one
 * before it; from `md` they stand side by side with no rules.
 */
function FooterColumn({ title, items }: { readonly title: string; readonly items: readonly FooterItem[] }) {
  return (
    <section className="border-t border-foreground/12 py-6 first:border-t-0 md:border-t-0 md:py-0">
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
 * The site footer: the page's floor in a neutral near-white, three equal
 * columns of links (stacked and ruled on the phone), then the legal line and
 * the controls. From `lg` that last row is one line, the copyright and the
 * legal pages at the left and the language and the social marks at the right;
 * under it the controls come first, then the copyright over the legal pages,
 * as a phone reads them.
 *
 * 24 in from the edges on the phone and tablet, 48 at a desktop's width, with
 * every size the screen's own.
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
    <footer className={cn("flex w-full shrink-0 flex-col bg-footer-ground text-foreground", className)}>
      <div className="mx-auto w-full max-w-[1920px] px-6 xl:px-12">
        <div className="md:grid md:grid-cols-3 md:gap-4 md:pt-6 md:pb-12 xl:pt-12">
          <FooterColumn items={services} title={t("footerColumnService")} />
          <FooterColumn items={advisors} title={t("footerColumnAdvisor")} />
          <FooterColumn items={company} title={t("footerColumnCompany")} />
        </div>

        <div className="flex flex-col-reverse gap-5 py-6 md:gap-3 md:pt-0 lg:flex-row lg:items-center lg:justify-between lg:pt-6">
          {/* The copyright over the legal pages on the phone, one line from
              `md`: a middle dot never opens a wrapped line. */}
          <div className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:gap-0">
            <span>{t("footerCopyright")}</span>
            <ul className="flex items-center">
              {legal.map((item, i) => (
                <li className="flex items-center" key={item.label}>
                  <span aria-hidden className={cn("mx-2", i === 0 && "hidden md:inline")}>
                    ·
                  </span>
                  <FooterLink {...item} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between lg:gap-5">
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
