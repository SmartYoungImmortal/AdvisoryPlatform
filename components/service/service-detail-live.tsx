"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Star } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { Paginated } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import {
  bookSlot,
  getAdvisor,
  getAdvisorRatingSummary,
  getService,
  listAdvisorReviews,
  listServiceSlots,
} from "@/lib/api/resources";
import type {
  ApiPublicAdvisor,
  ApiPublicService,
  ApiRatingSummary,
  ApiReview,
  ApiSlot,
} from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useLiveCatalogue, type LiveService } from "@/lib/catalogue/live";
import { addDays, baht, isoDay, liveAdvisorHref } from "@/components/bookings/booking-flow";
import { authPill } from "@/components/auth/auth-split";
import { SiteFooter } from "@/components/marketing/site-footer";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { ApiErrorCard } from "@/components/service/parts";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * `/service/…?serviceId=<uuid>`: one service, read from the API, and the place
 * it is booked.
 *
 * Laid out the way fastwork's seller showcase (`fastwork.com/selling`) lays
 * out a profile, applied to a service: on the left the advisor's face beside
 * the service's name, a line about it and a box of four figures; on the right
 * the cover as a wide band with the topics under it; then tabs (book a time,
 * reviews, about the advisor) beside a rail of the advisor's other services.
 * Only what the API knows is shown: there is no sales count or online status
 * behind a service, so neither is drawn.
 *
 * The cover and the advisor's face come from the live catalogue (the same
 * cached `GET /services` + `GET /advisors` the search page reads), since the
 * service response has no image of its own.
 *
 * Booking: `GET /services/:id/slots` (a session is required, and a screened
 * service answers 400 until the screening is accepted), then `POST /bookings`,
 * which holds the slot as `PENDING_PAYMENT` and opens the checkout; a slot
 * taken meanwhile answers 409 and goes to `/checkout/slot-taken`.
 */

/** Seven days is the window the booking tab offers, from today. */
const SLOT_WINDOW_DAYS = 7;

type Tab = "book" | "reviews" | "about";

/**
 * The advisor's score, or undefined when nothing has been scored: `average`
 * is `null`, not 0, while `total` is 0, and a zero would read as the lowest
 * score. One fetch however many blocks ask (`useResource` is keyed by request).
 */
function useRatingSummary(advisorId: string): ApiRatingSummary | undefined {
  const fetcher = useCallback(
    (signal: AbortSignal) => getAdvisorRatingSummary(advisorId, signal),
    [advisorId],
  );
  const { data } = useResource<ApiRatingSummary>(`advisors/${advisorId}/reviews/summary`, fetcher);
  return data && data.average !== null && data.total > 0 ? data : undefined;
}

/** The public advisor (`GET /advisors/:id`), shared by every block that asks. */
function useAdvisor(advisorId: string): ApiPublicAdvisor | undefined {
  const fetcher = useCallback((signal: AbortSignal) => getAdvisor(advisorId, signal), [advisorId]);
  return useResource<ApiPublicAdvisor>(`advisors/${advisorId}`, fetcher).data;
}

/** The advisor's face from the catalogue, or their initial. */
function Face({ item, name, className }: { readonly item?: LiveService; readonly name: string; readonly className: string }) {
  if (item?.face) return <Image alt="" className={cn(className, "rounded-full object-cover")} src={item.face} />;
  return (
    <span
      aria-hidden
      className={cn(className, "flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground")}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/* ---------------------------------------------------------------- booking */

/**
 * What the booking tab shows instead of times: loading, and each answer the
 * slots route gives other than a list. Signed out (401) asks to sign in, a
 * screened service (400) points at its questions, anything else can retry.
 */
function SlotsNotice({
  error,
  onRetry,
  serviceId,
}: {
  readonly error: Error | null;
  readonly onRetry: () => void;
  readonly serviceId: string;
}) {
  const t = useTranslations("service");
  const sc = useTranslations("screening");
  const pill = cn(authPill(true), "w-full sm:w-auto sm:px-8");
  if (!error) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        <span className="h-14 animate-pulse rounded-xl bg-muted" />
        <span className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("signInForSlots")}</p>
        <Button className={pill} nativeButton={false} render={<Link href="/login" />}>
          {t("signIn")}
        </Button>
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 400) {
    return (
      <Button className={pill} nativeButton={false} render={<Link href={`/screening/questions?serviceId=${serviceId}`} />}>
        {sc("answerTitle")}
      </Button>
    );
  }
  return <ApiErrorCard error={error} onRetry={onRetry} title={t("slotsTitle")} />;
}

