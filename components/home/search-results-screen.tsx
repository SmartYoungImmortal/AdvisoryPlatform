import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  christopherNolan as chris,
  jamesGunn as james,
  serviceAdvisorsDesk as coverTax,
  serviceAdvisorsReview as coverBusiness,
  serviceLaptopCode as coverTech,
} from "@/lib/assets/r2";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import {
  FilterButton,
  FilterChip,
  SearchField,
  ServiceMeta,
} from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";

/** Figma "Result Card" — an 88px square cover beside the title, advisor and meta. */
function ResultCard({
  cover,
  title,
  advisor,
  avatar,
  rating,
  reviews,
  price,
}: {
  readonly cover: StaticImageData;
  readonly title: string;
  readonly advisor: string;
  readonly avatar: ReactNode;
  readonly rating: string;
  readonly reviews: string;
  readonly price: string;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-xl border bg-card p-2">
      <Image
        alt=""
        className="size-22 shrink-0 rounded-xl object-cover"
        src={cover}
      />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <p className="w-full text-sm font-semibold text-foreground">{title}</p>
        <div className="flex w-full shrink-0 items-center gap-1 overflow-clip">
          {avatar}
          <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
            {advisor}
          </p>
        </div>
        <ServiceMeta
          price={price}
          rating={rating}
          reviews={reviews}
          starClassName="size-3"
        />
      </div>
    </div>
  );
}

/**
 * Figma "Search results (Light)" — 1155:17475.
 *
 * The search bar replaces the app's nav bar on this frame, so `TopBar` is not
 * used here: there is no lockup and the leading glyph goes back to the home
 * screen. It stays above `ScreenBody` rather than inside it, so the query and
 * the filter affordance remain on screen while the results scroll.
 */
export function SearchResultsScreen() {
  const t = useTranslations("search");
  const c = useTranslations("common");

  return (
    <MobileScreen>
      {/* Figma "Search Bar" — 16px side padding over a 28px back chevron. The
          glyph is #a3a3a3 in the design, which no token names; the muted ink at
          70% lands on the same grey and still follows the theme. */}
      <div className="flex w-full shrink-0 items-center gap-2 overflow-clip px-4 pt-8 pb-2">
        <Button
          aria-label={c("back")}
          className="relative size-7 shrink-0 overflow-visible text-muted-foreground/70 before:absolute before:-inset-2 before:content-['']"
          nativeButton={false}
          render={<Link href="/" />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="size-7" />
        </Button>
        <SearchField
          aria-label={c("search")}
          defaultValue={t("query")}
          iconClassName="size-4"
        />
        <FilterButton iconClassName="size-4" label={c("filters")} />
      </div>

      <ScreenBody>
        {/* Figma "Page Content" — 24px side padding, 16px between blocks. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-4 px-6 pt-2 pb-6">
          {/* Figma "Results Meta" */}
          <div className="flex w-full shrink-0 items-center overflow-clip">
            <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
              {t("count")}
            </p>
            <div className="flex shrink-0 items-center gap-1 overflow-clip">
              <p className="text-sm font-medium whitespace-nowrap text-foreground">
                {t("sort")}
              </p>
              <ChevronUp className="size-3.5 shrink-0 text-foreground" />
            </div>
          </div>

          {/* Figma "Active Filters" */}
          <div className="flex w-full shrink-0 items-start gap-2 overflow-x-auto">
            <FilterChip active>{t("filterQuery")}</FilterChip>
            <FilterChip>{t("filterToday")}</FilterChip>
            <FilterChip>{t("filterRating")}</FilterChip>
          </div>

          {/* Figma "Results List" */}
          <div className="flex w-full shrink-0 flex-col items-start gap-3">
            <ResultCard
              advisor={t("r1Advisor")}
              avatar={<ChatAvatar size={16} />}
              cover={coverTax}
              price={t("r1Price")}
              rating={t("r1Rating")}
              reviews={t("r1Reviews")}
              title={t("r1Title")}
            />
            <ResultCard
              advisor={t("r2Advisor")}
              avatar={<ChatAvatar crop={false} size={16} src={chris} />}
              cover={coverBusiness}
              price={t("r2Price")}
              rating={t("r2Rating")}
              reviews={t("r2Reviews")}
              title={t("r2Title")}
            />
            <ResultCard
              advisor={t("r3Advisor")}
              avatar={<ChatAvatar crop={false} size={16} src={james} />}
              cover={coverTech}
              price={t("r3Price")}
              rating={t("r3Rating")}
              reviews={t("r3Reviews")}
              title={t("r3Title")}
            />
            <ResultCard
              advisor={t("r4Advisor")}
              avatar={<ChatAvatar size={16} />}
              cover={coverTax}
              price={t("r4Price")}
              rating={t("r4Rating")}
              reviews={t("r4Reviews")}
              title={t("r4Title")}
            />
          </div>
        </div>
      </ScreenBody>
      <BottomBar role="user" selected="home" />
    </MobileScreen>
  );
}
