"use client";

import { CalendarDays, ChevronLeft, Clock, House, Inbox, Package, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame, type RailKey } from "@/components/account/app-frame";
import { LinkListCount } from "@/components/account/link-list";
import { BottomBar } from "@/components/bottombar";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { Button } from "@/components/ui/button";
import { usePendingScreening } from "@/components/work/work-data";
import { cn } from "@/lib/utils";
import { WORK_TABS, WORK_TAB_HREF, type WorkTab } from "@/lib/work";

/** The page's inset on a phone and an upright tablet; from `lg` each side pads itself. */
export const WORK_GUTTER = "px-5 md:px-10 lg:px-0";

const PLACE_ICON: Record<WorkTab, LucideIcon> = {
  today: House,
  calendar: CalendarDays,
  services: Package,
  availability: Clock,
  requests: Inbox,
  earnings: Wallet,
};

/** The current item's glyph filled, as the settings menu marks its own. */
const SOLID_GLYPH = "fill-current stroke-muted";

/**
 * The desk's places as a menu at the left of the panel, from `lg`: the
 * settings page's menu, item for item (its 320 column against the panel's
 * left edge, ruled off from the page, 48 rows with the glyph and the name,
 * the current one on the muted ground with its glyph filled). The requests
 * waiting on an answer show their count. It stays on every page of the desk,
 * the place a page belongs to marked, so nothing about where one is moves.
 */
function WorkMenu({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");
  const w = useTranslations("workDesk");
  const pending = usePendingScreening();

  return (
    <nav aria-label={t("title")} className="hidden lg:flex lg:flex-col lg:border-r lg:border-border lg:px-6 lg:pt-6 lg:pb-16">
      <div className="flex flex-col gap-5 lg:sticky lg:top-6">
        <p className="font-hero text-heading font-normal tracking-tight text-hero-ink">{t("title")}</p>
        <ul className="flex flex-col gap-1">
          {WORK_TABS.map((tab) => {
            const Icon = PLACE_ICON[tab];
            const active = tab === current;
            return (
              <li key={tab}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-xl px-4 font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-body",
                    active ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                  )}
                  href={WORK_TAB_HREF[tab]}
                >
                  <Icon aria-hidden className={cn("size-5 shrink-0", active && SOLID_GLYPH)} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{t(`tab.${tab}`)}</span>
                  {tab === "requests" && pending.data ? (
                    <LinkListCount count={pending.data} label={w("pendingCount", { count: pending.data })} />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/**
 * The same places below `lg`, as capsules under the title, the current one
 * filled in ink — the capsules the notification centre filters by. Links,
 * not a filter: each place is its own address.
 */
function WorkTabs({ current }: { readonly current: WorkTab }) {
  const t = useTranslations("work");

  return (
    <nav aria-label={t("title")} className="-mx-5 mt-5 flex min-w-0 gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10 lg:hidden">
      {WORK_TABS.map((tab) => {
        const active = tab === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
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
 * Every page of the advisor's desk: the rail with "งาน" current and the white
 * panel, laid out as the settings page is — from `lg` the desk's menu
 * (`WorkMenu`) at the left, and beside it the page under its band (its 88
 * row ruled off below: the way back when the page is one thing a place
 * opened, the title, its line, its action at the right). On the phone the
 * band is the title in the hero's face; a place shows the capsules under it
 * and the tab bar at the foot, and what a place opened shows the chevron
 * back on a row of its own instead.
 *
 * `place` is the menu's item the page belongs to; a page that is no place of
 * the desk's (the advisor page's facts, under the profile) leaves it out and
 * has no menu.
 */
export function WorkFrame({
  place,
  title,
  subtitle,
  action,
  backHref,
  rail = "work",
  stickyBand = false,
  footer,
  overlay,
  bodyClassName,
  children,
}: {
  readonly place: WorkTab | null;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** The page's one action, at the right of its title. */
  readonly action?: ReactNode;
  /** For a page a place opened: where its chevron goes back to. */
  readonly backHref?: string;
  readonly rail?: RailKey;
  /** From `lg` the band stays at the top while the page scrolls under it (the service editor's). */
  readonly stickyBand?: boolean;
  /** Held to the foot of the scroller, under the page (the editor's save). */
  readonly footer?: ReactNode;
  /** Laid over the screen, outside the scroller (the phone's floating price on a service). */
  readonly overlay?: ReactNode;
  /** Classes for the scroller (a page's own greys). */
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}) {
  const c = useTranslations("common");
  const isPlace = place !== null && backHref === undefined;

  return (
    <MobileScreen className="bg-card pb-0" wide="md">
      <AppFrame active={rail}>
        <ScreenBody className={cn("bg-card lg:pb-0", isPlace && "pb-19.5", bodyClassName)}>
          {/* `compact`: the whole panel, so the menu sits against its left edge; each side pads itself. */}
          <AccountShell compact>
            <div
              className={cn(
                "flex w-full min-w-0 flex-col pt-6 pb-12 lg:grid lg:grow lg:items-stretch lg:p-0",
                place !== null && "lg:grid-cols-[20rem_minmax(0,1fr)]",
                WORK_GUTTER,
              )}
            >
              {place !== null ? <WorkMenu current={place} /> : null}

              <div className="flex min-w-0 flex-col">
                <header
                  className={cn(
                    "flex w-full flex-col items-start gap-3 lg:h-22 lg:shrink-0 lg:flex-row lg:items-center lg:gap-4 lg:border-b lg:border-border lg:px-12",
                    stickyBand && "lg:sticky lg:top-0 lg:z-30 lg:bg-card",
                  )}
                >
                  {backHref ? (
                    <Button
                      aria-label={c("back")}
                      className="relative -ml-1.5 size-8 shrink-0 text-foreground before:absolute before:-inset-1.5 before:content-['']"
                      nativeButton={false}
                      render={<Link href={backHref} />}
                      size="icon"
                      variant="ghost"
                    >
                      <ChevronLeft aria-hidden className="size-6" />
                    </Button>
                  ) : null}
                  <div className="flex w-full min-w-0 flex-1 flex-wrap items-end justify-between gap-x-4 gap-y-3 lg:flex-nowrap lg:items-center">
                    <div className="flex min-w-0 flex-col gap-1 lg:gap-0.5">
                      <h1 className="font-hero text-title-compact font-normal tracking-tight text-hero-ink lg:truncate lg:font-sans lg:text-frame-heading lg:font-semibold lg:tracking-normal lg:text-foreground">
                        {title}
                      </h1>
                      {/* On the phone always a line, held by a space until the page has its words, so the
                          capsules under it never move; from `lg` the band's height holds everything still. */}
                      <p className={cn("text-sm text-muted-foreground lg:truncate lg:text-frame-meta", !subtitle && "lg:hidden")}>
                        {subtitle ?? " "}
                      </p>
                    </div>
                    {/* A place's action goes under the capsules on the phone, so they stand at the same height on all six. */}
                    {action ? <div className={cn("shrink-0", isPlace && "max-lg:hidden")}>{action}</div> : null}
                  </div>
                </header>
                {isPlace ? <WorkTabs current={place} /> : null}
                {isPlace && action ? <div className="mt-4 lg:hidden">{action}</div> : null}
                <div className="flex min-w-0 flex-1 flex-col lg:px-12 lg:pb-16">{children}</div>
              </div>
            </div>
          </AccountShell>
          {footer}
        </ScreenBody>
      </AppFrame>
      {overlay}
      {isPlace ? <BottomBar className="lg:hidden" role="advisor" selected="work" /> : null}
    </MobileScreen>
  );
}
