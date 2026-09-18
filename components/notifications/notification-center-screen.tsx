import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquare,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { TopBar } from "@/components/topbar";

/**
 * The 800px reading column the desktop notification frames centre in the page —
 * every band inside "Desktop / Notification center (Light)" (1952:35428) lays
 * its content out on it, at x=320 of the 1440 frame. The phone frame has no such
 * column, so it is a `lg:`-only cap on the block that already spans the width.
 */
export const FEED_COLUMN = "lg:mx-auto lg:max-w-200 lg:px-0";

/**
 * Figma notification row — 64px tall: a 16px glyph, a title/body stack and a
 * right-aligned relative time with an optional 8px unread dot.
 */
function NotificationRow({
  icon: Icon,
  title,
  body,
  time,
  unread = false,
  href,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly time: string;
  readonly unread?: boolean;
  readonly href: string;
}) {
  return (
    <Link
      className="flex h-16 w-full shrink-0 items-start gap-3 overflow-clip px-3.5 py-3"
      href={href}
    >
      <Icon className="mt-3 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p className="w-full text-sm font-medium text-foreground">
          {title}
        </p>
        <p className="w-full text-xs font-normal text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="mt-[11px] flex shrink-0 items-center gap-2">
        <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">
          {time}
        </span>
        {unread ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : null}
      </div>
    </Link>
  );
}

/** Figma day group — 20px top padding, an 18px caption, then the card. */
function DayGroup({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={`flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5 lg:pt-6 ${FEED_COLUMN}`}>
      <p className="w-full text-xs font-normal text-muted-foreground">
        {label}
      </p>
      {/* On the page ground the desktop frame puts behind this band the card
          needs its own hairline; on the phone the surface change carries it. */}
      <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card lg:border lg:border-border">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full shrink-0 bg-muted" />;
}

/** Figma's feed for the reader who books: a confirmation, a reply, a receipt. */
function AdviseeFeed() {
  const t = useTranslations("notifications");

  return (
    <>
      <DayGroup label={t("today")}>
        <NotificationRow
          body={t("bookingConfirmedBody")}
          href="/transactions/detail"
          icon={CalendarDays}
          time={t("bookingConfirmedTime")}
          title={t("bookingConfirmedTitle")}
          unread
        />
        <Divider />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          time={t("newMessageTime")}
          title={t("newMessageTitle")}
          unread
        />
        <Divider />
        <NotificationRow
          body={t("paymentBody")}
          href="/transactions/detail"
          icon={CreditCard}
          time={t("paymentTime")}
          title={t("paymentTitle")}
        />
      </DayGroup>

      <DayGroup label={t("yesterday")}>
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          time={t("yesterday")}
          title={t("newMessageTitle")}
        />
        <Divider />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          time={t("yesterday")}
          title={t("newMessageTitle")}
        />
      </DayGroup>
    </>
  );
}

/**
 * The same feed from the other side of the booking (1952:35562): the request to
 * screen, the booking that came of it, the reply, the payout — then yesterday's
 * review and the verification that put the profile up.
 *
 * Each row goes where an advisor would act on it, which is why the screening
 * request lands on the request desk and the payout on the earnings screen.
 */
function AdvisorFeed() {
  const t = useTranslations("notifications");

  return (
    <>
      <DayGroup label={t("today")}>
        <NotificationRow
          body={t("screeningRequestBody")}
          href="/screening/requests"
          icon={FileText}
          time={t("screeningRequestTime")}
          title={t("screeningRequestTitle")}
          unread
        />
        <Divider />
        <NotificationRow
          body={t("newBookingBody")}
          href="/work/calendar"
          icon={CalendarDays}
          time={t("bookingConfirmedTime")}
          title={t("newBookingTitle")}
          unread
        />
        <Divider />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat"
          icon={MessageSquare}
          time={t("newMessageTime")}
          title={t("advisorMessageTitle")}
          unread
        />
        <Divider />
        <NotificationRow
          body={t("payoutBody")}
          href="/earnings"
          icon={CreditCard}
          time={t("paymentTime")}
          title={t("payoutTitle")}
        />
      </DayGroup>

      <DayGroup label={t("yesterday")}>
        <NotificationRow
          body={t("reviewBody")}
          href="/reviews"
          icon={Star}
          time={t("yesterday")}
          title={t("reviewTitle")}
        />
        <Divider />
        <NotificationRow
          body={t("verifiedBody")}
          href="/advisor/profile"
          icon={BadgeCheck}
          time={t("yesterday")}
          title={t("verifiedTitle")}
        />
      </DayGroup>
    </>
  );
}

/**
 * Figma "Empty State": 72px circle, 12px gaps, 306px copy column — the desktop
 * frame keeps all three and only widens the column.
 */
function EmptyFeed() {
  const t = useTranslations("notifications");

  return (
    <div
      className={`flex w-full shrink-0 flex-col items-center gap-3 px-12 pt-20 text-center ${FEED_COLUMN}`}
    >
      <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-muted">
        <Bell className="size-7 text-muted-foreground" />
      </span>
      <p className="w-full text-xl font-semibold text-foreground">
        {t("emptyTitle")}
      </p>
      <p className="w-full text-sm font-normal text-muted-foreground">
        {t("emptyBody")}
      </p>
    </div>
  );
}

/** Which feed each state opens on. */
const FEEDS = {
  default: AdviseeFeed,
  empty: EmptyFeed,
  advisor: AdvisorFeed,
} as const;

/**
 * Figma "Notification center (Light)" (995:10813) and its empty state (995:10894).
 *
 * "Desktop / Notification center (Light)" (1952:35428) is the same three parts
 * at 1440: the app nav carrying the back control, a white heading band across
 * the page, and the feed on the page ground — both laid out on one 800px column
 * centred in the frame, closing on the site footer.
 *
 * `advisor` is "Desktop / Notification center - Advisor (Light)" (1952:35562):
 * the same screen turned round to the other side of the booking — a screening
 * request instead of a confirmation, a payout instead of a payment, and the
 * review and verification rows the phone frame keeps as hidden layers
 * (995:10867, 995:10875). Section 995:10812 has no advisor phone frame of its
 * own, so below `lg` it is this frame's rows in the phone frame's anatomy.
 *
 * Figma also swaps the nav for "Top Nav / Advisor" (หน้าหลัก / งานของฉัน / …).
 * `TopBar` carries one link set for the whole app, so only the back control
 * follows the role here; the nav is left to the one component that owns it.
 */
export function NotificationCenterScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "advisor";
}) {
  const t = useTranslations("notifications");
  const c = useTranslations("common");
  const advisor = state === "advisor";
  // The advisee reaches this from their profile; the advisor from the desk.
  const back = advisor ? "/work" : "/profile";
  const Feed = FEEDS[state];

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href={back} label={c("back")} />
      <ScreenBody>
        <div className="hidden w-full lg:block">
          <TopBar backHref={back} />
        </div>

        {/* Figma "Head Band" — the title sits on the card surface rather than
            the page, so the band is full-bleed and only its content is capped. */}
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card">
          <div className={`relative ${FEED_COLUMN}`}>
            <ScreenHeading className="pt-4 lg:pt-5 lg:pb-9" title={t("title")} />
            {/* Figma's desktop head band carries this beside the title; the
                phone frame has no room for it. */}
            <Button
              className="absolute end-0 bottom-9 hidden h-auto p-0 text-sm font-medium text-primary hover:bg-transparent lg:block"
              variant="ghost"
            >
              {t("markAllRead")}
            </Button>
          </div>
        </div>

        <Feed />

        <ScreenSpacer className="lg:min-h-14" />
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
