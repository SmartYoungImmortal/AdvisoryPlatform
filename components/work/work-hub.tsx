import { CalendarDays, FileText, Star, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BottomBar } from "@/components/bottombar";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
} from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
import { StatTile } from "@/components/mobile/stat-tile";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { buddhistYear } from "@/lib/calendar";
import { getAdvisor } from "@/lib/catalogue/services";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  PENDING_TOTAL,
  TODAY,
  TODAY_SESSIONS,
  TODAY_WEEKDAY,
  WORK_TAB_HREF,
  type WorkTab,
} from "@/lib/work";

const TABS: readonly WorkTab[] = ["today", "calendar", "earnings"];

/** The prototype's signed-in Advisor — the same record the public profile reads. */
const ME = getAdvisor("sarah-jenskins");

/** "อา. 16 ส.ค. 2569" — built from the real weekday, never a typed one. */
export function useTodayLabel(): string {
  const t = useTranslations("work");
  return t("dateLabel", {
    weekday: t(`weekdayAbbr.${TODAY_WEEKDAY}`),
    day: TODAY.day,
    month: t("monthAbbr"),
    year: buddhistYear(TODAY.year),
  });
}

function WorkTabs({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");

  return (
    <SegmentedTabs
      className="pt-1 pb-2 lg:px-0"
      current={current}
      items={TABS.map((tab) => ({
        key: tab,
        label: t(`tab.${tab}`),
        href: WORK_TAB_HREF[tab],
      }))}
      label={t("title")}
    />
  );
}

/**
 * The desk's four figures, the way the admin console leads with its counts.
 *
 * Desktop only, and on purpose: at 1440 the hub had a heading, three tabs and then
 * a phone's worth of cards, so nothing told the reader how the day was going before
 * they started reading rows. The phone frame has no room to say it twice, and these
 * numbers are all repeated further down the same screen.
 *
 * Every figure is read from the fixtures the rest of the hub renders — the session
 * count is `TODAY_SESSIONS`, the pending count is the pending desk's own rows, the
 * score and the review count are the catalogue's, not a typed pair.
 */
function WorkStats() {
  const t = useTranslations("work");
  const a = useTranslations("advisor");
  const p = useTranslations("advisorProfile");
  const today = useTodayLabel();

  return (
    <div className="hidden w-full shrink-0 lg:grid lg:grid-cols-4 lg:gap-4">
      <StatTile
        hint={today}
        icon={CalendarDays}
        label={t("todaySessions")}
        tone="accent"
        value={TODAY_SESSIONS.length}
      />
      <StatTile
        icon={FileText}
        label={t("pendingTitle")}
        value={PENDING_TOTAL}
      />
      <StatTile
        hint={a("withdrawnMeta")}
        icon={Wallet}
        label={a("available")}
        value={a("availableAmount")}
      />
      <StatTile
        hint={ME ? p("reviewCount", { count: ME.reviews }) : undefined}
        icon={Star}
        label={a("statRating")}
        value={ME?.rating ?? "—"}
      />
    </div>
  );
}

/**
 * The frame every "งานของฉัน" view shares: the app bar, the hub heading, the three
 * view tabs and the Advisor tab bar with this hub selected.
 *
 * Built the way `EarningsScreen` already is — the bar scrolls with the content and
 * the tab bar overlays the bottom, so the body reserves its height.
 */
export function WorkHub({
  tab,
  subtitle,
  children,
}: {
  readonly tab: WorkTab;
  readonly subtitle: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("work");

  return (
    // Figma "Desktop / Advisor dashboard (Light)" (1787:26587): the same hub —
    // heading, the three tabs, the tab's own content — inside the 1200 column,
    // with the app nav above it and the site footer under it.
    //
    // The inset is `PAGE`, the one every peer workspace screen uses; this file
    // carried its own `lg:px-4 xl:px-24` and then let each block keep its 24px
    // too, which is how the two-column split ended up with 72px of gutter.
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="gap-1.5 pb-19.5 lg:gap-0 lg:pb-0">
        <TopBar unreadNotifications />
        <div
          className={cn(
            "contents lg:flex lg:flex-col lg:gap-5 lg:pt-4 lg:pb-14",
            PAGE,
          )}
        >
          <ScreenHeading
            className="gap-1 lg:px-0"
            subtitle={subtitle}
            title={t("title")}
          />
          <WorkTabs current={tab} />
          <WorkStats />
          {children}
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="advisor" selected="work" />
    </MobileScreen>
  );
}
