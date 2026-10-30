"use client";

import {
  BadgeCheck,
  Bell,
  Briefcase,
  CalendarDays,
  CircleHelp,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UserRoundPen,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type KeyboardEvent, type ReactNode } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { AppFrame, PHONE_BAR } from "@/components/account/app-frame";
import { liveAdvisorHref, useMountTime } from "@/components/bookings/booking-flow";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { useNotificationPulse } from "@/components/notifications/notification-store";
import {
  IdentityRow,
  PORTRAIT,
  ProfileCover,
  ProfileCrumb,
  ProfileHero,
  profilePill,
  useProfileFacts,
} from "@/components/profile/identity-card";
import {
  OwnAvatar,
  hasRole,
  useBookingHistory,
  type BookingEntry,
  type BookingHistory,
} from "@/components/profile/profile-data";
import { ApiErrorCard } from "@/components/service/parts";
import { useAccount } from "@/components/session/account-bits";
import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { getBookingReview } from "@/lib/api/resources";
import type { ApiBookingState, ApiPublicAdvisor, ApiReview } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { heroCards, heroGround } from "@/lib/assets/r2";
import { heroCardFor } from "@/lib/catalogue/live";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- pieces */

/** Each state in its own words and colour. */
const STATE: Record<ApiBookingState, { readonly key: string; readonly tone: StatusTone }> = {
  PENDING_PAYMENT: { key: "awaitingPayment", tone: "warning" },
  BOOKED: { key: "confirmed", tone: "accent" },
  IN_PROGRESS: { key: "inProgress", tone: "info" },
  COMPLETED: { key: "completed", tone: "success" },
  NO_SHOW: { key: "noShow", tone: "neutral" },
  CANCELLED: { key: "cancelled", tone: "neutral" },
};

/** The dot each tone carries on the white pill a photograph needs. */
const DOT: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

function useStateLabel() {
  const t = useTranslations("profile");
  return (state: ApiBookingState) => t(`state.${STATE[state].key}` as "state.confirmed");
}

function StatePill({ state }: { readonly state: ApiBookingState }) {
  const label = useStateLabel();
  return (
    <StatusPill className="lg:px-3 lg:py-1 lg:text-frame-label" tone={STATE[state].tone}>
      {label(state)}
    </StatusPill>
  );
}

/**
 * An advisor's face, as `/search` draws it: their ring card's portrait if they
 * stand on the home hero, otherwise the API's own `image`.
 */
function faceOf(entry: {
  readonly service?: NonNullable<BookingEntry["service"]>;
  readonly advisor?: ApiPublicAdvisor;
}) {
  if (entry.service?.face) return entry.service.face;
  const advisor = entry.advisor;
  if (!advisor) return null;
  const card = heroCardFor(advisor.displayName);
  if (card) return heroCards[card].face;
  return advisor.image ? ({ src: advisor.image, width: 128, height: 128 } satisfies StaticImageData) : null;
}

function Face({
  face,
  name,
  className,
}: {
  readonly face: StaticImageData | null;
  readonly name: string | undefined;
  readonly className?: string;
}) {
  const box = cn("shrink-0 rounded-full", className);
  if (face) return <Image alt="" className={cn(box, "object-cover")} src={face} />;
  return (
    <span aria-hidden className={cn(box, "flex items-center justify-center bg-muted font-medium text-muted-foreground")}>
      {/* An advisor who is no longer listed has no name to take an initial
          from; a glyph, not an empty disc that reads as a failed photo. */}
      {name ? name.slice(0, 1) : <UserRound className="size-1/2" />}
    </span>
  );
}

/** A link in the capsule shape. */
function PillLink({
  href,
  icon: Icon,
  solid = false,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly solid?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <Button
      className={profilePill(solid)}
      nativeButton={false}
      render={<Link href={href} />}
      variant={solid ? "default" : "outline"}
    >
      <Icon aria-hidden />
      {children}
    </Button>
  );
}

/* ------------------------------------------------------------------ identity */

/**
 * The line about the person. The API holds no introduction for an
 * advisee and no field to write one in, so this is the one sentence the
 * bookings can honestly say: how many sessions, on what.
 */
