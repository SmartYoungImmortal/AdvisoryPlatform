"use client";

import Link from "next/link";
import { CalendarRange, ChevronRight, Info, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState, type FormEvent } from "react";

import { authPill } from "@/components/auth/auth-split";
import { ThaiText } from "@/components/mobile/thai-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useWeekLine } from "@/components/availability/profiles-screen";
import { DESK_BOX, DESK_PILL } from "@/components/work/desk-page";
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

/**
 * An option as a capsule, the chosen one filled in ink — the capsules the
 * notification centre and the work desk filter and switch with. A radio
 * underneath, so the form posts the choice and the keyboard moves through
 * the group.
 */
function OptionChip({
  selected = false,
  name,
  value,
  children,
}: {
  readonly selected?: boolean;
  readonly name: string;
  readonly value: string | number;
  readonly children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex h-9 shrink-0 cursor-pointer items-center rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
        "has-[:checked]:border-hero-action has-[:checked]:bg-hero-action has-[:checked]:text-hero-action-foreground",
        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 lg:h-12 lg:px-5 lg:text-frame-meta",
      )}
    >
      <Input className="sr-only size-px border-0 p-0 shadow-none" defaultChecked={selected} name={name} type="radio" value={value} />
      {children}
    </label>
  );
}

/** A setting: its name, what it does, the control, and a line under it when the control needs one. */
function Group({
  label,
  hint,
  children,
  footnote,
}: {
  readonly label: ReactNode;
  /** String, not ReactNode: `ThaiText` reproduces the break points on the raw copy. */
  readonly hint?: string;
  readonly children: ReactNode;
  readonly footnote?: string;
}) {
  return (
    <section className="flex w-full flex-col items-start gap-3 py-6 first:pt-0 lg:gap-4 lg:py-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-body">{label}</h2>
        {hint ? (
          <p className="text-sm text-muted-foreground lg:text-frame-meta">
            <ThaiText>{hint}</ThaiText>
          </p>
        ) : null}
      </div>
      {children}
      {footnote ? (
        <p className="text-xs text-muted-foreground lg:text-frame-label">
          <ThaiText>{footnote}</ThaiText>
        </p>
      ) : null}
    </section>
  );
}

/** The capsules of one setting, wrapping. */
function Options({ children }: { readonly children: ReactNode }) {
  return <div className="flex w-full flex-wrap gap-2 lg:gap-3">{children}</div>;
}

/** The number a "กำหนดเอง" capsule asks for, with its unit after it. */
function CustomValueRow({ value, unit, name }: { readonly value: number; readonly unit: ReactNode; readonly name: string }) {
  return (
    <div className="flex items-center gap-3">
      <Input
        className="h-11 w-28 shrink-0 rounded-xl border-accented bg-card px-4 font-latin text-base shadow-none lg:h-12"
        defaultValue={value}
        inputMode="numeric"
        name={name}
        type="text"
      />
      <span className="text-sm text-muted-foreground lg:text-frame-meta">{unit}</span>
    </div>
  );
}

/** A figure and its unit; the numeral in the Latin face, the unit a step down in the Thai one. */
function Figure({ value, unit }: { readonly value: number; readonly unit: string }) {
  return (
    <>
      {value}
      <span className="font-sans text-sm font-normal text-muted-foreground lg:text-frame-label"> {unit}</span>
    </>
  );
}

/**
 * `/availability`: the advisor's one global availability record — which
 * profiles are in play, how far ahead bookings open, the gap between
 * appointments, and an optional daily ceiling — on the desk's frame. The
 * three figures say what is set now; each setting is its capsules, and the
 * pair at the foot saves or goes back to the desk.
 *
 * The 30-minute slot interval is fixed by the scheduling rules, so it is
 * stated as a note rather than offered as a choice.
 */
