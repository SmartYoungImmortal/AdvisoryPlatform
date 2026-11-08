"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarHours,
  SESSION_TONE,
  SessionBlock,
  hourSpan,
  laySessions,
  minuteOfDay,
  noonOf,
  share,
} from "@/components/work/calendar-time-grid";
import { DESK_BONE } from "@/components/work/desk-parts";
import type { AdvisorBooking } from "@/lib/api/advisor-bookings";
import { WEEKDAY_KEYS, monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/**
 * The calendar from `lg`, in the frame's 1710 design space: a week hour by
 * hour or a month of day tiles, in a box that fills the window under the
 * title and scrolls on its own, with the way back, today and the way on
 * floating at its foot.
 */

export type CalendarView = "week" | "month";

/** The box's height before it is fitted (`h-170`). */
const BOX_UNITS = 680;
/** What stands under the box in the frame: the page's foot (`lg:pb-16`). */
const UNDER_BOX = 64;
/** The least the box stands, so a short window scrolls the page instead. */
const LEAST_BOX = 480;

/** The hours a week shows at the least, whatever it holds. */
const WEEK_FROM = 6;
const WEEK_TO = 23;
/** Where an empty week opens. */
const WEEK_OPENS = 8;

/**
 * The box as tall as the scroller (`ScreenBody`) has room for under it. The
 * page is zoomed into the design space, so the scale is read off the box
 * itself: its drawn height over the height it was given.
 */
function useFillHeight(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const box = ref.current;
    const body = box?.closest<HTMLElement>('[data-slot="screen-body"]');
    if (!box || !body) return;
    let units = BOX_UNITS;
    const fit = () => {
      const rect = box.getBoundingClientRect();
      if (rect.height === 0) return;
      const scale = rect.height / units;
      const room = (body.getBoundingClientRect().bottom - (rect.top + body.scrollTop)) / scale - UNDER_BOX;
      const next = Math.max(LEAST_BOX, Math.floor(room));
      if (next === units) return;
      units = next;
      box.style.height = `${next}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    return () => observer.disconnect();
  }, [ref]);
}

/**
 * The box both views scroll in: its head stays at the top (`data-calendar-head`),
 * and `controls` float at the foot over whatever scrolls under them, the
 * view's last rows kept clear of them. `data-lenis-prevent` lets the wheel
 * scroll it rather than the page's smooth scroller.
 */
export function CalendarDeskBox({ controls, children }: { readonly controls: ReactNode; readonly children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFillHeight(ref);
  return (
    <div className="relative mt-7.5 h-170 overflow-y-auto overscroll-contain" data-calendar-box data-lenis-prevent ref={ref}>
      <div className="flex min-h-full flex-col pb-6">
        <div className="flex-1 pb-20">{children}</div>
        <div className="pointer-events-none sticky bottom-6 z-30 -mt-14 flex h-14 justify-center">{controls}</div>
      </div>
    </div>
  );
}

const FLOAT = "bg-card text-foreground shadow-hero-card-hover hover:bg-muted hover:text-foreground";

/** Back a step, today, on a step: a week or a month, as the view moves. */
export function CalendarDeskControls({
  view,
  onStep,
  onToday,
}: {
  readonly view: CalendarView;
  readonly onStep: (offset: number) => void;
  readonly onToday: () => void;
}) {
  const t = useTranslations("advisorBookings");
  return (
    <div className="pointer-events-auto flex gap-2">
      <Button
        aria-label={t(view === "week" ? "previousWeek" : "previousMonth")}
        className={cn(FLOAT, "size-14 rounded-full")}
        onClick={() => onStep(-1)}
        type="button"
        variant="ghost"
      >
        <ChevronLeft aria-hidden className="size-6" />
      </Button>
      <Button className={cn(FLOAT, "h-14 rounded-full px-7 text-frame-meta font-medium")} onClick={onToday} type="button" variant="ghost">
        {t("today")}
      </Button>
      <Button
        aria-label={t(view === "week" ? "nextWeek" : "nextMonth")}
        className={cn(FLOAT, "size-14 rounded-full")}
        onClick={() => onStep(1)}
        type="button"
        variant="ghost"
      >
        <ChevronRight aria-hidden className="size-6" />
      </Button>
    </div>
  );
}

/** The controls while the calendar loads, at their sizes. */
export function CalendarDeskControlBones() {
  return (
    <div className="flex gap-2">
      <span className={cn(DESK_BONE, "size-14 rounded-full")} />
      <span className={cn(DESK_BONE, "h-14 w-25.5 rounded-full")} />
      <span className={cn(DESK_BONE, "size-14 rounded-full")} />
    </div>
  );
}

const MENU = "min-w-48 rounded-2xl p-1.5";
const MENU_ITEM = "h-10 rounded-xl pl-3 text-sm";

/** The months of the shown one's year, to jump to any of them. */
export function CalendarMonthMenu({ month, onPick }: { readonly month: string; readonly onPick: (month: string) => void }) {
  const t = useTranslations("advisorBookings");
  const format = useFormatter();
  const year = month.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={t("pickMonth")} className="size-10 rounded-full text-foreground" size="icon" type="button" variant="ghost">
            <ChevronDown aria-hidden className="size-6" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className={MENU}>
        <DropdownMenuRadioGroup onValueChange={(value) => onPick(value as string)} value={month}>
          {months.map((key) => (
            <DropdownMenuRadioItem className={MENU_ITEM} key={key} value={key}>
              {format.dateTime(noonOf(`${key}-01`), { month: "long", year: "numeric", timeZone: "UTC" })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The view's capsule: the week or the month, its menu under it. */
export function CalendarViewMenu({ view, onChange }: { readonly view: CalendarView; readonly onChange: (view: CalendarView) => void }) {
  const t = useTranslations("advisorBookings");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-10 gap-1.5 rounded-full bg-muted px-4 text-frame-label font-medium text-foreground hover:bg-muted/70 hover:text-foreground"
            type="button"
            variant="ghost"
          >
            {t(view === "week" ? "viewWeek" : "viewMonth")}
            <ChevronDown aria-hidden className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className={MENU}>
        <DropdownMenuRadioGroup onValueChange={(value) => onChange(value as CalendarView)} value={view}>
          <DropdownMenuRadioItem className={MENU_ITEM} value="week">
            {t("viewWeek")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className={MENU_ITEM} value="month">
            {t("viewMonth")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Opens the box at `hour`: the hour's label just under the head. Read in
 * shares of the box's content, so the design space's zoom cancels out.
 * Again whenever `key` (the week shown) changes.
 */
function useOpenAtHour(ref: RefObject<HTMLDivElement | null>, hour: number, key: string) {
  useEffect(() => {
    const grid = ref.current;
    const box = grid?.closest<HTMLElement>("[data-calendar-box]");
    const inner = box?.firstElementChild;
    const head = box?.querySelector("[data-calendar-head]");
    const label = grid?.querySelector(`[data-hour="${hour}"] > span`);
    if (!box || !inner || !head || !label) return;
    const whole = inner.getBoundingClientRect();
    if (whole.height === 0) return;
    const offset = label.getBoundingClientRect().top - whole.top - head.getBoundingClientRect().height;
    box.scrollTop = (offset / whole.height) * box.scrollHeight;
  }, [ref, hour, key]);
}

/** The week's head: each day's short name, then its date, today's in the ink circle. */
function WeekHead({ week, today }: { readonly week: readonly (string | null)[]; readonly today?: string }) {
  const s = useTranslations("serviceSchedule");
  return (
    <div aria-hidden className="sticky top-0 z-20 flex bg-card pb-3" data-calendar-head>
      <span className="w-12 shrink-0" />
      <div className="grid flex-1 grid-cols-7">
        {WEEKDAY_KEYS.map((key, index) => {
          const date = week[index];
          return (
            <span className="flex h-8 items-center justify-center gap-1 text-frame-label" key={key}>
              <span className="text-muted-foreground">{s(`weekdayShort.${key}`)}</span>
              {date === null ? (
                <span className={cn(DESK_BONE, "size-7 rounded-full")} />
              ) : (
                <span
                  className={cn(
                    "font-latin font-medium tabular-nums",
                    date === today
                      ? "flex size-7 items-center justify-center rounded-full bg-hero-action text-hero-action-foreground"
                      : "text-foreground",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A week hour by hour: 06:00 to 23:00 at the least, the seven days as
 * columns between hairlines, each day's sessions in its column, and a red
 * line across today's at the time it is now. It opens an hour before the
 * week's first session, or at 08:00.
 */
export function CalendarDeskWeek({
  week,
  today,
  now,
  byDay,
  timeZone,
}: {
  readonly week: readonly string[];
  readonly today: string;
  readonly now: number;
  readonly byDay: ReadonlyMap<string, readonly AdvisorBooking[]>;
  readonly timeZone: string;
}) {
  const format = useFormatter();
  const ref = useRef<HTMLDivElement>(null);
  const days = week.map((date) => ({ date, slots: laySessions(byDay.get(date) ?? [], timeZone) }));
  const all = days.flatMap((day) => day.slots);
  const { first, last } = hourSpan(all, WEEK_FROM, WEEK_TO, 0);
  const opens = all.length ? Math.max(first, Math.floor(Math.min(...all.map((slot) => slot.start)) / 60) - 1) : WEEK_OPENS;
  useOpenAtHour(ref, opens, week[0]);
  const minute = minuteOfDay(now, timeZone);
  const span = (last - first) * 60;
  const lineShown = minute >= first * 60 && minute <= last * 60;

  return (
    <>
      <WeekHead today={today} week={week} />
      <div className="pt-2" ref={ref}>
        <CalendarHours first={first} last={last} size="desk">
          <div className="grid h-full grid-cols-7">
            {days.map(({ date, slots }) => (
              <div className="relative border-l border-border" key={date}>
                <ul aria-label={format.dateTime(noonOf(date), { dateStyle: "full", timeZone: "UTC" })}>
                  {slots.map((slot) => (
                    <SessionBlock first={first} key={slot.booking.id} last={last} now={now} size="desk" slot={slot} timeZone={timeZone} />
                  ))}
                </ul>
                {date === today && lineShown ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 h-0.5 -translate-y-1/2 bg-destructive"
                    style={{ top: share(minute - first * 60, span) }}
                  >
                    <span className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive" />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </CalendarHours>
      </div>
    </>
  );
}

/** The week while the calendar loads: the head with its dates as bones, the hours' labels as bones, opened at 08:00. */
export function CalendarDeskWeekBones() {
  const ref = useRef<HTMLDivElement>(null);
  useOpenAtHour(ref, WEEK_OPENS, "");
  return (
    <>
      <WeekHead week={Array.from({ length: 7 }, () => null)} />
      <div className="pt-2" ref={ref}>
        <CalendarHours bones first={WEEK_FROM} last={WEEK_TO} size="desk">
          <div className="grid h-full grid-cols-7">
            {WEEKDAY_KEYS.map((key) => (
              <div className="border-l border-border" key={key} />
            ))}
          </div>
        </CalendarHours>
      </div>
    </>
  );
}

/** How many sessions a day's tile lists before it counts the rest. */
const TILE_SHOWN = 3;

/**
 * A month of tiles under the weekdays' names, Sunday first, the days of the
 * neighbouring months left empty. Each tile is the day's number (today's in
 * the ink circle) over its first sessions, each its time and service, and
 * how many more; the tile opens the day's week.
 */
export function CalendarDeskMonth({
  month,
  today,
  byDay,
  timeZone,
  onPick,
}: {
  readonly month: string;
  readonly today: string;
  readonly byDay: ReadonlyMap<string, readonly AdvisorBooking[]>;
  readonly timeZone: string;
  readonly onPick: (day: string) => void;
}) {
  const t = useTranslations("advisorBookings");
  const s = useTranslations("serviceSchedule");
  const format = useFormatter();
  const ref = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const clock = (value: string) =>
    format.dateTime(new Date(value), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });

  // A new month opens at its first week.
  useEffect(() => {
    const box = ref.current?.closest<HTMLElement>("[data-calendar-box]");
    if (box) box.scrollTop = 0;
  }, [month]);

  return (
    <div ref={ref}>
      <div aria-hidden className="sticky top-0 z-20 grid grid-cols-7 gap-2 bg-card pb-2" data-calendar-head>
        {WEEKDAY_KEYS.map((key) => (
          <span className="text-center text-frame-label text-muted-foreground" key={key}>
            {s(`weekdayShort.${key}`)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {monthGrid(year, monthNumber).map((cell, index) => {
          if (!cell.inMonth) return <span aria-hidden key={`pad-${index}`} />;
          const date = `${month}-${String(cell.day).padStart(2, "0")}`;
          const sessions = byDay.get(date) ?? [];
          const more = sessions.length - TILE_SHOWN;
          return (
            <div className="relative flex h-39 min-w-0 flex-col gap-1 rounded-3xl border border-border bg-card p-4" key={date}>
              <Button
                aria-current={date === today ? "date" : undefined}
                aria-label={`${format.dateTime(noonOf(date), { dateStyle: "full", timeZone: "UTC" })}, ${t("bookingCount", { count: sessions.length })}`}
                className="absolute inset-0 h-auto rounded-3xl px-0 hover:bg-muted/50"
                onClick={() => onPick(date)}
                type="button"
                variant="ghost"
              />
              <span className="pointer-events-none relative flex h-8 items-center font-latin text-frame-body font-medium text-foreground tabular-nums">
                {date === today ? (
                  <span className="flex size-8 items-center justify-center rounded-full bg-hero-action text-hero-action-foreground">{cell.day}</span>
                ) : (
                  cell.day
                )}
              </span>
              {sessions.length ? (
                <ul className="relative flex min-w-0 flex-col gap-0.5">
                  {sessions.slice(0, TILE_SHOWN).map((booking) => (
                    <li className="min-w-0" key={booking.id}>
                      <Link
                        className={cn(
                          "flex h-5 min-w-0 items-center gap-1 rounded-md border px-1.5 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          SESSION_TONE[booking.state],
                        )}
                        href={`/work/session?id=${booking.id}`}
                      >
                        <span className="shrink-0 font-latin tabular-nums">{clock(booking.startTime)}</span>
                        <span className="min-w-0 truncate">{booking.serviceName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {more > 0 ? (
                <span className="pointer-events-none relative text-xs text-muted-foreground">{t("more", { count: more })}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
