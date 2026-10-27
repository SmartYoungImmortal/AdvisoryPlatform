"use client";

import Link from "next/link";
import { Bell, BellOff, CalendarDays, CalendarPlus, ChevronLeft, Clock, EyeOff, Flag, UserRound, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { BOOKING_TONE, liveAdvisorHref, liveServiceHref, useMountTime } from "@/components/bookings/booking-flow";
import { StatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PersonAvatar } from "@/components/chat/chat-avatar";
import { counterpartName } from "@/components/chat/chat-chrome";
import { chatReportHref } from "@/components/chat/chat-data";
import { useClock } from "@/components/chat/chat-hooks";
import type { Counterpart } from "@/components/chat/chat-logic";
import type { ApiBooking, ApiPublicService } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Beside the thread: who this is, the consultation the room belongs to, and
 * the rules of the room. On a desktop it stands open as the card's third
 * column; on a phone it is the sheet behind the header's details button.
 *
 * Every fact here is read, not drawn: the person from the public directory,
 * the session from `GET /bookings/me`, its state in the API's own terms. What
 * cannot be told (an advisor no longer listed, a room nobody has written in)
 * is said as such.
 */

/** `StatusPill` is drawn at 12px for a phone; the zoomed desktop needs 16. */
const PILL = "lg:px-2.5 lg:text-frame-label";

/**
 * One of the actions under the person: a grey disc with its mark, the word
 * under it. A link with `href`, else a button for `onClick` (a switch when
 * `pressed` says how it stands).
 */
function RoundAction({
  icon: Icon,
  label,
  href,
  onClick,
  pressed,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly pressed?: boolean;
}) {
  const shape =
    // At least a disc's room either side, wider when its word needs it: a
    // label stays on one line rather than breaking under the disc.
    "group flex h-auto min-w-18 flex-col items-center gap-1.5 rounded-xl p-0 outline-none hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50 lg:min-w-22 lg:gap-2";
  const face = (
    <>
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors duration-150 group-hover:bg-accented/60 motion-reduce:transition-none lg:size-12">
        <Icon aria-hidden className="size-5 lg:size-6" strokeWidth={1.75} />
      </span>
      <span className="text-xs font-normal whitespace-nowrap text-foreground lg:text-frame-label">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link className={shape} href={href}>
        {face}
      </Link>
    );
  }
  return (
    <Button aria-pressed={pressed} className={shape} onClick={onClick} type="button" variant="ghost">
      {face}
    </Button>
  );
}

/** A small heading over one block of the panel. */
function BlockTitle({ children }: { readonly children: ReactNode }) {
  return <h3 className="text-xs font-semibold tracking-wide text-muted-foreground lg:text-frame-label">{children}</h3>;
}

