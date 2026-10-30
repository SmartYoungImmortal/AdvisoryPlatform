"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CircleAlert,
  ClipboardList,
  MessageCircle,
  RotateCw,
  X,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { bookSlot, listServiceSlots } from "@/lib/api/resources";
import type { ApiPublicService, ApiServicePackage, ApiSlot } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useSession } from "@/lib/session";
import { authPill } from "@/components/auth/auth-split";
import { baht, isoDay, liveServiceHref } from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The page's pills at desktop size. The desktop is drawn in 1710 space and
 * zoomed down (`app-scale`, ×0.84 at 1440), so the capsule `authPill` gives
 * a tablet reads small there: from `lg` it is the advisor profile's pill,
 * 47.5 tall (40 on the screen) with the frame's body step for its label.
 */
export const PILL_LG = "lg:h-[47.5px] lg:gap-[14.25px] lg:px-[23.75px] lg:text-frame-body";

/**
 * What is being booked, held by the page rather than by a picker: the
 * package whose page is open, the day, and a time of one package on that
 * day. A time belongs to a package (the panel lists every package's times
 * for the day), so taking one sets both.
 */
export type Selection = {
  /** The package looked at or booked; null before one is (the first is then the one shown). */
  readonly packageId: string | null;
  readonly day: string | null;
  readonly time: string | null;
  /** A day, with no time taken on it yet. */
  readonly pick: (day: string) => void;
  /** A package's page; keeps the day, drops a time taken in another package. */
  readonly choose: (packageId: string) => void;
  /** A time of a package on a day: the booking the button makes. */
  readonly take: (packageId: string | null, day: string, time: string) => void;
  readonly clearTime: () => void;
};

type Choice = { readonly packageId: string | null; readonly day: string | null; readonly time: string | null };

export function useSelection(): Selection {
  const [choice, setChoice] = useState<Choice>({ packageId: null, day: null, time: null });
  const pick = useCallback((day: string) => setChoice((current) => ({ ...current, day, time: null })), []);
  const choose = useCallback(
    (packageId: string) =>
      setChoice((current) => (current.packageId === packageId ? current : { ...current, packageId, time: null })),
    [],
  );
  const take = useCallback(
    (packageId: string | null, day: string, time: string) => setChoice({ packageId, day, time }),
    [],
  );
  const clearTime = useCallback(() => setChoice((current) => ({ ...current, time: null })), []);
  return { ...choice, pick, choose, take, clearTime };
}

/**
 * The package being looked at: the one chosen, else the first offered; null
 * for a service sold as itself.
 */
export function chosenPackage(service: ApiPublicService, selection: Selection): ApiServicePackage | null {
  const packages = service.packages ?? [];
  return packages.find((item) => item.id === selection.packageId) ?? packages[0] ?? null;
}

/**
 * What a price line quotes: the package chosen; before one is, the cheapest
 * "from" (no length, as the packages differ in it); a service sold as itself,
 * its own price and length.
 */
function quote(service: ApiPublicService, selection: Selection) {
  const packages = service.packages ?? [];
  const chosen = packages.find((item) => item.id === selection.packageId);
  if (chosen) return { priceSatang: chosen.priceSatang, durationMinutes: chosen.durationMinutes, from: false };
  if (packages.length > 0) {
    return { priceSatang: Math.min(...packages.map((item) => item.priceSatang)), durationMinutes: null, from: true };
  }
  return { priceSatang: service.priceSatang, durationMinutes: service.durationMinutes, from: false };
}

/** The photograph a package wears: the service's photographs dealt out to the packages in turn. */
function packagePhoto(service: ApiPublicService, photos: readonly string[], pack: ApiServicePackage): string | null {
  if (photos.length === 0) return null;
  const index = (service.packages ?? []).findIndex((item) => item.id === pack.id);
  return photos[Math.max(index, 0) % photos.length];
}

/**
 * The two layers the booking opens, held by the page: a package's own page,
 * and over it the panel of times. A package's card opens the first; its
 * button, the price card and the phone's bar open the second (over the
 * first when it is open). Both are dialogs from `lg` and sheets below it,
 * decided when the first of them opens.
 */
export type Picker = {
  readonly surface: "dialog" | "sheet";
  readonly detail: boolean;
  readonly times: boolean;
  readonly showDetail: () => void;
  readonly showTimes: () => void;
  readonly setDetail: (open: boolean) => void;
  readonly setTimes: (open: boolean) => void;
};

function surfaceNow(): "dialog" | "sheet" {
  return globalThis.matchMedia("(min-width: 1024px)").matches ? "dialog" : "sheet";
}

export function usePicker(): Picker {
  const [layers, setLayers] = useState<{ surface: "dialog" | "sheet"; detail: boolean; times: boolean }>({
    surface: "dialog",
    detail: false,
    times: false,
  });
  const showDetail = useCallback(() => setLayers({ surface: surfaceNow(), detail: true, times: false }), []);
  const showTimes = useCallback(
    () => setLayers((current) => ({ surface: current.detail ? current.surface : surfaceNow(), detail: current.detail, times: true })),
    [],
  );
  const setDetail = useCallback((open: boolean) => setLayers((current) => ({ ...current, detail: open })), []);
  const setTimes = useCallback((open: boolean) => setLayers((current) => ({ ...current, times: open })), []);
  return { ...layers, showDetail, showTimes, setDetail, setTimes };
}

/** Who the booking is with, for the lines that name them. */
type Party = {
  readonly service: ApiPublicService;
  readonly advisorName: string;
};

/** What the layers are handed: the party, the choice, the picker, and the photographs the packages wear. */
type LayerProps = Party & {
  readonly selection: Selection;
  readonly picker: Picker;
  readonly photos: readonly string[];
};

/** The light, blurred page under the booking's layers. */
const OVERLAY = "bg-accented/40 supports-backdrop-filter:backdrop-blur-sm";

/** The way out of the panel that is a link: messaging the advisor. */
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

