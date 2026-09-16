import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  Lock,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { landingCtaBand, landingHeroPoster, landingHeroVideo } from "@/lib/assets/r2";
import { HlsVideo } from "@/components/mobile/hls-video";
import { FaqSection } from "@/components/marketing/faq-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";

/** Figma section header — the primary eyebrow above the 28/40 title. */
function SectionHeader({
  eyebrow,
  title,
}: {
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <>
      <p className="w-full text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="w-full text-heading font-semibold text-foreground">{title}</h2>
    </>
  );
}

/** Figma "Step" — numbered badge beside a title/body pair, on a bordered card. */
function Step({
  index,
  title,
  children,
}: {
  readonly index: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-[16px] border bg-card p-4">
      <span className="flex size-7 shrink-0 items-center justify-center overflow-clip rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {index}
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-base font-semibold text-foreground">{title}</p>
        <p className="w-full text-sm font-normal text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

/** Figma "Point" — 36px icon badge beside a title/body pair, no card. */
function KnowPoint({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 overflow-clip">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-clip rounded-full bg-primary/10">
        <Icon className="size-4.5 text-primary" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-base font-semibold text-foreground">{title}</p>
        <p className="w-full text-sm font-normal text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

/**
 * Figma "Landing - About & FAQ (Light)" (1090:16061) — the marketing page: a
 * full-screen hero clip, About, How it works, Good to know, FAQ, a 320px CTA band
 * and the footer.
 */
export function LandingScreen() {
  const t = useTranslations("landing");

  return (
    <MobileScreen>
      <ScreenBody>
        {/* The design gave this frame its own nav (wordmark + a login link over
            the photo). It uses the shared bar instead, so the landing reads as the
            same app as every other screen — just transparent over the hero. */}
        <TopBar login overlay />
        {/* Figma "Hero" (1090:16062) under a 58% black scrim. The design draws a
            540px band with a still; this fills the phone screen with the clip
            instead, so `h-full` (the height ScreenBody has left) replaces it. The
            copy centres in whatever height that turns out to be. */}
        <section className="relative flex h-full w-full shrink-0 flex-col items-start justify-center overflow-clip">
          <HlsVideo
            className="absolute inset-0"
            poster={landingHeroPoster.src}
            src={landingHeroVideo}
          />
          <div className="absolute inset-0 bg-scrim/58" />

          {/* Figma "Hero Copy" */}
          <div className="relative flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6">
            <p className="w-full text-sm font-semibold text-on-media/75">
              {t("heroEyebrow")}
            </p>
            <h1 className="w-full text-heading-lg font-semibold text-on-media">
              {t("heroTitleLine1")}
              <br />
              {t("heroTitleLine2")}
            </h1>
            <p className="w-full text-base font-normal text-on-media/82">
              <ThaiText>{t("heroBody")}</ThaiText>
            </p>
            {/* `nativeButton={false}` because the CTA renders an anchor — without it
                Base UI warns that the native button semantics were dropped. */}
            <Button className="w-full" nativeButton={false} render={<Link href="/matching" />}>
              {t("heroCta")}
            </Button>
          </div>
        </section>

        {/* Figma "About" (1091:16068) */}
        <section id="about" className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-12 pb-2">
          <SectionHeader eyebrow={t("aboutEyebrow")} title={t("aboutTitle")} />
          {/* No ThaiText here: the closing run is wider than the 354px column, and
              a non-wrapping run that cannot fit overflows instead of breaking. */}
          <p className="w-full text-base font-normal text-muted-foreground">
            {t("aboutBody1")}
          </p>
          <p className="w-full text-base font-normal text-muted-foreground">
            <ThaiText>{t("aboutBody2")}</ThaiText>
          </p>

          {/* Figma "Stats" — three equal columns on one bordered card. */}
          <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-[16px] border bg-card p-4">
            {[
              [t("statExpertsLabel"), t("statExpertsValue")],
              [t("statPaymentLabel"), t("statPaymentValue")],
              [t("statDataLabel"), t("statDataValue")],
            ].map(([label, value]) => (
              <div
                className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip"
                key={label}
              >
                <p className="w-full text-sm font-semibold text-foreground">{label}</p>
                <p className="w-full text-xs font-normal text-muted-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Figma "How it works" (1092:16067) */}
        <section id="how-it-works" className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-12 pb-2">
          <SectionHeader eyebrow={t("stepsEyebrow")} title={t("stepsTitle")} />
          <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip">
            <Step index="1" title={t("step1Title")}>
              <ThaiText>{t("step1Body")}</ThaiText>
            </Step>
            <Step index="2" title={t("step2Title")}>
              <ThaiText>{t("step2Body")}</ThaiText>
            </Step>
            <Step index="3" title={t("step3Title")}>
              <ThaiText>{t("step3Body")}</ThaiText>
            </Step>
            <Step index="4" title={t("step4Title")}>
              <ThaiText>{t("step4Body")}</ThaiText>
            </Step>
          </div>
        </section>

        {/* Figma "Good to know" (1093:16067) — the one muted-surface band. */}
        <section id="good-to-know" className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip bg-muted px-6 py-12">
          <SectionHeader eyebrow={t("knowEyebrow")} title={t("knowTitle")} />
          {/* Same overflow caveat as About: this run does not fit the column. */}
          <KnowPoint icon={ShieldCheck} title={t("know1Title")}>
            {t("know1Body")}
          </KnowPoint>
          <KnowPoint icon={Lock} title={t("know2Title")}>
            <ThaiText>{t("know2Body")}</ThaiText>
          </KnowPoint>
          <KnowPoint icon={CreditCard} title={t("know3Title")}>
            <ThaiText>{t("know3Body")}</ThaiText>
          </KnowPoint>
          <KnowPoint icon={FileText} title={t("know4Title")}>
            <ThaiText>{t("know4Body")}</ThaiText>
          </KnowPoint>
        </section>

        {/* Figma "FAQ" (1094:16119) — see `FaqSection`; the rows really open now. */}
        <section
          className="flex w-full shrink-0 flex-col items-start gap-4 overflow-clip px-6 pt-12 pb-2"
          id="faq"
        >
          <SectionHeader eyebrow={t("faqEyebrow")} title={t("faqTitle")} />
          <p className="w-full text-sm font-normal text-muted-foreground">
            {t("faqSubtitle")}
          </p>
          <FaqSection />
        </section>

        {/* Figma "CTA Band" (1097:16133) — 402 x 320 under a 66% black scrim. */}
        <section className="relative flex h-[320px] w-full shrink-0 flex-col items-start overflow-clip">
          <Image
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={landingCtaBand}
          />
          <div className="absolute inset-0 bg-scrim/66" />
          <div className="relative flex w-full shrink-0 flex-col items-start gap-3 overflow-clip px-6 pt-14">
            <h2 className="w-full text-heading font-semibold text-on-media">
              {t("ctaTitle")}
            </h2>
            <p className="w-full text-base font-normal text-on-media/82">
              <ThaiText>{t("ctaBody")}</ThaiText>
            </p>
            <Button className="w-full" nativeButton={false} render={<Link href="/register" />}>
              {t("ctaPrimary")}
            </Button>
            <Link
              className="w-full text-center text-sm font-semibold text-on-media/85"
              href="/advisor/apply"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </section>

        <SiteFooter />
      </ScreenBody>
    </MobileScreen>
  );
}
