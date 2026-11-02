"use client";

import { CalendarClock, Plus } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { WeekSchedule, WeekScheduleBones } from "@/components/availability/week-schedule";
import { useMountTime } from "@/components/bookings/booking-flow";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESK_BONE, DeskFilter, DeskRow, DeskRowAction, DeskSection } from "@/components/work/desk-parts";
import { WorkHub } from "@/components/work/work-hub";
import { cn } from "@/lib/utils";
import { availabilityApi, type AvailabilityProfile, type GlobalAvailability } from "@/lib/availability/api";
import { invalidate, useResource } from "@/lib/api/use-resource";
import {
  BUFFER_MINUTE_OPTIONS,
  CUSTOM_BOUNDS,
  DAILY_LIMIT_HOUR_OPTIONS,
  GLOBAL_AVAILABILITY,
  HORIZON_DAY_OPTIONS,
  type GlobalAvailabilityState,
} from "@/lib/availability";

type Rule = "horizon" | "buffer" | "limit";

/** The three rules as the page holds them: days ahead, minutes between, and hours a day (none for no ceiling). */
type Rules = { readonly horizon: number; readonly buffer: number; readonly limit: number | null };

/** The page's column, its parts one under another. */
const PAGE = "flex w-full max-w-220 flex-col";

/** A part after the first, a step down the page. */
const NEXT_PART = "mt-8 lg:mt-12";

/** A part's body under its name. */
const BODY_GAP = "mt-3 lg:mt-4";

/** The rules' tiles: stacked on the phone, three across from `sm`. */
const TILES = "grid gap-3 sm:grid-cols-3 lg:gap-4";

/** A rule's tile: its name and value, and "change" — at the right on the phone, under them from `sm`. */
const TILE =
  "flex items-center justify-between gap-3 rounded-2xl border border-border p-4 sm:flex-col sm:items-start lg:p-5";

/** The schedules' capsules sit closer under the part's name than under the band, where `DeskFilter` spaces them. */
const CAPSULES_GAP = "[&>fieldset]:mt-3 lg:[&>fieldset]:mt-4";

/** A day a schedule differs on: closed (all of it or some hours) or opened beyond its week. */
type DateNote = { readonly date: string; readonly kind: "closed" | "open"; readonly ranges: readonly string[]; readonly allDay: boolean };

/** The schedule's dates from `today` on, a row per date and kind, in date order with the closings first. */
function datesAhead(profile: AvailabilityProfile, today: string): readonly DateNote[] {
  const notes = new Map<string, { date: string; kind: "closed" | "open"; ranges: string[]; allDay: boolean }>();
  const add = (date: string, kind: "closed" | "open", range: string | null) => {
    const day = date.slice(0, 10);
    if (day < today) return;
    const note = notes.get(`${day}-${kind}`) ?? { date: day, kind, ranges: [], allDay: false };
    if (range) note.ranges.push(range);
    else note.allDay = true;
    notes.set(`${day}-${kind}`, note);
  };
  const range = (start?: string, end?: string) => (start && end ? `${start.slice(0, 5)}–${end.slice(0, 5)}` : null);
  for (const period of profile.blockedPeriods) add(period.blockedDate, "closed", range(period.startTime, period.endTime));
  for (const window of profile.specificWindows) add(window.availableDate, "open", range(window.startTime, window.endTime));
  return [...notes.values()]
    .map((note) => ({ ...note, ranges: note.ranges.toSorted() }))
    .toSorted((a, b) => a.date.localeCompare(b.date) || (a.kind === "closed" ? -1 : 1));
}

/**
 * `/availability`: the advisor's hours, as a host's — the schedule's week
 * drawn as a week view (capsules to switch when there are several, its
 * editor and the way to make another beside the part's name), the dates it
 * closes or opens beyond its week when any are ahead, then the booking rules
 * as three tiles, each its value and "change", which opens the rule in a
 * popup that saves just it. While the record is read the page is those parts'
 * shape.
 *
 * Without an API answer the page shows the prototype's figures for `state`.
 */
