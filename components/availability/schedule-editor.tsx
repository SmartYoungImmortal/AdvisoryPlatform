"use client";

import { CalendarOff, Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { useQueryValue } from "@/components/bookings/booking-flow";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DESK_BOX, DESK_PILL, DeskPage } from "@/components/work/desk-page";
import { invalidate, useResource } from "@/lib/api/use-resource";
import {
  availabilityApi,
  type AvailabilityProfile,
  type BlockedAvailabilityPeriod,
  type SpecificAvailabilityWindow,
  type WeeklyAvailabilityWindow,
} from "@/lib/availability/api";
import { cn } from "@/lib/utils";

/**
 * `/availability/profiles/new` and `/availability/profiles/edit?id=`: one
 * schedule on one page, set the way people think about their week. Each day
 * is a switch and its time ranges — as many as the day has, each on the
 * half-hour grid the bookings use — with a copy to the other open days and a
 * few ready weeks to start from. Under it the dates that differ from the week:
 * a day off, a few hours off, or extra hours on a day that is normally closed.
 *
 * It writes the profile the API keeps (`weeklyWindows`, `specificWindows`,
 * `blockedPeriods`) in one save. A day's ranges are checked here for
 * overlap and order before the API would refuse them.
 */

/** ISO weekday order, Monday first, as `dayOfWeek` counts (1–7). */
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAYS)[number];