export function GlobalAvailabilityScreen({
  state = "default",
}: {
  readonly state?: GlobalAvailabilityState;
}) {
  const t = useTranslations("availability");
  const s = useTranslations("schedule");
  const c = useTranslations("common");
  const weekLine = useWeekLine();
  const resource = useResource<GlobalAvailability>("availability/global", () => availabilityApi.getGlobal());
  const profiles = useResource<AvailabilityProfile[]>("availability/profiles", () => availabilityApi.getProfiles());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState<boolean | null>(null);
  const [customSelection, setCustomSelection] = useState<Partial<Record<"horizon" | "buffer" | "dailyLimit", boolean>>>({});
  const data = resource.data;
  const fixture = data ? {
    horizonDays: HORIZON_DAY_OPTIONS.some((value) => value === data.bookingHorizonDays) ? data.bookingHorizonDays : null,
    bufferMinutes: BUFFER_MINUTE_OPTIONS.some((value) => value === data.bufferMinutes) ? data.bufferMinutes : null,
    dailyLimitHours: data.dailyConsultationLimitMinutes === null ? null : DAILY_LIMIT_HOUR_OPTIONS.some((value) => value * 60 === data.dailyConsultationLimitMinutes) ? data.dailyConsultationLimitMinutes / 60 : null,
    customHorizonDays: HORIZON_DAY_OPTIONS.some((value) => value === data.bookingHorizonDays) ? undefined : data.bookingHorizonDays,
    customBufferMinutes: BUFFER_MINUTE_OPTIONS.some((value) => value === data.bufferMinutes) ? undefined : data.bufferMinutes,
    customDailyLimitHours: data.dailyConsultationLimitMinutes !== null && !DAILY_LIMIT_HOUR_OPTIONS.some((value) => value * 60 === data.dailyConsultationLimitMinutes) ? data.dailyConsultationLimitMinutes / 60 : undefined,
  } : GLOBAL_AVAILABILITY[state];
  const limitOn = limitEnabled ?? (data ? data.dailyConsultationLimitMinutes !== null : state !== "default");
  const customHorizon = customSelection.horizon ?? fixture.horizonDays === null;
  const customBuffer = customSelection.buffer ?? fixture.bufferMinutes === null;
  const customDailyLimit = customSelection.dailyLimit ?? fixture.dailyLimitHours === null;
  const bufferMinutes = fixture.bufferMinutes ?? fixture.customBufferMinutes ?? 0;
  const dailyLimitHours =
    fixture.dailyLimitHours ?? fixture.customDailyLimitHours ?? 0;

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setSaveError(null); setSaved(false);
    const form = new FormData(event.currentTarget);
    const horizonValue = String(form.get("horizon") ?? "60");
    const bufferValue = String(form.get("buffer") ?? "0");
    const limitValue = String(form.get("dailyLimit") ?? "3");
    const horizon = Number(horizonValue === "custom" ? form.get("customHorizon") : horizonValue);
    const buffer = Number(bufferValue === "custom" ? form.get("customBuffer") : bufferValue);
    const limitOn = form.get("limitEnabled") === "on";
    const limitHours = Number(limitValue === "custom" ? form.get("customDailyLimit") : limitValue);
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 365 || !Number.isInteger(buffer) || buffer < 0 || buffer > 120 || (limitOn && (!Number.isFinite(limitHours) || !Number.isInteger(limitHours * 60) || limitHours < 1 || limitHours > 12))) {
      setSaveError("กรุณาตรวจสอบค่า: จองล่วงหน้า 1–365 วัน เว้นช่วง 0–120 นาที และจำกัด 1–12 ชั่วโมง"); setSaving(false); return;
    }
    try {
      await availabilityApi.saveGlobal({ bookingHorizonDays: horizon, bufferMinutes: buffer, minimumBookingNoticeMinutes: data?.minimumBookingNoticeMinutes ?? 0, dailyConsultationLimitMinutes: limitOn ? limitHours * 60 : null });
      invalidate("availability/global"); invalidate("advisors/me/services"); invalidate("services/"); resource.reload(); setSaved(true);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "บันทึกเวลาว่างไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  return (
    <form key={data ? JSON.stringify(data) : state} onSubmit={onSave} onReset={() => {
      setLimitEnabled(null);
      setCustomSelection({});
      setSaved(false);
      setSaveError(null);
    }} onChange={(event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && (input.name === "horizon" || input.name === "buffer" || input.name === "dailyLimit")) {
        setCustomSelection((current) => ({ ...current, [input.name]: input.value === "custom" }));
      }
    }} className="contents">
      <WorkHub tab="availability">
        <div className="mt-5 flex max-w-200 flex-col lg:mt-8">
          {/* The record as the three numbers it is. */}
          <dl className="mb-8 flex w-full max-w-xl rounded-2xl border border-border py-1 md:w-fit lg:mb-10 lg:py-1.5">
            {[
              { label: t("horizonLabel"), value: <Figure unit={t("dayUnit")} value={fixture.horizonDays ?? fixture.customHorizonDays ?? 0} /> },
              { label: t("bufferLabel"), value: bufferMinutes === 0 ? <span className="font-sans text-base">{t("noBuffer")}</span> : <Figure unit={t("minuteUnit")} value={bufferMinutes} /> },
              { label: t("limitLabel"), value: limitOn ? <Figure unit={t("hourUnit")} value={dailyLimitHours} /> : <span className="font-sans text-base">{t("limitOffTitle")}</span> },
            ].map((figure) => (
              <div className="flex flex-1 flex-col items-center px-3 py-2 md:flex-none md:px-5 lg:px-6" key={figure.label}>
                <dt className="order-2 text-xs whitespace-nowrap text-muted-foreground md:text-sm lg:text-frame-label">{figure.label}</dt>
                <dd className="order-1 font-latin text-xl leading-tight font-semibold whitespace-nowrap text-foreground tabular-nums md:text-2xl lg:text-frame-figure">
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col divide-y divide-border">
            {/* The schedules themselves, each its week in a line and the way into
                its editor: the hours are what an advisor comes here to change. */}
            <Group hint={s("listSubtitle")} label={t("profilesLabel")}>
              <ul className={cn(DESK_BOX, "flex w-full flex-col divide-y divide-border")}>
                {(profiles.data ?? []).map((profile) => (
                  <li key={profile.id}>
                    <Link
                      className="flex w-full items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:px-5 lg:py-4"
                      href={`/availability/profiles/edit?id=${encodeURIComponent(profile.id)}`}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted lg:size-10">
                        <CalendarRange aria-hidden className="size-4.5 lg:size-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-base text-foreground lg:text-frame-body">{profile.name}</span>
                        <span className="truncate font-latin text-xs text-muted-foreground tabular-nums lg:text-frame-label">{weekLine(profile)}</span>
                      </span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-base text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:px-5 lg:py-4 lg:text-frame-body"
                    href="/availability/profiles/new"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted lg:size-10">
                      <Plus aria-hidden className="size-4.5 lg:size-5" />
                    </span>
                    {s("createTitle")}
                  </Link>
                </li>
              </ul>
            </Group>

            <Group
              footnote={fixture.horizonDays === null ? t("horizonBounds", CUSTOM_BOUNDS.horizonDays) : undefined}
              hint={t("horizonHint")}
              label={t("horizonLabel")}
            >
              <Options>
                {HORIZON_DAY_OPTIONS.map((days) => (
                  <OptionChip key={days} name="horizon" selected={fixture.horizonDays === days} value={days}>
                    {t("days", { count: days })}
                  </OptionChip>
                ))}
                <OptionChip name="horizon" selected={fixture.horizonDays === null} value="custom">
                  {t("custom")}
                </OptionChip>
              </Options>
              {customHorizon ? <CustomValueRow name="customHorizon" unit={t("dayUnit")} value={fixture.customHorizonDays ?? 60} /> : null}
            </Group>

            <Group
              footnote={fixture.bufferMinutes === null ? t("bufferBounds", CUSTOM_BOUNDS.bufferMinutes) : undefined}
              hint={t("bufferHint")}
              label={t("bufferLabel")}
            >
              <Options>
                {BUFFER_MINUTE_OPTIONS.map((minutes) => (
                  <OptionChip key={minutes} name="buffer" selected={fixture.bufferMinutes === minutes} value={minutes}>
                    {minutes === 0 ? t("noBuffer") : t("minutes", { count: minutes })}
                  </OptionChip>
                ))}
                <OptionChip name="buffer" selected={fixture.bufferMinutes === null} value="custom">
                  {t("custom")}
                </OptionChip>
              </Options>
              {customBuffer ? <CustomValueRow name="customBuffer" unit={t("minuteUnit")} value={fixture.customBufferMinutes ?? 0} /> : null}
            </Group>

            <Group
              footnote={
                limitOn
                  ? state === "custom"
                    ? t("limitBoundsCustom", { ...CUSTOM_BOUNDS.dailyLimitHours, hours: fixture.customDailyLimitHours ?? 0 })
                    : t("limitCeiling", { hours: fixture.dailyLimitHours ?? 0 })
                  : t("limitOffFootnote")
              }
              hint={t("limitHint")}
              label={t("limitLabel")}
            >
              <div className={cn(DESK_BOX, "flex w-full items-center gap-3 px-4 py-3.5 lg:px-5 lg:py-4")}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-base text-foreground lg:text-frame-body">
                    {limitOn
                      ? t("limitOnTitle", { hours: fixture.dailyLimitHours ?? fixture.customDailyLimitHours ?? 0 })
                      : t("limitOffTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground lg:text-frame-label">
                    <ThaiText>{limitOn ? t("limitOnCaption") : t("limitOffCaption")}</ThaiText>
                  </p>
                </div>
                <Switch
                  aria-label={t("limitLabel")}
                  checked={limitOn}
                  className="shrink-0"
                  name="limitEnabled"
                  onCheckedChange={(checked) => {
                    setLimitEnabled(checked);
                    setCustomSelection((current) => ({ ...current, dailyLimit: fixture.dailyLimitHours === null }));
                  }}
                />
              </div>

              {limitOn ? (
                <Options>
                  {DAILY_LIMIT_HOUR_OPTIONS.map((hours) => (
                    <OptionChip key={hours} name="dailyLimit" selected={fixture.dailyLimitHours === hours} value={hours}>
                      {t("hours", { count: hours })}
                    </OptionChip>
                  ))}
                  <OptionChip name="dailyLimit" selected={fixture.dailyLimitHours === null} value="custom">
                    {t("custom")}
                  </OptionChip>
                </Options>
              ) : null}

              {limitOn && customDailyLimit ? (
                <CustomValueRow name="customDailyLimit" unit={t("hourUnit")} value={fixture.customDailyLimitHours ?? 3} />
              ) : null}
            </Group>
          </div>

          {/* The fixed 30-minute interval, stated not offered. */}
          <div className="mt-2 flex w-full items-start gap-2.5 rounded-2xl bg-muted/60 px-4 py-3.5 lg:px-5 lg:py-4">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground lg:text-frame-meta">
              <ThaiText>{t("slotNote")}</ThaiText>
            </p>
          </div>

          {saveError || saved || resource.error ? (
            <p
              className={cn("mt-5 text-sm lg:text-frame-meta", saveError || resource.error ? "text-destructive" : "text-success")}
              role={saveError || resource.error ? "alert" : "status"}
            >
              {saveError ?? (resource.error ? "โหลดข้อมูลเดิมไม่สำเร็จ ระบบจะแสดงค่าเริ่มต้นให้บันทึกใหม่ได้" : "บันทึกข้อมูลแล้ว")}
            </p>
          ) : null}

          <div className="mt-8 flex w-full items-center gap-3 lg:mt-10 lg:justify-end">
            {/* Puts the choices back as they were saved, on the page: going elsewhere is the capsules' job. */}
            <Button className={cn(authPill(false), DESK_PILL, "flex-1 lg:flex-none")} type="reset" variant="outline">
              {c("cancel")}
            </Button>
            <Button className={cn(authPill(true), DESK_PILL, "flex-[2] lg:flex-none")} disabled={saving} type="submit">
              {saving ? "กำลังบันทึก…" : t("save")}
            </Button>
          </div>
        </div>
      </WorkHub>
    </form>
  );
}
