import Link from "next/link";
import {
  CalendarOff,
  CalendarPlus,
  ChevronDown,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { AddDateSheet } from "@/components/availability/add-date-sheet";
import { TimePickerPopover } from "@/components/availability/time-picker-popover";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EmptyState } from "@/components/mobile/empty-state";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { TopBar } from "@/components/topbar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { READING_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  BLOCKED_DATES,
  EDITED_PROFILE_NAME,
  PRESET_WEEKLY_DAYS,
  SPECIFIC_DATES,
  WEEKLY_DAYS,
  WEEKLY_ERROR,
  WEEK_PRESETS,
  type EditorMode,
  type EditorTab,
  type TimeRange,
} from "@/lib/availability/editor";

/**
 * Figma "Back Bar" (1994:29194) and "Head Band" (1994:29197) — the 52px row
 * under the app's nav and the white band the heading sits in, above the grey
 * form band that holds the editor's own card. The 800px measure is
 * `READING_COLUMN`, which this file used to spell out as `lg:w-[800px]`.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";
const COLUMN = cn(READING_COLUMN, "lg:px-0");

/**
 * Figma "Card" — the 800px panel the whole editor becomes at 1440: a 40px inset
 * on the card surface, 48px clear of the band above it, on `shadow-panel` — the
 * token for a desktop panel over the page ground.
 */
const FORM_CARD = cn(
  "flex w-full shrink-0 flex-col gap-4 lg:my-12 lg:gap-4 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-10 lg:shadow-panel",
  READING_COLUMN,
);

/**
 * How long a range is, in minutes. Every time here is an Advisor-local
 * `HH:MM` wall-clock string, so this is arithmetic on the strings rather than on
 * dates — see the note at the top of `lib/availability/editor`.
 *
 * The error fixture's second range runs backwards on purpose, so a non-positive
 * length is a real case and the callers drop it.
 */
