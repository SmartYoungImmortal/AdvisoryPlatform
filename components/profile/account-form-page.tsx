import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { OwnAvatar } from "@/components/profile/profile-data";

function AccountFormHeader() {
  const c = useTranslations("common");
  const rail = useTranslations("appRail");
  return (
    <header className="hidden w-full shrink-0 items-center border-b border-border bg-card px-30 py-4 lg:flex">
      <Link aria-label={rail("home")} className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-ring" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Advisory" className="dark:brightness-0 dark:invert" src="/figma/account-forms/header-logo.svg" width={81.8492} height={20.0008} />
      </Link>
      <nav aria-label={rail("label")} className="flex flex-1 items-center gap-7 pl-12 text-sm font-medium text-muted-foreground">
        <Link className="text-foreground hover:underline" href="/search">{c("findAdvisor")}</Link>
        <Link className="hover:underline" href="/bookings">{rail("bookings")}</Link>
        <Link className="hover:underline" href="/chat">{rail("chat")}</Link>
        <Link className="hover:underline" href="/about">{c("about")}</Link>
      </nav>
      <div className="flex items-center gap-4">
        <Link aria-label={c("notifications")} className="relative rounded-sm before:absolute before:-inset-2 focus-visible:outline-2 focus-visible:outline-ring" href="/notifications">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="dark:invert" src="/figma/account-forms/bell.svg" width={22} height={22} />
        </Link>
        <Link aria-label={c("profile")} className="rounded-full focus-visible:outline-2 focus-visible:outline-ring" href="/profile">
          <OwnAvatar size={36} />
        </Link>
      </div>
    </header>
  );
}

function AccountFormFooter() {
  const t = useTranslations("landing");
  const rail = useTranslations("appRail");
  const columns = [
    { title: t("footerColumnService"), links: [
      { label: t("footerLinkSearch"), href: "/search" },
      { label: t("footerLinkCategories"), href: "/search" },
      { label: t("footerLinkPricing"), href: "/#pricing" },
    ] },
    { title: t("footerColumnAdvisor"), links: [
      { label: t("footerLinkBecomeAdvisor"), href: "/advisor/apply" },
      { label: t("footerLinkHowItWorks"), href: "/about" },
      { label: t("footerLinkHelp"), href: "/#faq" },
    ] },
    { title: t("footerColumnCompany"), links: [
      { label: t("footerLinkAbout"), href: "/about" },
      { label: t("footerLinkTerms"), href: "/terms" },
      { label: t("footerLinkPrivacy"), href: "/privacy-policy" },
    ] },
  ];
  return (
    <footer className="hidden w-full shrink-0 flex-col gap-6 border-t border-border bg-card px-30 py-12 lg:flex">
      <div className="grid grid-cols-4 gap-6">
        <div className="flex flex-col items-start gap-2.5">
          <Link aria-label={rail("home")} className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Advisory" className="dark:brightness-0 dark:invert" src="/figma/account-forms/footer-logo.svg" width={81.8491} height={20.0006} />
          </Link>
          <p className="text-xs text-muted-foreground">{t("footerTagline")}</p>
        </div>
        {columns.map(({ title, links }) => (
          <section className="flex flex-col items-start gap-2.5" key={title}>
            <h2 className="text-sm font-semibold">{title}</h2>
            <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground">
              {links.map(({ label, href }) => <li key={label}><Link className="hover:text-foreground hover:underline" href={href}>{label}</Link></li>)}
            </ul>
          </section>
        ))}
      </div>
      <p className="border-t border-border pt-6 text-xs text-muted-foreground">{t("footerCopyright")}</p>
    </footer>
  );
}

export function AccountFormPage({ title, description, children }: { readonly title: string; readonly description?: string; readonly children: ReactNode }) {
  const c = useTranslations("common");
  return (
    <MobileScreen className="profile-edit-page bg-background pb-0" wide="md">
      <ScreenTopBar href="/settings" label={c("back")} className="lg:hidden" />
      <ScreenBody className="bg-background">
        <AccountFormHeader />
        <main className="flex w-full flex-1 flex-col">
          <div className="lg:border-b lg:border-border lg:bg-card">
            <div className="hidden px-30 pt-6 lg:flex">
              <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href="/settings">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="dark:invert" src="/figma/account-forms/back.svg" width={28} height={28} />
                {c("back")}
              </Link>
            </div>
            <div className="mx-auto flex w-full max-w-[848px] flex-col gap-2 px-6 pt-4 lg:pt-5 lg:pb-9">
              <h1 className="text-heading font-semibold">{title}</h1>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-[848px] flex-1 flex-col px-6 lg:pt-12 lg:pb-22">
            {children}
          </div>
        </main>
        <AccountFormFooter />
      </ScreenBody>
    </MobileScreen>
  );
}

export const ACCOUNT_FORM_CLASS = "profile-edit-card flex min-h-[calc(100dvh-156px)] w-full flex-col gap-4 pt-6 lg:min-h-0 lg:gap-6 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-9.75";
export const ACCOUNT_FORM_ACTIONS = "mt-auto flex flex-col gap-3 pt-12 pb-4 lg:mt-0 lg:flex-row lg:items-center lg:justify-end lg:pt-2 lg:pb-0";
export const ACCOUNT_FORM_SUBMIT = "h-9 w-full rounded-md bg-info text-sm text-primary-foreground hover:bg-info/90 lg:order-2 lg:h-11 lg:w-52.5";
export const ACCOUNT_FORM_CANCEL = "hidden h-11 rounded-md bg-card text-sm shadow-none lg:order-1 lg:inline-flex lg:w-30";
