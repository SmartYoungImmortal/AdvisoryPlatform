"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarX2,
  CircleAlert,
  ClipboardList,
  Gift,
  LockKeyhole,
  MessageCircle,
  RotateCw,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { bookSlot, listServiceSlots } from "@/lib/api/resources";
import type { ApiPublicService, ApiSlot } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { authPill } from "@/components/auth/auth-split";
import { addDays, baht, isoDay, liveServiceHref } from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Seven days is the window the picker offers, from today. */
const SLOT_WINDOW_DAYS = 7;

/**
 * The page's pills at desktop size. The desktop is drawn in 1710 space and
 * zoomed down (`app-scale`, ×0.84 at 1440), so the capsule `authPill` gives
 * a tablet reads small there: from `lg` it is 52 tall (44 on the screen) with
 * the frame's body step for its label.
 */
export const PILL_LG = "lg:h-13 lg:gap-2.5 lg:px-7 lg:text-frame-body";

/**
 * The day and time being chosen, held by the page rather than by a picker:
 * the desktop panel and the phone's sheet are two pickers for one choice, and
 * a time picked in the sheet is still picked when it opens again.
 */
export type Selection = {
  readonly day: string | null;
  readonly time: string | null;
  readonly pick: (day: string | null, time: string | null) => void;
};

export function useSelection(): Selection {
  const [choice, setChoice] = useState<{ day: string | null; time: string | null }>({ day: null, time: null });
  const pick = useCallback((day: string | null, time: string | null) => setChoice({ day, time }), []);
  return { ...choice, pick };
}

/** Who the booking is with, for the lines that name them. */
type Party = {
  readonly service: ApiPublicService;
  readonly advisorName: string;
};

/** The ways out of the picker that are links: messaging the advisor. */
function MessageButton({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("service");
  return (
    <Button
      className={cn(authPill(), "w-full", PILL_LG)}
      nativeButton={false}
      render={<Link href={chatWithHref(advisorId)} />}
      variant="outline"
    >
      <MessageCircle aria-hidden />
      {t("messageExpert")}
    </Button>
  );
}

/** A state shown instead of content: a glyph, a sentence, an action. */
export function Notice({
  icon: Icon,
  children,
  action,
  className,
}: {
  readonly icon: typeof CalendarClock;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl bg-muted/70 px-5 py-6 text-center lg:gap-4 lg:px-6 lg:py-8", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-hero-card lg:size-13">
        <Icon aria-hidden className="size-5 lg:size-6" />
      </span>
      <div className="max-w-72 text-sm leading-6 text-foreground lg:text-frame-meta">{children}</div>
      {action}
    </div>
  );
}

/**
 * A request that failed: the API's own sentence, which is the only thing that
 * tells "no session" apart from "the container is not running", and a retry.
 */
export function FailedNotice({
  error,
  onRetry,
  className,
}: {
  readonly error: Error;
  readonly onRetry: () => void;
  readonly className?: string;
}) {
  const s = useTranslations("search");
  return (
    <Notice
      action={
        <Button className={cn(authPill(), "w-auto px-6", PILL_LG)} onClick={onRetry} type="button" variant="outline">
          <RotateCw aria-hidden />
          {s("retry")}
        </Button>
      }
      className={className}
      icon={CircleAlert}
    >
      {error.message}
    </Notice>
  );
}

/**
 * What the picker shows instead of times: loading, and each answer the slots
 * route gives other than a list. Signed out (401) asks to sign in and comes
 * back here afterwards, a screened service (400) points at its questions,
 * anything else is the API's own sentence with a retry.
 */
function SlotsNotice({
  error,
  onRetry,
  service,
  advisorName,
}: Party & {
  readonly error: Error | null;
  readonly onRetry: () => void;
}) {
  const t = useTranslations("service");
  const pill = cn(authPill(true), "w-full", PILL_LG);

  if (!error) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <span className="sr-only">{t("loadingTimes")}</span>
        <div aria-hidden className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: SLOT_WINDOW_DAYS }, (_, i) => (
            <span className="h-13 animate-pulse rounded-xl bg-muted lg:h-16" key={i} />
          ))}
        </div>
        <div aria-hidden className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <span className="h-11 animate-pulse rounded-full bg-muted lg:h-12" key={i} />
          ))}
        </div>
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 401) {
    return (
      <Notice
        action={
          <Button
            className={pill}
            nativeButton={false}
            render={<Link href={`/login?next=${encodeURIComponent(liveServiceHref(service.id))}`} />}
          >
            {t("signIn")}
          </Button>
        }
        icon={CalendarClock}
      >
        {t("signInForSlots")}
      </Notice>
    );
  }
  if (error instanceof ApiError && error.status === 400) {
    return (
      <Notice
        action={
          <Button
            className={pill}
            nativeButton={false}
            render={<Link href={`/screening/questions?serviceId=${service.id}`} />}
          >
            {t("answerQuestions")}
          </Button>
        }
        icon={ClipboardList}
      >
        {t("screeningNotice", { name: advisorName })}
      </Notice>
    );
  }
  return <FailedNotice error={error} onRetry={onRetry} />;
}