function rangeMinutes(range: TimeRange): number {
  const [startHour, startMinute] = range.start.split(":").map(Number);
  const [endHour, endMinute] = range.end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

/**
 * How much time a day or a date actually offers.
 *
 * The frames put nothing here — an open day was its name, a switch, and rows of
 * start/end pairs the reader had to add up. The total is the number the Advisor
 * is deciding by, the same reasoning `TimePickerPopover` already follows for a
 * single range, so it is stated.
 */
function RangesTotal({ ranges }: { readonly ranges: readonly TimeRange[] }) {
  const t = useTranslations("availability");
  const minutes = ranges.reduce(
    (total, range) => total + Math.max(rangeMinutes(range), 0),
    0,
  );

  if (minutes <= 0) return null;

  return (
    <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
      {minutes < 60
        ? t("minutes", { count: minutes })
        : minutes % 60 === 0
          ? t("hours", { count: minutes / 60 })
          : t("hoursDecimal", { hours: minutes / 60 })}
    </span>
  );
}

const TAB_HREF: Record<EditorTab, string> = {
  weekly: "/availability/profiles/edit",
  specific: "/availability/profiles/edit/specific",
  blocked: "/availability/profiles/edit/blocked",
};

const CREATE_TAB_HREF: Record<EditorTab, string> = {
  weekly: "/availability/profiles/new",
  specific: "/availability/profiles/new/specific",
  blocked: "/availability/profiles/new/blocked",
};

function isCreate(mode: EditorMode): boolean {
  return mode !== "edit";
}

/**
 * Figma "Tabs" — a full-width segmented control: a 4px muted track, the selected
 * segment a plain white surface at a 9px radius.
 *
 * Not the bookings screen's `StatusTabs`, which is a content-width track with an
 * accent-filled pill. Same idea, different drawing, and that one is private to its
 * screen.
 */
function EditorTabs({
  current,
  mode,
}: {
  readonly current: EditorTab;
  readonly mode: EditorMode;
}) {
  const t = useTranslations("availability");
  const tabs: readonly EditorTab[] = ["weekly", "specific", "blocked"];
  const hrefs = isCreate(mode) ? CREATE_TAB_HREF : TAB_HREF;

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 lg:px-0">
      {/* The track is the `well` tier: muted ground, no edge, at the 12px step. */}
      <div
        className={cn(
          surfaceClass({ tier: "well" }),
          "flex w-full shrink-0 items-start overflow-clip p-1",
        )}
      >
        {tabs.map((tab) => (
          <Link
            className={cn(
              "flex min-w-px flex-1 items-center justify-center overflow-clip rounded-[9px] p-2 text-sm whitespace-nowrap transition-colors",
              tab === current
                ? "bg-card font-medium text-foreground"
                : // The row hover is `bg-muted/50`, which is invisible on a muted
                  // track — an unselected segment reaches for the selected one's
                  // surface instead, at half strength.
                  "font-normal text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
            href={hrefs[tab]}
            key={tab}
          >
            {t(`tab.${tab}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Figma "Time" — the read-only picker trigger: muted ground, hairline, a 14/20
 * medium value and a 14px chevron. It is a trigger, not an input; the list it opens
 * is `TimePickerPopover`.
 */
function TimeTrigger({
  value,
  invalid = false,
  open = false,
}: {
  readonly value: string;
  readonly invalid?: boolean;
  readonly open?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-px flex-1 items-center gap-1 overflow-clip rounded-md border bg-muted py-2 pr-2.5 pl-3",
        invalid && "border-destructive",
        open && "border-primary",
        !invalid && !open && "border-border",
      )}
    >
      <span className="min-w-px flex-1 font-latin text-sm font-medium text-foreground">
        {value}
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    </span>
  );
}

/** Figma "Range" — two triggers around an en dash, with an optional 28px remove. */
function RangeRow({
  range,
  removable = true,
  invalid = false,
  picker = false,
}: {
  readonly range: TimeRange;
  readonly removable?: boolean;
  readonly invalid?: boolean;
  readonly picker?: boolean;
}) {
  return (
    // Bounded at `lg`: inside the 800px panel the two triggers were 340px each to
    // hold "09:00", which is a time field pretending to be a search bar.
    <div className="flex w-full shrink-0 items-center gap-2 lg:max-w-96">
      <TimeTrigger invalid={invalid} value={range.start} />
      <span className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
        –
      </span>
      {/* The popover anchors to the end trigger, so that half of the row — and only
          that half — becomes the positioning context. */}
      <span className="relative flex min-w-px flex-1 items-center">
        <TimeTrigger invalid={invalid} open={picker} value={range.end} />
        {picker ? <TimePickerPopover /> : null}
      </span>
      {removable ? (
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center overflow-clip text-base font-medium text-muted-foreground"
        >
          ×
        </span>
      ) : null}
    </div>
  );
}

/**
 * Figma "Day" / "Date" — the card every tab stacks.
 *
 * `raised` on the phone, where the card sits on the grey page ground and is an
 * object in its own right; `flat` from `lg`, where it is a block inside the
 * editor's 800px panel and a shadow would stack on a shadow.
 */
function EditorCard({
  children,
  invalid = false,
  className,
}: {
  readonly children: ReactNode;
  readonly invalid?: boolean;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-2 px-3.5 py-3 lg:shadow-none",
        invalid && "border-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Figma "+ เพิ่ม…" — the accent link that closes a card or a list. */
function AddLink({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) {
  return (
    <Link
      className="w-full text-sm font-medium text-primary transition-colors hover:underline"
      href={href}
    >
      {children}
    </Link>
  );
}

/**
 * Figma "+ เพิ่มวันที่…" — the dashed row that appends a date to a tab's list.
 *
 * On the muted ground the `bg-muted/50` row hover is a no-op, so a "create" row
 * takes the accent tint instead — the same call the profile list's add row makes.
 */
function AddDashedRow({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) {
  return (
    <Link
      className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-card border border-dashed border-border bg-muted p-3.5 text-sm font-medium text-primary transition-colors hover:bg-accent-surface"
      href={href}
    >
      {children}
    </Link>
  );
}

/** Figma "Validation Note" — the tinted accent strip each tab closes on. */
function Note({ children }: { readonly children: string }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 lg:px-0">
      <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg bg-accent-surface px-3 py-2.5">
        <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
          <ThaiText>{children}</ThaiText>
        </p>
      </div>
    </div>
  );
}

/** Figma "Section" — the label and hint each create-mode tab opens with. */
function SectionIntro({
  label,
  hint,
}: {
  readonly label: ReactNode;
  readonly hint: string;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-1">
      <p className="w-full text-sm font-medium text-foreground">{label}</p>
      <p className="w-full text-xs font-normal text-muted-foreground">
        <ThaiText>{hint}</ThaiText>
      </p>
    </div>
  );
}

/**
 * Figma "Empty" — the card a create-mode date tab starts on, now the app's one
 * `EmptyState`: the same two lines, with the mark and the 18px title an empty list
 * is meant to lead with instead of a 16px row that looks like a disabled card.
 */
function EmptyDatesCard({
  icon,
  title,
  body,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly body: string;
}) {
  return (
    <EditorCard className="overflow-clip p-0">
      <EmptyState
        body={<ThaiText>{body}</ThaiText>}
        icon={icon}
        title={title}
      />
    </EditorCard>
  );
}

/** Figma "เริ่มจากรูปแบบสำเร็จรูป" — the shapes a new week can start as. */
function PresetRow() {
  const t = useTranslations("availability");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2">
      <p className="w-full text-sm font-medium text-foreground">
        {t("presetLabel")}
      </p>
      <div className="flex w-full flex-wrap content-start items-start gap-2">
        {WEEK_PRESETS.map((preset) => (
          <span
            className={cn(
              "flex shrink-0 items-center rounded-full px-3.5 py-[7px] text-sm font-medium",
              preset.selected
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground",
            )}
            key={preset.id}
          >
            {t(`preset.${preset.id}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Figma "ใช้กับบริการนี้" — offered only when a Service sent you here. */
function ApplyToServiceBlock() {
  const t = useTranslations("availability");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:px-0">
      <p className="w-full text-sm font-medium text-foreground">
        {t("applyLabel")}
      </p>
      <EditorCard className="flex-row items-center gap-3">
        <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
          <p className="w-full text-base font-medium text-foreground">
            {t("applyTitle")}
          </p>
          <p className="w-full text-xs font-normal text-muted-foreground">
            <ThaiText>{t("applyCaption")}</ThaiText>
          </p>
        </div>
        <Switch aria-label={t("applyTitle")} className="shrink-0" defaultChecked />
      </EditorCard>
    </div>
  );
}

function WeeklyTab({
  mode,
  invalid = false,
  picker = false,
}: {
  readonly mode: EditorMode;
  readonly invalid?: boolean;
  readonly picker?: boolean;
}) {
  const t = useTranslations("availability");
  const create = isCreate(mode);
  const days = create ? PRESET_WEEKLY_DAYS : WEEKLY_DAYS;

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 px-6 lg:px-0">
      {create ? <PresetRow /> : null}
      {create ? (
        <p className="w-full pt-1.5 text-sm font-medium text-foreground">
          {t("weeklyLabel")}
        </p>
      ) : null}

      {invalid ? (
        /* Figma "Error Banner" — the count of what must be fixed, above the list. */
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip rounded-card border border-destructive bg-destructive/10 px-3.5 py-3">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <p className="min-w-px flex-1 text-sm font-medium text-destructive">
            {t("errorCount", { count: 1 })}
          </p>
        </div>
      ) : null}

      {days.map(({ day, ranges }) => {
        const dayInvalid = invalid && day === WEEKLY_ERROR.day;
        const shown = dayInvalid ? WEEKLY_ERROR.ranges : ranges;
        const isOpen = shown.length > 0;
        const pickerDay = picker && day === "mon";

        return (
          <EditorCard
            className={pickerDay ? "overflow-visible" : "overflow-clip"}
            invalid={dayInvalid}
            key={day}
          >
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="min-w-px flex-1 text-base font-medium text-foreground">
                {t(`weekday.${day}`)}
              </p>
              {/* An open day states how long it is; a closed one says so in a pill
                  rather than as 12px grey text that read as a hint. */}
              {isOpen ? (
                dayInvalid ? null : <RangesTotal ranges={shown} />
              ) : (
                <StatusPill tone="neutral">{t("dayClosed")}</StatusPill>
              )}
              <Switch
                aria-label={t(`weekday.${day}`)}
                className="shrink-0"
                defaultChecked={isOpen}
              />
            </div>

            {shown.map((range, index) => (
              <RangeRow
                invalid={dayInvalid && index === WEEKLY_ERROR.rangeIndex}
                key={`${range.start}-${range.end}`}
                picker={pickerDay && index === 0}
                range={range}
                removable={shown.length > 1}
              />
            ))}

            {dayInvalid ? (
              <p className="w-full text-xs font-normal text-destructive">
                <ThaiText>
                  {t("errorOverlap", {
                    start: WEEKLY_ERROR.ranges[0].start,
                    end: WEEKLY_ERROR.ranges[0].end,
                  })}
                </ThaiText>
              </p>
            ) : null}

            {isOpen ? (
              <AddLink href={create ? CREATE_TAB_HREF.weekly : TAB_HREF.weekly}>
                {t("addRange")}
              </AddLink>
            ) : null}
          </EditorCard>
        );
      })}
    </div>
  );
}

function SpecificTab({ mode }: { readonly mode: EditorMode }) {
  const t = useTranslations("availability");
  const create = isCreate(mode);
  const href = create ? CREATE_TAB_HREF.specific : TAB_HREF.specific;

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 lg:px-0">
      {create ? (
        <SectionIntro
          hint={t("specificHint")}
          label={t("tab.specific")}
        />
      ) : null}

      {create ? (
        <EmptyDatesCard
          body={t("specificEmptyBody")}
          icon={CalendarPlus}
          title={t("specificEmptyTitle")}
        />
      ) : (
        SPECIFIC_DATES.map((date) => (
          <EditorCard key={date.id}>
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="min-w-px flex-1 text-base font-medium text-foreground">
                {date.label}
              </p>
              <RangesTotal ranges={date.ranges} />
              <Link
                className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive transition-colors hover:underline"
                href={href}
              >
                {t("delete")}
              </Link>
            </div>
            {date.ranges.map((range) => (
              <RangeRow
                key={`${range.start}-${range.end}`}
                range={range}
                removable={date.ranges.length > 1}
              />
            ))}
            <AddLink href={href}>{t("addRange")}</AddLink>
          </EditorCard>
        ))
      )}

      <AddDashedRow href={create ? href : "/availability/profiles/add-date"}>
        {t("addSpecificDate")}
      </AddDashedRow>
    </div>
  );
}

function BlockedTab({ mode }: { readonly mode: EditorMode }) {
  const t = useTranslations("availability");
  const create = isCreate(mode);
  const href = create ? CREATE_TAB_HREF.blocked : TAB_HREF.blocked;

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6 lg:px-0">
      {create ? (
        <SectionIntro hint={t("blockedHint")} label={t("tab.blocked")} />
      ) : null}

      {create ? (
        <EmptyDatesCard
          body={t("blockedEmptyBody")}
          icon={CalendarOff}
          title={t("blockedEmptyTitle")}
        />
      ) : (
        BLOCKED_DATES.map((date) => {
          const wholeDay = date.range === undefined;

          return (
            <EditorCard key={date.id}>
              <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
                <p className="min-w-px flex-1 text-base font-medium text-foreground">
                  {date.label}
                </p>
                <Link
                  className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive transition-colors hover:underline"
                  href={href}
                >
                  {t("delete")}
                </Link>
              </div>
              {/* The two blocks are not the same severity and the tab used to say
                  both in the same grey: a whole day off the calendar is the hard
                  state, a window inside a day is the partial one. */}
              <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
                <span className="min-w-px flex-1">
                  <StatusPill tone={wholeDay ? "danger" : "warning"}>
                    {wholeDay ? t("blockWholeDay") : t("blockPartial")}
                  </StatusPill>
                </span>
                <Switch
                  aria-label={t("blockWholeDay")}
                  className="shrink-0"
                  defaultChecked={wholeDay}
                />
              </div>
              {date.range ? (
                <RangeRow range={date.range} removable={false} />
              ) : null}
            </EditorCard>
          );
        })
      )}

      <AddDashedRow href={href}>{t("addBlockedDate")}</AddDashedRow>
    </div>
  );
}

/**
 * Figma "Availability - Profile / …" and "Availability - Create profile / …" —
 * one screen at three modes and three tabs.
 *
 * `edit` opens an existing profile. `create` is reached from a Service and offers to
 * attach the new profile to it; `create-from-list` is reached from the profile list
 * and has nothing to attach to, which is the only difference between those two.
 *
 * In edit mode the name field appears on the weekly tab only, and the other two
 * carry the profile's name as the heading's subtitle. That is how the frames are
 * drawn and it reads as deliberate — the name is edited where the week is — so it is
 * reproduced rather than normalised.
 *
 * Every control is presentational. The tabs are sibling routes and the two overlays
 * are routes of their own, so this screen needs no client boundary.
 */
export function ProfileEditorScreen({
  tab = "weekly",
  mode = "edit",
  state = "default",
}: {
  readonly tab?: EditorTab;
  readonly mode?: EditorMode;
  readonly state?: "default" | "error" | "picker" | "add-date";
}) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const create = isCreate(mode);
  const invalid = state === "error";
  const picker = state === "picker";

  // The phone pins these to its bottom edge; the desktop card parks the same
  // pair at its end. Written once, placed twice.
  const actions = (
    <>
      <NeutralButton className="w-30 shrink-0 lg:w-auto lg:px-6" href="/availability/profiles">
        {c("cancel")}
      </NeutralButton>
      {/* Nothing can be saved while a range is invalid, which the frame shows by
          dimming the action rather than removing it. */}
      <PrimaryButton
        className="min-w-px flex-1 lg:w-auto lg:flex-none lg:px-8"
        disabled={invalid}
        href={invalid ? undefined : "/availability/profiles"}
      >
        {create ? t("createProfile") : t("saveProfile")}
      </PrimaryButton>
    </>
  );

  return (
    // Figma "Desktop / Availability - Profile / …" (1994:29171, 29651, 29917)
    // and the create variants (1994:28617, 28790, 28970, 29071): the heading
    // becomes a white band and the editor becomes one 800px card below it,
    // tabs and all, with its actions inside rather than pinned to the edge.
    <MobileScreen className="pb-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/availability/profiles" label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6", COLUMN, "lg:gap-2 lg:py-5")}>
            <h1 className="w-full text-2xl font-semibold text-foreground lg:text-display">
              {create ? t("createTitle") : t("editorTitle")}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              {create || tab === "weekly" ? (
                <ThaiText>
                  {create ? t("createSubtitle") : t("editorSubtitle")}
                </ThaiText>
              ) : (
                EDITED_PROFILE_NAME
              )}
            </p>
          </div>
        </div>

        <div className={FORM_CARD}>
        {create || tab === "weekly" ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip px-6 lg:px-0">
            <p className="w-full text-sm font-medium text-foreground">
              {t("nameLabel")}
            </p>
            <Input
              className="h-9"
              defaultValue={create ? undefined : EDITED_PROFILE_NAME}
              placeholder={create ? t("namePlaceholder") : undefined}
              type="text"
            />
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{create ? t("nameAutoHint") : t("nameHint")}</ThaiText>
            </p>
          </div>
        ) : null}

        <EditorTabs current={tab} mode={mode} />

        {tab === "weekly" ? (
          <WeeklyTab invalid={invalid} mode={mode} picker={picker} />
        ) : null}
        {tab === "specific" ? <SpecificTab mode={mode} /> : null}
        {tab === "blocked" ? <BlockedTab mode={mode} /> : null}

        {mode === "create" ? <ApplyToServiceBlock /> : null}

        {/* The weekly note is a different message in each mode — validation while
            editing, and where the dates and the service come next while creating.
            The other two tabs say the same thing either way. */}
        <Note>
          {tab !== "weekly"
            ? t(`note.${tab}`)
            : mode === "edit"
              ? t("note.weekly")
              : mode === "create"
                ? t("createNote.weekly")
                : t("createNote.weeklyFromList")}
        </Note>

        <div className="hidden w-full shrink-0 items-center justify-end gap-3 lg:flex">
          {actions}
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {/* The desktop card carries the same pair, so the bar stops at `lg`. */}
      <div className="flex w-full shrink-0 items-start gap-3 overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        {actions}
      </div>

      {state === "add-date" ? <AddDateSheet /> : null}
    </MobileScreen>
  );
}