export function GlobalAvailabilityScreen({ state = "default" }: { readonly state?: GlobalAvailabilityState }) {
  const t = useTranslations("availability");
  const s = useTranslations("schedule");
  const locale = useLocale();
  const now = useMountTime();
  const resource = useResource<GlobalAvailability>("availability/global", () => availabilityApi.getGlobal());
  const profiles = useResource<AvailabilityProfile[]>("availability/profiles", () => availabilityApi.getProfiles());
  const [editing, setEditing] = useState<Rule | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);

  const data = resource.data;
  const fixture = GLOBAL_AVAILABILITY[state];
  const rules: Rules = data
    ? {
        horizon: data.bookingHorizonDays,
        buffer: data.bufferMinutes,
        limit: data.dailyConsultationLimitMinutes === null ? null : data.dailyConsultationLimitMinutes / 60,
      }
    : {
        horizon: fixture.horizonDays ?? fixture.customHorizonDays ?? 60,
        buffer: fixture.bufferMinutes ?? fixture.customBufferMinutes ?? 0,
        limit: state === "default" ? null : (fixture.dailyLimitHours ?? fixture.customDailyLimitHours ?? null),
      };

  const save = async (next: Rules) => {
    await availabilityApi.saveGlobal({
      bookingHorizonDays: next.horizon,
      bufferMinutes: next.buffer,
      minimumBookingNoticeMinutes: data?.minimumBookingNoticeMinutes ?? 0,
      dailyConsultationLimitMinutes: next.limit === null ? null : Math.round(next.limit * 60),
    });
    invalidate("availability/global");
    invalidate("advisors/me/services");
    invalidate("services/");
    resource.reload();
  };

  const loading = (resource.loading && !data) || (profiles.loading && !profiles.data);
  const failure = resource.error ?? profiles.error;
  const sets = profiles.data ?? [];
  const shown = sets.find((profile) => profile.id === shownId) ?? sets[0];
  const today = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const dates = shown ? datesAhead(shown, today) : [];
  const dateName = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const tiles: readonly { readonly rule: Rule; readonly label: string; readonly value: string }[] = [
    { rule: "horizon", label: t("horizonLabel"), value: t("days", { count: rules.horizon }) },
    { rule: "buffer", label: t("bufferLabel"), value: rules.buffer === 0 ? t("noBuffer") : t("minutes", { count: rules.buffer }) },
    { rule: "limit", label: t("limitLabel"), value: rules.limit === null ? t("limitOffTitle") : t("hours", { count: rules.limit }) },
  ];

  return (
    <WorkHub tab="availability">
      {loading ? (
        <HoursSkeleton label={t("loading")} />
      ) : failure && !data ? (
        <div className="mt-5 lg:mt-8">
          <ApiErrorCard
            error={failure}
            onRetry={() => {
              resource.reload();
              profiles.reload();
            }}
            title={t("loadFailed")}
          />
        </div>
      ) : (
        <div className={PAGE}>
          <DeskSection
            action={
              shown ? (
                <div className="flex shrink-0 items-center gap-2">
                  <DeskRowAction href={`/availability/profiles/edit?id=${encodeURIComponent(shown.id)}`}>{t("edit")}</DeskRowAction>
                  <DeskRowAction href="/availability/profiles/new">
                    <Plus aria-hidden />
                    {t("createProfile")}
                  </DeskRowAction>
                </div>
              ) : undefined
            }
            className="mt-5 lg:mt-8"
            id="hours-week"
            title={t("profilesLabel")}
          >
            {profiles.error ? (
              <ApiErrorCard className={BODY_GAP} error={profiles.error} onRetry={profiles.reload} title={s("loadFailed")} />
            ) : shown ? (
              <>
                {sets.length > 1 ? (
                  <div className={CAPSULES_GAP}>
                    <DeskFilter
                      label={t("profilesLabel")}
                      onChange={setShownId}
                      options={sets.map((profile) => ({ key: profile.id, label: profile.name }))}
                      value={shown.id}
                    />
                  </div>
                ) : null}
                <div className={BODY_GAP}>
                  <WeekSchedule windows={shown.weeklyWindows} />
                </div>
              </>
            ) : (
              <div className={cn(BODY_GAP, "flex w-full flex-col items-center gap-3 rounded-2xl border border-border px-6 py-12 text-center lg:gap-5 lg:py-20")}>
                <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
                  <CalendarClock aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <h3 className="text-base font-semibold text-foreground lg:text-frame-figure">{t("emptyTitle")}</h3>
                  <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{t("emptyBody")}</p>
                </div>
                <Button
                  className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
                  nativeButton={false}
                  render={<Link href="/availability/profiles/new" />}
                >
                  <Plus aria-hidden />
                  {t("createProfile")}
                </Button>
              </div>
            )}
          </DeskSection>

          {dates.length > 0 ? (
            <DeskSection className={NEXT_PART} id="hours-dates" title={s("datesTitle")}>
              <ul className="flex flex-col">
                {dates.map((note) => (
                  <DeskRow
                    detail={
                      <span className="tabular-nums">
                        {note.kind === "open"
                          ? t("openRange", { range: note.ranges.join(", ") })
                          : note.allDay
                            ? t("closedAllDay")
                            : t("closedRange", { range: note.ranges.join(", ") })}
                      </span>
                    }
                    key={`${note.date}-${note.kind}`}
                    label={dateName.format(new Date(`${note.date}T12:00:00Z`))}
                  />
                ))}
              </ul>
            </DeskSection>
          ) : null}

          <DeskSection className={NEXT_PART} id="hours-rules" title={t("rulesTitle")}>
            <ul className={cn(BODY_GAP, TILES)}>
              {tiles.map((tile) => (
                <li className={TILE} key={tile.rule}>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm text-muted-foreground lg:text-frame-meta">{tile.label}</span>
                    <span className="text-xl font-semibold text-foreground lg:text-frame-figure">{tile.value}</span>
                  </div>
                  <DeskRowAction onClick={() => setEditing(tile.rule)}>{t("change")}</DeskRowAction>
                </li>
              ))}
            </ul>
          </DeskSection>
        </div>
      )}

      {editing === "horizon" ? (
        <RuleDialog
          custom={{ ...CUSTOM_BOUNDS.horizonDays, unit: t("dayUnit"), problem: t("invalidHorizon"), whole: true }}
          onClose={() => setEditing(null)}
          onSave={(next) => save({ ...rules, horizon: next ?? rules.horizon })}
          options={HORIZON_DAY_OPTIONS.map((days) => ({ value: days, label: t("days", { count: days }) }))}
          title={t("horizonLabel")}
          value={rules.horizon}
        />
      ) : null}
      {editing === "buffer" ? (
        <RuleDialog
          custom={{ ...CUSTOM_BOUNDS.bufferMinutes, unit: t("minuteUnit"), problem: t("invalidBuffer"), whole: true }}
          onClose={() => setEditing(null)}
          onSave={(next) => save({ ...rules, buffer: next ?? 0 })}
          options={BUFFER_MINUTE_OPTIONS.map((minutes) => ({ value: minutes, label: minutes === 0 ? t("noBuffer") : t("minutes", { count: minutes }) }))}
          title={t("bufferLabel")}
          value={rules.buffer}
        />
      ) : null}
      {editing === "limit" ? (
        <RuleDialog
          custom={{ ...CUSTOM_BOUNDS.dailyLimitHours, unit: t("hourUnit"), problem: t("invalidLimit"), whole: false }}
          onClose={() => setEditing(null)}
          onSave={(next) => save({ ...rules, limit: next })}
          options={[
            { value: null, label: t("limitOffTitle") },
            ...DAILY_LIMIT_HOUR_OPTIONS.map((hours) => ({ value: hours, label: t("hours", { count: hours }) })),
          ]}
          title={t("limitLabel")}
          value={rules.limit}
        />
      ) : null}
    </WorkHub>
  );
}

