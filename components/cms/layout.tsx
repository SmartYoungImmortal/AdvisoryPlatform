"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronsUpDown, ExternalLink, LogOut, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { useRulingVersion } from "@/components/cms/api";
import { CmsAvatar } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { useDashboardCounts, type DashboardCounts } from "@/components/cms/dashboard-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logo } from "@/lib/assets/r2";
import { cmsNav, isCmsNavActive, type CmsNavCount, type CmsNavItem } from "@/lib/navigation/cms";
import { signOut, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The console's frame, built the way the account pages' app frame is: from
 * `lg`, a grey ground with the sidebar standing on it and the page in one
 * white panel inset 6px from the top, right and bottom edges with 20px
 * corners. Below `lg` the panel is the whole screen and the sidebar moves
 * into a sheet that the phone bar's menu button opens.
 *
 * Sizes are written for a 1440 screen and drawn under `cms-scale` (see
 * `app/globals.css`), so they render as written at 1440 and on any wider
 * screen, and shrink with the width on a landscape tablet, as the site does.
 */

/**
 * The sidebar: 256 by default (the width of a desk name plus its count), and
 * draggable between 208 and 360. A double-click on the edge returns it to
 * 256. The width is in the sidebar's own 1440 px, before its zoom.
 */
const SIDEBAR = { min: 208, max: 360, initial: 256 } as const;
const SIDEBAR_STORAGE_KEY = "cms-sidebar-width";

function clampSidebar(width: number): number {
  return Math.round(Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, width)));
}

/**
 * The width the viewer last dragged to, remembered per browser. Storage can be
 * blocked or empty; the sidebar then simply opens at its default.
 */
function useSidebarWidth() {
  const [width, setWidth] = useState<number>(SIDEBAR.initial);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
      // Read after mount: the static render has no storage to read from.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of a per-viewer preference.
      if (saved) setWidth(clampSidebar(saved));
    } catch {
      // Blocked storage: keep the default.
    }
  }, []);

  function commit(next: number) {
    const value = clampSidebar(next);
    setWidth(value);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    } catch {
      // Blocked storage: the width holds for this visit only.
    }
  }

  return [width, commit] as const;
}

const SidebarContext = createContext<{
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => undefined });

/**
 * The theme is scoped on <body> as well as on the wrapper, so dialogs and
 * menus that portal out of the wrapper still get it.
 */
function useBodyTheme() {
  useEffect(() => {
    document.body.classList.add("cms-admin");
    return () => document.body.classList.remove("cms-admin");
  }, []);
}

export function CmsThemeScope({ children }: { readonly children: ReactNode }) {
  useBodyTheme();
  return <div className="cms-admin min-h-dvh bg-background font-sans text-foreground">{children}</div>;
}

export function CmsDashboard({ children }: { readonly children: ReactNode }) {
  const t = useTranslations("cms.nav");
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useSidebarWidth();
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; width: number; zoom: number } | null>(null);
  const aside = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  // After a ruling lands, the page mounts again and reads what it dropped.
  const version = useRulingVersion();

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    // The sidebar is zoomed, so a pointer's screen pixels are worth less (or
    // more) than its own: measure the ratio once, at the start of the drag.
    const drawn = aside.current?.getBoundingClientRect().width ?? width;
    drag.current = { x: event.clientX, width, zoom: drawn / width || 1 };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setWidth(drag.current.width + (event.clientX - drag.current.x) / drag.current.zoom);
  }

  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    if (event.key === "ArrowLeft") setWidth(width - step);
    else if (event.key === "ArrowRight") setWidth(width + step);
    else if (event.key === "Home") setWidth(SIDEBAR.min);
    else if (event.key === "End") setWidth(SIDEBAR.max);
    else return;
    event.preventDefault();
  }

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        className={cn(
          "fixed inset-0 flex overflow-hidden bg-card lg:bg-background",
          dragging && "cursor-ew-resize select-none",
        )}
      >
        <aside
          className="cms-scale relative hidden w-(--width) shrink-0 flex-col lg:flex"
          id="cms-sidebar"
          ref={aside}
          style={{ "--width": `${width}px` } as CSSProperties}
        >
          <SidebarBody version={version} />
        </aside>
        {/* The resize handle: no width of its own, a 12px grab area over the
            gap between the sidebar and the panel. */}
        <div
          aria-controls="cms-sidebar"
          aria-label={t("resize")}
          aria-orientation="vertical"
          aria-valuemax={SIDEBAR.max}
          aria-valuemin={SIDEBAR.min}
          aria-valuenow={width}
          className="relative z-10 hidden cursor-ew-resize touch-none select-none before:absolute before:inset-y-0 before:-right-1.5 before:-left-1.5 focus-visible:outline-none focus-visible:before:bg-ring/30 lg:block"
          data-cms-resize=""
          onDoubleClick={() => setWidth(SIDEBAR.initial)}
          onKeyDown={onKeyDown}
          onLostPointerCapture={onPointerUp}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          // The WAI-ARIA window splitter: a focusable `separator` with a value,
          // moved by arrow keys and dragged by pointer, so these handlers belong
          // on it. NOSONAR: S6847/S6845 do not know the splitter pattern.
          role="separator" // NOSONAR
          tabIndex={0}
        />
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetContent
            className="cms-admin gap-0 border-0 bg-background p-0 outline-none data-[side=left]:w-72 lg:hidden"
            // Opened by a press, the sheet takes the focus itself, so the logo
            // does not open showing its focus ring; from the keyboard it goes
            // to the first link as usual.
            initialFocus={(type) => (type === "keyboard" ? true : sheet.current)}
            ref={sheet}
            showCloseButton={false}
            side="left"
          >
            <SheetTitle className="sr-only">{t("label")}</SheetTitle>
            <SidebarBody version={version} />
          </SheetContent>
        </Sheet>
        <main
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-card lg:my-1.5 lg:me-1.5 lg:overflow-hidden lg:rounded-[20px]"
          data-slot="cms-panel"
        >
          <Fragment key={version}>{children}</Fragment>
        </main>
      </div>
    </SidebarContext.Provider>
  );
}

