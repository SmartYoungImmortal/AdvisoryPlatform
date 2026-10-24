"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type RefObject } from "react";

import { ChapterCost } from "@/components/home/chapter-cost";
import { ChapterGood } from "@/components/home/chapter-good";
import { ChapterSafe } from "@/components/home/chapter-safe";
import { ChapterWho } from "@/components/home/chapter-who";
import { ClosingCta } from "@/components/home/closing-cta";
import { HeroSearch } from "@/components/home/hero-search";
import { HomeFaq } from "@/components/home/home-faq";
import { advisorsOf, categoryIndex, recommended, useSoonestOpen } from "@/components/home/home-data";
import { HomeHero } from "@/components/home/home-hero";
import { HomeIntro } from "@/components/home/intro";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FilterButton } from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { useLiveCatalogue } from "@/lib/catalogue/live";
import { FOOTER_ABOVE_TAB_BAR } from "@/lib/layout";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

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
 * Re-measures every scroll trigger when the page below the hero changes
 * height. The chapters fill in from the API after the first paint, and
 * ScrollTrigger only re-measures on a window resize, so the held stage of
 * `ChapterSafe` would otherwise keep positions taken from the skeletons.
 */
function useRefreshOnGrowth(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let height = el.offsetHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = new ResizeObserver(() => {
      if (el.offsetHeight === height) return;
      height = el.offsetHeight;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    watch.observe(el);
    return () => {
      clearTimeout(timer);
      watch.disconnect();
    };
  }, [ref]);
}

/**
 * The home page: the hero's promise, "advice you can trust", then the
 * conversation under it. Each chapter opens on a question a first-time visitor
 * really has, in the hero's own hand, and the platform answers it in type, with
 * the live catalogue (`useLiveCatalogue`, the same lists `/search` reads) as
 * the proof, so every card opens the real service:
 *
 * 1. "Who do I ask about this?": the topics people bring here (`ChapterWho`).
 * 2. "Are they any good?": the people, and how each was checked (`ChapterGood`).
 * 3. "What will it cost?": prices per session, and who is free (`ChapterCost`).
 * 4. "Is my money safe?": the fee followed from payment to payout (`ChapterSafe`).
 * 5. "Still not sure?": the questions people ask (`HomeFaq`).
 *
 * It closes on a field to ask in, in the room the hero is set in (`ClosingCta`).
 * With the API down the answers that need data fold away and the rest stay;
 * the first chapter keeps its screen and offers to try again.
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

  const column = useRef<HTMLDivElement>(null);
  useRefreshOnGrowth(column);

  const catalogue = useLiveCatalogue();
  const open = useSoonestOpen();
  const { items } = catalogue;
  const loading = catalogue.loading && items.length === 0;
  const advisors = advisorsOf(items);
  const categories = categoryIndex(items);
  const counts =
    items.length > 0 ? { advisors: advisors.length, services: items.length, categories: categories.length } : null;
  // The fee chapter four follows: the most reviewed service's own price.
  const fee = recommended(items)[0]?.price ?? null;

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="relative isolate bg-card">
        {/* `login`: the home page is open to guests, so a guest gets the
            way in rather than a bell that leads to a sign-in wall. */}
        <TopBar unreadNotifications />
        {/* The page's wash used to sit here, a 458px band behind the top of
            the content. It is gone with the hero's own gradient: the hero is
            now a flat field carrying a dozen coloured shapes, and a wash
            bleeding up behind them gave the band a second light direction. */}

        {/* No gap between the blocks: each section carries its own rhythm, and
            on `lg` the first one has to land exactly where the hero's track
            leaves it, 6rem below the top of the screen. */}
        <div className="flex w-full shrink-0 flex-col items-center pt-2 lg:pt-0" ref={column}>
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
                <span className="lg:hidden">{t("searchTitle")}</span>
                {/* Two lines on purpose, broken where the sentence turns. The
                    `<em>` in the message is kept but drawn in the headline's
                    own grey: a blue word read as a link. */}
                <span className="hidden lg:inline">
                  {t.rich("heroTitle", {
                    br: () => <br />,
                    em: (chunks) => <>{chunks}</>,
                  })}
                </span>
              </span>
            }
          >
            <HeroSearch
              categories={CATEGORIES.map(({ label }) => t(label))}
              examples={searchExamples}
              placeholder={t("searchPlaceholder")}
              submitLabel={c("search")}
            />
            <FilterButton className="lg:hidden" label={c("filters")} />
          </HomeHero>

          <ChapterWho
            failed={catalogue.error !== null}
            loading={loading}
            onRetry={catalogue.reload}
            topics={categories}
            total={items.length}
          />

          <ChapterGood advisors={advisors} counts={counts} loading={loading} />

          <ChapterCost items={items} loading={loading} open={open} />

          <ChapterSafe fee={fee} />

          <HomeFaq />

          <ClosingCta />
          </HomeIntro>
        </div>

        {/* Runs under the tab bar, which is what the bar frosts against. The
            desktop frame has no tab bar to clear, so the inset goes with it. */}
        <SiteFooter className={cn(FOOTER_ABOVE_TAB_BAR, "page-scale")} />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="home" />
    </MobileScreen>
  );
}