/**
 * One rule in a popup — the settings page's: its name, the choices as
 * capsules with the chosen one in ink, a number of one's own after
 * "กำหนดเอง", and cancel and save. Saving sends this rule with the others as
 * they stand, and closes once the record is stored.
 */
function RuleDialog({ title, options, value, custom, onSave, onClose }: {
  readonly title: string;
  /** The capsules; `null` is "none" (no daily ceiling). */
  readonly options: readonly { readonly value: number | null; readonly label: string }[];
  readonly value: number | null;
  readonly custom: { readonly min: number; readonly max: number; readonly unit: string; readonly problem: string; readonly whole: boolean };
  readonly onSave: (next: number | null) => Promise<void>;
  readonly onClose: () => void;
}) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const preset = options.some((option) => option.value === value);
  const [choice, setChoice] = useState<number | null | "custom">(preset ? value : "custom");
  const [typed, setTyped] = useState(preset || value === null ? "" : String(value));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    let next: number | null;
    if (choice === "custom") {
      const number = Number(typed.trim());
      const fits = typed.trim() !== "" && Number.isFinite(number) && number >= custom.min && number <= custom.max;
      const shaped = custom.whole ? Number.isInteger(number) : Number.isInteger(number * 60);
      if (!fits || !shaped) {
        setProblem(custom.problem);
        return;
      }
      next = number;
    } else {
      next = choice;
    }
    setBusy(true);
    setProblem(null);
    void onSave(next)
      .then(onClose)
      .catch((cause: unknown) => {
        setProblem(cause instanceof Error ? cause.message : t("saveFailed"));
        setBusy(false);
      });
  };

  const capsule = (key: string, selected: boolean, label: string, onPick: () => void) => (
    <Button
      aria-checked={selected}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium shadow-none lg:h-12 lg:px-5 lg:text-frame-meta",
        selected
          ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
      key={key}
      onClick={onPick}
      role="radio"
      type="button"
      variant="ghost"
    >
      {label}
    </Button>
  );

  return (
    <SettingsDialog
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
      open
      title={title}
    >
      <div className="flex flex-col gap-4">
        <div aria-label={title} className="flex flex-wrap gap-2 lg:gap-3" role="radiogroup">
          {options.map((option) => capsule(String(option.value), choice === option.value, option.label, () => setChoice(option.value)))}
          {capsule("custom", choice === "custom", t("custom"), () => setChoice("custom"))}
        </div>
        {choice === "custom" ? (
          <div className="flex items-center gap-3">
            <Input
              aria-label={title}
              autoFocus
              className="h-11 w-28 shrink-0 rounded-xl border-accented bg-card px-4 font-latin text-base shadow-none lg:h-12"
              inputMode="numeric"
              onChange={(event) => setTyped(event.target.value)}
              value={typed}
            />
            <span className="text-sm text-muted-foreground lg:text-frame-meta">{custom.unit}</span>
          </div>
        ) : null}
        {problem ? (
          <p className="text-sm text-destructive" role="alert">
            {problem}
          </p>
        ) : null}
      </div>
      <div className={SETTINGS_DIALOG_ACTIONS}>
        <Button className={settingsPill("ghost")} disabled={busy} onClick={onClose} type="button" variant="ghost">
          {c("cancel")}
        </Button>
        <Button className={settingsPill("solid")} disabled={busy} onClick={submit} type="button" variant="ghost">
          {busy ? t("saving") : t("save")}
        </Button>
      </div>
    </SettingsDialog>
  );
}

