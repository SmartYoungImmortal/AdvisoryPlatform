import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  bookingsByStatus,
  nextSession,
  upcomingCount,
  type Booking,
} from "@/lib/bookings";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { BottomBar } from "@/components/bottombar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/** Figma "Meta" — a 16px glyph and a 14/20 muted line, on an 8px gap. */
function MetaRow({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: React.ReactNode;
}) {
  return (
    <span className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-normal whitespace-nowrap text-muted-foreground">
        {children}
      </span>
    </span>
  );
}

/**
 * Figma "Tabs" (1326:18659) — a segmented control on the muted surface: 3px of
 * padding around pills that carry the same 10px radius as the track, the
 * selected one filled with the accent and lifted on `shadow-sm`.
 *
 * Static here. The frame draws only the selected state of "กำลังจะถึง", and this
 * screen has no client boundary; wiring the other two is a state change, not a
 * transcription, so it waits for the completed and cancelled frames.
 */
function StatusTabs({ labels }: { readonly labels: readonly string[] }) {
  return (
    <div className="flex w-full shrink-0 items-start overflow-clip">
      <div className="flex shrink-0 items-center rounded-lg bg-muted p-[3px]">
        {labels.map((label, index) => (
          <span
            className={cn(
              "flex min-h-[29px] min-w-[29px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium whitespace-nowrap",
              index === 0
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Figma "Next Session Card" (1326:18661) — the only card on the screen the
 * accent outlines rather than fills, because it is the one you can act on now.
 */
function NextSessionCard() {
  const t = useTranslations("bookings");

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip pb-1">
      <div className="flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip rounded-xl border border-primary bg-card p-3.5">
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <p className="min-w-px flex-1 text-sm font-semibold text-primary">
            {t("nextSession")}
          </p>
          <span className="flex shrink-0 items-start rounded-full bg-accent-surface px-2.5 py-1 text-xs font-normal whitespace-nowrap text-primary">
            {nextSession.countdown}
          </span>
        </div>

        <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
          <ChatAvatar
            crop={nextSession.crop}
            size={44}
            src={nextSession.avatar}
          />
          <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip whitespace-nowrap">
            <span className="text-base font-semibold text-foreground">
              {nextSession.title}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {nextSession.advisor}
            </span>
          </span>
        </div>

        <span className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium whitespace-nowrap text-foreground">
            {nextSession.when}
          </span>
        </span>

        {/* The frame sizes these to their labels rather than splitting the row,
            so they stay auto-width instead of taking the buttons' full-width
            default. */}
        <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
          <PrimaryButton className="w-auto shrink-0" href={`/chat/sarah-jenskins`}>
            {t("join")}
          </PrimaryButton>
          <NeutralButton className="w-auto shrink-0" href="/transactions/detail">
            {t("details")}
          </NeutralButton>
        </div>
      </div>
    </div>
  );
}

/** Figma booking card (1326:18680) — header, a hairline, then the two meta rows. */
function BookingCard({ booking }: { readonly booking: Booking }) {
  return (
    <Link
      className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip rounded-xl bg-card p-3.5"
      href="/transactions/detail"
    >
      <span className="flex w-full shrink-0 items-center gap-3 overflow-clip">
        <ChatAvatar crop={booking.crop} size={40} src={booking.avatar} />
        <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip whitespace-nowrap">
          <span className="truncate text-base font-semibold text-foreground">
            {booking.title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {booking.advisor}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </span>

      <span className="h-px w-full shrink-0 bg-border" />

      <span className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
        <MetaRow icon={CalendarDays}>{booking.when}</MetaRow>
        <MetaRow icon={CreditCard}>{booking.payment}</MetaRow>
      </span>
    </Link>
  );
}

/**
 * Figma "My bookings (Light)" — 1326:18632.
 *
 * The screen the `การจอง` tab has been pointing at nothing for: `lib/navigation`
 * carried a note that the tab had no frame yet, so it rendered as a plain label.
 *
 * The frame's status bar and home indicator are not reproduced — this app draws
 * no mock OS chrome — and its nav bar and tab bar are the shared `TopBar` and
 * `BottomBar`, so the lockup and tab metrics stay identical to every other
 * screen.
 */
export function MyBookingsScreen() {
  const t = useTranslations("bookings");
  const upcoming = bookingsByStatus("upcoming");

  return (
    // Figma "Desktop / My bookings (Light)" (1952:32485) keeps every part of the
    // phone frame and re-seats them: the title becomes a band across the page,
    // the tabs and the list take the wide column, and the next session — which
    // the phone stacks above the list — rides beside it.
    <MobileScreen className="pb-0" wide>
      <ScreenBody className="pb-18 lg:pb-0">
        <TopBar unreadNotifications />

        {/* Figma "Page Content" — 24px inset, 16px between blocks. */}
        <div className="flex w-full shrink-0 flex-col items-center gap-4 px-6 lg:mx-auto lg:max-w-[1440px] lg:gap-0 lg:px-10 xl:px-30">
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip pt-4 pb-2 lg:gap-1 lg:pt-6 lg:pb-8">
            <h1 className="w-full text-heading font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
              {t("upcomingCount", { count: upcomingCount })}
            </p>
          </div>

          <div className="contents lg:grid lg:w-full lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:pb-14">
            <div className="contents lg:flex lg:flex-col lg:gap-4">
              <StatusTabs
                labels={[t("tabUpcoming"), t("tabCompleted"), t("tabCancelled")]}
              />

              <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip pb-6 lg:order-last lg:pb-0">
                <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
                  {t("upNext")}
                </p>
                <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip">
                  {upcoming.map((booking) => (
                    <BookingCard booking={booking} key={booking.id} />
                  ))}
                </div>
              </div>
            </div>

            {/* The phone frame puts this above the list; the desktop frame
                stands it in the column beside it. */}
            <div className="contents lg:block lg:self-start">
              <NextSessionCard />
            </div>
          </div>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="bookings" />
    </MobileScreen>
  );
}
