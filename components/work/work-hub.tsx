import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BottomBar } from "@/components/bottombar";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
} from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { WORK_TAB_HREF, type WorkTab } from "@/lib/work";

const TABS: readonly WorkTab[] = ["today", "calendar", "earnings"];

function WorkTabs({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");

  return (
    <SegmentedTabs
      className="pt-1 pb-2"
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
    // with the app nav above it and the site footer under it. The blocks keep
    // their own 24px inset, so the page inset here is 96.
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="gap-1.5 pb-19.5 lg:gap-0 lg:pb-0">
        <TopBar unreadNotifications />
        <div className="contents lg:mx-auto lg:flex lg:w-full lg:max-w-[1440px] lg:flex-col lg:gap-2 lg:px-4 xl:px-24 lg:pt-4 lg:pb-14">
          <ScreenHeading className="gap-1" subtitle={subtitle} title={t("title")} />
          <WorkTabs current={tab} />
          {children}
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="advisor" selected="work" />
    </MobileScreen>
  );
}

/** Figma section head — a 16/24 semibold title with a muted count or link trailing. */
export function WorkSectionHead({
  title,
  trailing,
}: {
  readonly title: ReactNode;
  readonly trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <h2 className="min-w-px flex-1 text-base font-semibold text-foreground">
        {title}
      </h2>
      {trailing}
    </div>
  );
}