/**
 * The page's own shape while it is read, part for part: the schedule's name
 * row with its two capsules over the week view's bones (one schedule, an
 * office week — the shape most land in), then the rules' name over the three
 * tiles, each line one line box of its text's step (`h-lh`) with the bone
 * inside. The dates part only shows when a schedule has dates ahead, so it
 * has no bones.
 */
function HoursSkeleton({ label }: { readonly label: string }) {
  const name = (width: string, action?: ReactNode) => (
    <div className="flex min-h-11 items-end justify-between gap-3">
      <span className="flex h-lh items-center text-base lg:text-frame-body">
        <span className={cn(DESK_BONE, "h-4 rounded lg:h-5", width)} />
      </span>
      {action}
    </div>
  );
  return (
    <div aria-busy className={PAGE}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="mt-5 flex flex-col lg:mt-8">
        {name(
          "w-24",
          <span className="flex shrink-0 items-center gap-2">
            <span className={cn(DESK_BONE, "h-8 w-14 rounded-full lg:h-11 lg:w-20")} />
            <span className={cn(DESK_BONE, "h-8 w-28 rounded-full lg:h-11 lg:w-40")} />
          </span>,
        )}
        <div className={BODY_GAP}>
          <WeekScheduleBones />
        </div>
      </div>
      <div aria-hidden className={cn("flex flex-col", NEXT_PART)}>
        {name("w-28")}
        <ul className={cn(BODY_GAP, TILES)}>
          {[0, 1, 2].map((tile) => (
            <li className={TILE} key={tile}>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex h-lh items-center text-sm lg:text-frame-meta">
                  <span className={cn(DESK_BONE, "h-3.5 w-24 rounded lg:h-4")} />
                </span>
                <span className="flex h-lh items-center text-xl lg:text-frame-figure">
                  <span className={cn(DESK_BONE, "h-5 w-16 rounded lg:h-6 lg:w-20")} />
                </span>
              </div>
              <span className={cn(DESK_BONE, "h-8 w-16 shrink-0 rounded-full lg:h-11 lg:w-20")} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
