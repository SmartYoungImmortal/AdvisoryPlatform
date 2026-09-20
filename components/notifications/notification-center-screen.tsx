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
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { SurfaceList } from "@/components/mobile/surface";
import { TopBar } from "@/components/topbar";
import { READING_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * What each kind of notification is *about*, in colour.
 *
 * Every row was the same 16px grey glyph, so a payout and a harassment report
 * looked identical until they were read. There is no noun in the message file to
 * label a kind with — and colour must never be the only carrier — so the colour
 * rides on the glyph chip and doubles the glyph that is already there: money is
 * green, a request needs an answer and is amber, a message is the accent, a
 * booking is informational.
 */
const KINDS = {
  booking: "bg-info/10 text-info",
  message: "bg-accent-surface text-primary",
  money: "bg-success/12 text-success",
  verified: "bg-success/12 text-success",
  request: "bg-warning/15 text-warning",
  review: "bg-warning/15 text-warning",
} as const;

type NotificationKind = keyof typeof KINDS;

/**
 * Figma notification row — 64px tall: a 16px glyph, a title/body stack and a
 * right-aligned relative time with an optional 8px unread dot.
 *
 * Unread used to be one 8px dot and nothing else, on a row whose title was the
 * same weight as the row below it. It now carries weight the way the chat inbox
 * does — a tinted ground, a semibold title — so the feed has a shape before it
 * is read. The row also answers the pointer, which it never did.
 */
function NotificationRow({
  icon: Icon,
  kind,
  title,
  body,
  time,
  unread = false,
  href,
}: {
  readonly icon: LucideIcon;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly time: string;
  readonly unread?: boolean;
  readonly href: string;
}) {
  return (
    <Link
      className={cn(
        "flex w-full shrink-0 items-center gap-3 overflow-clip px-3.5 py-3 transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
        unread && "bg-accent-surface/40 hover:bg-accent-surface/70",
      )}
      href={href}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          KINDS[kind],
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
        <p
          className={cn(
            "w-full truncate text-sm text-foreground",
            unread ? "font-semibold" : "font-medium",
          )}
        >
          {title}
        </p>
        <p className="w-full truncate text-xs font-normal tabular-nums text-muted-foreground">
          {body}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-latin text-xs font-normal tabular-nums whitespace-nowrap text-muted-foreground">
          {time}
        </span>
        {unread ? (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Figma day group — 20px top padding, a caption, then the card.
 *
 * The caption was a 12px muted line, the same step as the body copy inside the
 * card under it, so a day heading had less presence than a notification's
 * subtitle. It is a section head now. The card is `SurfaceList`, which is where
 * the hairlines between the rows come from — the group used to space them with a
 * hand-built `Divider` between every pair.
 */
function DayGroup({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5 lg:px-0 lg:pt-6",
        READING_COLUMN,
      )}
    >
      <p className="w-full text-base font-semibold text-foreground lg:text-lg">
        {label}
      </p>
      <SurfaceList>{children}</SurfaceList>
    </div>
  );
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
          kind="booking"
          time={t("bookingConfirmedTime")}
          title={t("bookingConfirmedTitle")}
          unread
        />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          kind="message"
          time={t("newMessageTime")}
          title={t("newMessageTitle")}
          unread
        />
        <NotificationRow
          body={t("paymentBody")}
          href="/transactions/detail"
          icon={CreditCard}
          kind="money"
          time={t("paymentTime")}
          title={t("paymentTitle")}
        />
      </DayGroup>

      <DayGroup label={t("yesterday")}>
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          kind="message"
          time={t("yesterday")}
          title={t("newMessageTitle")}
        />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat/sarah-jenskins"
          icon={MessageSquare}
          kind="message"
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
          kind="request"
          time={t("screeningRequestTime")}
          title={t("screeningRequestTitle")}
          unread
        />
        <NotificationRow
          body={t("newBookingBody")}
          href="/work/calendar"
          icon={CalendarDays}
          kind="booking"
          time={t("bookingConfirmedTime")}
          title={t("newBookingTitle")}
          unread
        />
        <NotificationRow
          body={t("newMessageBody")}
          href="/chat"
          icon={MessageSquare}
          kind="message"
          time={t("newMessageTime")}
          title={t("advisorMessageTitle")}
          unread
        />
        <NotificationRow
          body={t("payoutBody")}
          href="/earnings"
          icon={CreditCard}
          kind="money"
          time={t("paymentTime")}
          title={t("payoutTitle")}
        />
      </DayGroup>

      <DayGroup label={t("yesterday")}>
        <NotificationRow
          body={t("reviewBody")}
          href="/reviews"
          icon={Star}
          kind="review"
          time={t("yesterday")}
          title={t("reviewTitle")}
        />
        <NotificationRow
          body={t("verifiedBody")}
          href="/advisor/profile"
          icon={BadgeCheck}
          kind="verified"
          time={t("yesterday")}
          title={t("verifiedTitle")}
        />
      </DayGroup>
    </>
  );
}

/**
 * Figma "Empty State": a circled glyph, a title and a line of copy — which is
 * `EmptyState`, at the size every other empty list in the app now uses.
 */
function EmptyFeed() {
  const t = useTranslations("notifications");

  return (
    <div className={cn("w-full shrink-0 pt-14", READING_COLUMN)}>
      <EmptyState body={t("emptyBody")} icon={Bell} title={t("emptyTitle")} />
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
        <div className="w-full shrink-0 lg:border-b lg:border-border lg:bg-card lg:shadow-card">
          <div className={cn("relative", READING_COLUMN)}>
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