/** One session: what, when, for how long, and where it stands. */
function SessionCard({
  booking,
  service,
  primary,
}: {
  readonly booking: ApiBooking;
  readonly service: ApiPublicService | null;
  /** The room's own session, set as a card; others are quieter rows. */
  readonly primary: boolean;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const clock = useClock();
  const start = new Date(booking.startTime);
  const minutes = Math.round((Date.parse(booking.endTime) - start.getTime()) / 60_000);
  const date = format.dateTime(start, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = clock(start);
  const state = (
    <StatusPill className={PILL} tone={BOOKING_TONE[booking.state]}>
      {t(`state.${booking.state}`)}
    </StatusPill>
  );

  if (!primary) {
    return (
      <li className="flex items-center gap-3 py-2.5">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground lg:text-frame-meta">{service?.name ?? date}</span>
          <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-label">
            {service ? `${date} · ${time}` : time}
          </span>
        </span>
        {state}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-hero-card-border bg-card p-4 shadow-hero-card">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground lg:text-frame-meta">
          {service?.name ?? t("sessionFallback")}
        </p>
        {state}
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-foreground lg:text-frame-label">
        <span className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {date}
        </span>
        <span className="flex items-center gap-2 font-latin tabular-nums">
          <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {time}
          <span className="text-muted-foreground">· {t("durationMinutes", { count: minutes })}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * What goes under the name when there is no advisor headline: for someone the
 * API names but the directory does not list, "not public right now" only when
 * this is a room I booked them in (so they are the advisor), and nothing for
 * an Advisee; for nobody named, which of the two we cannot tell.
 */
function detailsNoteKey({ advisor, person, booking, userId }: Counterpart): "unlisted" | "unknownPartner" | null {
  if (advisor) return null;
  if (!person) return userId ? "unlisted" : "unknownPartner";
  return booking ? "unlisted" : null;
}

/** The next session with this person that has not ended yet, booked or under way. */
function nextSessionWith(bookings: readonly ApiBooking[], userId: string | null, now: number): ApiBooking | undefined {
  if (!userId) return undefined;
  return bookings
    .filter(
      (b) =>
        (b.advisorId === userId || b.adviseeId === userId) &&
        (b.state === "BOOKED" || b.state === "IN_PROGRESS") &&
        Date.parse(b.endTime) > now,
    )
    .toSorted((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0];
}

/** Where "book again" goes: the service this room is about, else the advisor's page. */
function bookHrefFor({ service, advisor }: Counterpart): string | null {
  if (service) return liveServiceHref(service.id);
  return advisor ? liveAdvisorHref(advisor.id) : null;
}

export function ThreadDetails({
  counterpart,
  roomId,
  anonymous,
  bookings,
  services,
  onReport,
  muted = false,
  muteFailed = false,
  onToggleMute,
  className,
}: {
  readonly counterpart: Counterpart;
  readonly roomId: string;
  readonly anonymous: boolean;
  /** Opens the report over the conversation; without it, the report's own page. */
  readonly onReport?: () => void;
  /** The room's notifications are off for me. */
  readonly muted?: boolean;
  /** The last switch did not go through; the disc is back where it was. */
  readonly muteFailed?: boolean;
  /** Turns the room's notifications off or back on; without it, no switch. */
  readonly onToggleMute?: () => void;
  /** Every booking of mine, for the other sessions with this person. */
  readonly bookings: readonly ApiBooking[];
  readonly services: readonly ApiPublicService[];
  readonly className?: string;
}) {
  const t = useTranslations("chat");
  const { advisor, booking, person, userId } = counterpart;
  const name = counterpartName(counterpart, t);
  const noteKey = detailsNoteKey(counterpart);
  const note = noteKey ? t(noteKey) : null;

  const now = useMountTime();
  const session = booking ?? nextSessionWith(bookings, userId, now) ?? null;
  const serviceOf = (b: ApiBooking) => services.find((s) => s.id === b.serviceId) ?? null;
  const bookHref = bookHrefFor(counterpart);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Who. */}
      <section className="flex flex-col items-center gap-3 text-center">
        <PersonAvatar advisor={advisor} known={userId !== null} person={person} size={80} verified={advisor !== null} />
        <div className="flex flex-col items-center gap-1">
          <p className="font-hero text-lg tracking-tight text-hero-ink lg:text-frame-figure">{name}</p>
          {advisor ? (
            <p className="line-clamp-2 text-xs text-muted-foreground lg:text-frame-label">{advisor.headline}</p>
          ) : null}
          {note ? <p className="text-xs text-muted-foreground lg:text-frame-label">{note}</p> : null}
        </div>
        {anonymous ? (
          <StatusPill className={PILL} icon={EyeOff} tone="neutral">
            {t("anonymous")}
          </StatusPill>
        ) : null}
        {advisor || onToggleMute ? (
          // Round actions under the name, as a messenger's details set them:
          // a grey disc with the mark, its word under it.
          <div className="flex justify-center gap-2 pt-1 lg:gap-3">
            {advisor ? <RoundAction href={liveAdvisorHref(advisor.id)} icon={UserRound} label={t("viewProfile")} /> : null}
            {advisor && bookHref ? <RoundAction href={bookHref} icon={CalendarPlus} label={t("bookAgain")} /> : null}
            {onToggleMute ? (
              // Says what pressing it does: the bell with its slash while it
              // would mute, the plain bell once muted.
              <RoundAction
                icon={muted ? Bell : BellOff}
                label={muted ? t("unmute") : t("mute")}
                onClick={onToggleMute}
                pressed={muted}
              />
            ) : null}
          </div>
        ) : null}
        {muteFailed ? (
          <p className="text-xs text-destructive lg:text-frame-label" role="alert">
            {t("muteFailed")}
          </p>
        ) : null}
      </section>

      {/* What it is about: this room's session, else the next one with them. */}
      {session ? (
        <section className="flex flex-col gap-2.5">
          <BlockTitle>{session === booking ? t("thisSession") : t("sessionsWithThem")}</BlockTitle>
          <SessionCard booking={session} primary service={serviceOf(session)} />
        </section>
      ) : null}

      {onReport ? (
        <Button
          className="h-11 gap-2 self-start px-0 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-destructive lg:h-12 lg:text-frame-meta"
          onClick={onReport}
          type="button"
          variant="ghost"
        >
          <Flag aria-hidden className="size-4" />
          {t("reportConversation")}
        </Button>
      ) : (
        <Link
          className="flex h-11 items-center gap-2 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-destructive lg:h-12 lg:text-frame-meta"
          href={chatReportHref(roomId)}
        >
          <Flag aria-hidden className="size-4" />
          {t("reportConversation")}
        </Link>
      )}
    </div>
  );
}

/** The details as a page over the conversation, for the header button below `lg` (a phone, an upright tablet). */
export function DetailsSheet({
  open,
  onOpenChange,
  children,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}) {
  const t = useTranslations("chat");
  const c = useTranslations("common");
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      {/* A page of its own over the conversation, in from the right edge the
          way the next screen of an app comes in, with the back chevron the
          conversation's own bar has. */}
      <SheetContent
        className="h-dvh gap-0 p-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
        showCloseButton={false}
        side="right"
      >
        <div className="flex h-16 shrink-0 items-center gap-1 border-b border-border px-1.5 pt-[env(safe-area-inset-top)]">
          <Button
            aria-label={c("back")}
            className="size-11 shrink-0 rounded-full"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="size-6" />
          </Button>
          <SheetTitle className="text-base font-semibold">{t("details")}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