/**
 * The week as seven days (a day with nothing open is shown, and cannot be
 * chosen, so the week reads as a week), that day's times, and the button that
 * books the chosen one. The API's other answers each get their own state:
 * signed out (401) asks to sign in, a screened service (400) points at its
 * questions, and an empty week says so plainly.
 */
function BookingPicker({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const format = useFormatter();
  const router = useRouter();
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
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
    (signal: AbortSignal) => listServiceSlots(serviceId, { from: range.from, to: range.to }, signal),
    [serviceId, range],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `services/${serviceId}/slots?from=${range.from}&to=${range.to}`,
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
  const selected = day && byDay.has(day) ? day : firstOpen;
  const hour = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });

  const book = () => {
    if (!time) return;
    setBooking(true);
    setFailure(null);
    void bookSlot({ serviceId, startTime: time })
      .then((created) => router.push(`/checkout/card?bookingId=${created.id}`))
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 409) {
          router.push(`/checkout/slot-taken?startTime=${encodeURIComponent(time)}&serviceId=${serviceId}`);
          return;
        }
        setFailure(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setBooking(false));
  };

  if (slots.loading || slots.error) {
    return <SlotsNotice error={slots.error} onRetry={slots.reload} serviceId={serviceId} />;
  }
  if (selected === null) return <p className="text-sm text-muted-foreground">{t("noSlots")}</p>;

  let label = t("pickTimeFirst");
  if (booking) label = t("booking");
  else if (time) label = t("bookAt", { time: hour(time) });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("pickDay")}</span>
        {/* Seven equal columns: the whole week fits, nothing scrolls off it. */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {range.week.map((key) => {
            const date = new Date(`${key}T00:00:00`);
            const open = byDay.has(key);
            const active = key === selected;
            return (
              <Button
                aria-pressed={active}
                className={cn(
                  "h-auto flex-col gap-0 rounded-xl px-0 py-2 shadow-none",
                  active
                    ? "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
                    : "border-border bg-card",
                )}
                disabled={!open}
                key={key}
                onClick={() => {
                  setDay(key);
                  setTime(null);
                }}
                variant="outline"
              >
                <span className="text-2xs font-normal sm:text-xs">{format.dateTime(date, { weekday: "short" })}</span>
                <span className="font-latin text-sm font-semibold tabular-nums sm:text-base">{date.getDate()}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("pickHour")}</span>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5">
          {(byDay.get(selected) ?? []).map((slot) => {
            const active = slot.startTime === time;
            return (
              <Button
                aria-pressed={active}
                className={cn(
                  "h-10 rounded-xl px-0 shadow-none",
                  active
                    ? "border-foreground bg-card ring-1 ring-foreground hover:bg-card"
                    : "border-border bg-card hover:border-foreground/40",
                )}
                key={slot.startTime}
                onClick={() => setTime(slot.startTime)}
                variant="outline"
              >
                <span className="font-latin text-sm font-medium tabular-nums">{hour(slot.startTime)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button
          aria-busy={booking || undefined}
          className={cn(authPill(true), "w-full sm:w-auto sm:min-w-56 sm:px-8")}
          disabled={!time || booking}
          onClick={book}
          type="button"
        >
          {label}
        </Button>
        <p className="text-center text-xs text-muted-foreground sm:text-left">{t("pickTimeHint")}</p>
      </div>
      {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- the tabs */

/** The advisor's reviews (there is no per-service review route). */
function ReviewsPanel({ advisorId }: { readonly advisorId: string }) {
  const t = useTranslations("service");
  const format = useFormatter();
  const fetcher = useCallback(
    (signal: AbortSignal) => listAdvisorReviews(advisorId, { limit: 6 }, signal),
    [advisorId],
  );
  const reviews = useResource<Paginated<ApiReview>>(`advisors/${advisorId}/reviews?limit=6`, fetcher);
  const items = reviews.data?.items ?? [];
  if (reviews.loading) return <span aria-hidden className="block h-24 animate-pulse rounded-xl bg-muted" />;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t("noReviewsYet")}</p>;

  return (
    <ul className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
      {items.map((review) => (
        <li className="flex flex-col gap-2" key={review.appointmentId}>
          <span className="text-sm font-medium text-foreground">{review.reviewerDisplayName}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-label={`${review.stars}/5`} className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  aria-hidden
                  className={cn("size-3", i < review.stars ? "fill-foreground text-foreground" : "text-border")}
                  key={i}
                />
              ))}
            </span>
            {format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}
          </span>
          {review.comment ? <p className="text-sm leading-6 text-foreground">{review.comment}</p> : null}
          <span className="text-xs text-muted-foreground">{review.serviceName}</span>
        </li>
      ))}
    </ul>
  );
}

/** The advisor in their own words, what they work on, and their profile. */
function AboutPanel({ advisor, advisorId }: { readonly advisor?: ApiPublicAdvisor; readonly advisorId: string }) {
  const t = useTranslations("service");
  if (!advisor) return <span aria-hidden className="block h-24 animate-pulse rounded-xl bg-muted" />;
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-base font-medium text-foreground">{advisor.headline}</p>
      {advisor.bio ? <p className="text-sm leading-7 text-muted-foreground">{advisor.bio}</p> : null}
      <Link
        className="self-start text-sm font-semibold text-foreground underline underline-offset-4"
        href={liveAdvisorHref(advisorId)}
      >
        {t("viewProfile")}
      </Link>
    </div>
  );
}

/** fastwork's "Services" rail: the advisor's other services as small rows. */
function ServicesRail({ advisorId, serviceId }: { readonly advisorId: string; readonly serviceId: string }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const catalogue = useLiveCatalogue();
  const items = catalogue.items.filter((item) => item.advisorId === advisorId && item.id !== serviceId);
  if (items.length === 0) return null;

  return (
    <aside className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("relatedTitle")}</h2>
        <Link className="text-sm font-medium text-foreground hover:underline hover:underline-offset-4" href={liveAdvisorHref(advisorId)}>
          {t("viewAll")}
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.slice(0, 4).map((item) => (
          <li key={item.id}>
            <Link
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-[box-shadow,border-color] hover:border-foreground/20 hover:shadow-hero-card"
              href={item.href}
            >
              <span className="w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image alt="" className="aspect-[4/3] w-full object-cover" src={item.cover} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.title}</span>
                <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  <span className="font-latin font-semibold text-foreground tabular-nums">
                    {format.number(item.price, { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
                  </span>
                  <span aria-hidden>·</span>
                  {item.reviews > 0 && item.rating ? (
                    <span className="flex items-center gap-1">
                      <Star aria-hidden className="size-3.5 fill-foreground text-foreground" />
                      <span className="font-latin tabular-nums">{item.rating.toFixed(1)}</span>
                      <span className="tabular-nums">({item.reviews})</span>
                    </span>
                  ) : (
                    <span>{s("noReviews")}</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* ------------------------------------------------------------------ screen */

/** The frame every state shares: the docking bar over the 1710 column. */
function Frame({ children }: { readonly children: React.ReactNode }) {
  return (
    <MobileScreen className="pb-0" wide="md">
      <ScreenBody className="bg-card">
        <TopBar dock unreadNotifications />
        <div className="doc-scale mx-auto flex w-full max-w-310 flex-1 flex-col px-5 pt-3 pb-28 md:px-12 md:pt-4 lg:px-8 lg:pt-6 lg:pb-24">
          {children}
        </div>
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}

/** One figure in the stats box: a value over its label. */
function Stat({ value, label }: { readonly value: React.ReactNode; readonly label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
      <strong className="font-latin text-base font-semibold whitespace-nowrap text-foreground tabular-nums md:text-lg">
        {value}
      </strong>
      <span className="text-xs whitespace-nowrap text-muted-foreground">{label}</span>
    </div>
  );
}

export function LiveServiceDetailScreen({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const sc = useTranslations("screening");
  const format = useFormatter();
  const catalogue = useLiveCatalogue();
  const [tab, setTab] = useState<Tab>("book");

  const fetcher = useCallback((signal: AbortSignal) => getService(serviceId, signal), [serviceId]);
  const service = useResource<ApiPublicService>(`services/${serviceId}`, fetcher);
  const advisorId = service.data?.advisorId ?? "none";
  const item = catalogue.items.find((entry) => entry.id === serviceId);
  const rating = useRatingSummary(advisorId);
  const advisor = useAdvisor(advisorId);

  if (service.loading) {
    return (
      <Frame>
        <div aria-hidden className="grid gap-8 pt-8 lg:grid-cols-2">
          <span className="flex flex-col gap-3">
            <span className="h-9 w-4/5 animate-pulse rounded-md bg-muted" />
            <span className="h-16 w-full animate-pulse rounded-md bg-muted" />
          </span>
          <span className="aspect-[7/2] w-full animate-pulse rounded-2xl bg-muted" />
        </div>
      </Frame>
    );
  }
  if (service.error || !service.data) {
    return (
      <Frame>
        <ApiErrorCard
          error={service.error ?? new Error(t("notFoundBody"))}
          onRetry={service.reload}
          title={t("notFoundTitle")}
        />
      </Frame>
    );
  }

  const live = service.data;
  const price = format.number(baht(live.priceSatang), "baht");
  const name = item?.advisorName ?? advisor?.displayName ?? "";
  const tags = [...new Set([item?.category, ...(advisor?.skills ?? [])].filter(Boolean))].slice(0, 4);
  const reviewsLabel = rating?.total ? `${t("tabReviews")} (${rating.total})` : t("tabReviews");
  const openBooking = () => {
    setTab("book");
    document.getElementById("service-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Frame>
        <Link
          className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
          href="/search"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t("back")}
        </Link>

        {/* The showcase head: who and what on the left, the cover on the right. */}
        <div className="grid items-start gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:pt-8">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("crumb", { name })}</p>
            <div className="flex items-start gap-4 md:gap-5">
              <Link className="shrink-0" href={liveAdvisorHref(live.advisorId)}>
                <Face className="size-16 text-xl md:size-22" item={item} name={name} />
              </Link>
              <div className="flex min-w-0 flex-col gap-2">
                <h1 className="font-hero text-2xl leading-tight font-normal tracking-tight text-hero-ink md:text-3xl lg:text-4xl">
                  {live.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  <Link className="font-medium text-foreground underline underline-offset-4" href={liveAdvisorHref(live.advisorId)}>
                    {name}
                  </Link>
                  {advisor?.headline ? ` · ${advisor.headline}` : null}
                </p>
              </div>
            </div>
            {live.description ? (
              <p className="text-base leading-7 text-muted-foreground lg:pl-27">{live.description}</p>
            ) : null}
            {live.trialEnabled && live.trialDurationMinutes !== null ? (
              <p className="text-sm text-muted-foreground lg:pl-27">
                {sc("trialLabel")} {s("durationMinutes", { count: live.trialDurationMinutes })}
              </p>
            ) : null}
            {/* fastwork's figures box, with the four this service actually has. */}
            <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border px-3 py-4 md:inline-grid md:w-auto md:gap-10 md:self-start md:px-6 lg:ml-27">
              <Stat label={t("statPrice")} value={price} />
              <Stat label={t("statLength")} value={s("durationMinutes", { count: live.durationMinutes })} />
              <Stat label={t("statRating")} value={rating?.average ? `★${rating.average.toFixed(1)}` : "–"} />
              <Stat label={t("statReviews")} value={rating?.total ?? 0} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {item ? (
              <span className="overflow-hidden rounded-2xl bg-muted shadow-hero-card">
                <Image alt="" className="aspect-[16/9] w-full object-cover lg:aspect-[7/3]" priority src={item.cover} />
              </span>
            ) : null}
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li className="rounded-full border border-border px-3 py-1 text-xs text-foreground" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* Tabs on the left, the advisor's other services in a rail beside them. */}
        <Tabs
          className="mt-10 scroll-mt-28 gap-0 lg:mt-14"
          id="service-tabs"
          onValueChange={(value) => setTab(value as Tab)}
          value={tab}
        >
          <TabsList className="h-auto w-full justify-start gap-6 border-b border-border p-0 md:gap-8" variant="line">
            {(
              [
                ["book", t("tabBook")],
                ["reviews", reviewsLabel],
                ["about", t("tabAbout")],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                className="h-11 flex-none rounded-none px-0 text-base font-normal data-active:font-semibold md:text-lg"
                key={value}
                value={value}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid items-start gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14">
            <div className="min-w-0">
              <TabsContent value="book">
                <div className="flex flex-col gap-5">
                  <BookingPicker serviceId={live.id} />
                  <Link
                    className="flex items-center gap-2 self-start text-sm font-medium text-foreground hover:underline hover:underline-offset-4"
                    href={`/chat/${live.advisorId}`}
                  >
                    <MessageSquare aria-hidden className="size-4" />
                    {t("message")}
                  </Link>
                </div>
              </TabsContent>
              <TabsContent value="reviews">
                <ReviewsPanel advisorId={live.advisorId} />
              </TabsContent>
              <TabsContent value="about">
                <AboutPanel advisor={advisor} advisorId={live.advisorId} />
              </TabsContent>
            </div>
            <ServicesRail advisorId={live.advisorId} serviceId={live.id} />
          </div>
        </Tabs>
      </Frame>

      {/* The phone keeps the price and the way to the times in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-border bg-card px-5 py-3 lg:hidden">
        <span className="flex min-w-0 flex-col">
          <span className="font-latin text-base font-bold text-foreground tabular-nums">{price}</span>
          <span className="text-xs text-muted-foreground">{s("perSession", { minutes: live.durationMinutes })}</span>
        </span>
        <Button className={cn(authPill(true), "ml-auto w-auto px-6")} onClick={openBooking} type="button">
          {t("pickTime")}
        </Button>
      </div>
    </>
  );
}