/** The way to the search inside a sentence (`t.rich`'s `<link>`). */
function searchLink(chunks: ReactNode) {
  return (
    <Link className="font-medium text-foreground underline underline-offset-4" href="/search">
      {chunks}
    </Link>
  );
}

function Summary({ history }: { readonly history: BookingHistory }) {
  const t = useTranslations("profile");
  const { bookings, completed, upcoming, categories } = history;
  if (!bookings.data) {
    return bookings.error ? null : <span aria-hidden className="mt-3 block h-5 w-4/5 animate-pulse rounded-md bg-muted" />;
  }
  const line = "mt-3 text-sm text-muted-foreground md:text-base lg:mt-2.5 lg:text-frame-meta";
  if (completed.length > 0) {
    const topics = categories.slice(0, 2).join(", ");
    return (
      <p className={line}>
        {topics
          ? t("summaryDone", { count: completed.length, topics })
          : t("summaryCount", { count: completed.length })}
      </p>
    );
  }
  if (upcoming.length > 0) return <p className={line}>{t("summaryFirst")}</p>;
  return (
    <p className={line}>
      {t.rich("summaryNew", { link: searchLink })}
    </p>
  );
}

/**
 * The figures box: four values over their labels in one hairline box,
 * every one counted from the account's own bookings.
 */
