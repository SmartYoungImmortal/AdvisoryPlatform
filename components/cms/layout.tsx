"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { CmsButton } from "@/components/cms/button";
import { useCmsFeedback } from "@/components/cms/feedback";
import { CmsAvatar } from "@/components/cms/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logo } from "@/lib/assets/r2";
import { resetDatabase } from "@/lib/mock-db/store";
import { cmsNav, isCmsNavActive, type CmsNavItem } from "@/lib/navigation/cms";
import { signOut, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Nexus's `cms-flex` layout on Nuxt UI's dashboard components: a fixed-height
 * group, a 220px sidebar (brand row, navigation, user menu) and a panel whose
 * navbar carries the page title. Below `lg` the sidebar moves into a sheet the
 * navbar's menu button opens, as `UDashboardSidebar` does.
 */
const SidebarContext = createContext<{
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => undefined });

/**
 * Nexus scopes its theme on <body> so dialogs that portal out still get it; the
 * wrapper class covers the static render, this covers the portals.
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

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="fixed inset-0 flex overflow-hidden">
        <aside className="relative hidden min-h-svh w-[220px] min-w-16 shrink-0 flex-col border-e border-border lg:flex">
          <SidebarBody />
        </aside>
        <Sheet onOpenChange={setOpen} open={open}>
          <SheetContent
            className="cms-admin w-[272px] gap-0 bg-background p-0 lg:hidden"
            showCloseButton={false}
            side="left"
          >
            <SheetTitle className="sr-only">{t("label")}</SheetTitle>
            <SidebarBody />
          </SheetContent>
        </Sheet>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function SidebarBody() {
  const t = useTranslations("cms.nav");
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-center gap-1.5 px-4">
        <Link aria-label={t("home")} href="/admin/dashboard">
          <Image
            alt="Advisory Platform"
            className="h-8 w-auto max-w-40 object-contain"
            priority
            src={logo}
          />
        </Link>
      </div>
      <nav
        aria-label={t("label")}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-2"
      >
        <ul className="isolate flex min-w-0 flex-col">
          {cmsNav.map((item) => (
            <NavEntry item={item} key={item.key} pathname={pathname} />
          ))}
        </ul>
      </nav>
      <div className="flex shrink-0 flex-col gap-2 px-4 py-2">
        <Separator />
        <UserMenu />
      </div>
    </>
  );
}

const linkBase =
  "group relative flex w-full flex-row items-center gap-1.5 px-2.5 py-1.5 text-sm font-normal before:absolute before:inset-x-0 before:inset-y-px before:z-[-1] before:rounded-md focus:outline-none focus-visible:before:outline-3 focus-visible:before:outline-primary/25";

function linkState(active: boolean): string {
  return active
    ? "text-primary"
    : "text-muted-foreground transition-colors before:transition-colors hover:text-highlighted hover:before:bg-muted/50";
}

function NavEntry({
  item,
  pathname,
  nested = false,
}: {
  readonly item: CmsNavItem;
  readonly pathname: string;
  readonly nested?: boolean;
}) {
  const t = useTranslations("cms.nav");
  const { setOpen } = useContext(SidebarContext);
  const active = isCmsNavActive(item, pathname);
  const Icon = item.icon;
  const icon = (
    <Icon
      aria-hidden
      className={cn(
        "size-5 shrink-0",
        active ? "text-primary" : "text-dimmed transition-colors group-hover:text-foreground",
      )}
    />
  );

  if (item.children) {
    return (
      <li className="min-w-0">
        <Collapsible defaultOpen={active || !nested}>
          {/* Nexus hands every group its `cmsNavGroupHeaderClass`, which
              defaults to `font-semibold` — the headers outweigh their links. */}
          <CollapsibleTrigger className={cn(linkBase, linkState(active), "font-semibold")}>
            {icon}
            <span className="truncate">{t(item.key)}</span>
            <ChevronDown
              aria-hidden
              className="ms-auto size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="isolate ms-5 border-s border-border">
              {item.children.map((child) => (
                <NavEntry item={child} key={child.key} nested pathname={pathname} />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </li>
    );
  }

  return (
    <li className={cn("min-w-0", nested && "-ms-px ps-1.5")}>
      <Link
        aria-current={active ? "page" : undefined}
        className={cn(
          linkBase,
          linkState(active),
          // The highlight bar Nexus's `highlight` prop draws on nested links.
          nested &&
            "after:absolute after:inset-y-0.5 after:-start-1.5 after:block after:w-px after:rounded-full after:transition-colors",
          nested && active && "after:bg-primary",
        )}
        href={item.href ?? "#"}
        // On a phone the sidebar is a sheet; following a link should close it.
        onClick={() => setOpen(false)}
      >
        {icon}
        <span className="truncate">{t(item.key)}</span>
        {/* No waiting badge. `CmsNavItem.pending` counts rows of `lib/mock-db`,
            and the queues it counted — verification, refunds, reports,
            off-platform, payouts — now read the API, where all five are empty. A
            red 3 beside a queue the API says is empty is a lie the sidebar tells
            on every page. Restoring it means deriving the counts from the API in
            `lib/navigation/cms`, which is not this change's to edit. */}
      </Link>
    </li>
  );
}

