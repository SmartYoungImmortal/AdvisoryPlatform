"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Gift,
  MessageCircle,
  RotateCw,
  Video,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { bookSlot, listServiceSlots } from "@/lib/api/resources";
import type { ApiPublicService, ApiServicePackage, ApiSlot } from "@/lib/api/types";
import { useResource } from "@/lib/api/use-resource";
import { useSession } from "@/lib/session";
import { authPill } from "@/components/auth/auth-split";
import { baht, isoDay, liveServiceHref } from "@/components/bookings/booking-flow";
import { chatWithHref } from "@/components/chat/chat-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * The page's pills at desktop size. The desktop is drawn in 1710 space and
 * zoomed down (`app-scale`, ×0.84 at 1440), so the capsule `authPill` gives
 * a tablet reads small there: from `lg` it is the advisor profile's pill,
 * 47.5 tall (40 on the screen) with the frame's body step for its label.
 */
export const PILL_LG = "lg:h-[47.5px] lg:gap-[14.25px] lg:px-[23.75px] lg:text-frame-body";

/**
 * The package, day and time being chosen, held by the page rather than by a
 * picker: the desktop's dialog and the phone's sheet are two pickers for one
 * choice, and a time picked in the sheet is still picked when it opens again.
 * Choosing another package clears the day and time, which were cut to the
 * last one's length.
 */
export type Selection = {
  /** The package chosen; null before one is (the first is then the one shown). */
  readonly packageId: string | null;
  readonly day: string | null;
  readonly time: string | null;
  readonly pick: (day: string | null, time: string | null) => void;
  readonly choose: (packageId: string) => void;
};

export function useSelection(): Selection {
  const [choice, setChoice] = useState<{ packageId: string | null; day: string | null; time: string | null }>({
    packageId: null,
    day: null,
    time: null,
  });
  const pick = useCallback(
    (day: string | null, time: string | null) => setChoice((current) => ({ ...current, day, time })),
    [],
  );
  const choose = useCallback(
    (packageId: string) =>
      setChoice((current) => (current.packageId === packageId ? current : { packageId, day: null, time: null })),
    [],
  );
  return { ...choice, pick, choose };
}

/**
 * The package being booked: the one chosen, else the first offered; null for
 * a service sold as itself. Its price and length stand for the service's.
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

/** The picker's two pages: a package's own, then the times for it. */
export type PickerStep = "package" | "times";

/**
 * Where the times open: the desktop's dialog or the phone's sheet, one at a
 * time, and which of its pages is showing. Held by the page, so a package's
 * card opens the same picker the price card and the booking bar open: the
 * card at the package's page, the price card straight at the times.
 */
export type Picker = {
  readonly mode: "dialog" | "sheet" | null;
  readonly step: PickerStep;
  readonly set: (mode: "dialog" | "sheet" | null) => void;
  /** Opens whichever this screen has at `step`: the dialog from `lg`, the sheet below it. */
  readonly show: (step: PickerStep) => void;
  /** Turns the open picker to its other page. */
  readonly go: (step: PickerStep) => void;
};

export function usePicker(): Picker {
  const [mode, set] = useState<"dialog" | "sheet" | null>(null);
  const [step, go] = useState<PickerStep>("times");
  const show = useCallback((next: PickerStep) => {
    go(next);
    set(globalThis.matchMedia("(min-width: 1024px)").matches ? "dialog" : "sheet");
  }, []);
  return { mode, step, set, show, go };
}

/** Who the booking is with, for the lines that name them. */
type Party = {
  readonly service: ApiPublicService;
  readonly advisorName: string;
};

/** What the two pickers are handed: the party, the choice, the picker, and the photographs the packages wear. */
type PickerProps = Party & {
  readonly selection: Selection;
  readonly picker: Picker;
  readonly photos: readonly string[];
};

/**
 * The packages by name, the chosen one ringed, above a package's page: the
 * reader compares them without closing it. None for a single package.
 */
