"use client";

import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { OwnAvatar } from "@/components/profile/profile-data";
import { logo } from "@/lib/assets/r2";
import { cn } from "@/lib/utils";
import styles from "./booking-detail.module.css";

function Wordmark() {
  return <Link aria-label="Advisory Platform" href="/"><Image alt="Advisory" className="h-5 w-auto" src={logo} /></Link>;
}

/** Booking's desktop Figma uses site navigation, rather than the account rail. */
export function BookingDetailFrame({ children }: { readonly children: ReactNode }) {
  const t = useTranslations("bookings");
  const landing = useTranslations("landing");
  const c = useTranslations("common");
  const links = [
    { href: "/search", label: t("detailFooterExplore") },
    { href: "/bookings", label: t("title") },
    { href: "/chat", label: t("detailChatTile") },
    { href: "/about", label: t("detailFooterAbout") },
  ];
  const columns = [
    { title: t("detailFooterServices"), links: [links[0], { href: "/search", label: t("detailFooterCategories") }, { href: "/landing#good-to-know", label: t("detailFooterPricing") }] },
    { title: t("detailFooterAdvisors"), links: [{ href: "/advisor-onboarding/stage-1", label: t("detailFooterBecome") }, { href: "/landing#how-it-works", label: t("detailFooterHow") }, { href: "/landing#faq", label: t("detailFooterHelp") }] },
    { title: t("detailFooterCompany"), links: [links[3], { href: "/terms", label: t("detailFooterTerms") }, { href: "/privacy-policy", label: t("detailFooterPrivacy") }] },
  ];
  return <MobileScreen wide className={cn(styles.canvas, "pb-0")}>
    <ScreenBody>
      <header className={cn(styles.inset, "hidden shrink-0 items-center gap-12 border-b border-border bg-card py-4 lg:flex")}>
        <Wordmark />
        <nav aria-label={t("title")} className="flex flex-1 items-center gap-7 text-sm font-medium">
          {links.map(link => <Link key={link.href} href={link.href} aria-current={link.href === "/bookings" ? "page" : undefined} className={link.href === "/bookings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>{link.label}</Link>)}
        </nav>
        <Link href="/notifications" aria-label={c("notifications")}><Bell className="size-5.5 text-muted-foreground" /></Link>
        <Link href="/profile" aria-label={c("profile")}><OwnAvatar size={36} /></Link>
      </header>
      {children}
      <footer className={cn(styles.inset, "hidden shrink-0 flex-col gap-6 border-t border-border bg-card py-12 lg:flex")}>
        <div className="grid w-full grid-cols-4 gap-6">
          <div className="flex flex-col items-start gap-2.5"><Wordmark /><p className="text-xs text-muted-foreground">{landing("footerTagline")}</p></div>
          {columns.map(column => <div key={column.title} className="flex flex-col gap-2.5"><p className="text-sm font-semibold">{column.title}</p>{column.links.map(link => <Link key={link.href} href={link.href} className="text-xs text-muted-foreground hover:text-foreground">{link.label}</Link>)}</div>)}
        </div>
        <div className="h-px w-full bg-border" /><p className="text-xs text-muted-foreground">© 2026 Advisory Platform</p>
      </footer>
    </ScreenBody>
  </MobileScreen>;
}
