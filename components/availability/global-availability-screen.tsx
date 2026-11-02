"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useWeekLine } from "@/components/availability/profiles-screen";
import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESK_BONE, DeskRow, DeskRowAction, DeskSection } from "@/components/work/desk-parts";
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

/**
 * `/availability`: the advisor's hours, laid out as the settings page is —
 * the sets of hours as rows (each its week and the way into its editor, the
 * way to make another beside the part's name), then the booking rules as
 * rows, each its value and "change", which opens the rule in a popup that
 * saves just it. While the record is read the page is those rows' shape.
 *
 * Without an API answer the page shows the prototype's figures for `state`.
 */
export function GlobalAvailabilityScreen({ state = "default" }: { readonly state?: GlobalAvailabilityState }) {
  const t = useTranslations("availability");
  const s = useTranslations("schedule");
  const weekLine = useWeekLine();
  const resource = useResource<GlobalAvailability>("availability/global", () => availabilityApi.getGlobal());
  const profiles = useResource<AvailabilityProfile[]>("availability/profiles", () => availabilityApi.getProfiles());
  const [editing, setEditing] = useState<Rule | null>(null);

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
        <div className="flex w-full max-w-220 flex-col">
          <DeskSection
            action={
              <DeskRowAction href="/availability/profiles/new">
                <Plus aria-hidden />
                {s("createTitle")}
              </DeskRowAction>
            }
            className="mt-5 lg:mt-8"
            id="hours-sets"
            title={t("profilesLabel")}
          >
            <ul className="flex flex-col">
              {(profiles.data ?? []).map((profile) => (
                <DeskRow detail={<span className="font-latin tabular-nums">{weekLine(profile)}</span>} key={profile.id} label={profile.name}>
                  <DeskRowAction href={`/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`}>{t("edit")}</DeskRowAction>
                </DeskRow>
              ))}
            </ul>
          </DeskSection>

          <DeskSection className="mt-8 lg:mt-12" id="hours-rules" title={t("rulesTitle")}>
            <ul className="flex flex-col">
              <DeskRow detail={t("days", { count: rules.horizon })} label={t("horizonLabel")}>
                <DeskRowAction onClick={() => setEditing("horizon")}>{t("change")}</DeskRowAction>
              </DeskRow>
              <DeskRow detail={rules.buffer === 0 ? t("noBuffer") : t("minutes", { count: rules.buffer })} label={t("bufferLabel")}>
                <DeskRowAction onClick={() => setEditing("buffer")}>{t("change")}</DeskRowAction>
              </DeskRow>
              <DeskRow detail={rules.limit === null ? t("limitOffTitle") : t("hours", { count: rules.limit })} label={t("limitLabel")}>
                <DeskRowAction onClick={() => setEditing("limit")}>{t("change")}</DeskRowAction>
              </DeskRow>
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

/** The page's own shape while it is read: each part's name and its rows, line for line as `DeskRow` draws them. */
function HoursSkeleton({ label }: { readonly label: string }) {
  const part = (rows: number, name: string, action: boolean, className: string) => (
    <div aria-hidden className={cn("flex flex-col", className)}>
      <div className="flex min-h-11 items-end justify-between gap-3">
        <span className="flex h-lh items-center text-base lg:text-frame-body">
          <span className={cn(DESK_BONE, "h-4 rounded", name)} />
        </span>
        {action ? <span className={cn(DESK_BONE, "h-8 w-36 rounded-full lg:h-11 lg:w-44")} /> : null}
      </div>
      <ul className="flex flex-col">
        {Array.from({ length: rows }, (_, row) => (
          <li className="flex items-center gap-4 border-b border-border py-3 md:py-3.5 lg:gap-8 lg:py-5" key={row}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
              <span className="flex h-lh items-center text-sm lg:text-frame-body">
                <span className={cn(DESK_BONE, "h-3.5 w-40 rounded lg:h-4.5")} />
              </span>
              <span className="flex h-lh items-center text-xs lg:text-frame-meta">
                <span className={cn(DESK_BONE, "h-3 w-56 rounded lg:h-4")} />
              </span>
            </span>
            <span className={cn(DESK_BONE, "h-8 w-16 shrink-0 rounded-full lg:h-11 lg:w-20")} />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div aria-busy className="flex w-full max-w-220 flex-col">
      <span className="sr-only">{label}</span>
      {part(2, "w-24", true, "mt-5 lg:mt-8")}
      {part(3, "w-28", false, "mt-8 lg:mt-12")}
    </div>
  );
}