function PackageSwitch({ service, selection }: { readonly service: ApiPublicService; readonly selection: Selection }) {
  const t = useTranslations("service");
  const packages = service.packages ?? [];
  const chosen = chosenPackage(service, selection);
  if (packages.length < 2) return null;

  return (
    <div aria-label={t("packagesTitle")} className="flex flex-wrap gap-2 lg:gap-[9.5px]" role="group">
      {packages.map((item) => {
        const active = item.id === chosen?.id;
        return (
          <Button
            aria-pressed={active}
            className={cn(
              "h-9 rounded-full bg-card px-4 text-sm font-medium shadow-none lg:h-[47.5px] lg:px-[19px] lg:text-frame-meta",
              active
                ? "border-foreground ring-1 ring-foreground hover:bg-card"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:bg-card hover:text-foreground",
            )}
            key={item.id}
            onClick={() => selection.choose(item.id)}
            type="button"
            variant="outline"
          >
            {item.name}
          </Button>
        );
      })}
    </div>
  );
}

/** A title slot: the dialog's own title on the desktop, a plain heading in the sheet, whose title is its head's. */
type TitleSlot = (props: { readonly className?: string; readonly children: ReactNode }) => ReactNode;

function PlainTitle({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return <h3 className={className}>{children}</h3>;
}

/** The dialog's title on a package's page. `lg:` again: tailwind-merge reads an unprefixed `frame-*` step as a colour. */
function PackageDialogTitle({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return <DialogTitle className={cn(className, "lg:text-frame-title")}>{children}</DialogTitle>;
}

/**
 * A package's own page, the picker's first: its photograph, its name, what
 * it costs and for how long, the price card's accent line, what it covers,
 * and the way on to its times. `wide` is the desktop's dialog, the
 * photograph down its left and the words beside it; `stacked` the phone's
 * sheet, the photograph on top.
 */
function PackageDetail({
  service,
  selection,
  picker,
  photos,
  layout,
  Title,
}: Omit<PickerProps, "advisorName"> & { readonly layout: "wide" | "stacked"; readonly Title: TitleSlot }) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const pack = chosenPackage(service, selection);
  if (!pack) return null;
  const photo = packagePhoto(service, photos, pack);
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;
  const price = format.number(baht(pack.priceSatang), "baht");
  const length = s("durationMinutes", { count: pack.durationMinutes });

  if (layout === "stacked") {
    return (
      <div className="flex flex-col">
        <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted">
          {photo ? <Image alt="" className="object-cover" fill sizes="(min-width: 768px) 576px, 100vw" src={photo} /> : null}
        </span>
        <div className="mt-5 empty:hidden">
          <PackageSwitch selection={selection} service={service} />
        </div>
        <Title className="mt-5 text-xl leading-snug font-semibold text-foreground">{pack.name}</Title>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-latin font-semibold text-foreground tabular-nums">{price}</span>
          {` · ${length}`}
        </p>
        <p className="mt-1 text-sm font-medium text-primary">
          {trial ? t("trialFree", { minutes: trial }) : t("trustEscrow")}
        </p>
        {pack.description ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{pack.description}</p> : null}
        <Button className={cn(authPill(true), "mt-6 w-full")} onClick={() => picker.go("times")} type="button">
          {t("pickTime")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[641.25px] grid-cols-[494px_minmax(0,1fr)]">
      <div className="relative">
        <span className="absolute inset-y-[14.25px] right-0 left-[14.25px] overflow-hidden rounded-[14.25px] bg-muted">
          {photo ? <Image alt="" className="object-cover" fill sizes="420px" src={photo} /> : null}
        </span>
      </div>
      <div className="flex min-w-0 flex-col px-[47.5px] pt-[57px] pb-9.5">
        <div className="mb-9.5 empty:hidden">
          <PackageSwitch selection={selection} service={service} />
        </div>
        <Title className="text-frame-title leading-[1.125] font-semibold text-foreground">{pack.name}</Title>
        {pack.description ? (
          <p className="mt-[19px] text-frame-body leading-[1.5] text-muted-foreground">{pack.description}</p>
        ) : null}
        {/* The price card's own row at the foot: the price and its line on
            the left, the button on the right. */}
        <div className="mt-auto flex items-center justify-between gap-[19px] pt-9.5">
          <div className="flex min-w-0 flex-col gap-[2.375px]">
            <p className="flex flex-wrap items-baseline gap-x-[4.75px]">
              <span className="font-latin text-frame-figure leading-[1.33] font-medium text-foreground tabular-nums">
                {price}
              </span>
              <span className="text-frame-label text-muted-foreground">{t("priceUnit", { duration: length })}</span>
            </p>
            <p className="text-frame-label font-medium text-primary">
              {trial ? t("trialFree", { minutes: trial }) : t("trustEscrow")}
            </p>
          </div>
          <Button
            className={cn(authPill(true), "w-auto shrink-0 lg:h-[61.75px] lg:px-[28.5px] lg:text-frame-figure lg:font-medium")}
            onClick={() => picker.go("times")}
            type="button"
          >
            {t("pickTime")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The way from the times back to the package's page, when the service is sold in packages. */
function BackToPackage({ picker, className, iconClassName }: {
  readonly picker: Picker;
  readonly className?: string;
  readonly iconClassName?: string;
}) {
  const t = useTranslations("service");
  return (
    <Button
      aria-label={t("backToPackage")}
      className={cn("shrink-0 rounded-full", className)}
      onClick={() => picker.go("package")}
      size="icon"
      type="button"
      variant="ghost"
    >
      <ChevronLeft aria-hidden className={iconClassName} />
    </Button>
  );
}

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

/**
 * A state shown instead of content: a glyph in the soft grey circle, a
 * sentence, an action. Flat on its ground, the way the notification feed
 * draws its empty state: inside the panel's card a tinted box was a box in a
 * box.
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
 * What the calendar shows instead of times, for each answer the slots route
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
 * Booking a chosen time: `POST /bookings` holds the slot as `PENDING_PAYMENT`
 * and opens the checkout, and a slot taken meanwhile (409) goes to
 * `/checkout/slot-taken`. Nothing is charged here. Shared by the calendar on
 * the page and the phone's sheet.
 */
function useBook(serviceId: string) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const book = (time: string | null, packageId: string | null) => {
    if (!time) return;
    setBooking(true);
    setFailure(null);
    void bookSlot({ serviceId, startTime: time, packageId: packageId ?? undefined })
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
  return { booking, failure, book };
}

/**
 * Whether the signed-in account is the advisor of this service. Every account
 * can book (an advisor is an advisee too), but not their own service: the API
 * refuses that booking (`selfBooking`), so the picker says whose it is
 * instead of offering times that cannot be taken.
 */
function useOwnService(advisorId: string): boolean {
  const session = useSession();
  return session.status === "authenticated" && session.account.id === advisorId;
}

/** The picker on the advisor's own service: whose it is, and the way to manage it. */
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

/** The price, what it buys, and the free trial when the service has one. */
function PriceSummary({
  service,
  pack,
}: {
  readonly service: ApiPublicService;
  readonly pack: ApiServicePackage | null;
}) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;

  return (
    <div className="flex flex-col gap-2 lg:gap-2.5">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-latin text-2xl font-semibold tracking-tight text-foreground tabular-nums lg:text-frame-heading">
          {format.number(baht(pack ? pack.priceSatang : service.priceSatang), "baht")}
        </span>
        <span className="text-sm text-muted-foreground lg:text-frame-meta">
          {t("perSession", {
            duration: s("durationMinutes", { count: pack ? pack.durationMinutes : service.durationMinutes }),
          })}
        </span>
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground lg:text-frame-meta">
        <Video aria-hidden className="size-4 shrink-0 lg:size-5" />
        {t("videoInApp")}
      </p>
      {trial ? (
        <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-muted px-3 text-xs font-medium text-foreground lg:mt-1 lg:h-10 lg:gap-2 lg:px-4 lg:text-frame-meta">
          <Gift aria-hidden className="size-3.5 lg:size-4.5" />
          {t("trialFree", { minutes: trial })}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The desktop's price card, docked at the foot of the column that rides
 * beside the page, the way the listing pages this page is drawn after dock
 * theirs: on the screen's bottom edge, round at the top (24) and barely at
 * the bottom (6), lifted on a shadow rather than drawn round with a line.
 * The price of the session (the chosen package's, or "from" the cheapest
 * before one is chosen) and the button that opens the calendar, in a dialog
 * over the page. A package's card opens the same dialog at the package's own
 * page, one step before its times. The popup is portalled out of the
 * column's zoom, so it takes `app-scale` itself and its `frame-*` steps read
 * as the page's.
 */
export function BookingCard({ service, advisorName, selection, picker, photos }: PickerProps) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const trial = service.trialEnabled ? service.trialDurationMinutes : null;
  const pack = chosenPackage(service, selection);
  const quoted = quote(service, selection);

  return (
    <>
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
          onClick={() => picker.show("times")}
          type="button"
        >
          {t("pickTime")}
        </Button>
    </div>

      {/* One box for both pages, the same width and at least the same
          height, so turning from the package to its times does not jump. */}
      <Dialog onOpenChange={(next) => picker.set(next ? "dialog" : null)} open={picker.mode === "dialog"}>
        <DialogContent
          className="block max-h-[calc(100dvh-4rem)] w-auto max-w-none gap-0 overflow-y-auto overscroll-contain rounded-3xl bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-none"
          overlayClassName="bg-scrim/50"
        >
          <div className="app-scale block w-[1045px]">
            {picker.step === "package" && pack ? (
              <PackageDetail
                layout="wide"
                photos={photos}
                picker={picker}
                selection={selection}
                service={service}
                Title={PackageDialogTitle}
              />
            ) : (
              <div className="flex min-h-[641.25px] flex-col">
                <div className="flex items-center gap-[14.25px] border-b border-border px-[28.5px] pt-[28.5px] pr-19 pb-[23.75px]">
                  {pack ? (
                    <BackToPackage className="-ml-[9.5px] size-[47.5px]" iconClassName="size-[23.75px]" picker={picker} />
                  ) : null}
                  <div className="flex min-w-0 flex-col gap-[4.75px]">
                    <DialogTitle className="font-semibold text-foreground lg:text-frame-heading">{t("book")}</DialogTitle>
                    <DialogDescription className="truncate text-muted-foreground lg:text-frame-meta">
                      {pack ? `${service.name} · ${pack.name}` : service.name}
                    </DialogDescription>
                  </div>
                </div>
                <div className="px-[28.5px] pt-[28.5px] pb-[28.5px]">
                  <SlotCalendar advisorName={advisorName} layout="wide" selection={selection} service={service} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The phone's version: the price and the way to the times kept in reach along
 * the bottom edge, and the same picker in a sheet that rises from it, with
 * the same two pages. Up to the portrait tablet; the desktop has the panel.
 */
export function BookingBar({ service, advisorName, selection, picker, photos }: PickerProps) {
  const t = useTranslations("service");
  const s = useTranslations("search");
  const format = useFormatter();
  const pack = chosenPackage(service, selection);
  const quoted = quote(service, selection);
  const chosen = (service.packages ?? []).find((item) => item.id === selection.packageId);

  let sub = t("perSession", { duration: s("durationMinutes", { count: service.durationMinutes }) });
  if (chosen) sub = `${chosen.name} · ${s("durationMinutes", { count: chosen.durationMinutes })}`;
  else if (quoted.from) sub = t("fromPackages", { count: service.packages?.length ?? 0 });

  return (
    <>
      <div className="flex w-full shrink-0 items-center gap-2 border-t border-border bg-card px-5 py-3 md:px-12 lg:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="font-latin text-lg leading-6 font-semibold text-foreground tabular-nums">
            {format.number(baht(quoted.priceSatang), "baht")}
          </span>
          <span className="truncate text-xs text-muted-foreground">{sub}</span>
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
        <Button className={cn(authPill(true), "w-auto shrink-0 px-6")} onClick={() => picker.show("times")} type="button">
          {t("pickTime")}
        </Button>
      </div>

      <Sheet onOpenChange={(next) => picker.set(next ? "sheet" : null)} open={picker.mode === "sheet"}>
        {/* Centred and capped on the portrait tablet, where a sheet the full
            820 wide spreads seven days across a hand's span. */}
        <SheetContent className="max-h-[88dvh] gap-0 rounded-t-3xl p-0 md:mx-auto md:max-w-xl" side="bottom">
          {picker.step === "package" && pack ? (
            <>
              <div className="flex flex-col gap-0.5 border-b border-border px-5 pt-5 pr-14 pb-4">
                <SheetTitle className="font-hero text-xl font-normal tracking-tight text-hero-ink">{t("packagesTitle")}</SheetTitle>
                <SheetDescription className="truncate">{service.name}</SheetDescription>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
                <PackageDetail
                  layout="stacked"
                  photos={photos}
                  picker={picker}
                  selection={selection}
                  service={service}
                  Title={PlainTitle}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-5 pt-5 pr-14 pb-4">
                {pack ? <BackToPackage className="-ml-2 size-10" iconClassName="size-5" picker={picker} /> : null}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <SheetTitle className="font-hero text-xl font-normal tracking-tight text-hero-ink">{t("book")}</SheetTitle>
                  <SheetDescription className="truncate">{pack ? `${service.name} · ${pack.name}` : service.name}</SheetDescription>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
                <PriceSummary pack={pack} service={service} />
                <SlotCalendar advisorName={advisorName} layout="stacked" selection={selection} service={service} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** How far ahead the calendar pages: this month and the two after it (the slots route takes up to 90 days). */
const CALENDAR_MONTHS = 3;

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

/**
 * One month's open times, from today when it is this month, cut to the
 * package's length when there is one: the route's answer and its slots by
 * day in the viewer's zone. A month of a package is one request, cached by
 * it, so paging back is instant.
 */
function useMonthSlots(serviceId: string, month: string, today: string, packageId: string | null) {
  const from = today.startsWith(month) ? today : `${month}-01`;
  const [year, index] = month.split("-").map(Number);
  const to = `${month}-${String(new Date(year, index, 0).getDate()).padStart(2, "0")}`;
  const fetcher = useCallback(
    (signal: AbortSignal) => listServiceSlots(serviceId, { from, to, packageId: packageId ?? undefined }, signal),
    [serviceId, from, to, packageId],
  );
  const slots = useResource<readonly ApiSlot[]>(
    `services/${serviceId}/slots?from=${from}&to=${to}&package=${packageId ?? ""}`,
    fetcher,
  );
  const byDay = useMemo(() => {
    const days = new Map<string, ApiSlot[]>();
    for (const slot of slots.data ?? []) {
      const key = isoDay(new Date(slot.startTime));
      const list = days.get(key);
      if (list) list.push(slot);
      else days.set(key, [slot]);
    }
    return days;
  }, [slots.data]);
  return { slots, byDay };
}

/**
 * The times, laid out as a booking page lays out an appointment: the month, a
 * day with open times a button on it (today ringed, the chosen day filled),
 * and that day's times with the button that books the chosen one. Pages
 * through this month and the two after it; this month starts at this week,
 * not at weeks already gone. Every answer of the slots route other than a
 * list is its notice; the advisor's own service says whose it is.
 *
 * `wide` puts the times beside the month (the desktop's dialog), `stacked`
 * under it (the phone's sheet).
 */
export function SlotCalendar({
  service,
  advisorName,
  selection,
  layout,
}: Party & { readonly selection: Selection; readonly layout: "wide" | "stacked" }) {
  const t = useTranslations("service");
  const b = useTranslations("bookings");
  const format = useFormatter();
  const locale = useLocale();
  const own = useOwnService(service.advisorId);
  const today = useMemo(() => isoDay(new Date()), []);
  const first = today.slice(0, 7);
  const [month, setMonth] = useState(first);
  const pack = chosenPackage(service, selection);
  const { slots, byDay } = useMonthSlots(service.id, month, today, pack?.id ?? null);
  const { booking, failure, book } = useBook(service.id);

  // This month from this week: the weeks already gone are only closed days.
  const grid = monthGrid(month);
  const thisWeek = month === first ? Math.floor(grid.findIndex((cell) => cell.date === today) / 7) : 0;
  const cells = grid.slice(thisWeek * 7);
  const firstOpen = cells.find((cell) => cell.inMonth && byDay.has(cell.date))?.date ?? null;
  const day = selection.day && byDay.has(selection.day) ? selection.day : firstOpen;
  const times = day ? (byDay.get(day) ?? []) : [];
  const time = times.some((slot) => slot.startTime === selection.time) ? selection.time : null;

  const date = (key: string) => new Date(`${key}T00:00:00`);
  const hour = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  const dayLabel = (key: string) => format.dateTime(date(key), { weekday: "short", day: "numeric", month: "short" });
  // Thai's "short" weekday is the whole word ("อาทิตย์"), too long for a
  // seventh of the month; "narrow" is the calendar's own "อา". English keeps
  // "Sun": its narrow "S" cannot tell Saturday from Sunday.
  const weekday = locale === "th" ? "narrow" : "short";

  let label = t("pickTimeFirst");
  if (booking) label = t("booking");
  else if (time && day) label = t("bookAtDay", { day: dayLabel(day), time: hour(time) });

  const step = (by: number) => {
    setMonth(shiftMonth(month, by));
    selection.pick(null, null);
  };

  let body: ReactNode;
  if (own) {
    body = <OwnNotice />;
  } else if (slots.error) {
    body = <SlotsNotice advisorName={advisorName} error={slots.error} onRetry={slots.reload} service={service} />;
  } else {
    body = (
      <div className={layout === "wide" ? "grid grid-cols-[minmax(0,1fr)_356px] gap-x-[57px]" : "flex flex-col gap-6"}>
        <div className="flex min-w-0 flex-col gap-3 lg:gap-[19px]">
          <div className="flex items-center justify-between gap-2">
            <span aria-live="polite" className="text-base font-medium text-foreground lg:text-frame-body">
              {format.dateTime(date(`${month}-01`), { month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Button
                aria-label={b("previousMonth")}
                className="size-9 rounded-full lg:size-[47.5px]"
                disabled={month === first}
                onClick={() => step(-1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronLeft aria-hidden className="size-5 lg:size-[23.75px]" />
              </Button>
              <Button
                aria-label={b("nextMonth")}
                className="size-9 rounded-full lg:size-[47.5px]"
                disabled={month === shiftMonth(first, CALENDAR_MONTHS - 1)}
                onClick={() => step(1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronRight aria-hidden className="size-5 lg:size-[23.75px]" />
              </Button>
            </span>
          </div>
          <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted-foreground lg:text-frame-label">
            {cells.slice(0, 7).map((cell) => (
              <span key={cell.date}>{format.dateTime(date(cell.date), { weekday })}</span>
            ))}
          </div>
          <div aria-busy={slots.loading || undefined} className="grid grid-cols-7 gap-y-1 lg:gap-y-[4.75px]">
            {cells.map((cell) => {
              if (!cell.inMonth) return <span aria-hidden key={cell.date} />;
              const open = byDay.has(cell.date);
              const chosen = cell.date === day;
              return (
                <span className="flex justify-center" key={cell.date}>
                  <Button
                    aria-label={open ? dayLabel(cell.date) : t("dayClosed", { day: dayLabel(cell.date) })}
                    aria-pressed={chosen}
                    className={cn(
                      "size-10 rounded-full p-0 font-latin text-sm tabular-nums shadow-none lg:size-[57px] lg:text-frame-meta",
                      chosen && "bg-foreground font-semibold text-background hover:bg-foreground/90 hover:text-background",
                      !chosen && open && "bg-muted font-semibold text-foreground hover:bg-accented",
                      !open && "font-normal text-muted-foreground/60",
                      cell.date === today && !chosen && "ring-1 ring-foreground/40",
                    )}
                    disabled={!open}
                    onClick={() => selection.pick(cell.date, null)}
                    type="button"
                    variant="ghost"
                  >
                    {date(cell.date).getDate()}
                  </Button>
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:gap-[19px]">
          {slots.loading ? (
            <div aria-hidden className="grid grid-cols-3 gap-2 lg:gap-[9.5px]">
              {Array.from({ length: 9 }, (_, i) => (
                <span className="h-11 animate-pulse rounded-full bg-muted lg:h-[47.5px]" key={`pending-${i}`} />
              ))}
            </div>
          ) : null}
          {!slots.loading && day ? (
            <>
              <span className="text-sm font-medium text-foreground lg:text-frame-meta">{t("timesOn", { day: dayLabel(day) })}</span>
              <div className="grid max-h-63 grid-cols-3 gap-2 overflow-y-auto overscroll-contain lg:max-h-[332.5px] lg:gap-[9.5px]">
                {times.map((slot) => {
                  const active = slot.startTime === time;
                  return (
                    <Button
                      aria-pressed={active}
                      className={cn(
                        "h-11 rounded-full px-0 shadow-none lg:h-[47.5px]",
                        active
                          ? "border-transparent bg-hero-action text-hero-action-foreground hover:bg-hero-action/85 hover:text-hero-action-foreground"
                          : "border-border bg-card hover:border-foreground/40",
                      )}
                      key={slot.startTime}
                      onClick={() => selection.pick(day, slot.startTime)}
                      type="button"
                      variant="outline"
                    >
                      <span className="font-latin text-sm font-medium tabular-nums lg:text-frame-meta">{hour(slot.startTime)}</span>
                    </Button>
                  );
                })}
              </div>
              <Button
                aria-busy={booking || undefined}
                className={cn(authPill(true), "w-full", PILL_LG)}
                disabled={!time || booking}
                onClick={() => book(time, pack?.id ?? null)}
                type="button"
              >
                {label}
              </Button>
              <MessageButton advisorId={service.advisorId} />
              {failure ? (
                <p className="text-center text-sm text-destructive lg:text-frame-meta" role="alert">
                  {failure}
                </p>
              ) : null}
            </>
          ) : null}
          {!slots.loading && !day ? (
            <>
              <Notice icon={CalendarX2}>{t("noSlotsMonth")}</Notice>
              <MessageButton advisorId={service.advisorId} />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return body;
}

/**
 * The packages at the top of the page: one card each, in their order, a
 * photograph and three lines. Pressing a card chooses it and opens the
 * picker at the package's own page; which one is chosen shows there and on
 * the price card, so the cards carry no state of their own.
 *
 * Cut to what a package says: a square photograph (104 on the screen at
 * 1440, the card's 24 round less its 8 inset), the name a step over the
 * line under it, and the price the darkest of the three. Each card wears
 * one of the service's photographs, in turn.
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
              className="h-auto w-full items-center justify-start gap-4 rounded-3xl bg-card p-2 pr-5 text-left font-normal whitespace-normal shadow-panel ring-1 ring-foreground/[0.03] transition-shadow hover:bg-card hover:shadow-hero-card-hover lg:gap-[23.75px] lg:rounded-[28.5px] lg:p-[9.5px] lg:pr-[28.5px]"
              onClick={() => {
                selection.choose(item.id);
                picker.show("package");
              }}
              type="button"
              variant="ghost"
            >
              <span className="relative block size-20 shrink-0 overflow-hidden rounded-2xl bg-muted lg:size-[123.5px] lg:rounded-[19px]">
                {photo ? <Image alt="" className="object-cover" fill sizes="(min-width: 1024px) 128px, 80px" src={photo} /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-[2.375px]">
                <span className="text-base leading-snug font-semibold text-foreground lg:text-frame-body lg:leading-[1.3]">
                  {item.name}
                </span>
                {item.description ? (
                  <span className="line-clamp-2 text-sm text-muted-foreground lg:text-frame-meta lg:leading-[1.43]">
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