/** Every half hour of the day: what a range may start or end on. */
const TIMES = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hours}:${index % 2 === 0 ? "00" : "30"}`;
});

type Range = { readonly key: string; start: string; end: string };
type DayPlan = { open: boolean; ranges: Range[] };
type Week = Record<Day, DayPlan>;

type Exception =
  | { readonly key: string; readonly date: string; readonly kind: "off" }
  | { readonly key: string; readonly date: string; readonly kind: "offPart" | "extra"; start: string; end: string };

let keys = 0;
const nextKey = () => `k${(keys += 1)}`;
const range = (start: string, end: string): Range => ({ key: nextKey(), start, end });

function emptyWeek(): Week {
  return Object.fromEntries(DAYS.map((day) => [day, { open: false, ranges: [] }])) as unknown as Week;
}

function weekOf(profile: AvailabilityProfile | undefined): Week {
  const week = emptyWeek();
  if (!profile) {
    // A new schedule starts as office hours on weekdays: a week to edit is
    // easier to start from than an empty one.
    for (const day of DAYS.slice(0, 5)) week[day] = { open: true, ranges: [range("09:00", "17:00")] };
    return week;
  }
  for (const window of profile.weeklyWindows) {
    const day = DAYS[window.dayOfWeek - 1];
    if (!day) continue;
    week[day].open = true;
    week[day].ranges.push(range(window.startTime.slice(0, 5), window.endTime.slice(0, 5)));
  }
  for (const day of DAYS) week[day].ranges.sort((a, b) => a.start.localeCompare(b.start));
  return week;
}

function exceptionsOf(profile: AvailabilityProfile | undefined): Exception[] {
  if (!profile) return [];
  const blocked: Exception[] = profile.blockedPeriods.map((period) =>
    period.startTime && period.endTime
      ? { key: nextKey(), date: period.blockedDate, kind: "offPart", start: period.startTime.slice(0, 5), end: period.endTime.slice(0, 5) }
      : { key: nextKey(), date: period.blockedDate, kind: "off" },
  );
  const extra: Exception[] = profile.specificWindows.map((window) => ({
    key: nextKey(),
    date: window.availableDate,
    kind: "extra",
    start: window.startTime.slice(0, 5),
    end: window.endTime.slice(0, 5),
  }));
  return [...blocked, ...extra].sort((a, b) => a.date.localeCompare(b.date));
}

/** A day's ranges that end before they start, or run into each other. */
function rangesProblem(ranges: readonly Range[]): "order" | "overlap" | null {
  const sorted = ranges.toSorted((a, b) => a.start.localeCompare(b.start));
  for (const [index, item] of sorted.entries()) {
    if (item.start >= item.end) return "order";
    const before = sorted[index - 1];
    if (before && before.end > item.start) return "overlap";
  }
  return null;
}

/** Ready weeks to start from. */
const PRESETS: readonly {
  readonly key: "office" | "everyday" | "evenings" | "weekend";
  readonly days: readonly Day[];
  readonly start: string;
  readonly end: string;
}[] = [
  { key: "office", days: ["mon", "tue", "wed", "thu", "fri"], start: "09:00", end: "17:00" },
  { key: "everyday", days: DAYS, start: "09:00", end: "18:00" },
  { key: "evenings", days: ["mon", "tue", "wed", "thu", "fri"], start: "18:00", end: "21:00" },
  { key: "weekend", days: ["sat", "sun"], start: "10:00", end: "16:00" },
];

/* ------------------------------------------------------------------ pieces */

const TRIGGER = "h-10! rounded-xl border-accented bg-card px-3 text-sm shadow-none lg:h-11! lg:text-frame-meta";

/** A choice from a short list, on the shadcn select. */
function Pick<T extends string>({ value, onChange, label, items, className }: {
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly label: string;
  readonly items: readonly { readonly value: T; readonly label: string }[];
  readonly className?: string;
}) {
  return (
    <Select items={items} onValueChange={(next) => onChange(next as T)} value={value}>
      <SelectTrigger aria-label={label} className={cn(TRIGGER, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72" sideOffset={6}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TimeSelect({ value, onChange, label, from = 0 }: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly from?: number;
}) {
  return (
    <Pick
      className="w-24 font-latin tabular-nums"
      items={TIMES.slice(from).map((time) => ({ value: time, label: time }))}
      label={label}
      onChange={onChange}
      value={value}
    />
  );
}

function Section({ title, hint, action, children }: {
  readonly title: string;
  readonly hint?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0 lg:gap-5 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground lg:text-frame-heading">{title}</h2>
          {hint ? <p className="text-sm text-muted-foreground lg:text-frame-meta">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ screen */

export function ScheduleEditorScreen({ mode }: { readonly mode: "create" | "edit" }) {
  const t = useTranslations("schedule");
  const id = useQueryValue("id");
  const profiles = useResource<AvailabilityProfile[]>(
    "availability/profiles",
    useCallback((signal: AbortSignal) => availabilityApi.getProfiles(signal), []),
  );

  if (mode === "edit" && (profiles.error || !profiles.data)) {
    return (
      <DeskPage backHref="/availability/profiles" title={t("editTitle")}>
        <div className="mt-5 lg:mt-8">
          {profiles.error ? (
            <ApiErrorCard error={profiles.error} onRetry={profiles.reload} title={t("loadFailed")} />
          ) : (
            <div aria-busy className="h-96 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
          )}
        </div>
      </DeskPage>
    );
  }
  const profile = mode === "edit" ? profiles.data?.find((item) => item.id === id) : undefined;
  if (mode === "edit" && !profile) {
    return (
      <DeskPage backHref="/availability/profiles" title={t("editTitle")}>
        <p className="mt-5 text-sm text-muted-foreground lg:mt-8 lg:text-frame-meta" role="alert">
          {t("notFound")}
        </p>
      </DeskPage>
    );
  }
  return <Editor key={profile?.id ?? "new"} profile={profile} />;
}

function Editor({ profile }: { readonly profile?: AvailabilityProfile }) {
  const t = useTranslations("schedule");
  const d = useTranslations("availability");
  const c = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [name, setName] = useState(profile?.name ?? t("defaultName"));
  const [week, setWeek] = useState<Week>(() => weekOf(profile));
  const [exceptions, setExceptions] = useState<Exception[]>(() => exceptionsOf(profile));
  const [draft, setDraft] = useState<{ date: string; kind: Exception["kind"]; start: string; end: string }>({
    date: "",
    kind: "off",
    start: "09:00",
    end: "12:00",
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setDay = (day: Day, change: (plan: DayPlan) => DayPlan) =>
    setWeek((current) => ({ ...current, [day]: change(current[day]) }));

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const next = emptyWeek();
    for (const day of preset.days) next[day] = { open: true, ranges: [range(preset.start, preset.end)] };
    setWeek(next);
  };

  const copyToAll = (from: Day) =>
    setWeek((current) => {
      const next = { ...current };
      for (const day of DAYS) {
        if (day === from || !current[day].open) continue;
        next[day] = { open: true, ranges: current[from].ranges.map((item) => range(item.start, item.end)) };
      }
      return next;
    });

  const addException = () => {
    if (!draft.date) return setProblem(t("pickDate"));
    if (draft.kind !== "off" && draft.start >= draft.end) return setProblem(t("errorOrder"));
    setProblem(null);
    const item: Exception =
      draft.kind === "off"
        ? { key: nextKey(), date: draft.date, kind: "off" }
        : { key: nextKey(), date: draft.date, kind: draft.kind, start: draft.start, end: draft.end };
    setExceptions((current) => [...current, item].sort((a, b) => a.date.localeCompare(b.date)));
    setDraft((current) => ({ ...current, date: "" }));
  };

  async function save() {
    if (!name.trim()) return setProblem(t("nameRequired"));
    for (const day of DAYS) {
      if (!week[day].open) continue;
      if (week[day].ranges.length === 0) return setProblem(t("dayEmpty", { day: d(`weekday.${day}`) }));
      const issue = rangesProblem(week[day].ranges);
      if (issue) return setProblem(t(issue === "order" ? "errorOrderDay" : "errorOverlapDay", { day: d(`weekday.${day}`) }));
    }
    const weeklyWindows: WeeklyAvailabilityWindow[] = DAYS.flatMap((day, index) =>
      week[day].open ? week[day].ranges.map((item) => ({ dayOfWeek: index + 1, startTime: item.start, endTime: item.end })) : [],
    );
    const specificWindows: SpecificAvailabilityWindow[] = exceptions.flatMap((item) =>
      item.kind === "extra" ? [{ availableDate: item.date, startTime: item.start, endTime: item.end }] : [],
    );
    const blockedPeriods: BlockedAvailabilityPeriod[] = exceptions.flatMap((item) =>
      item.kind === "off"
        ? [{ blockedDate: item.date }]
        : item.kind === "offPart"
          ? [{ blockedDate: item.date, startTime: item.start, endTime: item.end }]
          : [],
    );
    setSaving(true);
    setProblem(null);
    try {
      const values = { name: name.trim(), weeklyWindows, specificWindows, blockedPeriods };
      if (profile) await availabilityApi.updateProfile(profile.id, values);
      else await availabilityApi.createProfile(values);
      invalidate("availability/profiles");
      invalidate("advisors/me/services");
      invalidate("services/");
      router.push("/availability/profiles");
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  }

  const dateLabel = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <DeskPage backHref="/availability/profiles" subtitle={t("subtitle")} title={profile ? t("editTitle") : t("createTitle")}>
      <form
        className="mt-5 flex w-full max-w-200 flex-col gap-8 lg:mt-8 lg:gap-10"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Section title={t("nameLabel")}>
          <Input
            aria-label={t("nameLabel")}
            className="h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base lg:text-frame-body"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </Section>

        <Section hint={t("weekHint")} title={t("weekTitle")}>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                className="h-9 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted lg:h-10 lg:px-4 lg:text-frame-meta"
                key={preset.key}
                onClick={() => applyPreset(preset)}
                type="button"
                variant="ghost"
              >
                {t(`preset.${preset.key}`)}
              </Button>
            ))}
          </div>

          <ul className={cn(DESK_BOX, "flex flex-col divide-y divide-border")}>
            {DAYS.map((day) => {
              const plan = week[day];
              return (
                <li className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:gap-5 lg:px-6" key={day}>
                  <label className="flex h-10 shrink-0 items-center gap-3 md:w-40 lg:h-11">
                    <Switch
                      checked={plan.open}
                      onCheckedChange={(open) =>
                        setDay(day, (current) => ({
                          open,
                          ranges: open && current.ranges.length === 0 ? [range("09:00", "17:00")] : current.ranges,
                        }))
                      }
                    />
                    <span className={cn("text-base font-medium lg:text-frame-body", plan.open ? "text-foreground" : "text-muted-foreground")}>
                      {d(`weekday.${day}`)}
                    </span>
                  </label>
                  {plan.open ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {plan.ranges.map((item) => (
                        <div className="flex flex-wrap items-center gap-2" key={item.key}>
                          <TimeSelect
                            label={t("from")}
                            onChange={(start) =>
                              setDay(day, (current) => ({
                                ...current,
                                ranges: current.ranges.map((entry) => (entry.key === item.key ? { ...entry, start } : entry)),
                              }))
                            }
                            value={item.start}
                          />
                          <span aria-hidden className="text-muted-foreground">
                            –
                          </span>
                          <TimeSelect
                            from={1}
                            label={t("to")}
                            onChange={(end) =>
                              setDay(day, (current) => ({
                                ...current,
                                ranges: current.ranges.map((entry) => (entry.key === item.key ? { ...entry, end } : entry)),
                              }))
                            }
                            value={item.end}
                          />
                          <Button
                            aria-label={t("removeRange")}
                            className="size-10 rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDay(day, (current) => {
                                const ranges = current.ranges.filter((entry) => entry.key !== item.key);
                                return { open: ranges.length > 0, ranges };
                              })
                            }
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="h-9 rounded-full px-3 text-sm font-medium text-foreground"
                          onClick={() => {
                            const last = plan.ranges.at(-1);
                            const startIndex = last ? Math.min(TIMES.indexOf(last.end) + 2, 46) : 18;
                            setDay(day, (current) => ({
                              ...current,
                              ranges: [...current.ranges, range(TIMES[startIndex] ?? "09:00", TIMES[Math.min(startIndex + 2, 47)] ?? "10:00")],
                            }));
                          }}
                          type="button"
                          variant="ghost"
                        >
                          <Plus aria-hidden className="size-4" />
                          {t("addRange")}
                        </Button>
                        <Button
                          className="h-9 rounded-full px-3 text-sm font-medium text-foreground"
                          onClick={() => copyToAll(day)}
                          type="button"
                          variant="ghost"
                        >
                          <Copy aria-hidden className="size-4" />
                          {t("copyToAll")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="flex h-10 items-center text-sm text-muted-foreground lg:h-11 lg:text-frame-meta">{t("closed")}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section hint={t("datesHint")} title={t("datesTitle")}>
          {exceptions.length > 0 ? (
            <ul className={cn(DESK_BOX, "flex flex-col divide-y divide-border")}>
              {exceptions.map((item) => (
                <li className="flex items-center gap-3 px-4 py-3.5 lg:px-6" key={item.key}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted lg:size-10">
                    {item.kind === "extra" ? <Plus aria-hidden className="size-4" /> : <CalendarOff aria-hidden className="size-4" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground lg:text-frame-body">{dateLabel(item.date)}</span>
                    <span className="text-xs text-muted-foreground lg:text-frame-meta">
                      {item.kind === "off" ? t("kind.off") : `${t(`kind.${item.kind}`)} · ${item.start}–${item.end}`}
                    </span>
                  </span>
                  <Button
                    aria-label={t("removeDate")}
                    className="size-10 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setExceptions((current) => current.filter((entry) => entry.key !== item.key))}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4 lg:p-5">
            <p className="text-sm font-medium text-foreground lg:text-frame-meta">{t("addDateTitle")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={t("date")}
                className="h-10 w-auto rounded-xl border-accented bg-card px-3 font-latin text-sm shadow-none lg:h-11"
                onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                type="date"
                value={draft.date}
              />
              <Pick<Exception["kind"]>
                items={[
                  { value: "off", label: t("kind.off") },
                  { value: "offPart", label: t("kind.offPart") },
                  { value: "extra", label: t("kind.extra") },
                ]}
                label={t("kindLabel")}
                onChange={(kind) => setDraft((current) => ({ ...current, kind }))}
                value={draft.kind}
              />
              {draft.kind !== "off" ? (
                <>
                  <TimeSelect label={t("from")} onChange={(start) => setDraft((current) => ({ ...current, start }))} value={draft.start} />
                  <span aria-hidden className="text-muted-foreground">
                    –
                  </span>
                  <TimeSelect from={1} label={t("to")} onChange={(end) => setDraft((current) => ({ ...current, end }))} value={draft.end} />
                </>
              ) : null}
              <Button className={cn(authPill(false), "h-10 w-auto px-4 text-sm md:h-10 md:px-4 md:text-sm lg:h-11")} onClick={addException} type="button" variant="outline">
                <Plus aria-hidden />
                {t("addDate")}
              </Button>
            </div>
          </div>
        </Section>

        {problem ? (
          <p className="text-sm text-destructive lg:text-frame-meta" role="alert">
            {problem}
          </p>
        ) : null}

        <div className="flex w-full items-center gap-3 lg:justify-end">
          <Button className={cn(authPill(false), DESK_PILL, "flex-1 lg:flex-none")} nativeButton={false} render={<Link href="/availability/profiles" />} variant="outline">
            {c("cancel")}
          </Button>
          <Button className={cn(authPill(true), DESK_PILL, "flex-[2] lg:flex-none")} disabled={saving} type="submit">
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </DeskPage>
  );
}