/** `CmsUserMenu`: a ghost "Menu" button opening upward with the account on top. */
function UserMenu() {
  const t = useTranslations("cms.userMenu");
  const session = useSession();
  const { confirm, toast } = useCmsFeedback();
  const account = session.status === "authenticated" ? session.account : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <CmsButton
            className="w-full px-2"
            color="neutral"
            trailingIcon={Menu}
            variant="ghost"
          />
        }
      >
        {t("menu")}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-56 rounded-md bg-card p-0 shadow-lg ring-1 ring-border"
        side="top"
        sideOffset={8}
      >
        {account ? (
          <DropdownMenuGroup className="p-1">
            <DropdownMenuLabel className="flex items-center gap-2 p-1.5 text-sm font-semibold text-highlighted">
              <CmsAvatar account={account} size="lg" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{account.name}</span>
                <span className="truncate font-latin text-xs font-normal text-muted-foreground">
                  {account.email}
                </span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : null}
        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="rounded-md p-1.5 text-foreground"
            onClick={() => window.open("/", "_blank", "noopener")}
          >
            <ExternalLink className="size-5 text-dimmed" />
            {t("openSite")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-md p-1.5 text-foreground"
            onClick={async () => {
              const ok = await confirm({
                type: "warning",
                title: t("resetTitle"),
                description: t("resetBody"),
                confirmLabel: t("resetConfirm"),
              });
              if (!ok) return;
              resetDatabase();
              toast({ title: t("resetDone") });
            }}
          >
            <RotateCcw className="size-5 text-dimmed" />
            {t("reset")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="rounded-md p-1.5"
            onClick={() => {
              signOut();
              // A full load: the console gate reacts to the sign-out as well, and
              // its soft redirect would carry a `?next=` back into the console.
              window.location.replace("/admin/login");
            }}
            variant="destructive"
          >
            <LogOut className="size-5" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The panel: `UDashboardNavbar` (64px, bottom hairline, title at `xl:text-2xl`,
 * a back arrow on edit pages, actions on the right) over a scrolling body with
 * `p-4 sm:p-6`. `aside` is Nexus's right panel, 280/320px wide.
 */
export function CmsPage({
  title,
  badge,
  backHref,
  actions,
  aside,
  children,
}: {
  readonly title: ReactNode;
  readonly badge?: ReactNode;
  readonly backHref?: string;
  readonly actions?: ReactNode;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}) {
  const t = useTranslations("cms.nav");
  const { setOpen } = useContext(SidebarContext);
  const router = useRouter();

  return (
    <div className="relative flex min-h-svh min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-1.5 border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <CmsButton
            aria-label={t("openMenu")}
            className="lg:hidden"
            color="neutral"
            icon={Menu}
            onClick={() => setOpen(true)}
            variant="ghost"
          />
          {backHref ? (
            <CmsButton
              aria-label={t("back")}
              color="neutral"
              icon={ArrowLeft}
              onClick={() => router.push(backHref)}
              variant="ghost"
            />
          ) : null}
          <h1 className="truncate font-semibold text-highlighted xl:text-2xl xl:leading-8">{title}</h1>
          {badge}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6">
        {/* Nexus stacks the options panel under the form on narrow screens. */}
        <div className="flex w-full flex-col items-start gap-4 sm:gap-6 md:flex-row md:gap-8">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4 sm:gap-6">{children}</div>
          {aside ? <div className="w-full shrink-0 md:w-70 xl:w-80">{aside}</div> : null}
        </div>
      </div>
    </div>
  );
}