function Stats({ history }: { readonly history: BookingHistory }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { bookings, upcoming, completed } = history;
  // A failed list has no figures to give; the panel below says why. An
  // account that has never booked has nothing to count yet.
  if (bookings.error || bookings.data?.total === 0) return null;

  const minutes = completed.reduce(
    (sum, { booking }) => sum + (Date.parse(booking.endTime) - Date.parse(booking.startTime)) / 60_000,
    0,
  );
  const hours = minutes / 60;
  const figures = [
    { label: t("stats.upcoming"), value: upcoming.length, decimals: 0 },
    { label: t("stats.completed"), value: completed.length, decimals: 0 },
    { label: t("stats.hours"), value: hours, decimals: Number.isInteger(hours) ? 0 : 1 },
    {
      label: t("stats.experts"),
      value: new Set(completed.map(({ booking }) => booking.advisorId)).size,
      decimals: 0,
    },
  ];

  return (
    <dl
      aria-label={t("figures.label")}
      className="mt-4 flex w-full max-w-lg rounded-2xl border border-border py-1 md:w-fit lg:mt-5 lg:py-1.5"
    >
      {figures.map((figure) => (
        <div className="flex flex-1 flex-col items-center px-3 py-2 md:flex-none md:px-5 lg:px-6" key={figure.label}>
          <dt className="order-2 text-xs whitespace-nowrap text-muted-foreground md:text-sm lg:text-frame-label">
            {figure.label}
          </dt>
          <dd className="order-1 font-latin text-xl leading-tight font-semibold text-foreground tabular-nums md:text-2xl lg:text-frame-figure">
            {bookings.data ? (
              format.number(figure.value, {
                minimumFractionDigits: figure.decimals,
                maximumFractionDigits: figure.decimals,
              })
            ) : (
              <span aria-hidden className="my-1 block h-6 w-8 animate-pulse rounded-md bg-muted lg:h-8" />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Identity({ history }: { readonly history: BookingHistory }) {
  const t = useTranslations("profile");
  const { name, email, verified } = useProfileFacts();

  return (
    <IdentityRow portrait={<OwnAvatar className={PORTRAIT} fluid size={112} />}>
      <h1 className="font-hero text-heading font-normal tracking-tight text-hero-ink md:text-4xl md:leading-[1.25] lg:text-frame-title">
        {name ?? (
          <>
            <span className="sr-only">{t("yourProfile")}</span>
            <span aria-hidden className="block h-9 w-56 animate-pulse rounded-lg bg-muted lg:h-12" />
          </>
        )}
      </h1>
      {/* The handle line: the address stands in for the @handle an
          advisee does not have. */}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:text-base lg:mt-2">
        {email ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="truncate font-latin text-foreground underline decoration-border underline-offset-4">
              {email}
            </span>
            {verified ? (
              <BadgeCheck aria-label={t("emailVerified")} className="size-4 shrink-0 text-success lg:size-5" role="img" />
            ) : null}
          </span>
        ) : null}
        <span aria-hidden>·</span>
        <span>{t("role")}</span>
      </p>
      <Summary history={history} />
      <Stats history={history} />
    </IdentityRow>
  );
}

/* ---------------------------------------------------------------------- feed */

/** A titled list down the right of the feed, with its "View all". */
function Rail({
  id,
  title,
  action,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3 lg:gap-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" id={id}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RailLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <Link
      className="flex h-11 shrink-0 items-center gap-1 rounded-full px-1 text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:text-base lg:text-frame-body"
      href={href}
    >
      {children}
      <ChevronRight aria-hidden className="size-4 lg:size-5" />
    </Link>
  );
}

/**
 * A service row: a 4:3 photograph at the left, a title in two lines
 * at most, and the facts under it.
 */
function RailRow({
  href,
  cover,
  title,
  children,
}: {
  readonly href?: string;
  readonly cover: StaticImageData;
  readonly title: string;
  readonly children: ReactNode;
}) {
  const body = (
    <>
      <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted lg:w-32">
        <Image alt="" className="object-cover" fill sizes="128px" src={cover} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pr-1 lg:gap-1.5">
        <span className="line-clamp-2 text-base leading-snug font-medium text-foreground lg:text-frame-body">{title}</span>
        {children}
      </span>
    </>
  );
  const box = "flex items-center gap-4 rounded-2xl border border-border bg-card p-2.5";
  return (
    <li>
      {href ? (
        <Link
          className={cn(
            box,
            "outline-none transition-shadow duration-200 hover:shadow-hero-card-hover focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          href={href}
        >
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}

/** The row's fact line: 14px on the phone, 16 from `lg`. */
const META = "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground lg:text-frame-meta";

function RailSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-3">
      {[0, 1].map((index) => (
        <li className="flex items-center gap-4 rounded-2xl border border-border p-2.5" key={index}>
          <span className="aspect-[4/3] w-28 shrink-0 animate-pulse rounded-xl bg-muted lg:w-32" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-5 w-4/5 animate-pulse rounded-md bg-muted" />
            <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A quiet card in place of a list with nothing in it. */
function EmptyNote({ title, body, children }: { readonly title?: string; readonly body: string; readonly children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 lg:gap-4 lg:p-6">
      <div className="flex flex-col gap-1">
        {title ? <p className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</p> : null}
        <p className="text-sm text-muted-foreground lg:text-frame-meta">{body}</p>
      </div>
      {children ? <div className="flex flex-wrap gap-2.5">{children}</div> : null}
    </div>
  );
}

/** The shapes the photo grid cycles through, so its columns stagger. */
const TILE_SHAPES = ["aspect-[3/4]", "aspect-[4/3]", "aspect-[2/3]", "aspect-square", "aspect-[4/5]", "aspect-[3/2]"];

/**
 * A portfolio of the account's own sessions: each one a photograph
 * of the service, with what it was and when over the bottom of it. A tile
 * opens the service again while it is still listed.
 */
function SessionGrid({ entries }: { readonly entries: readonly BookingEntry[] }) {
  const t = useTranslations("profile");
  const label = useStateLabel();
  const format = useFormatter();

  return (
    <div className="columns-2 gap-3 md:columns-3 lg:gap-4">
      {entries.map(({ booking, service }, index) => {
        const tone = STATE[booking.state].tone;
        const tile = (
          <>
            <span className={cn("relative block", TILE_SHAPES[index % TILE_SHAPES.length])}>
              <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 220px, 50vw" src={service?.cover ?? heroGround} />
            </span>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-scrim/75 via-scrim/30 to-transparent" />
            <span className="absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1.5 rounded-full bg-card/90 px-2.5 text-xs font-medium text-foreground backdrop-blur-sm lg:top-3 lg:left-3 lg:h-7 lg:px-3 lg:text-frame-label">
              <span aria-hidden className={cn("size-1.5 rounded-full lg:size-2", DOT[tone])} />
              {label(booking.state)}
            </span>
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 lg:p-4">
              <span className="line-clamp-2 text-sm leading-snug font-semibold text-on-media md:text-base lg:text-frame-body">
                {service?.title ?? t("serviceGone")}
              </span>
              <span className="text-xs text-on-media/85 md:text-sm lg:text-frame-meta">
                {format.dateTime(new Date(booking.startTime), { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </span>
          </>
        );
        const box =
          "group relative mb-3 block break-inside-avoid overflow-hidden rounded-2xl bg-muted lg:mb-4 lg:rounded-[1.25rem]";
        return service ? (
          <Link
            className={cn(box, "outline-none focus-visible:ring-3 focus-visible:ring-ring/50")}
            href={service.href}
            key={booking.id}
          >
            {tile}
          </Link>
        ) : (
          <div className={box} key={booking.id}>
            {tile}
          </div>
        );
      })}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div aria-hidden className="columns-2 gap-3 md:columns-3 lg:gap-4">
      {TILE_SHAPES.map((shape) => (
        <span className={cn("mb-3 block animate-pulse rounded-2xl bg-muted lg:mb-4", shape)} key={shape} />
      ))}
    </div>
  );
}

/** The feed's two columns: the wide one, and the rail beside it. */
const FEED = "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8";

function BookingsPanel({ history, now }: { readonly history: BookingHistory; readonly now: number }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { bookings, past, upcoming } = history;

  if (bookings.error) {
    return <ApiErrorCard error={bookings.error} onRetry={bookings.reload} title={t("bookingsFailed")} />;
  }

  return (
    <div className={FEED}>
      <section aria-labelledby="profile-past" className="min-w-0">
        <h2 className="sr-only" id="profile-past">
          {t("pastTitle")}
        </h2>
        {!bookings.data ? <GridSkeleton /> : null}
        {bookings.data && past.length > 0 ? <SessionGrid entries={past} /> : null}
        {bookings.data && past.length === 0 ? <EmptyNote body={t("noHistory")} /> : null}
      </section>

      <Rail action={<RailLink href="/bookings">{t("seeAll")}</RailLink>} id="profile-upcoming" title={t("upcomingTitle")}>
        {!bookings.data ? <RailSkeleton /> : null}
        {bookings.data && upcoming.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {upcoming.slice(0, 3).map(({ booking, service, advisor }) => {
              const start = new Date(booking.startTime);
              const end = new Date(booking.endTime);
              const time = (date: Date) => format.dateTime(date, { hour: "2-digit", minute: "2-digit" });
              return (
                <RailRow
                  cover={service?.cover ?? heroGround}
                  // Where the booking can be moved or called off.
                  href="/bookings"
                  key={booking.id}
                  title={service?.title ?? t("serviceGone")}
                >
                  <span className={META}>
                    <span className="whitespace-nowrap">{format.dateTime(start, { day: "numeric", month: "short" })}</span>
                    <span aria-hidden>·</span>
                    <span className="font-latin whitespace-nowrap tabular-nums">
                      {time(start)} - {time(end)}
                    </span>
                  </span>
                  <span className={META}>
                    {advisor ? <span className="truncate">{advisor.displayName}</span> : null}
                    <span className="font-medium text-primary">{format.relativeTime(start, now)}</span>
                  </span>
                  <span>
                    <StatePill state={booking.state} />
                  </span>
                </RailRow>
              );
            })}
          </ul>
        ) : null}
        {/* Nothing booked ahead: one row the height of the service rows
            under it, so the way to book again stays in the first screen. */}
        {bookings.data && upcoming.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border p-2.5 pr-4">
            <span className="flex aspect-[4/3] w-28 shrink-0 items-center justify-center rounded-xl bg-muted lg:w-32">
              <CalendarDays aria-hidden className="size-6 text-muted-foreground lg:size-7" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-semibold text-foreground lg:text-frame-body">{t("noUpcomingTitle")}</span>
              <span className="flex flex-wrap items-center gap-x-3">
                <Link
                  className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta"
                  href="/search"
                >
                  <Search aria-hidden className="size-4" />
                  {t("findAdvisor")}
                </Link>
                <Link
                  className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-frame-meta"
                  href="/matching"
                >
                  <Sparkles aria-hidden className="size-4" />
                  {t("matchMe")}
                </Link>
              </span>
            </span>
          </div>
        ) : null}

        {/* The services behind the sessions,
            each a way to book the same thing again while it is listed. */}
        <BookAgain past={past} />
      </Rail>
    </div>
  );
}

function BookAgain({ past }: { readonly past: readonly BookingEntry[] }) {
  const t = useTranslations("profile");
  const s = useTranslations("search");
  const format = useFormatter();
  const services = new Map<string, NonNullable<BookingEntry["service"]>>();
  for (const { service } of past) {
    if (service && !services.has(service.id)) services.set(service.id, service);
  }
  if (services.size === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3 lg:mt-5 lg:gap-4">
      <h3 className="text-base font-semibold text-foreground lg:text-frame-body">{t("bookAgain")}</h3>
      <ul className="flex flex-col gap-3">
        {[...services.values()].slice(0, 3).map((service) => (
          <RailRow cover={service.cover} href={service.href} key={service.id} title={service.title}>
            <span className={META}>
              <span className="font-latin font-semibold text-foreground tabular-nums">
                {format.number(service.price, { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
              </span>
              <span aria-hidden>·</span>
              <span>{s("durationMinutes", { count: service.minutes })}</span>
            </span>
            {service.rating !== null && service.reviews > 0 ? (
              <span className={META}>
                <Star aria-hidden className="size-4 fill-primary text-primary" />
                <span className="font-latin font-semibold text-foreground tabular-nums">{service.rating.toFixed(1)}</span>
                <span className="tabular-nums">({service.reviews})</span>
              </span>
            ) : null}
          </RailRow>
        ))}
      </ul>
    </div>
  );
}

function ExpertsPanel({ history }: { readonly history: BookingHistory }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { bookings, completed } = history;

  if (bookings.error) {
    return <ApiErrorCard error={bookings.error} onRetry={bookings.reload} title={t("bookingsFailed")} />;
  }

  // Everyone with a session behind them, most recent first (the list is
  // newest first, so the first sighting is the latest).
  const experts = new Map<string, { entry: BookingEntry; count: number }>();
  for (const entry of completed) {
    const seen = experts.get(entry.booking.advisorId);
    if (seen) seen.count += 1;
    else experts.set(entry.booking.advisorId, { entry, count: 1 });
  }

  return (
    <div>
      <section aria-labelledby="profile-experts" className="min-w-0">
        <h2 className="sr-only" id="profile-experts">
          {t("tabExperts")}
        </h2>
        {!bookings.data ? <RailSkeleton /> : null}
        {bookings.data && experts.size === 0 ? <EmptyNote body={t("noExperts")} /> : null}
        {experts.size > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {[...experts.values()].map(({ entry, count }) => {
              const name = entry.advisor?.displayName ?? entry.service?.advisorName;
              const card = (
                <>
                  <Face className="size-14 text-lg lg:size-[57px]" face={faceOf(entry)} name={name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold text-foreground lg:text-frame-body">
                      {name ?? t("expertGone")}
                    </span>
                    {entry.advisor?.headline ? (
                      <span className="line-clamp-1 text-sm text-muted-foreground lg:text-frame-meta">{entry.advisor.headline}</span>
                    ) : null}
                    <span className="text-sm text-muted-foreground lg:text-frame-meta">
                      {t("expertSessions", { count })} ·{" "}
                      {t("lastSession", {
                        date: format.dateTime(new Date(entry.booking.startTime), { day: "numeric", month: "short" }),
                      })}
                    </span>
                  </span>
                </>
              );
              const box = "flex items-center gap-4 rounded-2xl border border-border bg-card p-4 lg:p-5";
              return (
                <li key={entry.booking.advisorId}>
                  {entry.advisor ? (
                    <Link
                      className={cn(box, "outline-none transition-shadow hover:shadow-hero-card-hover focus-visible:ring-3 focus-visible:ring-ring/50")}
                      href={liveAdvisorHref(entry.advisor.id)}
                    >
                      {card}
                    </Link>
                  ) : (
                    <div className={box}>{card}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

/** Five stars, the given ones filled; read out as a sentence. */
function Stars({ value }: { readonly value: number }) {
  const t = useTranslations("profile");
  return (
    <span aria-label={t("starsLabel", { stars: value })} className="flex items-center gap-0.5" role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          aria-hidden
          className={cn("size-4 lg:size-5", n <= value ? "fill-primary text-primary" : "text-border")}
          key={n}
        />
      ))}
    </span>
  );
}

/**
 * The reviews the account has written. There is no list of them on the API,
 * only `GET /bookings/:id/review` per consultation (404 for one not
 * reviewed), so this asks once per completed session, and only when the tab
 * is opened.
 */
function ReviewsPanel({ history }: { readonly history: BookingHistory }) {
  const t = useTranslations("profile");
  const format = useFormatter();
  const { completed } = history;
  const ids = completed.map(({ booking }) => booking.id);
  const key = ids.join(",");

  const reviews = useResource<ReadonlyMap<string, ApiReview | null>>(
    `reviews:mine:${key}`,
    useCallback(
      async (signal: AbortSignal) => {
        const pairs = await Promise.all(
          (key ? key.split(",") : []).map(async (id) => {
            try {
              return [id, await getBookingReview(id, signal)] as const;
            } catch (cause) {
              if (cause instanceof ApiError && cause.status === 404) return [id, null] as const;
              throw cause;
            }
          }),
        );
        return new Map(pairs);
      },
      [key],
    ),
  );

  if (reviews.error) {
    return <ApiErrorCard error={reviews.error} onRetry={reviews.reload} title={t("reviewsFailed")} />;
  }

  const written = completed.flatMap((entry) => {
    const review = reviews.data?.get(entry.booking.id);
    return review ? [{ entry, review }] : [];
  });
  const waiting = reviews.data ? completed.filter((entry) => reviews.data?.get(entry.booking.id) === null) : [];

  return (
    <div className={FEED}>
      <section aria-labelledby="profile-reviews" className="min-w-0">
        <h2 className="sr-only" id="profile-reviews">
          {t("tabReviews")}
        </h2>
        {!reviews.data ? <RailSkeleton /> : null}
        {reviews.data && written.length === 0 ? <EmptyNote body={t("noReviews")} /> : null}
        {written.length > 0 ? (
          <ul className="flex flex-col gap-3 lg:gap-4">
            {written.map(({ entry, review }) => (
              <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 lg:p-6" key={review.appointmentId}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={review.stars} />
                  <span className="text-sm text-muted-foreground lg:text-frame-meta">
                    {format.dateTime(new Date(review.createdAt), { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold text-foreground lg:text-frame-body">{review.serviceName}</p>
                  {entry.advisor ? (
                    <p className="text-sm text-muted-foreground lg:text-frame-meta">
                      {t("withAdvisor", { name: entry.advisor.displayName })}
                    </p>
                  ) : null}
                </div>
                {review.comment ? <p className="text-base text-foreground lg:text-frame-body">{review.comment}</p> : null}
                {review.advisorReply ? (
                  <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
                    <p className="text-sm font-medium text-muted-foreground lg:text-frame-meta">{t("advisorReply")}</p>
                    <p className="text-sm text-foreground lg:text-frame-meta">{review.advisorReply}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Rail id="profile-review-waiting" title={t("reviewsPending")}>
        {!reviews.data ? <RailSkeleton /> : null}
        {reviews.data && waiting.length === 0 ? <EmptyNote body={t("allReviewed")} /> : null}
        {waiting.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {waiting.map(({ booking, service }) => (
              <RailRow
                cover={service?.cover ?? heroGround}
                href={`/reviews/session?booking=${booking.id}`}
                key={booking.id}
                title={service?.title ?? t("serviceGone")}
              >
                <span className={META}>
                  {format.dateTime(new Date(booking.startTime), { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground lg:text-frame-meta">
                  {t("writeReview")}
                  <ChevronRight aria-hidden className="size-4" />
                </span>
              </RailRow>
            ))}
          </ul>
        ) : null}
      </Rail>
    </div>
  );
}

type Row = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly href: string;
  readonly badge?: ReactNode;
};

/** A card of links, one 56px row each (64 from `lg`). */
function LinkList({
  rows,
  label,
  className,
  children,
}: {
  readonly rows: readonly Row[];
  readonly label: string;
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  return (
    <nav aria-label={label} className={cn("rounded-2xl border border-border bg-card p-2", className)}>
      <ul className="flex flex-col">
        {rows.map(({ icon: Icon, label: text, href, badge }) => (
          <li key={href}>
            <Link
              className="flex h-14 items-center gap-3 rounded-xl px-3 text-base text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-13 lg:text-frame-body"
              href={href}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted lg:size-10">
                <Icon aria-hidden className="size-4.5 lg:size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{text}</span>
              {badge}
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </nav>
  );
}

function AboutPanel() {
  const t = useTranslations("profile");
  const c = useTranslations("common");
  const { profile, name, email, fullName, verified, joined } = useProfileFacts();
  const offersAdvisor = profile.data !== undefined && !hasRole(profile.data, "advisor");

  const facts: { readonly label: string; readonly value: ReactNode }[] = [
    { label: t("displayName"), value: name },
    {
      label: t("fullName"),
      value: fullName ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {fullName}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground lg:text-frame-meta">
            <ShieldCheck aria-hidden className="size-4 text-success" />
            {t("hiddenFromExperts")}
          </span>
        </span>
      ) : null,
    },
    {
      label: c("email"),
      value: email ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-latin">{email}</span>
          <span className={cn("inline-flex items-center gap-1 text-sm lg:text-frame-meta", verified ? "text-success" : "text-muted-foreground")}>
            {verified ? <BadgeCheck aria-hidden className="size-4" /> : null}
            {verified ? t("emailVerified") : t("emailUnverified")}
          </span>
        </span>
      ) : null,
    },
    { label: t("joinedLabel"), value: joined },
    { label: t("timezone"), value: profile.data?.timezone ? <span className="font-latin">{profile.data.timezone}</span> : null },
  ];

  return (
    <div className={FEED}>
      <section aria-labelledby="profile-about" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:gap-5 lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading" id="profile-about">
            {t("aboutTitle")}
          </h2>
          <PillLink href="/profile/edit" icon={UserRoundPen}>
            {t("editProfileAction")}
          </PillLink>
        </div>
        <dl className="flex flex-col">
          {facts.map((fact) =>
            fact.value ? (
              <div
                className="flex flex-col gap-0.5 border-t border-border py-3.5 first:border-t-0 first:pt-0 md:flex-row md:items-baseline md:gap-6 lg:py-4"
                key={fact.label}
              >
                <dt className="shrink-0 text-sm text-muted-foreground md:w-40 lg:w-48 lg:text-frame-meta">{fact.label}</dt>
                <dd className="min-w-0 text-base text-foreground lg:text-frame-body">{fact.value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </section>

      <Rail id="profile-more" title={t("moreTitle")}>
        <LinkList
          label={t("moreTitle")}
          rows={[
            { icon: CircleHelp, label: t("helpCentre"), href: "/#faq" },
            { icon: ShieldCheck, label: t("termsPrivacy"), href: "/terms" },
          ]}
        />
        {offersAdvisor ? (
          <Link
            className="group flex items-start gap-3 rounded-2xl bg-muted/60 p-5 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/advisor/apply"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card">
              <Briefcase aria-hidden className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-base font-semibold text-foreground lg:text-frame-body">{t("becomeAdvisorTitle")}</span>
              <span className="text-sm text-muted-foreground lg:text-frame-meta">{t("becomeAdvisorBody")}</span>
            </span>
          </Link>
        ) : null}
      </Rail>
    </div>
  );
}

/* ------------------------------------------------------------------- screen */

const TABS = ["bookings", "experts", "reviews", "about"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  bookings: "tabBookings",
  experts: "tabExperts",
  reviews: "tabReviews",
  about: "tabAbout",
};

/**
 * `/profile`: the advisee's own profile, inside the account layout
 * (`AccountShell`).
 *
 * The frame's parts, each fed only by what the API holds:
 * - **crumb** "X's profile", with editing at the right;
 * - **identity**: portrait, name, the address as the handle, one sentence the
 *   bookings support, and a box of four figures, all counted from
 *   `GET /bookings/me`;
 * - **cover**: the home hero's room, the categories booked as pills, when the
 *   account joined;
 * - **tabs**, line tabs: bookings (past sessions as a photo grid
 *   with what is coming in the rail), experts (who was consulted, and the
 *   services booked), reviews (written, and waiting), about (the account's
 *   facts).
 *
 * The phone has no sidebar, so the account's other pages follow the feed as
 * a card of their own.
 */
export function ProfileScreen({
  overlay,
}: {
  /** The log-out route renders this page under its dialog. */
  readonly overlay?: ReactNode;
}) {
  const t = useTranslations("profile");
  const nav = useTranslations("accountNav");
  const now = useMountTime();
  const history = useBookingHistory(now);
  const signedIn = useAccount() !== null;
  const { unread } = useNotificationPulse(isApiConfigured && signedIn);
  const [tab, setTab] = useState<Tab>("bookings");

  // Arrow keys move along the tabs, as a tab list should.
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
    setTab(next);
    document.getElementById(`profile-tab-${next}`)?.focus();
  };

  const menu: readonly Row[] = [
    { icon: ReceiptText, label: nav("transactions"), href: "/transactions" },
    {
      icon: Bell,
      label: nav("notifications"),
      href: "/notifications",
      badge:
        unread !== null && unread > 0 ? (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 font-latin text-xs font-semibold text-primary-foreground tabular-nums">
            <span aria-hidden>{unread > 99 ? "99+" : unread}</span>
            <span className="sr-only">{nav("unread", { count: unread })}</span>
          </span>
        ) : null,
    },
    { icon: Settings, label: nav("settings"), href: "/settings" },
  ];

  return (
    <MobileScreen className="pb-0" wide="md">
      <AppFrame active="profile">
      <ScreenBody className="bg-card pb-19.5 lg:pb-0">
        <div className={PHONE_BAR}>
          <TopBar dock unreadNotifications />
        </div>

        <AccountShell active="profile">
          <div className="flex w-full shrink-0 flex-col gap-4 px-4 pt-1 pb-10 md:px-8 md:pb-14 lg:gap-6 lg:p-0">
            <ProfileCrumb
              action={
                <Button
                  className={profilePill()}
                  nativeButton={false}
                  render={<Link href="/profile/edit" />}
                  variant="outline"
                >
                  <UserRoundPen aria-hidden />
                  {t("editProfileAction")}
                </Button>
              }
            />

            <ProfileHero cover={<ProfileCover categories={history.categories} />} identity={<Identity history={history} />} />

            <section className="mt-2 flex min-w-0 flex-col lg:mt-4">
              {/* Line tabs: the chosen one in full ink on a 2px rule. */}
              <div
                aria-label={t("tabsLabel")}
                className="flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none] md:gap-8 lg:gap-10"
                role="tablist"
              >
                {TABS.map((key) => (
                  <Button
                    aria-controls={`profile-panel-${key}`}
                    aria-selected={tab === key}
                    className={cn(
                      "relative h-12 shrink-0 rounded-none border-0 px-0 text-base font-medium hover:bg-transparent focus-visible:ring-inset lg:h-14 lg:text-frame-body",
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full",
                      // The chosen tab semibold, the rest regular.
                      tab === key
                        ? "text-foreground after:bg-foreground hover:text-foreground lg:font-semibold"
                        : "text-muted-foreground hover:text-foreground lg:font-normal",
                    )}
                    id={`profile-tab-${key}`}
                    key={key}
                    onClick={() => setTab(key)}
                    onKeyDown={onTabKey}
                    role="tab"
                    tabIndex={tab === key ? 0 : -1}
                    type="button"
                    variant="ghost"
                  >
                    {t(TAB_LABEL[key] as "tabBookings")}
                  </Button>
                ))}
              </div>

              <div
                aria-labelledby={`profile-tab-${tab}`}
                className="pt-5 lg:pt-8"
                id={`profile-panel-${tab}`}
                role="tabpanel"
              >
                {tab === "bookings" ? <BookingsPanel history={history} now={now} /> : null}
                {tab === "experts" ? <ExpertsPanel history={history} /> : null}
                {tab === "reviews" ? <ReviewsPanel history={history} /> : null}
                {tab === "about" ? <AboutPanel /> : null}
              </div>
            </section>

            {/* The rail's destinations, for the phone that has no rail. Log
                out is not among them: it lives in the settings. */}
            <LinkList className="mt-4 lg:hidden" label={t("menuLabel")} rows={menu} />
          </div>
        </AccountShell>
      </ScreenBody>
      </AppFrame>
      <BottomBar className="lg:hidden" role="user" selected="user" />
      {overlay}
    </MobileScreen>
  );
}