/**
 * A state shown instead of content: a glyph in the soft grey circle, a
 * sentence, an action. Flat on its ground, the way the notification feed
 * draws its empty state: inside the panel a tinted box was a box in a box.
 */
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
    <div className={cn("flex flex-col items-center gap-3 px-2 py-4 text-center lg:gap-4 lg:py-6", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground lg:size-13">
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
 * What the panel shows instead of times, for each answer the slots route
 * gives other than a list. Signed out (401) asks to sign in and comes back
 * here afterwards, a screened service (400) points at its questions,
 * anything else is the API's own sentence with a retry.
 */
function SlotsNotice({
  error,
  onRetry,
  service,
  advisorName,
}: Party & {
  readonly error: Error;
  readonly onRetry: () => void;
}) {
  const t = useTranslations("service");
  const pill = cn(authPill(true), "w-full", PILL_LG);

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
 * Booking a taken time: `POST /bookings` holds the slot as `PENDING_PAYMENT`
 * and opens the checkout. A slot taken meanwhile (409) goes to
 * `/checkout/slot-taken`; a time the route offered but the booking refused
 * (400: the rules moved under it) reads the times again (`onRejected`) and
 * says so, for another to be taken. Nothing is charged here.
 */
function useBook(serviceId: string, onRejected: () => void) {
  const t = useTranslations("service");
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const book = (time: string, packageId: string | null) => {
    setBooking(true);
    setFailure(null);
    void bookSlot({ serviceId, startTime: time, packageId: packageId ?? undefined })
      .then((created) => router.push(`/checkout/card?bookingId=${created.id}`))
      .catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 409) {
          router.push(`/checkout/slot-taken?startTime=${encodeURIComponent(time)}&serviceId=${serviceId}`);
          return;
        }
        if (cause instanceof ApiError && cause.status === 400) {
          onRejected();
          setFailure(t("bookingSelectionRejected"));
          return;
        }
        setFailure(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setBooking(false));
  };
  return { booking, failure, book };
}

/**
 * Whether the signed-in account is the advisor of this service. Every account
 * can book (an advisor is an advisee too), but not their own service: the API
 * refuses that booking (`selfBooking`), so the panel says whose it is instead
 * of offering times that cannot be taken.
 */
function useOwnService(advisorId: string): boolean {
  const session = useSession();
  return session.status === "authenticated" && session.account.id === advisorId;
}

/** The panel on the advisor's own service: whose it is, and the way to manage it. */
function OwnNotice() {
  const t = useTranslations("service");
  return (
    <Notice
      action={
        <Button
          className={cn(authPill(), "w-auto px-6", PILL_LG)}
          nativeButton={false}
          render={<Link href="/advisor/services" />}
          variant="outline"
        >
          {t("manageService")}
        </Button>
      }
      icon={BadgeCheck}
    >
      <span className="block font-medium">{t("ownService")}</span>
      <span className="block text-muted-foreground">{t("ownServiceHint")}</span>
    </Notice>
  );
}

/**
 * The desktop's price card, docked at the foot of the column that rides
 * beside the page: on the screen's bottom edge, round at the top (24) and
 * barely at the bottom (6), lifted on a shadow rather than drawn round with a
 * line. The price of the session (the chosen package's, or "from" the
 * cheapest before one is chosen) and the button that opens the panel of
 * times.
 */
export function BookingCard({
  service,
  selection,
  picker,
}: {
  readonly service: ApiPublicService;
  readonly selection: Selection;
  readonly picker: Picker;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;
  const quoted = quote(service, selection);

  return (
    <div className="flex items-center justify-between gap-[19px] rounded-t-[28.5px] rounded-b-[7.125px] bg-card py-[23.75px] pr-[23.75px] pl-9.5 text-left shadow-panel">
      <div className="flex min-w-0 flex-col gap-[2.375px]">
        <p className="flex flex-wrap items-baseline gap-x-[4.75px]">
          {quoted.from ? <span className="text-frame-label text-muted-foreground">{t("priceFrom")}</span> : null}
          <span className="font-latin text-frame-figure leading-[1.33] font-medium text-foreground tabular-nums">
            {format.number(baht(quoted.priceSatang), "baht")}
          </span>
          {quoted.durationMinutes === null ? null : (
            <span className="text-frame-label text-muted-foreground">
              {t("priceUnit", { duration: s("durationMinutes", { count: quoted.durationMinutes }) })}
            </span>
          )}
        </p>
        {/* The line in the accent under the price, and only what holds for
            this booking: the free trial when the service has one, otherwise
            the payment held until the session ends. */}
        <p className="text-frame-label font-medium text-primary">
          {trial ? t("trialFree", { minutes: trial }) : t("trustEscrow")}
        </p>
      </div>
      <Button
        // `lg:` like `PILL_LG`: unprefixed, tailwind-merge reads `text-frame-body`
        // as a colour and drops the capsule's white ink. The card is `lg` only.
        className={cn(authPill(true), "w-auto shrink-0 lg:h-[61.75px] lg:px-[28.5px] lg:text-frame-figure lg:font-medium")}
        onClick={picker.showTimes}
        type="button"
      >
        {t("pickTime")}
      </Button>
    </div>
  );
}

/**
 * The phone's price, floating over the foot of the page: a white capsule 16
 * off the bottom edge and 24 in from the sides (centred and capped from the
 * portrait tablet), the price "from" the cheapest package with the accent
 * line under it, and the button that opens the panel of times. Up to the
 * portrait tablet; the desktop has the price card.
 */
export function BookingBar({
  service,
  selection,
  picker,
}: {
  readonly service: ApiPublicService;
  readonly selection: Selection;
  readonly picker: Picker;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;
  const quoted = quote(service, selection);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-6 md:px-12 lg:hidden">
      <div className="pointer-events-auto flex h-[70px] w-full max-w-xl items-center justify-between gap-3 rounded-full bg-card py-2 pr-2 pl-5 shadow-float">
        <div className="flex min-w-0 flex-col">
          <p className="flex flex-wrap items-baseline gap-x-1 text-base font-medium text-foreground">
            {quoted.from ? <span>{t("priceFrom")}</span> : null}
            <span className="font-latin tabular-nums">{format.number(baht(quoted.priceSatang), "baht")}</span>
            {quoted.durationMinutes === null ? null : (
              <span className="text-xs font-normal text-muted-foreground">
                {t("priceUnit", { duration: s("durationMinutes", { count: quoted.durationMinutes }) })}
              </span>
            )}
          </p>
          <p className="truncate text-xs font-medium text-primary">
            {trial ? t("trialFree", { minutes: trial }) : t("trustEscrow")}
          </p>
        </div>
        <Button className={cn(authPill(true), "h-13.5 w-auto shrink-0 px-6 md:h-13.5")} onClick={picker.showTimes} type="button">
          {t("pickTime")}
        </Button>
      </div>
    </div>
  );
}

/**
 * A package's own page on the desktop: a dialog 1032 by 532 on the screen
 * at 1440 (drawn here at ×1.1875), 32 round, on the light blurred page. The
 * package's photograph down its left, 500 square and 16 round, sliding up
 * or down to the next package's; the name, the price and the description
 * centred beside it, and the button that opens the times at its foot. The
 * packages' photographs stand in a column outside its left edge, 56 square
 * and 12 apart, 44 off it, the open one ringed.
 */
function PackageDialog({
  service,
  photos,
  selection,
  picker,
  children,
}: Omit<LayerProps, "advisorName"> & { readonly children?: ReactNode }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const c = useTranslations("common");
  const format = useFormatter();
  const packages = service.packages ?? [];
  const pack = chosenPackage(service, selection);
  const index = Math.max(
    packages.findIndex((item) => item.id === pack?.id),
    0,
  );
  const rail = packages.length > 1;

  return (
    <Dialog
      // The panel of times opens inside this one; while it is up, a press
      // outside it closes it and leaves this page standing.
      onOpenChange={(open) => {
        if (open || !picker.times) picker.setDetail(open);
      }}
      open={picker.surface === "dialog" && picker.detail}
    >
      <DialogContent
        className={cn(
          "block w-auto max-w-none gap-0 overflow-visible rounded-[32px] bg-card p-0 text-foreground shadow-dialog ring-0 sm:max-w-none",
          // 43 to the right on the screen at 1440 (in the page's zoom), about
          // half the column and its gap, so the two read as one centred.
          rail && "left-[calc(50%_+_51.0625px_*_tan(atan2(min(100vw,1440px),1710px)))]",
        )}
        overlayClassName={OVERLAY}
        showCloseButton={false}
      >
        {pack ? (
          <div className="app-scale relative grid h-[631.75px] w-[1225.5px] grid-cols-[593.75px_minmax(0,1fr)] p-[19px]">
            {rail ? (
              <fieldset className="absolute top-1/2 right-full mr-[52.25px] flex -translate-y-1/2 flex-col gap-[14.25px]">
                <legend className="sr-only">{t("packagesTitle")}</legend>
                {packages.map((item) => {
                  const photo = packagePhoto(service, photos, item);
                  const active = item.id === pack.id;
                  return (
                    <Button
                      aria-label={item.name}
                      aria-pressed={active}
                      className={cn(
                        "size-[66.5px] rounded-[19px] p-[4.75px] hover:bg-transparent",
                        active ? "bg-card ring-2 ring-foreground hover:bg-card" : "bg-transparent",
                      )}
                      key={item.id}
                      onClick={() => selection.choose(item.id)}
                      type="button"
                      variant="ghost"
                    >
                      <span className="relative block size-full overflow-hidden rounded-[14.25px] bg-muted">
                        {photo ? <Image alt="" className="object-cover" fill sizes="64px" src={photo} /> : null}
                      </span>
                    </Button>
                  );
                })}
              </fieldset>
            ) : null}

            <div className="relative overflow-hidden rounded-[19px] bg-muted">
              <div
                className="flex flex-col gap-[57px] transition-transform duration-500 ease-out motion-reduce:transition-none"
                style={{ transform: `translateY(${index * -650.75}px)` }}
              >
                {packages.map((item) => {
                  const photo = packagePhoto(service, photos, item);
                  return (
                    <span className="relative block h-[593.75px] shrink-0 overflow-hidden rounded-[19px] bg-muted" key={item.id}>
                      {photo ? <Image alt="" className="object-cover" fill sizes="500px" src={photo} /> : null}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="relative min-w-0">
              {/* Centred a step below the middle, the button's height above
                  the foot; the description keeps its box however long it is. */}
              <div className="absolute inset-x-9.5 top-[calc(50%+19px)] flex -translate-y-1/2 flex-col items-center text-center">
                <DialogTitle className="leading-[1.125] font-semibold text-balance text-foreground lg:text-frame-title">
                  {pack.name}
                </DialogTitle>
                <p className="mt-[10.6875px] text-frame-body leading-[1.375] text-muted-foreground">
                  <span className="font-latin font-semibold text-foreground tabular-nums">
                    {format.number(baht(pack.priceSatang), "baht")}
                  </span>
                  {` · ${s("durationMinutes", { count: pack.durationMinutes })}`}
                </p>
                <p className="mt-[39.1875px] h-[213.75px] w-full overflow-y-auto text-frame-meta leading-[1.43] text-pretty text-muted-foreground">
                  {pack.description}
                </p>
              </div>
              <Button
                className={cn(
                  authPill(true),
                  "absolute bottom-[28.5px] left-1/2 w-auto -translate-x-1/2 lg:h-[57px] lg:px-[28.5px] lg:text-frame-body",
                )}
                onClick={picker.showTimes}
                type="button"
              >
                {t("pickTime")}
              </Button>
            </div>

            <DialogClose
              render={
                <Button
                  aria-label={c("close")}
                  className="absolute top-[19px] right-[19px] size-9.5 rounded-full"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden className="size-[19px]" />
            </DialogClose>
          </div>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A package's own page on the phone: a sheet risen to 44 from the top, 32
 * round, the photograph the sheet's width at its head with the white close
 * on it; the name, price and description left-aligned under it; the button
 * centred 24 off the foot.
 */
function PackageSheet({
  service,
  photos,
  selection,
  picker,
  children,
}: Omit<LayerProps, "advisorName"> & { readonly children?: ReactNode }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const c = useTranslations("common");
  const format = useFormatter();
  const pack = chosenPackage(service, selection);
  const photo = pack ? packagePhoto(service, photos, pack) : null;

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open || !picker.times) picker.setDetail(open);
      }}
      open={picker.surface === "sheet" && picker.detail}
    >
      <SheetContent
        className="top-11 gap-0 overflow-hidden rounded-t-[32px] border-0 p-0 md:mx-auto md:max-w-xl"
        showCloseButton={false}
        side="bottom"
      >
        {pack ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
              <span className="relative block aspect-[402/447] w-full bg-muted">
                {photo ? <Image alt="" className="object-cover" fill sizes="(min-width: 768px) 576px, 100vw" src={photo} /> : null}
              </span>
              <div className="px-4 pt-8">
                <SheetTitle className="text-display-xs font-semibold text-foreground">{pack.name}</SheetTitle>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  <span className="font-latin font-semibold text-foreground tabular-nums">
                    {format.number(baht(pack.priceSatang), "baht")}
                  </span>
                  {` · ${s("durationMinutes", { count: pack.durationMinutes })}`}
                </p>
                {pack.description ? (
                  <p className="mt-6 text-sm leading-5 text-muted-foreground">{pack.description}</p>
                ) : null}
              </div>
            </div>
            <Button
              className={cn(authPill(true), "absolute bottom-6 left-1/2 h-13.5 w-auto -translate-x-1/2 px-6 md:h-13.5")}
              onClick={picker.showTimes}
              type="button"
            >
              {t("pickTime")}
            </Button>
            <SheetClose
              render={
                <Button
                  aria-label={c("close")}
                  className="absolute top-4 right-4 size-10 rounded-full bg-card shadow-hero-card hover:bg-card"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden className="size-5" />
            </SheetClose>
          </>
        ) : null}
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** How far ahead the panel reads: the slots route takes up to 90 days, both ends counted. */
const SLOT_DAYS = 90;

/** `YYYY-MM-DD`, `by` days on, in the viewer's calendar. */
function addDays(day: string, by: number): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + by);
  return isoDay(date);
}

/** `YYYY-MM`, `by` months on. */
function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The month's weeks, Sunday first, each cell its real date: the padding
 * cells are the neighbouring months' days (`inMonth` false), so every cell
 * has a key of its own.
 */
function monthGrid(month: string): readonly { readonly date: string; readonly inMonth: boolean }[] {
  const [year, index] = month.split("-").map(Number);
  const lead = new Date(year, index - 1, 1).getDay();
  const length = new Date(year, index, 0).getDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => {
    const date = new Date(year, index - 1, i - lead + 1);
    return { date: isoDay(date), inMonth: date.getMonth() === index - 1 };
  });
}

/** The weeks the strip pages through, Sunday first: from `first`'s week to the one holding `last`. */
function weeksBetween(first: string, last: string): readonly (readonly string[])[] {
  const weeks: string[][] = [];
  let sunday = addDays(first, -new Date(`${first}T00:00:00`).getDay());
  while (sunday <= last) {
    const start = sunday;
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
    sunday = addDays(sunday, 7);
  }
  return weeks;
}

/** The months the calendar list runs through, `YYYY-MM`, from `first`'s to `last`'s. */
function monthsBetween(first: string, last: string): readonly string[] {
  const months: string[] = [];
  for (let month = first.slice(0, 7); month <= last.slice(0, 7); month = shiftMonth(month, 1)) months.push(month);
  return months;
}

/** One row of the panel: a package (or the service itself) and its open times by day, in the viewer's zone. */
type Lane = {
  readonly pack: ApiServicePackage | null;
  readonly byDay: ReadonlyMap<string, readonly ApiSlot[]>;
};

/**
 * Every package's open times from today to the route's limit, one request
 * per package (each cut to its own length), read together: the panel lists
 * them all for the day picked, and a day is open when any of them is.
 */
function useServiceSlots(service: ApiPublicService, today: string, last: string) {
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      const packs = service.packages && service.packages.length > 0 ? service.packages : [null];
      return Promise.all(
        packs.map((pack) => listServiceSlots(service.id, { from: today, to: last, packageId: pack?.id }, signal)),
      );
    },
    [service, today, last],
  );
  const ids = (service.packages ?? []).map((item) => item.id).join(",");
  const slots = useResource<readonly (readonly ApiSlot[])[]>(
    `services/${service.id}/slots?from=${today}&to=${last}&packages=${ids}`,
    fetcher,
  );
  const { lanes, openDays } = useMemo(() => {
    const packs = service.packages && service.packages.length > 0 ? service.packages : [null];
    const open = new Set<string>();
    const built = packs.map((pack, i): Lane => {
      const days = new Map<string, ApiSlot[]>();
      for (const slot of slots.data?.[i] ?? []) {
        const key = isoDay(new Date(slot.startTime));
        open.add(key);
        const list = days.get(key);
        if (list) list.push(slot);
        else days.set(key, [slot]);
      }
      return { pack, byDay: days };
    });
    return { lanes: built, openDays: open };
  }, [service.packages, slots.data]);
  return { slots, lanes, openDays };
}

/**
 * The panel's sizes. `WIDE` is the desktop's dialog, measured at 1440 on the
 * screen and drawn here in the 1710 space (×1.1875): 568 wide, the title
 * 26/600, a week of 45 circles, each package a 64 photograph, its name 16
 * and its times six to a row, 83 by 42 and 12 round. `NARROW` is the
 * phone's sheet at its own size, the times in one row that scrolls sideways.
 * Text sizes on buttons are `lg:` in `WIDE` (the dialog is `lg` only):
 * unprefixed, tailwind-merge reads a `frame-*` step as a colour.
 */
const WIDE = {
  // The leading again: the dialog's title primitive sets `leading-none`.
  title: "px-[28.5px] pt-[61.75px] pr-19 text-frame-headline leading-[1.1538] font-semibold text-foreground",
  monthRow: "mt-9.5 flex items-center justify-between gap-[19px] px-[28.5px]",
  monthLabel: "text-frame-body leading-[1.25] font-medium text-foreground",
  calendar: "size-9.5 rounded-full",
  calendarIcon: "size-[19px]",
  weekdays: "mt-[26.125px] grid grid-cols-7 px-[19px] text-center text-frame-label font-medium text-muted-foreground",
  week: "grid w-full shrink-0 snap-start grid-cols-7 px-[19px] pt-[4.75px]",
  day: "mx-auto size-[53.4375px] rounded-full p-0 font-latin font-medium tabular-nums shadow-none disabled:opacity-100 lg:text-frame-meta",
  divider: "mx-[28.5px] mt-[19px] border-b border-border",
  lanes: "flex flex-col gap-9.5 pt-[29.6875px] pb-9.5",
  laneHead: "flex items-center gap-[19px] px-[28.5px]",
  thumb: "relative size-[76px] shrink-0 overflow-hidden rounded-[14.25px] bg-muted",
  laneName: "text-frame-body leading-[1.25] font-medium text-foreground",
  lanePrice: "mt-[4.75px] text-frame-meta leading-[1.29] text-muted-foreground",
  slots: "mt-[14.25px] grid grid-cols-6 gap-x-[4.75px] gap-y-[7.125px] px-[28.5px]",
  slot: "h-[49.875px] rounded-[14.25px] px-0 shadow-none",
  slotText: "font-latin text-frame-label font-medium tabular-nums",
  none: "mt-[14.25px] px-[28.5px] text-frame-meta text-muted-foreground",
  notice: "px-[28.5px] pt-9.5",
  footer: "flex shrink-0 items-center justify-between gap-[19px] border-t border-border px-[28.5px] py-[19px]",
  footPrice: "font-latin text-frame-figure font-medium text-foreground tabular-nums",
  footNote: "text-frame-label text-muted-foreground",
  next: "w-auto shrink-0 lg:h-[57px] lg:px-[45.125px] lg:text-frame-body",
  failure: "px-[28.5px] pb-[9.5px] text-center text-frame-meta text-destructive",
  monthHead:
    "sticky top-0 z-10 grid grid-cols-7 bg-card px-[19px] pt-[97.375px] pb-[9.5px] text-center text-frame-label font-medium text-muted-foreground",
  monthName: "px-[28.5px] pt-[28.5px] pb-[9.5px] text-frame-body font-semibold text-foreground",
  monthGrid: "grid grid-cols-7 gap-y-[2.375px] px-[19px]",
  monthDay: "mx-auto size-[47.5px] rounded-full p-0 font-latin font-medium tabular-nums shadow-none disabled:opacity-100 lg:text-frame-meta",
  monthFoot: "shrink-0 border-t border-border px-[28.5px] py-[19px]",
  monthNext: "w-full rounded-[9.5px] lg:h-[57px] lg:text-frame-body",
};

const NARROW: typeof WIDE = {
  title: "px-6 pt-13 pr-14 text-display-sm font-semibold text-foreground",
  monthRow: "mt-8 flex items-center justify-between gap-4 px-6",
  monthLabel: "text-base font-medium text-foreground",
  calendar: "size-8 rounded-full",
  calendarIcon: "size-4",
  weekdays: "mt-5.5 grid grid-cols-7 px-4 text-center text-xs font-medium text-muted-foreground",
  week: "grid w-full shrink-0 snap-start grid-cols-7 px-4 pt-1",
  day: "mx-auto size-[45px] rounded-full p-0 font-latin text-sm font-medium tabular-nums shadow-none disabled:opacity-100",
  divider: "mx-6 mt-4 border-b border-border",
  lanes: "flex flex-col gap-8 pt-6 pb-8",
  laneHead: "flex items-center gap-4 px-6",
  thumb: "relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-muted",
  laneName: "text-base leading-snug font-medium text-foreground",
  lanePrice: "mt-1 text-sm text-muted-foreground",
  slots: "mt-3 flex gap-1 overflow-x-auto overscroll-x-contain px-6",
  slot: "h-[45px] w-16 shrink-0 rounded-[12px] px-0 shadow-none",
  slotText: "font-latin text-xs font-medium tabular-nums",
  none: "mt-3 px-6 text-sm text-muted-foreground",
  notice: "px-6 pt-8",
  footer: "flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4",
  footPrice: "font-latin text-lg font-medium text-foreground tabular-nums",
  footNote: "text-xs text-muted-foreground",
  next: "w-auto shrink-0 px-6",
  failure: "px-6 pb-2 text-center text-sm text-destructive",
  // Under the close, which stays at the panel's corner over the list.
  monthHead: "sticky top-0 z-10 grid grid-cols-7 bg-card px-4 pt-18 pb-2 text-center text-xs font-medium text-muted-foreground",
  monthName: "px-6 pt-6 pb-2 text-base font-semibold text-foreground",
  monthGrid: "grid grid-cols-7 gap-y-0.5 px-4",
  monthDay: "mx-auto size-10 rounded-full p-0 font-latin text-sm font-medium tabular-nums shadow-none disabled:opacity-100",
  monthFoot: "shrink-0 border-t border-border px-6 py-4",
  monthNext: "h-12 w-full rounded-lg",
};

/** A title slot: the dialog's own on the desktop, the sheet's on the phone. */
type TitleSlot = (props: { readonly className?: string; readonly children: ReactNode }) => ReactNode;

/**
 * The panel of times, the booking's second layer. The title; the month and
 * the calendar's button; a week of days that pages sideways (the days gone
 * and the closed ones struck through, the picked one filled); then every
 * package with its photograph, its name, price and length, and its times
 * that day. Taking a time brings up the foot with its price and the button
 * that books it. The calendar's button turns the panel into the months
 * ahead, one under another, to pick a day from; its button turns it back.
 *
 * Every answer of the slots route other than a list is its notice; the
 * advisor's own service says whose it is.
 */
function Schedule({
  service,
  advisorName,
  selection,
  photos,
  sizes: S,
  Title,
}: Party & {
  readonly selection: Selection;
  readonly photos: readonly string[];
  readonly sizes: typeof WIDE;
  readonly Title: TitleSlot;
}) {
  const t = useTranslations("service");
  const format = useFormatter();
  const { dayLabel, hour } = useCalendarFormat();
  const today = useMemo(() => isoDay(new Date()), []);
  const last = addDays(today, SLOT_DAYS - 1);
  const { slots, lanes, openDays } = useServiceSlots(service, today, last);
  const { booking, failure, book } = useBook(service.id, () => {
    selection.clearTime();
    slots.reload();
  });
  const [view, setView] = useState<"week" | "month">("week");
  const weeks = useMemo(() => weeksBetween(today, last), [today, last]);

  const firstOpen = useMemo(() => [...openDays].sort((a, b) => a.localeCompare(b))[0] ?? null, [openDays]);
  const day = selection.day && openDays.has(selection.day) ? selection.day : firstOpen;
  const taken = takenOn(lanes, selection, day);
  const calendar: Calendar = { today, day, openDays, onPick: selection.pick };

  if (view === "month") {
    return (
      <MonthList
        calendar={calendar}
        months={monthsBetween(today, last)}
        onDone={() => setView("week")}
        sizes={S}
        Title={Title}
        week={weeks[0]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Title className={S.title}>{t("book")}</Title>
        <ScheduleBody
          advisorName={advisorName}
          calendar={calendar}
          lanes={lanes}
          onCalendar={() => setView("month")}
          photos={photos}
          selection={selection}
          service={service}
          sizes={S}
          slots={slots}
          taken={taken}
          weeks={weeks}
        />
      </div>
      {failure ? (
        <p className={S.failure} role="alert">
          {failure}
        </p>
      ) : null}
      {taken ? (
        <div className={S.footer}>
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className={S.footPrice}>
              {format.number(baht(taken.lane.pack?.priceSatang ?? service.priceSatang), "baht")}
            </span>
            <span className={S.footNote}>{`${dayLabel(taken.day)} · ${hour(taken.time)}`}</span>
          </p>
          <Button
            aria-busy={booking || undefined}
            className={cn(authPill(true), S.next)}
            disabled={booking}
            onClick={() => book(taken.time, selection.packageId)}
            type="button"
          >
            {booking ? t("booking") : t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The panel under its title: whose service it is on the advisor's own, the
 * slots route's notice when it answered with anything but a list, a notice
 * when nothing is open in the 90 days, and otherwise the week and every
 * package's times on the day picked.
 */
function ScheduleBody({
  service,
  advisorName,
  selection,
  photos,
  sizes: S,
  slots,
  lanes,
  weeks,
  calendar,
  taken,
  onCalendar,
}: Party & {
  readonly selection: Selection;
  readonly photos: readonly string[];
  readonly sizes: typeof WIDE;
  readonly slots: ReturnType<typeof useServiceSlots>["slots"];
  readonly lanes: readonly Lane[];
  readonly weeks: readonly (readonly string[])[];
  readonly calendar: Calendar;
  readonly taken: Taken | null;
  readonly onCalendar: () => void;
}) {
  const t = useTranslations("service");
  const own = useOwnService(service.advisorId);
  const { day } = calendar;

  if (own) {
    return (
      <div className={S.notice}>
        <OwnNotice />
      </div>
    );
  }
  if (slots.error) {
    return (
      <div className={S.notice}>
        <SlotsNotice advisorName={advisorName} error={slots.error} onRetry={slots.reload} service={service} />
      </div>
    );
  }
  if (!slots.loading && !day) {
    return (
      <div className={S.notice}>
        <Notice action={<MessageButton advisorId={service.advisorId} />} icon={CalendarX2}>
          {t("noSlotsAhead")}
        </Notice>
      </div>
    );
  }
  return (
    <>
      <WeekStrip busy={slots.loading} calendar={calendar} onCalendar={onCalendar} sizes={S} weeks={weeks} />
      {day && !slots.loading ? (
        <div className={S.lanes}>
          {lanes.map((lane) => (
            <LaneTimes
              day={day}
              key={lane.pack?.id ?? "service"}
              lane={lane}
              photos={photos}
              selection={selection}
              service={service}
              sizes={S}
              taken={taken}
            />
          ))}
        </div>
      ) : (
        <PendingLanes count={Math.max(service.packages?.length ?? 0, 1)} sizes={S} />
      )}
    </>
  );
}

/** The day picked, what is open, and how a day is picked: what the week and the months share. */
type Calendar = {
  readonly today: string;
  readonly day: string | null;
  readonly openDays: ReadonlySet<string>;
  readonly onPick: (day: string) => void;
};

/** A time taken: its lane, its day and its start. */
type Taken = { readonly lane: Lane; readonly day: string; readonly time: string };

/** The time taken, when it is one of its package's times on the day shown; null otherwise. */
function takenOn(lanes: readonly Lane[], selection: Selection, day: string | null): Taken | null {
  const time = selection.time;
  if (!day || !time) return null;
  const lane = lanes.find(
    (item) =>
      (item.pack?.id ?? null) === selection.packageId &&
      (item.byDay.get(day) ?? []).some((slot) => slot.startTime === time),
  );
  return lane ? { lane, day, time } : null;
}

/** The calendar's words in the reader's locale: a day's date, an hour, a day, a weekday, a month. */
function useCalendarFormat() {
  const format = useFormatter();
  const locale = useLocale();
  // Thai's "short" weekday is the whole word ("อาทิตย์"), too long for a
  // seventh of the row; "narrow" is the calendar's own "อา". English keeps
  // "Sun": its narrow "S" cannot tell Saturday from Sunday.
  const weekday = locale === "th" ? "narrow" : "short";
  return useMemo(() => {
    const date = (key: string) => new Date(`${key}T00:00:00`);
    return {
      date,
      hour: (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" }),
      dayLabel: (key: string) => format.dateTime(date(key), { weekday: "short", day: "numeric", month: "short" }),
      weekdayLabel: (key: string) => format.dateTime(date(key), { weekday }),
      monthLabel: (key: string) => format.dateTime(date(key), { month: "long", year: "numeric" }),
    };
  }, [format, weekday]);
}

/**
 * One day's button: filled when picked, dark when it has open times, faded
 * (and, in the week, struck through) when it has none; ringed when it is
 * today, in the months.
 */
function DayButton({
  day,
  calendar,
  className,
  strike,
  ringToday,
}: {
  readonly day: string;
  readonly calendar: Calendar;
  readonly className: string;
  readonly strike: boolean;
  readonly ringToday: boolean;
}) {
  const t = useTranslations("service");
  const { date, dayLabel } = useCalendarFormat();
  const open = calendar.openDays.has(day);
  const chosen = day === calendar.day;
  return (
    <Button
      aria-label={open ? dayLabel(day) : t("dayClosed", { day: dayLabel(day) })}
      aria-pressed={chosen}
      className={cn(
        className,
        chosen && "bg-foreground text-background hover:bg-foreground hover:text-background",
        !chosen && open && "text-foreground hover:bg-muted",
        !open && "text-muted-foreground/50",
        !open && strike && "line-through",
        ringToday && day === calendar.today && !chosen && "ring-1 ring-foreground",
      )}
      disabled={!open}
      onClick={() => calendar.onPick(day)}
      type="button"
      variant="ghost"
    >
      {date(day).getDate()}
    </Button>
  );
}

/**
 * The month shown, the calendar's button, the weekdays, and the weeks paging
 * sideways under them. Keeps the picked day's week in view: on opening, and
 * on coming back from the months.
 */
function WeekStrip({
  weeks,
  calendar,
  busy,
  sizes: S,
  onCalendar,
}: {
  readonly weeks: readonly (readonly string[])[];
  readonly calendar: Calendar;
  readonly busy: boolean;
  readonly sizes: typeof WIDE;
  readonly onCalendar: () => void;
}) {
  const t = useTranslations("service");
  const { monthLabel, weekdayLabel } = useCalendarFormat();
  const strip = useRef<HTMLDivElement>(null);
  const [shownWeek, setShownWeek] = useState(0);
  const { day, today } = calendar;

  useEffect(() => {
    const el = strip.current;
    if (!el || !day) return;
    const index = weeks.findIndex((week) => week.includes(day));
    if (index >= 0) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" });
  }, [day, weeks]);

  const shown = weeks[shownWeek] ?? weeks[0];
  const labelDay = day && shown.includes(day) ? day : (shown.find((key) => key >= today) ?? shown[0]);

  return (
    <>
      <div className={S.monthRow}>
        <span aria-live="polite" className={S.monthLabel}>
          {monthLabel(labelDay)}
        </span>
        <Button aria-label={t("openCalendar")} className={S.calendar} onClick={onCalendar} size="icon" type="button" variant="ghost">
          <CalendarDays aria-hidden className={S.calendarIcon} />
        </Button>
      </div>
      <div aria-hidden className={S.weekdays}>
        {weeks[0].map((key) => (
          <span key={key}>{weekdayLabel(key)}</span>
        ))}
      </div>
      <div
        aria-busy={busy || undefined}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        onScroll={(event) => {
          const el = event.currentTarget;
          setShownWeek(Math.round(el.scrollLeft / el.clientWidth));
        }}
        ref={strip}
      >
        {weeks.map((week) => (
          <div className={S.week} key={week[0]}>
            {week.map((key) => (
              <span className="flex justify-center" key={key}>
                <DayButton calendar={calendar} className={S.day} day={key} ringToday={false} strike />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={S.divider} />
    </>
  );
}

/**
 * The months ahead one under another, under weekdays that stay at the top,
 * to pick a day from; the button at the foot turns the panel back to its
 * week.
 */
function MonthList({
  months,
  week,
  calendar,
  sizes: S,
  onDone,
  Title,
}: {
  readonly months: readonly string[];
  readonly week: readonly string[];
  readonly calendar: Calendar;
  readonly sizes: typeof WIDE;
  readonly onDone: () => void;
  readonly Title: TitleSlot;
}) {
  const t = useTranslations("service");
  const { monthLabel, weekdayLabel } = useCalendarFormat();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Title className="sr-only">{t("book")}</Title>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div aria-hidden className={S.monthHead}>
          {week.map((key) => (
            <span key={key}>{weekdayLabel(key)}</span>
          ))}
        </div>
        {months.map((month) => (
          <section key={month}>
            <h3 className={S.monthName}>{monthLabel(`${month}-01`)}</h3>
            <div className={S.monthGrid}>
              {monthGrid(month).map((cell) =>
                cell.inMonth ? (
                  <span className="flex justify-center" key={cell.date}>
                    <DayButton calendar={calendar} className={S.monthDay} day={cell.date} ringToday strike={false} />
                  </span>
                ) : (
                  <span aria-hidden key={cell.date} />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
      <div className={S.monthFoot}>
        <Button className={cn(authPill(true), S.monthNext)} onClick={onDone} type="button">
          {t("next")}
        </Button>
      </div>
    </div>
  );
}

/** One package (or the service itself) on the day picked: its photograph, name, price and length, and its times. */
function LaneTimes({
  lane,
  day,
  service,
  photos,
  selection,
  taken,
  sizes: S,
}: {
  readonly lane: Lane;
  readonly day: string;
  readonly service: ApiPublicService;
  readonly photos: readonly string[];
  readonly selection: Selection;
  readonly taken: Taken | null;
  readonly sizes: typeof WIDE;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const { hour } = useCalendarFormat();
  const laneId = lane.pack?.id ?? null;
  const name = lane.pack?.name ?? service.name;
  const times = lane.byDay.get(day) ?? [];
  const photo = lane.pack ? packagePhoto(service, photos, lane.pack) : (photos[0] ?? null);

  return (
    <section aria-label={name}>
      <div className={S.laneHead}>
        <span className={S.thumb}>
          {photo ? <Image alt="" className="object-cover" fill sizes="80px" src={photo} /> : null}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className={S.laneName}>{name}</h3>
          <p className={S.lanePrice}>
            <span className="font-latin font-semibold text-foreground tabular-nums">
              {format.number(baht(lane.pack?.priceSatang ?? service.priceSatang), "baht")}
            </span>
            {` · ${s("durationMinutes", { count: lane.pack?.durationMinutes ?? service.durationMinutes })}`}
          </p>
        </div>
      </div>
      {times.length > 0 ? (
        <div className={S.slots}>
          {times.map((slot) => {
            const active = taken?.lane === lane && taken.time === slot.startTime;
            return (
              <Button
                aria-pressed={active}
                className={cn(
                  S.slot,
                  active
                    ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                    : "border-border bg-card text-foreground hover:border-foreground hover:bg-card",
                )}
                key={slot.startTime}
                onClick={() => selection.take(laneId, day, slot.startTime)}
                type="button"
                variant="outline"
              >
                <span className={S.slotText}>{hour(slot.startTime)}</span>
              </Button>
            );
          })}
        </div>
      ) : (
        <p className={S.none}>{t("noTimesThatDay")}</p>
      )}
    </section>
  );
}

/** The packages' places while their times load: a photograph, a line, and a row of times. */
function PendingLanes({ count, sizes: S }: { readonly count: number; readonly sizes: typeof WIDE }) {
  return (
    <div aria-hidden className={S.lanes}>
      {Array.from({ length: count }, (_, i) => (
        <div key={`pending-${i}`}>
          <div className={S.laneHead}>
            <span className={cn(S.thumb, "animate-pulse")} />
            <span className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
          </div>
          <div className={S.slots}>
            {Array.from({ length: 6 }, (_, j) => (
              <span className={cn(S.slot, "animate-pulse border border-border bg-muted")} key={`pending-slot-${j}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The panel of times on the desktop: a dialog 568 wide on the screen at
 * 1440, 40 off the top and the bottom, 32 round; its content scrolls and its
 * foot stays.
 */
function TimesDialog({ service, advisorName, selection, picker, photos }: LayerProps) {
  const c = useTranslations("common");
  return (
    <Dialog onOpenChange={picker.setTimes} open={picker.surface === "dialog" && picker.times}>
      <DialogContent
        className="flex h-[calc(100dvh-80px)] w-auto max-w-none flex-col gap-0 overflow-hidden rounded-[32px] bg-card p-0 text-foreground shadow-dialog ring-0 sm:max-w-none"
        overlayClassName={OVERLAY}
        showCloseButton={false}
      >
        <div className="app-scale relative flex min-h-0 w-[674.5px] flex-1 flex-col">
          <Schedule
            advisorName={advisorName}
            photos={photos}
            selection={selection}
            service={service}
            sizes={WIDE}
            Title={DialogTitle}
          />
          <DialogClose
            render={
              <Button
                aria-label={c("close")}
                className="absolute top-[19px] right-[19px] z-20 size-9.5 rounded-full"
                size="icon"
                variant="ghost"
              />
            }
          >
            <X aria-hidden className="size-[19px]" />
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The panel of times on the phone: a sheet risen to 12 from the top, 32 round. */
function TimesSheet({ service, advisorName, selection, picker, photos }: LayerProps) {
  const c = useTranslations("common");
  return (
    <Sheet onOpenChange={picker.setTimes} open={picker.surface === "sheet" && picker.times}>
      <SheetContent
        className="top-3 gap-0 overflow-hidden rounded-t-[32px] border-0 p-0 md:mx-auto md:max-w-xl"
        showCloseButton={false}
        side="bottom"
      >
        <Schedule
          advisorName={advisorName}
          photos={photos}
          selection={selection}
          service={service}
          sizes={NARROW}
          Title={SheetTitle}
        />
        <SheetClose
          render={
            <Button
              aria-label={c("close")}
              className="absolute top-6 right-4 z-20 size-10 rounded-full"
              size="icon"
              variant="ghost"
            />
          }
        >
          <X aria-hidden className="size-5" />
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The booking's layers, mounted once for the page. The panel of times sits
 * inside the package's page when that is open, so it stacks over it as a
 * nested dialog (a press outside the panel closes the panel alone), and on
 * its own when the price card or the bar opened it.
 */
export function BookingPicker(props: LayerProps) {
  const { picker } = props;
  const dialog = <TimesDialog {...props} />;
  const sheet = <TimesSheet {...props} />;
  return (
    <>
      <PackageDialog {...props}>{picker.detail ? dialog : null}</PackageDialog>
      {picker.detail ? null : dialog}
      <PackageSheet {...props}>{picker.detail ? sheet : null}</PackageSheet>
      {picker.detail ? null : sheet}
    </>
  );
}

/**
 * The packages at the top of the page: one card each, in their order, a
 * photograph and three lines. Pressing a card opens the package's own page;
 * which one is chosen shows there and on the price card, so the cards carry
 * no state of their own.
 *
 * On the phone 116 tall at 402, 20 round, the photograph 104 by 100; from
 * `lg` cut to what a package says, a square photograph (104 on the screen
 * at 1440, the card's 24 round less its 8 inset), the name a step over the
 * line under it, and the price the darkest of the three. Each card wears one
 * of the service's photographs, in turn.
 */
export function PackageCards({
  service,
  photos,
  selection,
  picker,
}: {
  readonly service: ApiPublicService;
  readonly photos: readonly string[];
  readonly selection: Selection;
  readonly picker: Picker;
}) {
  const s = useTranslations("search");
  const format = useFormatter();
  const packages = service.packages ?? [];

  return (
    <ul className="flex flex-col gap-3 lg:gap-[19px]">
      {packages.map((item) => {
        const photo = packagePhoto(service, photos, item);
        return (
          <li key={item.id}>
            <Button
              className="h-auto w-full items-center justify-start gap-5 rounded-[20px] bg-card p-2 pr-5 text-left font-normal whitespace-normal shadow-panel ring-1 ring-foreground/[0.03] transition-shadow hover:bg-card hover:shadow-hero-card-hover lg:gap-[23.75px] lg:rounded-[28.5px] lg:p-[9.5px] lg:pr-[28.5px]"
              onClick={() => {
                selection.choose(item.id);
                picker.showDetail();
              }}
              type="button"
              variant="ghost"
            >
              <span className="relative block h-25 w-26 shrink-0 overflow-hidden rounded-[20px] bg-muted lg:size-[123.5px] lg:rounded-[19px]">
                {photo ? <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 128px, 104px" src={photo} /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-[2.375px]">
                <span className="text-sm leading-tight font-semibold text-foreground lg:text-frame-body lg:leading-[1.3]">
                  {item.name}
                </span>
                {item.description ? (
                  <span className="line-clamp-2 text-sm leading-5 text-muted-foreground lg:text-frame-meta lg:leading-[1.43]">
                    {item.description}
                  </span>
                ) : null}
                <span className="mt-1 text-sm text-muted-foreground lg:mt-[4.75px] lg:text-frame-meta">
                  <span className="font-latin font-semibold text-foreground tabular-nums">
                    {format.number(baht(item.priceSatang), "baht")}
                  </span>
                  {` · ${s("durationMinutes", { count: item.durationMinutes })}`}
                </span>
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
