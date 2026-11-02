import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame } from "@/components/account/app-frame";
import { BottomBar } from "@/components/bottombar";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { FEED_COLUMN } from "@/components/notifications/notification-center-screen";
import { cn } from "@/lib/utils";
import { WORK_TAB_HREF, type WorkTab } from "@/lib/work";

const TABS: readonly WorkTab[] = ["today", "calendar", "earnings"];

/** The page's inset on a phone and an upright tablet; from `lg` the shell's. */
export const WORK_GUTTER = "px-5 md:px-10 lg:px-0";

/**
 * The desk's three views as capsules, the current one filled in ink — the
 * same capsules the notification centre and the transactions filter by. They
 * are links, not a filter: each view is its own address.
 */
function WorkTabs({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");

  return (
    <nav
      aria-label={t("title")}
      className="-mx-5 mt-5 flex min-w-0 gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10 lg:mx-0 lg:mt-8 lg:gap-3 lg:px-0"
    >
      {TABS.map((tab) => {
        const active = tab === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-12 lg:px-5 lg:text-frame-meta",
              active
                ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            href={WORK_TAB_HREF[tab]}
            key={tab}
          >
            {t(`tab.${tab}`)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * `/work`, `/work/calendar`, `/work/earnings`: the advisor's desk, inside the
 * account frame like every other page an account owns — the rail (where the
 * desk has its own "งาน" place), the white panel, the title in the hero's
 * face, the three views as capsules, then the view. The phone keeps the
 * advisor's tab bar with the desk selected.
 */
export function WorkHub({
  tab,
  subtitle,
  children,
}: {
  readonly tab: WorkTab;
  readonly subtitle?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("work");

  return (
    <MobileScreen className="bg-card pb-0" wide="md">
      <AppFrame active="work">
        <ScreenBody className="bg-card pb-19.5 lg:pb-0">
          <AccountShell>
            <div className={cn("flex w-full min-w-0 flex-col pt-6 pb-12 lg:flex-1 lg:pt-0 lg:pb-0", FEED_COLUMN, WORK_GUTTER)}>
              <header className="flex flex-col gap-1 lg:gap-2">
                <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:text-frame-title">
                  {t("title")}
                </h1>
                {subtitle ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{subtitle}</p> : null}
              </header>
              <WorkTabs current={tab} />
              {children}
            </div>
          </AccountShell>
        </ScreenBody>
      </AppFrame>
      <BottomBar className="lg:hidden" role="advisor" selected="work" />
    </MobileScreen>
  );
}
