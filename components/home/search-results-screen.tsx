import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  getAdvisor,
  getService,
  type Service,
} from "@/lib/catalogue/services";
import { Button } from "@/components/ui/button";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import {
  FilterButton,
  FilterChip,
  SearchField,
  ServicePrice,
  ServiceProof,
  VerifiedTick,
} from "@/components/home/parts";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";

/**
 * Figma "Result Card" — an 88px square cover beside the title, advisor and meta.
 *
 * A results list whose rows go nowhere is a dead end, which is what this was
 * until `/service/[id]` existed. It reads the same catalogue the home rails do,
 * so a service found here and a service found there are the same record.
 */
function ResultCard({ service }: { readonly service: Service }) {
  const advisor = getAdvisor(service.advisorId);
  if (!advisor) return null;

  return (
    <Link
      className="flex w-full shrink-0 items-start gap-3 overflow-clip rounded-xl border bg-card p-2"
      href={`/service/${service.id}`}
    >
      <Image
        alt=""
        className="size-22 shrink-0 rounded-xl object-cover"
        src={service.cover}
      />
      <span className="flex min-w-px flex-1 flex-col items-start gap-1 overflow-clip">
        <span className="w-full text-sm font-semibold text-foreground">
          <ThaiText>{service.title}</ThaiText>
        </span>
        <span className="flex w-full shrink-0 items-center gap-1 overflow-clip">
          <ChatAvatar crop={advisor.crop} size={16} src={advisor.avatar} />
          <span className="flex min-w-px flex-1 items-center gap-1 overflow-clip">
            <span className="min-w-px truncate text-xs font-normal text-muted-foreground">
              {advisor.name}
            </span>
            {advisor.verified ? <VerifiedTick /> : null}
          </span>
        </span>
        <ServiceProof
          bookings={service.bookings}
          rating={advisor.rating}
          reviews={advisor.reviews}
          starClassName="size-3"
        />
        <ServicePrice minutes={service.minutes} price={service.price} />
      </span>
    </Link>
  );
}

/** The catalogue records this frame's query ("วางแผนภาษี") turns up. */
const RESULT_IDS = [
  "tax-freelance",
  "tax-review",
  "tax-corporate",
  "tax-personal",
];

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
    <MobileScreen className="pb-0">
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

      <ScreenBody className="pb-18">
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
            {RESULT_IDS.map((id) => {
              const service = getService(id);
              return service ? (
                <ResultCard key={id} service={service} />
              ) : null;
            })}
          </div>
        </div>
      </ScreenBody>
      <BottomBar role="user" selected="home" />
    </MobileScreen>
  );
}
