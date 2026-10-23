"use client";

import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  LogOut,
  Mail,
  MessageSquare,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";

import { BOOKING_BUCKET, BOOKING_TONE, useMountTime } from "@/components/bookings/booking-flow";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { SettingsCard, SettingsRow } from "@/components/mobile/settings-list";
import { StatusPill } from "@/components/mobile/status-pill";
import { OwnAvatar, hasRole, useOwnProfile } from "@/components/profile/profile-data";
import { AccountEmail, AccountName } from "@/components/session/account-bits";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/api/client";
import { listAdvisors, listMyBookings, listServices } from "@/lib/api/resources";
import type { ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * fastwork's pill: 40px, fully round, 16/500, the icon 12px in from the left.
 * `dark` is their black "Share profile"; the rest are the grey "Invite friends".
 */
function pill(dark = false) {
  return cn(
    // 44 on touch screens, the minimum a thumb hits reliably; fastwork's 40
    // once there is a pointer.
    "h-11 gap-2 rounded-full border-0 pr-4 pl-3 text-base font-medium lg:h-10 [&_svg:not([class*='size-'])]:size-4",
    dark
      ? "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85"
      : "bg-muted text-foreground hover:bg-accented/60",
  );
}

function PillLink({
  href,
  icon: Icon,
  dark,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly dark?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <Button className={pill(dark)} nativeButton={false} render={<Link href={href} />}>
      <Icon aria-hidden />
      {children}
    </Button>
  );
}

type Row = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href: string;
};

/**
 * The account's own profile, on the frame of fastwork's profile page
 * (`fastwork.com/user/<handle>`, measured at 1710): identity on the left, one
 * tall soft panel on the right, a ruled heading across the page, and what it
 * heads.
 *
 * The frame is fastwork's; what sits in it is not, because fastwork's page is a
 * seller's shop front and this is a buyer's own account. Each control is in the
 * one place it belongs, and none appears twice:
 *
 * - **The panel holds the next booking**, the thing someone opening their
 *   account most often came to check. Empty, it offers the search.
 * - **Every figure is real and opens the bookings**: all three are counted
 *   from `GET /bookings/me`. Sessions and reviews, which the API does not
 *   count, are gone rather than shown as a confident zero.
 * - **Editing sits with the identity it edits**, once.
 * - **One menu, no tabs**: five rows do not need a second click to reach two
 *   of them. Chat and payments are rows here rather than pills, since the
 *   panel already carries the booking's own way to chat.
 * - **Log-out ends the page**, apart from everything else and in red, the
 *   last thing anyone should hit by accident.
 * - **Becoming an advisor is a quiet strip** under the menu: an offer for the
 *   few, not the page's largest surface.
 */
