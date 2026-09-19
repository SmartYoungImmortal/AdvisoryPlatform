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
  type BookingStatus,
} from "@/lib/bookings";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatTile } from "@/components/mobile/stat-tile";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { BottomBar } from "@/components/bottombar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TopBar } from "@/components/topbar";
import { PAGE, SPLIT_WITH_RAIL } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * The settlement line's colour comes from the booking's own status rather than
 * from matching its words: a cancelled booking's "คืนเงินแล้ว" is information, and
 * everything else's "ชำระแล้ว" is money that arrived. The word is always printed —
 * colour doubles it, never replaces it.
 */
const PAYMENT_TONE: Record<BookingStatus, StatusTone> = {
  upcoming: "success",
  completed: "success",
  cancelled: "info",
};

/**
 * The fixtures write a date and its range, and an amount and its settlement, as
 * one line each — "วันนี้ · 14:00 – 14:45", "฿840 · ชำระแล้ว". Both halves want
 * different treatment, so the row splits them back apart rather than printing two
 * facts at one weight.
 */
function splitMeta(line: string): readonly [string, string | undefined] {
  const [lead, ...rest] = line.split(" · ");
  return [lead ?? line, rest.length > 0 ? rest.join(" · ") : undefined];
}

/** Figma "Meta" — a 16px glyph and a 14/20 line, on an 8px gap. */
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
      <span className="flex min-w-px flex-1 items-center gap-1.5 text-sm font-normal whitespace-nowrap text-foreground">
        {children}
      </span>
    </span>
  );
}

/**
 * Figma "Tabs" (1326:18659) — a segmented control on the muted surface.
 *
 * Restyled to the shared `components/mobile/segmented-tabs`: the white thumb on
 * the muted track, the `rounded-card` track with `rounded-lg` segments inside it,
 * and a track that stops stretching at `lg`. The app had two segmented controls
 * disagreeing — this one filled its selected segment with the accent while the
 * profile's lifted a card out of the track.
 *
 * Still static, and still not `SegmentedTabs`: that control is a row of links and
 * these three tabs have no sibling routes to point at. Which is also why there is
 * no hover state here — a hover on something that cannot be clicked is a lie.
 */
function StatusTabs({ labels }: { readonly labels: readonly string[] }) {
  return (
    <div className="flex w-full shrink-0 items-start overflow-clip">
      <div className="flex min-w-px flex-1 items-center rounded-card bg-muted p-1 lg:w-auto lg:flex-none">
        {labels.map((label, index) => (
          <span
            className={cn(
              "flex min-h-8 min-w-px flex-1 items-center justify-center rounded-lg px-2.5 py-[5.5px] text-sm font-medium whitespace-nowrap lg:flex-none lg:px-4",
              index === 0
                ? "bg-card text-foreground shadow-card"
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
 *
 * The accent ring joins the edge, so on a page of raised white cards this one
 * reads as lifted out of them rather than as the one with a bluer hairline.
 */
function NextSessionCard() {
  const t = useTranslations("bookings");

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip pb-1">
      <Surface className="flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip border-primary p-3.5 ring-1 ring-primary/15">
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <p className="min-w-px flex-1 text-base font-semibold text-primary">
            {t("nextSession")}
          </p>
          <StatusPill icon={Clock} tone="accent">
            {nextSession.countdown}
          </StatusPill>
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

        <MetaRow icon={CalendarDays}>
          <span className="font-latin font-medium tabular-nums">
            {nextSession.when}
          </span>
        </MetaRow>

        {/* A row of two actions, so neither takes `block`: they size to their
            labels the way the frame draws them. */}
        <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
          <PrimaryButton className="w-auto shrink-0" href={`/chat/sarah-jenskins`}>
            {t("join")}
          </PrimaryButton>
          <NeutralButton className="w-auto shrink-0" href="/transactions/detail">
            {t("details")}
          </NeutralButton>
        </div>
      </Surface>
    </div>
  );
}

/**
 * Figma booking card (1326:18680) — header, a hairline, then the two meta rows.
 *
 * It had no edge at all: a white box on a near-white page, with the amount and
 * whether it was paid printed as one grey 14px line. The amount leads now and the
 * settlement is a pill, so the row answers "is this settled?" before it is read.
 */
function BookingCard({ booking }: { readonly booking: Booking }) {
  const [day, range] = splitMeta(booking.when);
  const [amount, settlement] = splitMeta(booking.payment);

  return (
    <Link
      className={cn(
        surfaceClass({ interactive: true }),
        "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-3.5",
      )}
      href="/transactions/detail"
    >
      <span className="flex w-full shrink-0 items-center gap-3 overflow-clip">
        <ChatAvatar crop={booking.crop} size={40} src={booking.avatar} />
        <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip whitespace-nowrap">
          <span className="w-full truncate text-base font-semibold text-foreground">
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
        <MetaRow icon={CalendarDays}>
          {day}
          {range ? (
            <span className="font-latin tabular-nums text-muted-foreground">
              {range}
            </span>
          ) : null}
        </MetaRow>
        <MetaRow icon={CreditCard}>
          <span className="font-latin text-base font-semibold tabular-nums">
            {amount}
          </span>
          {settlement ? (
            <StatusPill tone={PAYMENT_TONE[booking.status]}>
              {settlement}
            </StatusPill>
          ) : null}
        </MetaRow>
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
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center gap-4 px-6 lg:gap-0",
            PAGE,
          )}
        >
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip pt-4 pb-2 lg:gap-1 lg:pt-6 lg:pb-8">
            <h1 className="w-full text-heading font-semibold text-foreground lg:text-heading-lg">
              {t("title")}
            </h1>
            <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
              {t("upcomingCount", { count: upcomingCount })}
            </p>
          </div>

          <div className={cn("contents lg:w-full lg:pb-14", SPLIT_WITH_RAIL)}>
            <div className="contents lg:flex lg:flex-col lg:gap-4">
              <StatusTabs
                labels={[t("tabUpcoming"), t("tabCompleted"), t("tabCancelled")]}
              />

              <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip pb-6 lg:order-last lg:pb-0">
                <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
                  {t("upNext")}
                </p>
                {/* Two across at `lg`: one column of these on a 1200 page left
                    half the width holding nothing. */}
                <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip lg:grid lg:grid-cols-2 lg:gap-4">
                  {upcoming.map((booking) => (
                    <BookingCard booking={booking} key={booking.id} />
                  ))}
                </div>
              </div>
            </div>

            {/* The phone frame puts this above the list; the desktop frame
                stands it in the column beside it. */}
            <div className="contents lg:flex lg:flex-col lg:gap-4 lg:self-start">
              <NextSessionCard />

              {/* The rail ended here and left the rest of the column empty. The
                  three counts the tabs already name are the obvious thing to put
                  in it, and the data is the same fixture the list reads. */}
              <div className="hidden lg:grid lg:grid-cols-1 lg:gap-3">
                <StatTile
                  icon={CalendarDays}
                  label={t("tabUpcoming")}
                  tone="accent"
                  value={upcomingCount}
                />
                <StatTile
                  icon={Clock}
                  label={t("tabCompleted")}
                  value={bookingsByStatus("completed").length}
                />
                <StatTile
                  icon={CreditCard}
                  label={t("tabCancelled")}
                  value={bookingsByStatus("cancelled").length}
                />
              </div>
            </div>
          </div>
        </div>

        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
      <BottomBar className="lg:hidden" role="user" selected="bookings" />
    </MobileScreen>
  );
}
