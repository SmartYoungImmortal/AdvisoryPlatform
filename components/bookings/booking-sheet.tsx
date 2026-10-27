"use client";

import {
  Banknote,
  CalendarPlus,
  ChevronRight,
  CircleX,
  Clock3,
  MessageSquare,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useId, useState, type ReactNode } from "react";

import { DESKTOP_TYPE_LIFT } from "@/components/account/account-shell";
import { AUTH_LINK } from "@/components/auth/auth-split";
import {
  baht,
  isCancellable,
  liveAdvisorHref,
  liveServiceHref,
  BOOKING_BUCKET,
} from "@/components/bookings/booking-flow";
import { RescheduleSlots } from "@/components/bookings/reschedule-booking";
import { faceFor } from "@/components/chat/chat-avatar";
import { chatWithHref } from "@/components/chat/chat-data";
import { Figures } from "@/components/figures";
import { SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
import { invoiceHref } from "@/components/payment/transactions-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import type { Paginated } from "@/lib/api/client";
import { cancelBooking, listMyInvoices } from "@/lib/api/resources";
import type { ApiAdviseeInvoice, ApiBooking, ApiPublicAdvisor, ApiPublicService } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * One booking as the screens show it: the appointment row, joined to the
 * public service and advisor it names. Either join can be missing (an
 * unpublished service, a list that has not answered yet); the appointment's
 * own day and state still show.
 */
export type BookingEntry = {
  readonly booking: ApiBooking;
  readonly service: ApiPublicService | undefined;
  readonly advisor: ApiPublicAdvisor | undefined;
};

/** Where a booking stands for the reader: still ahead of them, behind them, or called off. */
export type BookingPhase = "ahead" | "past" | "cancelled";

/**
 * A booking whose end has passed reads as past whatever its state says: a
 * session the server has not closed yet is behind the reader, not coming up.
 */
export function bookingPhase(booking: ApiBooking, now: number): BookingPhase {
  if (booking.state === "CANCELLED") return "cancelled";
  return BOOKING_BUCKET[booking.state] === "upcoming" && Date.parse(booking.endTime) > now ? "ahead" : "past";
}

/**
 * How the booking stands, in the words the reader needs. The API's state with
 * the clock applied: a held slot whose time has gone by was never paid for,
 * and a confirmed one the server has not closed has ended.
 */
type Standing =
  | "awaitingPayment"
  | "confirmed"
  | "inProgress"
  | "completed"
  | "noShow"
  | "cancelled"
  | "ended"
  | "lapsed";

function standingOf(booking: ApiBooking, now: number): Standing {
  const ahead = bookingPhase(booking, now) === "ahead";
  switch (booking.state) {
    case "PENDING_PAYMENT":
      return ahead ? "awaitingPayment" : "lapsed";
    case "BOOKED":
      return ahead ? "confirmed" : "ended";
    case "IN_PROGRESS":
      return ahead ? "inProgress" : "ended";
    case "COMPLETED":
      return "completed";
    case "NO_SHOW":
      return "noShow";
    case "CANCELLED":
      return "cancelled";
  }
}

/**
 * Each standing's ink, and the colour its booking wears on the calendar: the
 * dot on a day, the square beside the title. Only what still asks something
 * of the reader is in colour.
 */
const STANDING = {
  awaitingPayment: { ink: "text-warning", dot: "bg-warning" },
  confirmed: { ink: "text-primary", dot: "bg-primary" },
  inProgress: { ink: "text-info", dot: "bg-info" },
  completed: { ink: "text-success", dot: "bg-success" },
  noShow: { ink: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  cancelled: { ink: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  ended: { ink: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  lapsed: { ink: "text-muted-foreground", dot: "bg-muted-foreground/50" },
} as const satisfies Record<Standing, { readonly ink: string; readonly dot: string }>;

/** The standing's word, ink and colour, for whatever shows a booking. */
export function useStanding(): (
  booking: ApiBooking,
  now: number,
) => { readonly label: string; readonly ink: string; readonly dot: string } {
  const p = useTranslations("profile");
  const t = useTranslations("bookings");
  return (booking, now) => {
    const standing = standingOf(booking, now);
    // The profile page's words for the API's states, so a booking is called
    // the same on both; the two the clock adds are the bookings' own.
    let label: string;
    if (standing === "ended") label = t("stateEnded");
    else if (standing === "lapsed") label = t("stateLapsed");
    else label = p(`state.${standing}` as "state.confirmed");
    return { label, ...STANDING[standing] };
  };
}

/** "13:30", on a 24-hour clock in either language. */
export function useClock(): (date: Date | string) => string {
  const format = useFormatter();
  return (date) => format.dateTime(new Date(date), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

type WayOn = { readonly label: string; readonly href: string; readonly icon?: LucideIcon };

/** The way on that matters most where the booking stands, and what else can be done with it. */
export function useWaysOn(entry: BookingEntry, now: number): { readonly main: WayOn; readonly more: readonly WayOn[] } {
  const t = useTranslations("bookings");
  const { booking } = entry;
  const phase = bookingPhase(booking, now);
  const chat = { label: t("chatAdvisor"), href: chatWithHref(booking.advisorId), icon: MessageSquare };
  const rebook = { label: t("rebook"), href: liveServiceHref(booking.serviceId) };

  if (phase === "ahead") {
    return booking.state === "PENDING_PAYMENT"
      ? { main: { label: t("payNow"), href: `/checkout/card?bookingId=${booking.id}` }, more: [chat] }
      : { main: chat, more: [] };
  }
  if (booking.state === "COMPLETED") {
    return { main: { label: t("review"), href: `/reviews/session?booking=${booking.id}` }, more: [rebook] };
  }
  return { main: rebook, more: [chat] };
}

/**
 * The invoice that paid for a booking, if the reader's history holds one.
 *
 * The invoice names no booking: it carries its service and the start of the
 * appointment it covers, which a rescheduling moves with it. The two together
 * pick out one booking, so that is the match. The history is the payments
 * page's own request, so the cache answers it there and here alike.
 */
function useBookingInvoice(booking: ApiBooking): ApiAdviseeInvoice | undefined {
  const fetcher = useCallback((signal: AbortSignal) => listMyInvoices({ page: 1, limit: 50 }, signal), []);
  const invoices = useResource<Paginated<ApiAdviseeInvoice>>("payment/invoices?page=1&limit=50", fetcher);
  // `items` guarded too: an API (or a stand-in for one) that answers without
  // a page simply has no invoice to show.
  return invoices.data?.items?.find(
    (invoice) =>
      invoice.service.id === booking.serviceId &&
      invoice.session !== null &&
      Date.parse(invoice.session.startTime) === Date.parse(booking.startTime),
  );
}

/** The gutter every line hangs from: its icon centred in a column as wide as the title's square's. */
const GUTTER_W = "w-7 lg:w-10";
/** Lines without an icon start where the text of the iconed ones does. */
const UNDER_TEXT = "pl-11 lg:pl-15";

/** One line of the card: an icon in the gutter, the line beside it, as a calendar's event card has. */
function Line({ icon: Icon, children }: { readonly icon: LucideIcon; readonly children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 lg:gap-5">
      <span className={cn("flex shrink-0 justify-center pt-0.5 text-muted-foreground", GUTTER_W)}>
        <Icon aria-hidden className="size-4.5 lg:size-6" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 text-sm text-foreground lg:text-frame-meta">{children}</div>
    </div>
  );
}

/**
 * The advisor's face, else the first letter of their name on the muted disc.
 * `className` sizes it where the card's gutter is not the place.
 */
export function AdvisorFace({
  advisor,
  className,
}: {
  readonly advisor: ApiPublicAdvisor | undefined;
  readonly className?: string;
}) {
  const face = faceFor(advisor ?? null);
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground lg:size-10 lg:text-frame-label",
        className,
      )}
    >
      {face ? (
        <Image alt="" className="size-full object-cover" height={112} src={face} width={112} />
      ) : (
        advisor?.displayName.trim().slice(0, 1)
      )}
    </span>
  );
}

/** The card's capsules: the main way on filled in the calendar's blue, the rest outlined. */
const PILL = "h-10 gap-2 rounded-full px-5 text-sm font-medium lg:h-12 lg:px-6 lg:text-frame-meta";
const MAIN_PILL = cn(PILL, "bg-primary text-primary-foreground hover:bg-primary/90");
const MORE_PILL = cn(PILL, "border border-border bg-card text-foreground hover:bg-muted");

/**
 * The booking as a calendar's event card shows an event: a square in its
 * colour beside the title, the day and the hours under it and how it stands;
 * then the one way on that matters most, as a meeting's card puts its join
 * button; then the rest, each a line hanging from an icon in the gutter: who
 * it is with, for how long, the price, when it was booked. What else can be
 * done with it closes the card.
 *
 * `inDialog`: the card is the dialog's own surface, so it drops its border
 * and shadow, and its heading is an `h2` under the page's `h1`, named by
 * `titleId` for the dialog to be labelled by.
 */
export function BookingSheet({
  entry,
  now,
  onChanged,
  inDialog = false,
  titleId,
}: {
  readonly entry: BookingEntry;
  readonly now: number;
  /** The booking changed (new time, called off): read it, and whatever lists it, again. */
  readonly onChanged: () => void;
  readonly inDialog?: boolean;
  readonly titleId?: string;
}) {
  const t = useTranslations("bookings");
  const tr = useTranslations("transactions");
  const l = useTranslations("landing");
  const format = useFormatter();
  const clock = useClock();
  const standing = useStanding()(entry.booking, now);
  const ways = useWaysOn(entry, now);
  const invoice = useBookingInvoice(entry.booking);
  const MainIcon = ways.main.icon;
  const [panel, setPanel] = useState<"none" | "reschedule" | "cancel">("none");
  const [cancelling, setCancelling] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { booking, service, advisor } = entry;
  const start = new Date(booking.startTime);
  const minutes = Math.round((Date.parse(booking.endTime) - start.getTime()) / 60_000);
  const ahead = bookingPhase(booking, now) === "ahead";
  const changeable = ahead && isCancellable(booking.state);
  const Heading = inDialog ? "h2" : "h1";
  const stamp = (iso: string) =>
    `${format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" })} · ${clock(iso)}`;

  const cancel = () => {
    setCancelling(true);
    setFailure(null);
    void cancelBooking(booking.id)
      .then(() => {
        setPanel("none");
        onChanged();
      })
      .catch((cause: unknown) => {
        // The API's own sentence: for a state that can no longer be cancelled
        // it names the two that can, which is the whole explanation.
        setFailure(cause instanceof Error ? cause.message : t("detailsCancelFailed"));
      })
      .finally(() => setCancelling(false));
  };
  const subject = encodeURIComponent(
    t("supportSubject", {
      service: service?.name ?? "",
      date: format.dateTime(start, { day: "numeric", month: "short", year: "numeric" }),
    }),
  );

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-5 bg-card lg:gap-7",
        inDialog ? "pt-1 pb-6 lg:pb-8" : "rounded-card border border-hero-card-border pt-6 pb-6 shadow-hero-card lg:pt-9 lg:pb-9",
        SHEET_X,
      )}
    >
      <header className="flex items-start gap-4 lg:gap-5">
        <span className={cn("flex shrink-0 justify-center pt-1.5 lg:pt-2", GUTTER_W)}>
          <span aria-hidden className={cn("size-4 rounded-[5px] lg:size-5 lg:rounded-md", standing.dot)} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-1.5">
          <Heading className="text-xl font-normal text-foreground lg:text-frame-heading" id={titleId}>
            {service?.name ?? t("detailsUnavailableValue")}
          </Heading>
          <p className="text-sm text-foreground lg:text-frame-meta">
            <Figures>{format.dateTime(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Figures>
            {" · "}
            <span className="font-latin tabular-nums whitespace-nowrap">
              {clock(start)} – {clock(booking.endTime)}
            </span>
          </p>
          <p className={cn("text-sm lg:text-frame-meta", standing.ink)}>
            {standing.label}
            {ahead && booking.state !== "IN_PROGRESS" ? (
              <span className="text-muted-foreground"> · {format.relativeTime(start, now)}</span>
            ) : null}
          </p>
        </div>
      </header>

      <div className={UNDER_TEXT}>
        <Button className={MAIN_PILL} nativeButton={false} render={<Link href={ways.main.href} />}>
          {MainIcon ? <MainIcon aria-hidden className="size-4 lg:size-5" /> : null}
          {ways.main.label}
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:gap-5">
        {/* Who it is with: their face in the gutter, the way to their profile. */}
        <Link
          className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-1 outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted/60 motion-reduce:transition-none lg:-mx-3 lg:gap-5 lg:px-3 lg:py-1.5"
          href={liveAdvisorHref(booking.advisorId)}
        >
          <span className={cn("flex shrink-0 justify-center", GUTTER_W)}>
            <AdvisorFace advisor={advisor} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground lg:text-frame-meta">
              {advisor?.displayName ?? t("detailsUnavailableValue")}
            </span>
            <span className="text-xs text-muted-foreground lg:text-frame-label">{t("detailsAdvisorLabel")}</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground lg:size-5" />
        </Link>
        <Line icon={Clock3}>{t("detailsDuration", { count: minutes })}</Line>
        {/* What was paid and how it stands, with the way to its receipt. With
            no invoice to show, the service's price now: the appointment
            itself records no amount. */}
        {invoice ? (
          <Line icon={Banknote}>
            <span className="text-muted-foreground">{tr(`status.${invoice.status}`)}</span>{" "}
            <span className="font-latin font-medium tabular-nums">{format.number(baht(invoice.amountSatang), "baht")}</span>
            {" · "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href={invoiceHref(invoice.id)}>
              {t("viewReceipt")}
            </Link>
          </Line>
        ) : service ? (
          <Line icon={Banknote}>
            {t("detailsPriceLabel")}{" "}
            <span className="font-latin font-medium tabular-nums">{format.number(baht(service.priceSatang), "baht")}</span>
          </Line>
        ) : null}
        <Line icon={CalendarPlus}>
          <span className="text-muted-foreground">{t("detailsCreatedLabel")}</span> <Figures>{stamp(booking.createdAt)}</Figures>
        </Line>
        {booking.cancelledAt ? (
          <Line icon={CircleX}>
            <span className="text-muted-foreground">{t("cancelledAtLabel")}</span> <Figures>{stamp(booking.cancelledAt)}</Figures>
          </Line>
        ) : null}
      </div>

      {ways.more.length > 0 || changeable ? (
        <div className={cn("flex flex-wrap gap-2 lg:gap-3", UNDER_TEXT)}>
          {ways.more.map((way) => (
            <Button className={MORE_PILL} key={way.href} nativeButton={false} render={<Link href={way.href} />} variant="ghost">
              {way.label}
            </Button>
          ))}
          {changeable ? (
            <>
              <Button
                aria-expanded={panel === "reschedule"}
                className={MORE_PILL}
                onClick={() => setPanel((open) => (open === "reschedule" ? "none" : "reschedule"))}
                type="button"
                variant="ghost"
              >
                {t("reschedule")}
              </Button>
              <Button
                aria-expanded={panel === "cancel"}
                className={cn(MORE_PILL, "text-destructive hover:text-destructive")}
                onClick={() => setPanel((open) => (open === "cancel" ? "none" : "cancel"))}
                type="button"
                variant="ghost"
              >
                {t("detailsCancel")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {panel === "reschedule" ? (
        // The picker is a shared phone block; the lift sets its type on the frame's steps.
        <div className={cn(UNDER_TEXT, DESKTOP_TYPE_LIFT)}>
          <RescheduleSlots
            booking={booking}
            onRescheduled={() => {
              setPanel("none");
              onChanged();
            }}
          />
        </div>
      ) : null}

      {/* Asks once before it calls the booking off: the time goes back on the
          advisor's calendar, where another advisee can take it. */}
      {changeable && panel === "cancel" ? (
        <div className={UNDER_TEXT}>
          <div className="flex flex-col gap-3 rounded-xl bg-destructive/5 p-4 lg:gap-4 lg:p-5" role="group">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground lg:text-frame-meta">{t("cancelConfirmTitle")}</p>
              <p className="text-xs text-muted-foreground lg:text-frame-label">{t("cancelConfirmBody")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className={cn(PILL, "bg-destructive text-primary-foreground hover:bg-destructive/90")}
                disabled={cancelling}
                onClick={cancel}
                type="button"
              >
                {t("cancelConfirm")}
              </Button>
              <Button className={MORE_PILL} disabled={cancelling} onClick={() => setPanel("none")} type="button" variant="ghost">
                {t("cancelKeep")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {failure ? (
        <p className={cn("text-sm text-destructive lg:text-frame-meta", UNDER_TEXT)} role="alert">
          {failure}
        </p>
      ) : null}

      <p className={cn("text-xs text-muted-foreground lg:text-frame-label", UNDER_TEXT)}>
        {t("helpPrompt")}{" "}
        <a className={cn(AUTH_LINK, "py-1.5")} href={`mailto:${l("footerEmailAddress")}?subject=${subject}`}>
          {tr("contactSupport")}
        </a>
      </p>
    </article>
  );
}

/**
 * A booking over the calendar, as a calendar opens an event: the card on one
 * white surface that scrolls inside the window, its close button held at the
 * top. The receipt's dialog, piece for piece (`ReceiptDialog`).
 *
 * The popup is portalled out of the account column, so it takes that column's
 * zoom itself (`app-scale`) from `lg`; below `lg` the wrapper is `contents`.
 *
 * `entry` is null until a booking is first opened; the dialog is closed then.
 */
export function BookingDialog({
  entry,
  now,
  open,
  onOpenChange,
  onChanged,
}: {
  readonly entry: BookingEntry | null;
  readonly now: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChanged: () => void;
}) {
  const c = useTranslations("common");
  const title = useId();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-labelledby={title}
        // On a phone 24px clear of each edge, as the receipt's.
        className="block max-h-[calc(100dvh-3rem)] max-w-[calc(100%-3rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-md lg:w-auto lg:max-w-none"
        showCloseButton={false}
      >
        {entry ? (
          <div className={cn("app-scale contents lg:block", SHEET_W)}>
            <div className="sticky top-0 z-10 flex justify-end bg-card px-2 pt-2 lg:px-4 lg:pt-4">
              <DialogClose
                render={<Button aria-label={c("close")} className="size-11 lg:size-12" size="icon" variant="ghost" />}
              >
                <X aria-hidden className="size-6" />
              </DialogClose>
            </div>
            {/* Keyed by the booking, so the next one opens with its prompts closed. */}
            <BookingSheet entry={entry} inDialog key={entry.booking.id} now={now} onChanged={onChanged} titleId={title} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
