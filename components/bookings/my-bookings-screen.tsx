"use client";

import {
  CalendarDays,
  Clock,
  CreditCard,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import type { Paginated } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import {
  cancelBooking,
  listAdvisors,
  listMyBookings,
  listServices,
} from "@/lib/api/resources";
import type {
  ApiBooking,
  ApiBookingState,
  ApiPublicAdvisor,
  ApiPublicService,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import {
  baht,
  isCancellable,
  useMountTime,
  BOOKING_BUCKET,
  BOOKING_TONE,
  type BookingBucket,
} from "@/components/bookings/booking-flow";
import { Button } from "@/components/ui/button";
import { NeutralButton } from "@/components/mobile/buttons";
import { RescheduleBooking } from "@/components/bookings/reschedule-booking";
import { EmptyState } from "@/components/mobile/empty-state";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatTile } from "@/components/mobile/stat-tile";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface, surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { AccountShell, DESKTOP_TYPE_LIFT } from "@/components/account/account-shell";
import { AppFrame, PHONE_BAR } from "@/components/account/app-frame";
import { chatWithHref } from "@/components/chat/chat-data";
import { SPLIT_WITH_RAIL } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * API-backed booking list. Public service/advisor records supply display names;
 * unavailable records retain the appointment's own date and state.
 * Prices shown here are current catalogue prices, not historical invoice totals.
 * Details opens the participant-authorized booking resource.
 */

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
 * Main-page Figma "My bookings" (1594:28110) — a segmented control on the muted surface.
 *
 * Not `SegmentedTabs`: that control is a row of links between sibling routes, and
 * these three filter one list in place. `Button` rather than a styled `<button>`
 * so the focus ring, the press and the disabled state come from the primitive.
 */
function StatusTabs({
  current,
  onSelect,
  labels,
}: {
  readonly current: BookingBucket;
  readonly onSelect: (bucket: BookingBucket) => void;
  readonly labels: Readonly<Record<BookingBucket, string>>;
}) {
  const buckets: readonly BookingBucket[] = ["upcoming", "completed", "cancelled"];

  return (
    <div className="flex w-full shrink-0 items-start overflow-clip">
      <div
        className="flex min-w-px flex-1 items-center rounded-card bg-muted p-1 lg:w-auto lg:flex-none"
        role="tablist"
      >
        {buckets.map((bucket) => (
          <Button
            aria-selected={bucket === current}
            className={cn(
              "flex min-h-8 min-w-px flex-1 items-center justify-center rounded-lg px-2.5 py-[5.5px] text-sm font-medium whitespace-nowrap shadow-none lg:flex-none lg:px-4",
              bucket === current
                ? "bg-card text-foreground shadow-card hover:bg-card"
                : "text-muted-foreground",
            )}
            key={bucket}
            onClick={() => onSelect(bucket)}
            role="tab"
            variant="ghost"
          >
            {labels[bucket]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** What the joins resolved for one booking — either half can be missing. */
type Joined = {
  readonly booking: ApiBooking;
  readonly service: ApiPublicService | undefined;
  readonly advisorName: string | undefined;
};

/** The state, in its own colour and its own words. `neutral` is never bare. */
export function BookingStatePill({ state }: { readonly state: ApiBookingState }) {
  const t = useTranslations("bookings");
  const p = useTranslations("payment");

  // Each label is the existing string that says this state exactly. `NO_SHOW`
  // has none, so it borrows the bucket's word — see `BOOKING_BUCKET`.
  const LABELS: Record<ApiBookingState, string> = {
    PENDING_PAYMENT: p("bookingUnconfirmed"),
    BOOKED: t("tabUpcoming"),
    IN_PROGRESS: p("processingTitle"),
    COMPLETED: t("tabCompleted"),
    NO_SHOW: t("tabCompleted"),
    CANCELLED: p("bookingCancelled"),
  };

  return <StatusPill tone={BOOKING_TONE[state]}>{LABELS[state]}</StatusPill>;
}

/**
 * Main-page Figma booking card (1594:28110) — header, a hairline, then the two meta rows.
 *
 * The amount leads and the state is a pill, so the row answers "is this settled?"
 * before it is read. A booking the API will still let you call off carries the one
 * action it has; everything else carries none, because there is nowhere honest for
 * it to go.
 */
function BookingCard({
  entry,
  onCancel,
  onRescheduled,
  cancelling,
}: {
  readonly entry: Joined;
  readonly onCancel: (bookingId: string) => void;
  readonly onRescheduled: () => void;
  readonly cancelling: boolean;
}) {
  const c = useTranslations("common");
  const t = useTranslations("bookings");
  const s = useTranslations("search");
  const format = useFormatter();
  const { booking, service, advisorName } = entry;
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  return (
    <Surface className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-3.5">
      <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
        {/* No portrait exists for an advisor on the public API, so the row keeps
            its 40px lead column as a glyph chip rather than a grey disc. */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-surface">
          <UserRound aria-hidden className="size-5 text-primary" />
        </span>
        <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
          <span className="w-full truncate text-base font-semibold text-foreground">
            <ThaiText>{service?.name ?? booking.serviceId}</ThaiText>
          </span>
          {advisorName ? (
            <span className="w-full truncate text-sm font-normal text-muted-foreground">
              {advisorName}
            </span>
          ) : null}
        </span>
        <BookingStatePill state={booking.state} />
      </div>

      <span className="h-px w-full shrink-0 bg-border" />

      <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip">
        <MetaRow icon={CalendarDays}>
          {format.dateTime(start, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          <span className="font-latin tabular-nums text-muted-foreground">
            {format.dateTime(start, { hour: "2-digit", minute: "2-digit" })} –{" "}
            {format.dateTime(end, { hour: "2-digit", minute: "2-digit" })}
          </span>
        </MetaRow>
        <MetaRow icon={CreditCard}>
          {service ? (
            <span className="font-latin text-base font-semibold tabular-nums">
              {format.number(baht(service.priceSatang), "baht")}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            {service
              ? s("durationMinutes", { count: service.durationMinutes })
              : null}
          </span>
        </MetaRow>
      </div>

      <NeutralButton className="w-auto" size="sm" href={`/bookings/detail?bookingId=${booking.id}`}>
        {t("detailsAction")}
      </NeutralButton>
      {isCancellable(booking.state) ? (
        <div className="flex w-full flex-wrap items-start gap-2">
          <NeutralButton
            className="w-auto shrink-0"
            disabled={cancelling}
            onClick={() => onCancel(booking.id)}
            size="sm"
          >
            {c("cancel")}
          </NeutralButton>
          <RescheduleBooking booking={booking} onRescheduled={onRescheduled} />
        </div>
      ) : null}
    </Surface>
  );
}

/** A row-shaped skeleton, so the list does not reflow when the data lands. */
function CardSkeleton() {
  return (
    <div
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-3 p-3.5",
      )}
    >
      <div className="flex w-full items-center gap-3">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="flex min-w-px flex-1 flex-col gap-1.5">
          <div className="h-4 w-3/5 rounded-md bg-muted" />
          <div className="h-3 w-2/5 rounded-md bg-muted" />
        </div>
      </div>
      <span className="h-px w-full shrink-0 bg-border" />
      <div className="h-4 w-4/5 rounded-md bg-muted" />
      <div className="h-4 w-2/5 rounded-md bg-muted" />
    </div>
  );
}

/**
 * Main-page Figma next-session card (1594:28110) — the only card the accent outlines
 * rather than fills, because it is the one you can act on now.
 */
function NextSessionCard({ entry }: { readonly entry: Joined }) {
  const t = useTranslations("bookings");
  const format = useFormatter();
  const { booking, service, advisorName } = entry;
  const start = new Date(booking.startTime);

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip pb-1">
      <Surface className="flex w-full shrink-0 flex-col items-start gap-3.5 overflow-clip border-primary p-3.5 ring-1 ring-primary/15">
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
          <p className="min-w-px flex-1 text-base font-semibold text-primary">
            {t("nextSession")}
          </p>
          <BookingStatePill state={booking.state} />
        </div>

        <div className="flex w-full shrink-0 items-center gap-3 overflow-clip">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-surface">
            <UserRound aria-hidden className="size-5.5 text-primary" />
          </span>
          <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
            <span className="w-full truncate text-base font-semibold text-foreground">
              <ThaiText>{service?.name ?? booking.serviceId}</ThaiText>
            </span>
            {advisorName ? (
              <span className="w-full truncate text-sm font-normal text-muted-foreground">
                {advisorName}
              </span>
            ) : null}
          </span>
        </div>

        <MetaRow icon={CalendarDays}>
          <span className="font-latin font-medium tabular-nums">
            {format.dateTime(start, {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </MetaRow>

        {/* The chat thread is keyed by the advisor, which the booking carries, so
            this is the one action on the card that leads somewhere real. */}
        <NeutralButton
          className="w-auto shrink-0"
          href={chatWithHref(booking.advisorId)}
        >
          {t("detailsChat")}
        </NeutralButton>
      </Surface>
    </div>
  );
}

/** Main-page Figma My bookings (1594:28110), adapted to the current app frame. */
export function MyBookingsScreen() {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const s = useTranslations("search");
  const now = useMountTime();
  const [bucket, setBucket] = useState<BookingBucket>("upcoming");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelFailure, setCancelFailure] = useState<string | null>(null);

  const bookingsFetcher = useCallback(
    (signal: AbortSignal) => listMyBookings({ limit: 50 }, signal),
    [],
  );
  const servicesFetcher = useCallback(
    (signal: AbortSignal) => listServices({ limit: 100 }, signal),
    [],
  );
  const advisorsFetcher = useCallback(
    (signal: AbortSignal) => listAdvisors({ limit: 100 }, signal),
    [],
  );

  const bookings = useResource<Paginated<ApiBooking>>(
    "bookings/me?limit=50",
    bookingsFetcher,
  );
  const services = useResource<Paginated<ApiPublicService>>(
    "services?limit=100",
    servicesFetcher,
  );
  const advisors = useResource<Paginated<ApiPublicAdvisor>>(
    "advisors?limit=100",
    advisorsFetcher,
  );

  const serviceById = new Map(
    (services.data?.items ?? []).map((service) => [service.id, service]),
  );
  const nameById = new Map(
    (advisors.data?.items ?? []).map((advisor) => [advisor.id, advisor.displayName]),
  );

  const entries: readonly Joined[] = (bookings.data?.items ?? []).map(
    (booking) => ({
      booking,
      service: serviceById.get(booking.serviceId),
      advisorName: nameById.get(booking.advisorId),
    }),
  );

  const inBucket = (which: BookingBucket): readonly Joined[] =>
    entries
      .filter((entry) => BOOKING_BUCKET[entry.booking.state] === which)
      .toSorted(
        (a, b) =>
          Date.parse(a.booking.startTime) - Date.parse(b.booking.startTime),
      );

  const upcoming = inBucket("upcoming");
  // The soonest slot still ahead of the clock. A held slot whose time has passed
  // is not "next", and putting it in the accent card would be the one wrong card
  // on the page.
  const next = upcoming.find(
    (entry) => Date.parse(entry.booking.startTime) > now,
  );
  const shown = inBucket(bucket);

  const onCancel = useCallback(
    (bookingId: string) => {
      setCancelling(bookingId);
      setCancelFailure(null);
      void cancelBooking(bookingId)
        .then(() => {
          bookings.reload();
        })
        .catch((cause: unknown) => {
          // The API's own sentence — for a state that can no longer be cancelled
          // it names the two that can, which is the whole explanation.
          setCancelFailure(
            cause instanceof Error ? cause.message : String(cause),
          );
        })
        .finally(() => setCancelling(null));
    },
    [bookings],
  );

  const failed = bookings.error;

  return (
    <MobileScreen className="pb-0" wide="md">
      <AppFrame active="bookings">
      {/* White from `lg`: the app frame's panel. */}
      <ScreenBody className="pb-18 lg:bg-card lg:pb-0">
        <div className={PHONE_BAR}>
          <TopBar dock unreadNotifications />
        </div>

        <AccountShell active="bookings">
        {/* Figma "Page Content" — 24px inset, 16px between blocks. From `lg`
            the shell's column is the page, so the block drops its own inset,
            and its phone-sized type is lifted for the zoomed frame. */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col items-center gap-4 px-6 lg:gap-0 lg:px-0",
            DESKTOP_TYPE_LIFT,
          )}
        >
          <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip pt-4 pb-2 lg:gap-1 lg:pt-0 lg:pb-8">
            <h1 className="w-full text-heading font-semibold text-foreground lg:font-hero lg:text-frame-title lg:font-normal lg:tracking-tight lg:text-hero-ink">
              {t("title")}
            </h1>
            {!bookings.loading && !failed ? (
              <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
                {t("upcomingCount", { count: upcoming.length })}
              </p>
            ) : null}
          </div>

          {failed ? (
            /* The API's own sentence, not a translated guess. For a missing
               session it is the only thing that distinguishes "sign in" from
               "the container is not running", so both the retry and the way in
               are offered and the reader picks. */
            <div
              className={cn(
                surfaceClass(),
                "flex w-full shrink-0 flex-col items-start gap-3 p-5",
              )}
            >
              <p className="w-full text-base font-semibold text-foreground">
                {s("loadFailedTitle")}
              </p>
              <p className="w-full text-sm font-normal text-muted-foreground">
                {failed.message}
              </p>
              <div className="flex w-full shrink-0 flex-wrap items-center gap-2">
                <NeutralButton
                  className="w-auto shrink-0"
                  onClick={bookings.reload}
                  size="sm"
                >
                  {s("retry")}
                </NeutralButton>
                {failed instanceof ApiError && failed.isUnauthenticated ? (
                  <NeutralButton className="w-auto shrink-0" href="/login" size="sm">
                    {c("login")}
                  </NeutralButton>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={cn("contents lg:w-full", SPLIT_WITH_RAIL)}>
              <div className="contents lg:flex lg:flex-col lg:gap-4">
                <StatusTabs
                  current={bucket}
                  labels={{
                    upcoming: t("tabUpcoming"),
                    completed: t("tabCompleted"),
                    cancelled: t("tabCancelled"),
                  }}
                  onSelect={setBucket}
                />

                <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip pb-6 lg:order-last lg:pb-0">
                  <p className="text-sm font-normal whitespace-nowrap text-muted-foreground">
                    {t("upNext")}
                  </p>

                  {cancelFailure ? (
                    <Surface className="w-full p-3.5" tier="flat">
                      <p className="w-full text-sm font-normal text-destructive">
                        {cancelFailure}
                      </p>
                    </Surface>
                  ) : null}

                  {/* Two across at `lg`: one column of these on a 1200 page left
                      half the width holding nothing. */}
                  <div className="flex w-full shrink-0 flex-col items-start gap-3 overflow-clip lg:grid lg:grid-cols-2 lg:gap-4">
                    {bookings.loading ? (
                      [0, 1, 2].map((index) => <CardSkeleton key={index} />)
                    ) : shown.length > 0 ? (
                      shown.map((entry) => (
                        <BookingCard
                          cancelling={cancelling === entry.booking.id}
                          entry={entry}
                          key={entry.booking.id}
                          onCancel={onCancel}
                          onRescheduled={bookings.reload}
                        />
                      ))
                    ) : (
                      /* `service_appointments` is seeded empty, so an advisee who
                         has never booked lands here legitimately. It is an empty
                         list, not a failed one. */
                      <Surface className="w-full lg:col-span-2" tier="well">
                        <EmptyState
                          action={
                            <NeutralButton href="/search">
                              {s("browseAll")}
                            </NeutralButton>
                          }
                          icon={CalendarDays}
                          title={s("noResults")}
                        />
                      </Surface>
                    )}
                  </div>
                </div>
              </div>

              {/* The phone frame puts this above the list; the desktop frame
                  stands it in the column beside it. */}
              <div className="contents lg:flex lg:flex-col lg:gap-4 lg:self-start">
                {next ? <NextSessionCard entry={next} /> : null}

                <div className="hidden lg:grid lg:grid-cols-1 lg:gap-3">
                  <StatTile
                    icon={CalendarDays}
                    label={t("tabUpcoming")}
                    tone="accent"
                    value={upcoming.length}
                  />
                  <StatTile
                    icon={Clock}
                    label={t("tabCompleted")}
                    value={inBucket("completed").length}
                  />
                  <StatTile
                    icon={CreditCard}
                    label={t("tabCancelled")}
                    value={inBucket("cancelled").length}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        </AccountShell>
      </ScreenBody>
      </AppFrame>
      <BottomBar className="lg:hidden" role="user" selected="bookings" />
    </MobileScreen>
  );
}
