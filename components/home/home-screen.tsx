"use client";

import { useTranslations } from "next-intl";

import { ClosingCta } from "@/components/home/closing-cta";
import { HeroSearch } from "@/components/home/hero-search";
import { HomeFaq } from "@/components/home/home-faq";
import { HomeHero } from "@/components/home/home-hero";
import { HomeIntro } from "@/components/home/intro";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { FOOTER_ABOVE_TAB_BAR } from "@/lib/layout";

/**
 * The five the catalogue is filed under (technology was dropped), as the
 * hero's search suggests them.
 */
const CATEGORIES = [
  { label: "categoryBusiness" },
  { label: "categoryFinance" },
  { label: "categoryLegal" },
  { label: "categoryEducation" },
  { label: "categoryWellbeing" },
] as const;

/**
 * The home page: the hero's promise, "advice you can trust", and its search;
 * "still not sure?", the questions people ask (`HomeFaq`); and a closing field
 * to ask in (`ClosingCta`), then the footer.
 */
export function HomeScreen() {
  const t = useTranslations("home");
  const c = useTranslations("common");
  // next-intl does not carry arrays through a message file, and it types message
  // keys as a literal union, so the examples are spelled out rather than built
  // from a template literal.
  const searchExamples = [
    t("searchExample1"),
    t("searchExample2"),
    t("searchExample3"),
    t("searchExample4"),
    t("searchExample5"),
  ];

  // No scroll-trigger refresh when the page below the hero changes height: the
  // only triggers on this page are the hero's own, measured off its track,
  // which nothing below it moves. Refreshing on every FAQ answer reset every
  // tween to measure it and showed as a jolt.
  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="relative isolate bg-card">
        {/* `login`: the home page is open to guests, so a guest gets the
            way in rather than a bell that leads to a sign-in wall. */}
        <TopBar clearAtTop unreadNotifications />
        {/* The page's wash used to sit here, a 458px band behind the top of
            the content. It is gone with the hero's own gradient: the hero is
            now a flat field carrying a dozen coloured shapes, and a wash
            bleeding up behind them gave the band a second light direction. */}

        {/* No gap between the blocks: each section carries its own rhythm, and
            on `lg` the first one has to land exactly where the hero's track
            leaves it, 6rem below the top of the screen. */}
        <div className="flex w-full shrink-0 flex-col items-center">
          <HomeIntro>
          {/* The hero, built to the shape of the team's own
              `buonogroup-fe` home `SectionHero`: a full-bleed photograph under
              a two-layer veil, with the copy on a full-height band. The search
              field is what the reference puts a CTA button in. */}
          <HomeHero
            body={t("heroSubtitle")}
            title={
              // The whole headline in the hand face, the one `/search` quotes its word in.
              <span className="font-hand">
                {/* The desktop's headline at every width. The `<em>` in the
                    message is kept but drawn in the headline's own grey: a
                    blue word read as a link. */}
                {t.rich("heroTitle", {
                  br: () => <br />,
                  em: (chunks) => <>{chunks}</>,
                })}
              </span>
            }
          >
            <HeroSearch
              categories={CATEGORIES.map(({ label }) => t(label))}
              examples={searchExamples}
              placeholder={t("searchPlaceholder")}
              submitLabel={c("search")}
            />
          </HomeHero>

          {/* A white section holding the place of the one that will follow the
              hero, until it is designed; labelled as such, untranslated on
              purpose since it is not meant to ship. */}
          <section
            className="flex h-80 w-full shrink-0 items-center justify-center bg-card md:h-96 lg:h-160"
            data-slot="home-placeholder"
          >
            <p className="rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-muted-foreground lg:text-lg">
              Placeholder
            </p>
          </section>

          <HomeFaq />

          {/* Below `lg` the closing field is the hero's own, suggestions and all. */}
          <ClosingCta
            search={
              <HeroSearch
                categories={CATEGORIES.map(({ label }) => t(label))}
                examples={searchExamples}
                placeholder={t("searchExample2")}
                compact
                submitLabel={c("search")}
                typing={false}
              />
            }
          />
          </HomeIntro>
        </div>

        {/* Runs under the tab bar, which is what the bar frosts against. The
            desktop frame has no tab bar to clear, so the inset goes with it. */}
        <SiteFooter className={FOOTER_ABOVE_TAB_BAR} />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