export function ProfileScreen({
  overlay,
}: {
  /** Kept for the log-out route, which renders this page under its dialog. */
  readonly variant?: "view" | "logout";
  readonly overlay?: ReactNode;
}) {
  const t = useTranslations("profile");
  const b = useTranslations("bookings");
  const p = useTranslations("payment");
  const s = useTranslations("search");
  const format = useFormatter();
  const now = useMountTime();
  const profile = useOwnProfile();
  const offersAdvisor = !hasRole(profile.data, "advisor");

  const bookings = useResource<Paginated<ApiBooking>>(
    "bookings/me?limit=50",
    useCallback((signal: AbortSignal) => listMyBookings({ limit: 50 }, signal), []),
  );
  const services = useResource<Paginated<ApiPublicService>>(
    "services?limit=100",
    useCallback((signal: AbortSignal) => listServices({ limit: 100 }, signal), []),
  );
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    useCallback((signal: AbortSignal) => listAdvisors({ limit: 100 }, signal), []),
  );

  const all = bookings.data?.items ?? [];
  // Still ahead of the clock as well as open: a held slot whose time has passed
  // is neither "upcoming" in the count nor "next" in the panel, so the two can
  // never disagree.
  const upcoming = all
    .filter(
      (booking) =>
        BOOKING_BUCKET[booking.state] === "upcoming" && Date.parse(booking.startTime) > now,
    )
    .toSorted((x, y) => Date.parse(x.startTime) - Date.parse(y.startTime));
  const next = upcoming[0];
  const nextService = next
    ? services.data?.items.find((service) => service.id === next.serviceId)
    : undefined;
  const nextAdvisor = next
    ? advisors.data?.items.find((advisor) => advisor.id === next.advisorId)
    : undefined;

  // `null` until the list lands, drawn as a skeleton bar, so nothing reads a
  // confident 0 it does not have.
  const count = (value: number) => (bookings.data ? String(value) : null);
  const stats = [
    { value: count(upcoming.length), label: t("stats.upcoming") },
    {
      value: count(all.filter((booking) => booking.state === "COMPLETED").length),
      label: t("stats.completed"),
    },
    { value: count(bookings.data?.total ?? 0), label: t("stats.bookings") },
  ];

  const rows: readonly Row[] = [
    { icon: MessageSquare, label: t("tiles.chat"), href: "/chat" },
    { icon: Wallet, label: t("tiles.payments"), href: "/transactions" },
    { icon: Bell, label: t("tiles.alerts"), href: "/notifications" },
    { icon: Settings, label: t("accountSettings"), href: "/settings" },
    { icon: CircleHelp, label: t("helpCentre"), href: "/landing#faq" },
    { icon: ShieldCheck, label: t("termsPrivacy"), href: "/terms" },
  ];

  const joined = profile.data?.createdAt
    ? format.dateTime(new Date(profile.data.createdAt), { month: "short", year: "numeric" })
    : null;
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });

  return (
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="bg-card pb-19.5 lg:pb-0">
        <TopBar unreadNotifications />

        <div className={cn("flex w-full shrink-0 flex-col items-start px-6 pt-4 pb-10 lg:pt-10 lg:pb-24", PAGE)}>
          <div className="grid w-full shrink-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,680px)] lg:items-start">
            {/* Who you are: 80px portrait, 24px over to the text column. */}
            {/* Side by side on the phone too: stacked, the portrait took a
                whole band of the first screen to itself. */}
            <div className="flex w-full min-w-0 flex-row items-start gap-4 lg:gap-6">
              <OwnAvatar className="text-2xl" size={80} />
              <div className="flex w-full min-w-0 flex-col items-start gap-1.5 lg:pt-1">
                <h1 className="w-full truncate text-heading-lg leading-tight font-semibold text-foreground">
                  {profile.data?.displayName ?? <AccountName fallback={t("name")} />}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                    {t("role")}
                  </span>
                  {joined ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{t("memberSince", { date: joined })}</span>
                    </>
                  ) : null}
                </div>
                <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">
                    {profile.data?.email ?? <AccountEmail fallback="" />}
                  </span>
                </span>

                {/* fastwork's stat strip: one 16px-round outline, the figures
                    16/600 over 12px labels. The whole strip opens the bookings
                    every figure is counted from. */}
                <Link
                  className="mt-4 flex items-stretch rounded-2xl border border-border transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  href="/bookings"
                >
                  {stats.map((stat) => (
                    <span
                      className="flex min-w-20 flex-col items-center gap-0.5 px-4 py-4 lg:px-6"
                      key={stat.label}
                    >
                      {stat.value === null ? (
                        <span aria-hidden className="my-1 h-4 w-5 animate-pulse rounded-md bg-muted" />
                      ) : (
                        <span className="font-latin text-base font-semibold text-foreground tabular-nums">
                          {stat.value}
                        </span>
                      )}
                      <span className="text-xs font-normal text-muted-foreground">{stat.label}</span>
                    </span>
                  ))}
                </Link>

                <div className="mt-3">
                  <PillLink href="/profile/edit" icon={UserRoundCog}>
                    {t("editProfileAction")}
                  </PillLink>
                </div>
              </div>
            </div>

            {/* fastwork's tall soft panel (their show reel): grey fading out
                to the page, 18px corners (`rounded-2xl` on this theme's
                scale). Here it is the next booking. */}
            <section
              aria-labelledby="profile-next"
              className="flex w-full flex-col justify-center gap-5 rounded-2xl bg-linear-to-b from-muted to-transparent px-6 py-8 lg:min-h-[383px] lg:px-10 lg:py-7"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-muted-foreground" id="profile-next">
                  {t("nextTitle")}
                </h2>
                {next ? (
                  <StatusPill tone={BOOKING_TONE[next.state]}>
                    {next.state === "PENDING_PAYMENT" ? p("bookingUnconfirmed") : b("tabUpcoming")}
                  </StatusPill>
                ) : null}
              </div>

              {bookings.error ? (
                // A failed list is not an empty one: saying "no upcoming
                // bookings" here would be the one false sentence on the page.
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-heading font-semibold text-foreground">{s("loadFailedTitle")}</p>
                    <p className="text-sm text-muted-foreground">{bookings.error.message}</p>
                  </div>
                  <div>
                    <Button className={pill()} onClick={bookings.reload}>
                      <RotateCw aria-hidden />
                      {s("retry")}
                    </Button>
                  </div>
                </>
              ) : !bookings.data ? (
                // The loaded layout's own shape, so nothing shifts when it lands.
                <div aria-hidden className="flex flex-col gap-3">
                  <span className="h-8 w-3/5 animate-pulse rounded-md bg-card" />
                  <span className="h-4 w-1/4 animate-pulse rounded-md bg-card" />
                  <span className="mt-2 h-4 w-2/5 animate-pulse rounded-md bg-card" />
                  <span className="mt-3 h-10 w-52 animate-pulse rounded-full bg-card" />
                </div>
              ) : next ? (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-heading font-semibold text-foreground">
                      {format.dateTime(new Date(next.startTime), {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                    <p className="font-latin text-base text-muted-foreground tabular-nums">
                      {time(next.startTime)} - {time(next.endTime)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-base font-semibold text-foreground">
                      {nextService?.name ?? " "}
                    </p>
                    <p className="text-sm text-muted-foreground">{nextAdvisor?.displayName ?? " "}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <PillLink dark href={`/chat/${next.advisorId}`} icon={MessageSquare}>
                      {t("chatAdvisor")}
                    </PillLink>
                    <PillLink href="/bookings" icon={CalendarDays}>
                      {t("allBookings")}
                    </PillLink>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-heading font-semibold text-foreground">{t("noUpcomingTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("noUpcomingBody")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <PillLink dark href="/search" icon={Search}>
                      {t("findAdvisor")}
                    </PillLink>
                    {all.length > 0 ? (
                      <PillLink href="/bookings" icon={CalendarDays}>
                        {t("allBookings")}
                      </PillLink>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* The ruled heading fastwork draws its tab bar as: one 16/600
              label, a hairline under the whole page. */}
          <h2 className="mt-10 w-full shrink-0 border-b border-border pb-3 text-base font-semibold text-foreground lg:mt-14">
            {t("menuLabel")}
          </h2>

          <div className="mt-6 grid w-full shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
            {rows.map((row) => (
              <SettingsCard key={row.href}>
                <SettingsRow href={row.href} icon={row.icon} label={row.label} />
              </SettingsCard>
            ))}
          </div>

          {offersAdvisor ? (
            <Link
              className="mt-3 flex w-full shrink-0 items-center gap-3 rounded-card border border-dashed border-border px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              href="/advisor/apply"
            >
              <Briefcase aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">{t("becomeAdvisorTitle")}</span>
                <span className="truncate text-xs text-muted-foreground">{t("becomeAdvisorBody")}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}

          <Button
            className="mt-8 h-11 gap-2 px-0 lg:h-10 text-base font-medium text-destructive hover:bg-transparent hover:text-destructive/80 [&_svg:not([class*='size-'])]:size-4"
            nativeButton={false}
            render={<Link href="/settings/logout" />}
            variant="ghost"
          >
            <LogOut aria-hidden />
            {t("logOut")}
          </Button>
        </div>

        <SiteFooter className="hidden lg:mt-auto lg:flex" />
      </ScreenBody>
      {/* Figma's desktop nav carries these destinations itself — see `TopBar`. */}
      <BottomBar className="lg:hidden" role="user" selected="user" />
      {overlay}
    </MobileScreen>
  );
}