function SidebarBody({ version }: { readonly version: number }) {
  const t = useTranslations("cms.nav");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <Link
          aria-label={t("home")}
          className="flex shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/admin/dashboard"
        >
          {/* The wordmark in ink, as the app frame's rail draws the mark. */}
          <Image
            alt="Advisory"
            className="h-6.5 w-auto brightness-0"
            priority
            src={logo}
          />
        </Link>
        <span className="truncate text-sm font-medium text-muted-foreground">{t("brand")}</span>
      </div>
      {/* Mounted again after every ruling, so its counts are read again. */}
      <NavList key={version} />
      <div className="shrink-0 px-3 pt-2 pb-3">
        <UserMenu />
      </div>
    </div>
  );
}

function NavList() {
  const t = useTranslations("cms.nav");
  const pathname = usePathname();
  const counts = useDashboardCounts();

  return (
    <nav aria-label={t("label")} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
      {cmsNav.map((group) => (
        <div className="flex flex-col" key={group.key}>
          {group.titled ? (
            <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">
              {t(`group.${group.key}`)}
            </p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavEntry
                count={item.count ? waitingCount(counts, item.count) : undefined}
                item={item}
                key={item.key}
                pathname={pathname}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function waitingCount(counts: DashboardCounts, which: CmsNavCount): number | undefined {
  if (which === "verification") return counts.verification;
  if (which === "cases") return counts.cases;
  if (which === "refunds") return counts.refunds;
  return counts.payoutsWaiting;
}

/**
 * One desk: its line icon and name, the current one on the faint ink square
 * the app frame's rail marks its current place with. How many items wait on
 * it sits at the right edge, and only when there are any.
 */
function NavEntry({
  item,
  pathname,
  count,
}: {
  readonly item: CmsNavItem;
  readonly pathname: string;
  readonly count: number | undefined;
}) {
  const t = useTranslations("cms.nav");
  const { setOpen } = useContext(SidebarContext);
  const active = isCmsNavActive(item, pathname);
  const Icon = item.icon;

  return (
    <li className="min-w-0">
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10",
          active
            ? "bg-hero-ink/7 text-hero-ink"
            : "text-hero-ink/80 hover:bg-hero-ink/4 hover:text-hero-ink",
        )}
        href={item.href}
        // In the phone's sheet, following a link should close it.
        onClick={() => setOpen(false)}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
        {count ? (
          <span className="shrink-0 font-latin text-xs font-medium text-muted-foreground tabular-nums">
            <span className="sr-only">{t("waiting", { count })}</span>
            <span aria-hidden>{count > 99 ? "99+" : count}</span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** The signed-in admin at the sidebar's foot, opening upward: the site, and signing out. */
function UserMenu() {
  const t = useTranslations("cms.userMenu");
  const session = useSession();
  const account = session.status === "authenticated" ? session.account : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <CmsButton
            className="h-auto w-full justify-start gap-3 rounded-xl px-2 py-2 text-start hover:bg-hero-ink/4 md:h-auto"
            variant="ghost"
          />
        }
      >
        {account ? <CmsAvatar account={account} /> : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {account?.name ?? t("menu")}
          </span>
          {account ? (
            <span className="truncate font-latin text-xs font-normal text-muted-foreground">
              {account.email}
            </span>
          ) : null}
        </span>
        <ChevronsUpDown aria-hidden className="size-4 text-muted-foreground" />
        <span className="sr-only">{t("menu")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-60 rounded-xl bg-popover p-1 shadow-panel ring-1 ring-border"
        side="top"
        sideOffset={8}
      >
        {account ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col px-2.5 py-2">
              <span className="truncate text-sm font-medium text-foreground">{account.name}</span>
              <span className="truncate font-latin text-xs font-normal text-muted-foreground">
                {account.email}
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="h-9 gap-2.5 rounded-lg px-2.5 text-sm text-foreground"
            onClick={() => window.open("/", "_blank", "noopener")}
          >
            <ExternalLink aria-hidden className="size-4 text-muted-foreground" />
            {t("openSite")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-9 gap-2.5 rounded-lg px-2.5 text-sm"
            onClick={() => {
              // A full load: the console gate reacts to the sign-out as well, and
              // its soft redirect would carry a `?next=` back into the console.
              // After the API has dropped the cookie: leaving cancels that request.
              void signOut().then(() => window.location.replace("/admin/login"));
            }}
            variant="destructive"
          >
            <LogOut aria-hidden className="size-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A page's tabs, as the profile page draws its own: names in a row on a
 * hairline, the current one in full ink on a 2px rule. Links, so a tab is in
 * the address and survives a reload. A count beside a name says how many wait
 * there (on a queue) or how many it holds (on a list); none when it is zero.
 */
export function CmsPageTabs({
  label,
  tabs,
  current,
}: {
  readonly label: string;
  readonly tabs: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly href: string;
    readonly count?: number;
  }>;
  readonly current: string;
}) {
  return (
    <nav
      aria-label={label}
      className="mt-6 flex gap-6 overflow-x-auto border-b border-border md:gap-8"
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 shrink-0 items-center gap-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full",
              active
                ? "font-semibold text-foreground after:bg-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
            href={tab.href}
            key={tab.key}
            replace
            scroll={false}
          >
            {tab.label}
            {tab.count ? (
              <span className="rounded-full bg-muted px-2 font-latin text-xs leading-5 font-medium text-foreground tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * A page inside the panel: the phone's bar (below `lg`), then the page column
 * — at most 1280 wide, 36 in from the panel's edges and 40 down, as the
 * account pages' column is — holding the head (the way back to the list, the
 * title in the site's heading face with its status beside it, a muted line,
 * the page's own actions at the right, its tabs) and the body.
 *
 * `aside` is the column beside a record: 288 or 320 wide from `lg`, ruled off
 * by a hairline and held in view while the record scrolls; under the record
 * on a phone.
 */
export function CmsPage({
  title,
  badge,
  description,
  backHref,
  backLabel,
  actions,
  tabs,
  aside,
  children,
}: {
  readonly title: ReactNode;
  readonly badge?: ReactNode;
  readonly description?: ReactNode;
  readonly backHref?: string;
  /** The list the way back leads to; "back" when it is left out. */
  readonly backLabel?: string;
  readonly actions?: ReactNode;
  /** `CmsPageTabs`, under the title. */
  readonly tabs?: ReactNode;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("cms.nav");
  const { setOpen } = useContext(SidebarContext);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 lg:hidden">
        <CmsButton
          aria-label={t("openMenu")}
          icon={Menu}
          onClick={() => setOpen(true)}
          variant="ghost"
        />
        <Image alt="Advisory" className="h-5.5 w-auto brightness-0" src={logo} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-slot="cms-scroll">
        <div className="cms-scale mx-auto flex w-full max-w-7xl flex-col px-5 pt-6 pb-16 md:px-10 md:pt-8 lg:px-9 lg:pt-10">
          <header className="flex flex-col">
            {backHref ? (
              <Link
                className="mb-3 inline-flex h-8 items-center gap-1 self-start rounded-full pe-2 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                href={backHref}
              >
                <ChevronLeft aria-hidden className="size-4" />
                {backLabel ?? t("back")}
              </Link>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h1 className="min-w-0 font-hero text-title-compact font-normal tracking-tight break-words text-hero-ink md:text-2xl">
                    {title}
                  </h1>
                  {badge}
                </div>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {tabs}
          </header>
          <div
            className={cn(
              "mt-6 md:mt-8",
              aside &&
                "lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12",
            )}
          >
            <div className="flex min-w-0 flex-col gap-10">{children}</div>
            {aside ? (
              <aside className="mt-10 border-t border-border pt-6 lg:sticky lg:top-10 lg:mt-0 lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
                {aside}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
