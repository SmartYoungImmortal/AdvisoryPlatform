"use client";

import { CalendarClock, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PILL_BONE, WeekHours, WeekHoursBones } from "@/components/availability/week-hours";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DESK_BONE, DeskEmpty } from "@/components/work/desk-parts";
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

/** The page under the frame's band, as the calendar's. */
const PAGE = "mt-5 flex w-full min-w-0 flex-col lg:mt-8";

/** The grey capsule of the calendar's head (40 tall, 14/500), and its round button. */
const PILL =
  "h-10 gap-1.5 rounded-full bg-muted px-4 text-sm font-medium text-foreground hover:bg-muted/70 hover:text-foreground lg:text-frame-label";
const ROUND = "size-10 rounded-full bg-muted text-foreground hover:bg-muted/70 hover:text-foreground";

/** The set's name at the head, the calendar's month: large, in the title's face. */
const TITLE = "truncate font-hero text-2xl font-medium tracking-tight text-hero-ink lg:text-frame-title";

const MENU = "min-w-56 rounded-2xl p-1.5";
const MENU_ITEM = "h-10 rounded-xl pl-3 text-sm";

/**
 * `/availability`: the advisor's hours drawn as the calendar draws a week.
 * At the head, as the calendar's month, the set of hours shown (a menu
 * beside it switches between sets and makes a new one), and at its right the
 * way into that set's editor and a new set. Under it the three booking rules
 * as grey capsules, each its value, each opening its rule in a popup that
 * saves just it. Then the week, its open hours as blocks.
 *
 * Without an API answer the page shows the prototype's figures for `state`.
 */
export function GlobalAvailabilityScreen({ state = "default" }: { readonly state?: GlobalAvailabilityState }) {
  const t = useTranslations("availability");
  const resource = useResource<GlobalAvailability>("availability/global", () => availabilityApi.getGlobal());
  const profiles = useResource<AvailabilityProfile[]>("availability/profiles", () => availabilityApi.getProfiles());
  const [editing, setEditing] = useState<Rule | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);

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
  const shown = sets.find((profile) => profile.id === chosenId) ?? sets[0];

  // The rules as the calendar's grey capsules: what each is, its value, the way to change it.
  const ruleCapsules: readonly { readonly rule: Rule; readonly label: string; readonly value: string }[] = [
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className={TITLE}>{shown ? shown.name : t("profilesLabel")}</h2>
              {sets.length > 0 ? <ProfileMenu chosen={shown?.id ?? ""} onPick={setChosenId} profiles={sets} /> : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {shown ? (
                <Button
                  className={PILL}
                  nativeButton={false}
                  render={<Link href={`/availability/profiles/edit?id=${encodeURIComponent(shown.id)}`} />}
                  variant="ghost"
                >
                  {t("editorTitle")}
                </Button>
              ) : null}
              <Button
                aria-label={t("createTitle")}
                className={ROUND}
                nativeButton={false}
                render={<Link href="/availability/profiles/new" />}
                size="icon"
                variant="ghost"
              >
                <Plus aria-hidden className="size-5" />
              </Button>
            </div>
          </div>

          <div aria-label={t("rulesTitle")} className="mt-4 flex flex-wrap gap-2 lg:mt-5 lg:gap-3" role="group">
            {ruleCapsules.map(({ rule, label, value }) => (
              <Button className={PILL} key={rule} onClick={() => setEditing(rule)} type="button" variant="ghost">
                <span className="text-muted-foreground">{label}</span>
                {value}
                <ChevronDown aria-hidden className="size-4" />
              </Button>
            ))}
          </div>

          {shown ? (
            <WeekHours windows={shown.weeklyWindows} />
          ) : (
            <DeskEmpty
              action={{ label: t("createTitle"), href: "/availability/profiles/new" }}
              body={t("emptyBody")}
              icon={CalendarClock}
              title={t("emptyTitle")}
            />
          )}
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
 * The sets of hours as a menu by the head's name: each set to show, then
 * the way to make another.
 */
function ProfileMenu({ profiles, chosen, onPick }: {
  readonly profiles: readonly AvailabilityProfile[];
  readonly chosen: string;
  readonly onPick: (id: string) => void;
}) {
  const t = useTranslations("availability");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={t("profilesLabel")} className="size-10 rounded-full text-foreground" size="icon" type="button" variant="ghost">
            <ChevronDown aria-hidden className="size-6" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className={MENU}>
        <DropdownMenuRadioGroup onValueChange={(value) => onPick(value as string)} value={chosen}>
          {profiles.map((profile) => (
            <DropdownMenuRadioItem className={MENU_ITEM} key={profile.id} value={profile.id}>
              {profile.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={MENU_ITEM} render={<Link href="/availability/profiles/new" />}>
          <Plus aria-hidden />
          {t("createTitle")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The page's own shape while it is read: the head's name and its two buttons, the three rule capsules, then the week. */
function HoursSkeleton({ label }: { readonly label: string }) {
  return (
    <div aria-busy className={PAGE}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="flex items-center justify-between gap-3">
        <span className={cn(TITLE, "flex h-lh items-center")}>
          <span className={cn(DESK_BONE, "h-6 w-48 rounded-md lg:h-8 lg:w-72")} />
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className={cn(PILL_BONE, "w-32")} />
          <span className={cn(PILL_BONE, "w-10")} />
        </span>
      </div>
      <div aria-hidden className="mt-4 flex flex-wrap gap-2 lg:mt-5 lg:gap-3">
        {["w-52", "w-48", "w-56"].map((width) => (
          <span className={cn(PILL_BONE, width)} key={width} />
        ))}
      </div>
      <WeekHoursBones />
    </div>
  );
}
