import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BottomBar } from "@/components/bottombar";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
} from "@/components/mobile/screen";
import { SegmentedTabs } from "@/components/mobile/segmented-tabs";
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
    <MobileScreen className="pb-0">
      <ScreenBody className="gap-1.5 pb-19.5">
        <TopBar unreadNotifications />
        <ScreenHeading className="gap-1" subtitle={subtitle} title={t("title")} />
        <WorkTabs current={tab} />
        {children}
      </ScreenBody>
      <BottomBar role="advisor" selected="work" />
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
