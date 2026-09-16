import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BottomBar } from "@/components/bottombar";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { WORK_TAB_HREF, type WorkTab } from "@/lib/work";

const TABS: readonly WorkTab[] = ["today", "calendar", "earnings"];

/**
 * Figma "View Tabs" — a full-width track whose selected segment takes the accent
 * fill and a small lift. Each segment is a sibling route rather than client state,
 * the way the rest of the prototype's tabbed screens work.
 */
function WorkTabs({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");

  return (
    <div className="flex w-full shrink-0 items-start overflow-clip px-6 pt-1 pb-2">
      <nav
        aria-label={t("title")}
        className="flex min-w-px flex-1 items-center rounded-[12px] bg-muted p-1"
      >
        {TABS.map((tab) => (
          <Link
            aria-current={tab === current ? "page" : undefined}
            className={cn(
              "flex min-h-8 min-w-px flex-1 items-center justify-center rounded-lg px-2.5 py-[5.5px] text-sm font-medium whitespace-nowrap",
              tab === current
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            href={WORK_TAB_HREF[tab]}
            key={tab}
          >
            {t(`tab.${tab}`)}
          </Link>
        ))}
      </nav>
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
