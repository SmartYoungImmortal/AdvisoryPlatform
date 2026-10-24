"use client";

import Link from "next/link";
import { CalendarDays, Clock, EyeOff, Flag, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
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
const PILL = "lg:px-3 lg:text-base";

/** A small heading over one block of the panel. */
function BlockTitle({ children }: { readonly children: ReactNode }) {
  return <h3 className="text-xs font-semibold tracking-wide text-muted-foreground lg:text-base">{children}</h3>;
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
          <span className="truncate text-sm font-medium text-foreground lg:text-base">{service?.name ?? date}</span>
          <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-base">
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
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground lg:text-lg">
          {service?.name ?? t("sessionFallback")}
        </p>
        {state}
      </div>
      <div className="flex flex-col gap-1.5 text-sm text-foreground lg:text-base">
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
  className,
}: {
  readonly counterpart: Counterpart;
  readonly roomId: string;
  readonly anonymous: boolean;
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
          <p className="font-hero text-xl tracking-tight text-hero-ink lg:text-2xl">{name}</p>
          {advisor ? (
            <p className="line-clamp-2 text-sm text-muted-foreground lg:text-base">{advisor.headline}</p>
          ) : null}
          {note ? <p className="text-sm text-muted-foreground lg:text-base">{note}</p> : null}
        </div>
        {anonymous ? (
          <StatusPill className={PILL} icon={EyeOff} tone="neutral">
            {t("anonymous")}
          </StatusPill>
        ) : null}
        {advisor ? (
          <div className="flex w-full gap-2 pt-1">
            <Button
              className={cn(authPill(), "h-11 flex-1 px-3 md:px-3 lg:h-12")}
              nativeButton={false}
              render={<Link href={liveAdvisorHref(advisor.id)} />}
              variant="outline"
            >
              {t("viewProfile")}
            </Button>
            {bookHref ? (
              <Button
                className={cn(authPill(true), "h-11 flex-1 px-3 md:px-3 lg:h-12")}
                nativeButton={false}
                render={<Link href={bookHref} />}
              >
                {t("bookAgain")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* What it is about: this room's session, else the next one with them. */}
      {session ? (
        <section className="flex flex-col gap-2.5">
          <BlockTitle>{session === booking ? t("thisSession") : t("sessionsWithThem")}</BlockTitle>
          <SessionCard booking={session} primary service={serviceOf(session)} />
        </section>
      ) : null}

      <Link
        className="flex h-11 items-center gap-2 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-destructive lg:h-12 lg:text-frame-meta"
        href={chatReportHref(roomId)}
      >
        <Flag aria-hidden className="size-4" />
        {t("reportConversation")}
      </Link>
    </div>
  );
}

/** The details as a sheet from the bottom, for the phone's header button. */
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
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="max-h-[88dvh] gap-0 rounded-t-3xl p-0" showCloseButton={false} side="bottom">
        <div className="flex items-center justify-between border-b border-border py-2 pr-2 pl-5">
          <SheetTitle className="text-base font-semibold">{t("details")}</SheetTitle>
          <Button
            aria-label={t("close")}
            className="size-11 rounded-full"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