/**
 * The week as seven days (a day with nothing open is shown, and cannot be
 * chosen, so the week reads as a week), that day's times, and the button that
 * books the chosen one: `POST /bookings` holds the slot as `PENDING_PAYMENT`
 * and opens the checkout, and a slot taken meanwhile (409) goes to
 * `/checkout/slot-taken`. Nothing is charged here.
 */
export function BookingPicker({
  service,
  advisorName,
  selection,
}: Party & { readonly selection: Selection }) {
  const t = useTranslations("service");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Anchored to midnight so a render that crosses a minute keeps the same key.
  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = Array.from({ length: SLOT_WINDOW_DAYS }, (_, i) => isoDay(addDays(today, i)));
    return { from: isoDay(today), to: isoDay(addDays(today, SLOT_WINDOW_DAYS)), week };
  }, []);
  const fetcher = useCallback(
    (signal: AbortSignal) => listServiceSlots(service.id, { from: range.from, to: range.to }, signal),
    [service.id, range],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `services/${service.id}/slots?from=${range.from}&to=${range.to}`,
    fetcher,
  );

  // Grouped in the viewer's own zone: the API answers UTC instants.
  const byDay = new Map<string, ApiSlot[]>();
  for (const slot of slots.data ?? []) {
    const key = isoDay(new Date(slot.startTime));
    const list = byDay.get(key);
    if (list) list.push(slot);
    else byDay.set(key, [slot]);
  }
  const firstOpen = range.week.find((key) => byDay.has(key)) ?? null;
  const selected = selection.day && byDay.has(selection.day) ? selection.day : firstOpen;
  const dayTimes = selected ? (byDay.get(selected) ?? []) : [];
  const time = dayTimes.some((slot) => slot.startTime === selection.time) ? selection.time : null;

  const hour = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  // Thai's "short" weekday is the whole word ("อาทิตย์"), too long for a
  // seventh of the panel; "narrow" is the calendar's own "อา". English keeps
  // "Sun": its narrow "S" cannot tell Saturday from Sunday.
  const weekday = locale === "th" ? "narrow" : "short";
  const dayLabel = (key: string) =>
    format.dateTime(new Date(`${key}T00:00:00`), { weekday: "short", day: "numeric", month: "short" });

  const book = () => {
    if (!time) return;
    setBooking(true);
    setFailure(null);
    void bookSlot({ serviceId: service.id, startTime: time })
      .then((created) => router.push(`/checkout/card?bookingId=${created.id}`))
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 409) {
          router.push(`/checkout/slot-taken?startTime=${encodeURIComponent(time)}&serviceId=${service.id}`);
          return;
        }
        if (cause instanceof ApiError && cause.status === 400) {
          selection.pick(null, null);
          slots.reload();
          setFailure(t("bookingSelectionRejected"));
          return;
        }
        setFailure(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setBooking(false));
  };

  const failureNotice = failure ? (
    <p className="text-center text-sm text-destructive lg:text-frame-meta" role="alert">
      {failure}
    </p>
  ) : null;

  if (slots.loading || slots.error) {
    return (
      <div className="flex flex-col gap-3">
        {failureNotice}
        <SlotsNotice
          advisorName={advisorName}
          error={slots.error}
          onRetry={slots.reload}
          service={service}
        />
        <MessageButton advisorId={service.advisorId} />
      </div>
    );
  }
  if (selected === null) {
    return (
      <div className="flex flex-col gap-3">
        {failureNotice}
        <Notice icon={CalendarX2}>{t("noSlots")}</Notice>
        <MessageButton advisorId={service.advisorId} />
      </div>
    );
  }

  let label = t("pickTimeFirst");
  if (booking) label = t("booking");
  else if (time) label = t("bookAtDay", { day: dayLabel(selected), time: hour(time) });

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-2.5 lg:gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-foreground lg:text-frame-meta">{t("pickDay")}</span>
          <span className="text-xs text-muted-foreground lg:text-frame-meta">
            {format.dateTime(new Date(`${selected}T00:00:00`), { month: "long", year: "numeric" })}
          </span>
        </div>
        {/* Seven equal columns: the whole week fits, nothing scrolls off it. */}
        <div className="grid grid-cols-7 gap-1.5 lg:gap-2">
          {range.week.map((key) => {
            const date = new Date(`${key}T00:00:00`);
            const open = byDay.has(key);
            const active = key === selected;
            return (
              <Button
                aria-label={open ? dayLabel(key) : t("dayClosed", { day: dayLabel(key) })}
                aria-pressed={active}
                className={cn(
                  "h-auto min-h-13 flex-col gap-0 rounded-xl px-0 py-1.5 shadow-none lg:min-h-16 lg:gap-0.5 lg:rounded-2xl",
                  active
                    ? "border-foreground bg-card ring-1 ring-foreground hover:bg-card"
                    : "border-border bg-card hover:border-foreground/40",
                )}
                disabled={!open}
                key={key}
                onClick={() => selection.pick(key, null)}
                type="button"
                variant="outline"
              >
                <span className="text-xs font-normal text-muted-foreground lg:text-frame-meta">
                  {format.dateTime(date, { weekday })}
                </span>
                <span className="font-latin text-base font-semibold tabular-nums lg:text-frame-body">{date.getDate()}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:gap-3">
        <span className="text-sm font-medium text-foreground lg:text-frame-meta">{t("timesOn", { day: dayLabel(selected) })}</span>
        {/* Room for five rows; a longer day scrolls inside it, under a fade
            that says so, since scrollbars are hidden app-wide. */}
        <div
          className={cn(
            "grid max-h-63 grid-cols-4 gap-2 overflow-y-auto overscroll-contain lg:max-h-68",
            dayTimes.length > 20 && "pb-6 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]",
          )}
        >
          {dayTimes.map((slot) => {
            const active = slot.startTime === time;
            return (
              <Button
                aria-pressed={active}
                className={cn(
                  "h-11 rounded-full px-0 shadow-none lg:h-12",
                  active
                    ? "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
                    : "border-border bg-card hover:border-foreground/40",
                )}
                key={slot.startTime}
                onClick={() => selection.pick(selected, slot.startTime)}
                type="button"
                variant="outline"
              >
                <span className="font-latin text-sm font-medium tabular-nums lg:text-frame-meta">{hour(slot.startTime)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:gap-3">
        <Button
          aria-busy={booking || undefined}
          className={cn(authPill(true), "w-full", PILL_LG)}
          disabled={!time || booking}
          onClick={book}
          type="button"
        >
          {label}
        </Button>
        <MessageButton advisorId={service.advisorId} />
        <p className="text-center text-xs text-muted-foreground lg:text-frame-meta">{t("pickTimeHint")}</p>
        {failureNotice}
      </div>
    </div>
  );
}

/** The price, what it buys, and the free trial when the service has one. */
function PriceSummary({ service }: { readonly service: ApiPublicService }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;

  return (
    <div className="flex flex-col gap-2 lg:gap-2.5">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-latin text-2xl font-semibold tracking-tight text-foreground tabular-nums lg:text-frame-heading">
          {format.number(baht(service.priceSatang), "baht")}
        </span>
        <span className="text-sm text-muted-foreground lg:text-frame-meta">
          {t("perSession", { duration: s("durationMinutes", { count: service.durationMinutes }) })}
        </span>
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground lg:text-frame-meta">
        <Video aria-hidden className="size-4 shrink-0 lg:size-5" />
        {t("videoInApp")}
      </p>
      {trial ? (
        <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-accent-surface px-3 text-xs font-medium text-primary lg:mt-1 lg:h-10 lg:gap-2 lg:px-4 lg:text-frame-meta">
          <Gift aria-hidden className="size-3.5 lg:size-4.5" />
          {t("trialFree", { minutes: trial })}
        </span>
      ) : null}
    </div>
  );
}

/** The two promises under the panel, each the platform's, not this advisor's. */
export function TrustLine({ className }: { readonly className?: string }) {
  const t = useTranslations("service");
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:gap-x-6 lg:text-frame-meta",
        className,
      )}
    >
      <li className="flex items-center gap-1.5 lg:gap-2">
        <ShieldCheck aria-hidden className="size-4 text-primary lg:size-5" />
        {t("verifiedIdentity")}
      </li>
      <li className="flex items-center gap-1.5 lg:gap-2">
        <LockKeyhole aria-hidden className="size-4 text-primary lg:size-5" />
        {t("trustEscrow")}
      </li>
    </ul>
  );
}

/**
 * The desktop's booking panel: the price and the picker in one card that
 * rides beside the page (the page makes it sticky), lifted on the hero's long
 * shadow because the page scrolls under it.
 */
export function BookingPanel({
  service,
  advisorName,
  selection,
}: Party & { readonly selection: Selection }) {
  return (
    <div className="flex flex-col gap-6 rounded-card border border-hero-card-border bg-card p-6 shadow-hero">
      <PriceSummary service={service} />
      <div className="h-px bg-border" />
      <BookingPicker advisorName={advisorName} selection={selection} service={service} />
    </div>
  );
}

/**
 * The phone's version: the price and the way to the times kept in reach along
 * the bottom edge, and the same picker in a sheet that rises from it. Up to
 * the portrait tablet; the desktop has the panel.
 */
export function BookingBar({
  service,
  advisorName,
  selection,
}: Party & { readonly selection: Selection }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex w-full shrink-0 items-center gap-2 border-t border-border bg-card px-5 py-3 md:px-12 lg:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="font-latin text-lg leading-6 font-semibold text-foreground tabular-nums">
            {format.number(baht(service.priceSatang), "baht")}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t("perSession", { duration: s("durationMinutes", { count: service.durationMinutes }) })}
          </span>
        </div>
        <Button
          aria-label={t("messageExpert")}
          className="ml-auto size-11 shrink-0 rounded-full"
          nativeButton={false}
          render={<Link href={chatWithHref(service.advisorId)} />}
          size="icon"
          variant="outline"
        >
          <MessageCircle aria-hidden className="size-5" />
        </Button>
        <Button className={cn(authPill(true), "w-auto shrink-0 px-6")} onClick={() => setOpen(true)} type="button">
          {t("pickTime")}
        </Button>
      </div>

      <Sheet onOpenChange={setOpen} open={open}>
        {/* Centred and capped on the portrait tablet, where a sheet the full
            820 wide spreads seven days across a hand's span. */}
        <SheetContent className="max-h-[88dvh] gap-0 rounded-t-3xl p-0 md:mx-auto md:max-w-xl" side="bottom">
          <div className="flex flex-col gap-0.5 border-b border-border px-5 pt-5 pr-14 pb-4">
            <SheetTitle className="font-hero text-xl font-normal tracking-tight text-hero-ink">{t("book")}</SheetTitle>
            <SheetDescription className="truncate">{service.name}</SheetDescription>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
            <PriceSummary service={service} />
            <BookingPicker advisorName={advisorName} selection={selection} service={service} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
