import Link from "next/link";
import {
  CalendarRange,
  ChevronRight,
  Hourglass,
  Info,
  Timer,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { StatTile } from "@/components/mobile/stat-tile";
import { surfaceClass } from "@/components/mobile/surface";
import { ThaiText } from "@/components/mobile/thai-text";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { TopBar } from "@/components/topbar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { READING_COLUMN } from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  BUFFER_MINUTE_OPTIONS,
  CUSTOM_BOUNDS,
  DAILY_LIMIT_HOUR_OPTIONS,
  GLOBAL_AVAILABILITY,
  HORIZON_DAY_OPTIONS,
  type GlobalAvailabilityState,
} from "@/lib/availability";

/**
 * Figma "Back Bar" (1994:27895) — the 52px row under the app's nav, at the
 * 120px page inset, and the white "Head Band" the heading sits in above the
 * grey form band.
 */
const BACK_BAR = "lg:h-13 lg:bg-card lg:pt-0 lg:pb-0 lg:pl-10 xl:pl-30";
const HEAD_BAND = "w-full shrink-0 lg:border-b lg:border-border lg:bg-card";

/**
 * Figma "Heading" (1994:27899) — the same 800px column the form card uses, which
 * is `READING_COLUMN`; it was spelled out here as `lg:w-[800px]`.
 */
const COLUMN = cn(READING_COLUMN, "lg:px-0");

/**
 * Figma "Card" — the 800px panel the whole form becomes at 1440: a 40px inset
 * on the card surface, 48px clear of the band above it. On the phone the form
 * is the screen, so this is a set of `lg:` classes rather than a second layout.
 *
 * `shadow-panel` is the token for exactly this — a desktop panel floating over
 * the page ground — and it only exists from `lg`, where the panel does.
 */
const FORM_CARD = cn(
  "flex w-full shrink-0 flex-col gap-4 lg:my-12 lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-10 lg:shadow-panel",
  READING_COLUMN,
);

/** Figma "Actions" — the pair stops filling the width and holds the card's end. */
const CARD_ACTIONS = "lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0";

/**
 * Figma "Chip" — a 14/20 medium label in a pill. The selected one takes the accent
 * fill and drops the hairline; the rest are surface with a border.
 *
 * Not `FilterChip` from the home screen: that one is the 12/18 badge used to filter
 * a result list, and these are 14/20 options on a form. Same shape, different type
 * ramp and different job.
 */
function OptionChip({
  selected = false,
  children,
}: {
  readonly selected?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center rounded-full px-3.5 py-[7px] text-sm font-medium",
        selected
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-foreground",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Figma "Row" — the surface every group's control sits on, at the 12px step
 * `rounded-card` now names.
 *
 * Two tiers in one row, because the row is two different objects at the two
 * widths: on the phone the form *is* the screen, so each row is a card on the grey
 * page ground and takes `raised`; inside the 800px desktop panel it is a block
 * within a card, so the shadow comes off and it reads `flat`.
 */
const GROUP_SURFACE = cn(
  surfaceClass(),
  "flex w-full shrink-0 overflow-clip px-3.5 py-3 lg:shadow-none",
);

function GroupSurface({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={cn(GROUP_SURFACE, className)}>{children}</div>;
}

/** Figma "Group" — a 14/20 label, an optional 12/18 hint, then the control. */
function Group({
  label,
  hint,
  children,
  footnote,
}: {
  readonly label: ReactNode;
  /** String, not ReactNode: `ThaiText` reproduces Figma's break points on the raw copy. */
  readonly hint?: string;
  readonly children: ReactNode;
  readonly footnote?: string;
}) {
  return (
    // The page inset is the phone's; inside the desktop card the panel's own
    // 40px padding is already holding the same edge.
    <section className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:px-0">
      <p className="w-full text-sm font-medium text-foreground">{label}</p>
      {hint ? (
        <p className="w-full text-xs font-normal text-muted-foreground">
          <ThaiText>{hint}</ThaiText>
        </p>
      ) : null}
      {children}
      {footnote ? (
        <p className="w-full text-xs font-normal text-muted-foreground">
          <ThaiText>{footnote}</ThaiText>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Figma "Custom input" — the numeric field a `กำหนดเอง` chip reveals, with its unit
 * trailing. The bound line underneath is the group's footnote, not part of the row.
 */
function CustomValueRow({
  value,
  unit,
}: {
  readonly value: number;
  readonly unit: ReactNode;
}) {
  return (
    <GroupSurface className="items-center gap-3">
      <Input
        className="h-9 w-24 shrink-0 font-latin"
        defaultValue={value}
        inputMode="numeric"
        type="text"
      />
      <span className="text-sm font-normal text-muted-foreground">{unit}</span>
    </GroupSurface>
  );
}

/**
 * A figure and its unit, for the `StatTile` row.
 *
 * `StatTile` sets its value in `font-latin tabular-nums` — Geist, which has no Thai
 * glyphs — so the unit cannot ride inside the numeral's span or it falls back to
 * whatever the machine has. The numeral keeps the Latin face and the unit steps
 * down into the Thai one, which is the right typographic split anyway.
 */
function Figure({
  value,
  unit,
}: {
  readonly value: number;
  readonly unit: string;
}) {
  return (
    <>
      {value}
      <span className="font-sans text-sm font-normal text-muted-foreground">
        {" "}
        {unit}
      </span>
    </>
  );
}

/** A `StatTile` value that is a word rather than a number — "ไม่เว้น", "ไม่จำกัด". */
function FigureWord({ children }: { readonly children: string }) {
  return <span className="font-sans text-base">{children}</span>;
}

/**
 * Figma "Availability - Global" (1594:30833 / 31442 / 31959) — the Advisor's one
 * Global Availability record: which profiles are in play, how far ahead bookings
 * open, the recovery gap between appointments, and an optional daily ceiling.
 *
 * The three states are the same screen at three settings, so they are one component:
 * `default` has no buffer and no ceiling, `configured` has both, and `custom` puts
 * every row on its own numeric input.
 *
 * The 30-minute slot interval is fixed by the scheduling rules, so it is stated as a
 * note rather than offered as a choice.
 */
export function GlobalAvailabilityScreen({
  state = "default",
}: {
  readonly state?: GlobalAvailabilityState;
}) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const fixture = GLOBAL_AVAILABILITY[state];
  const limitOn = state !== "default";
  const bufferMinutes = fixture.bufferMinutes ?? fixture.customBufferMinutes ?? 0;
  const dailyLimitHours =
    fixture.dailyLimitHours ?? fixture.customDailyLimitHours ?? 0;

  // The phone pins these to its bottom edge over a hairline; the desktop frame
  // parks the same pair at the end of the card. Written once, placed twice.
  const actions = (
    <>
      <NeutralButton className="w-30 shrink-0 lg:w-auto lg:px-6" href="/advisor/profile">
        {c("cancel")}
      </NeutralButton>
      <PrimaryButton
        className="min-w-px flex-1 lg:w-auto lg:flex-none lg:px-8"
        href="/advisor/profile"
      >
        {t("save")}
      </PrimaryButton>
    </>
  );

  return (
    // Figma "Desktop / Availability - Global (Light)" (1994:27872 / 27993 /
    // 28129): the heading becomes a white band and the whole form becomes one
    // 800px card on the grey ground, with its actions inside it.
    <MobileScreen className="pb-0" wide>
      <div className="hidden w-full lg:block">
        <TopBar unreadNotifications />
      </div>
      <ScreenTopBar className={BACK_BAR} href="/advisor/profile" label={c("back")} />

      <ScreenBody className="gap-4 pb-6 lg:gap-0 lg:pb-0">
        {/* Figma "Heading" — 24/34 Thai semibold over a 14/20 muted line. The 6px
            gap is tighter than ScreenHeading's, and the title is a step smaller.
            The desktop band takes it to 40/60 in the 800px column. */}
        <div className={HEAD_BAND}>
          <div className={cn("flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6", COLUMN, "lg:gap-2 lg:py-5")}>
            <h1 className="w-full text-2xl font-semibold text-foreground lg:text-display">
              {t("title")}
            </h1>
            <p className="text-sm font-normal text-muted-foreground">
              <ThaiText>{t("subtitle")}</ThaiText>
            </p>
          </div>

          {/* The record, as the three numbers it actually is. At 1440 this band was
              a full-width white slab carrying two lines of text, and the settings
              below it were only legible by reading which chip was filled. `lg:`
              only — on the phone the form is the screen and the chips are right
              there, so nothing is added to it. */}
          <div
            className={cn("hidden px-6", COLUMN, "lg:grid lg:grid-cols-3 lg:gap-3 lg:pb-6")}
          >
            <StatTile
              icon={CalendarRange}
              label={t("horizonLabel")}
              tone="accent"
              value={
                <Figure
                  unit={t("dayUnit")}
                  value={fixture.horizonDays ?? fixture.customHorizonDays ?? 0}
                />
              }
            />
            <StatTile
              icon={Timer}
              label={t("bufferLabel")}
              value={
                bufferMinutes === 0 ? (
                  <FigureWord>{t("noBuffer")}</FigureWord>
                ) : (
                  <Figure unit={t("minuteUnit")} value={bufferMinutes} />
                )
              }
            />
            <StatTile
              icon={Hourglass}
              label={t("limitLabel")}
              value={
                limitOn ? (
                  <Figure unit={t("hourUnit")} value={dailyLimitHours} />
                ) : (
                  <FigureWord>{t("limitOffTitle")}</FigureWord>
                )
              }
            />
          </div>
        </div>

        <div className={FORM_CARD}>
        <Group label={t("profilesLabel")}>
          {/* The whole row is the target now, not the four words inside it: it has
              a chevron at its end and it navigates, so the surface is the link and
              takes the row hover. */}
          <Link
            className={cn(
              GROUP_SURFACE,
              "items-center gap-3 transition-colors hover:bg-muted/50",
            )}
            href="/availability/profiles"
          >
            <span className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <span className="w-full text-base font-medium text-foreground">
                {t("profilesAction")}
              </span>
              <span className="w-full text-xs font-normal text-muted-foreground">
                {t("profilesMeta", {
                  profiles: fixture.profileCount,
                  services: fixture.serviceCount,
                })}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </Group>

        <Group
          hint={t("horizonHint")}
          label={t("horizonLabel")}
          footnote={
            fixture.horizonDays === null
              ? t("horizonBounds", CUSTOM_BOUNDS.horizonDays)
              : undefined
          }
        >
          <GroupSurface className="flex-wrap content-start items-start gap-2">
            {HORIZON_DAY_OPTIONS.map((days) => (
              <OptionChip key={days} selected={fixture.horizonDays === days}>
                {t("days", { count: days })}
              </OptionChip>
            ))}
            <OptionChip selected={fixture.horizonDays === null}>
              {t("custom")}
            </OptionChip>
          </GroupSurface>
          {fixture.customHorizonDays ? (
            <CustomValueRow
              unit={t("dayUnit")}
              value={fixture.customHorizonDays}
            />
          ) : null}
        </Group>

        <Group
          hint={t("bufferHint")}
          label={t("bufferLabel")}
          footnote={
            fixture.bufferMinutes === null
              ? t("bufferBounds", CUSTOM_BOUNDS.bufferMinutes)
              : undefined
          }
        >
          <GroupSurface className="flex-wrap content-start items-start gap-2">
            {BUFFER_MINUTE_OPTIONS.map((minutes) => (
              <OptionChip
                key={minutes}
                selected={fixture.bufferMinutes === minutes}
              >
                {minutes === 0 ? t("noBuffer") : t("minutes", { count: minutes })}
              </OptionChip>
            ))}
            <OptionChip selected={fixture.bufferMinutes === null}>
              {t("custom")}
            </OptionChip>
          </GroupSurface>
          {fixture.customBufferMinutes ? (
            <CustomValueRow
              unit={t("minuteUnit")}
              value={fixture.customBufferMinutes}
            />
          ) : null}
        </Group>

        <Group
          hint={t("limitHint")}
          label={t("limitLabel")}
          footnote={
            limitOn
              ? state === "custom"
                ? t("limitBoundsCustom", {
                    ...CUSTOM_BOUNDS.dailyLimitHours,
                    hours: fixture.customDailyLimitHours ?? 0,
                  })
                : t("limitCeiling", { hours: fixture.dailyLimitHours ?? 0 })
              : t("limitOffFootnote")
          }
        >
          <GroupSurface className="items-center gap-3">
            <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
              <p className="w-full text-base font-medium text-foreground">
                {limitOn
                  ? t("limitOnTitle", {
                      hours:
                        fixture.dailyLimitHours ??
                        fixture.customDailyLimitHours ??
                        0,
                    })
                  : t("limitOffTitle")}
              </p>
              <p className="w-full text-xs font-normal text-muted-foreground">
                <ThaiText>
                  {limitOn ? t("limitOnCaption") : t("limitOffCaption")}
                </ThaiText>
              </p>
            </div>
            {/* Uncontrolled, like every other control in this prototype — `disabled`
                would grey it out, which is not the state the frame draws. */}
            <Switch
              aria-label={t("limitLabel")}
              className="shrink-0"
              defaultChecked={limitOn}
            />
          </GroupSurface>

          {limitOn ? (
            <GroupSurface className="flex-wrap content-start items-start gap-2">
              {DAILY_LIMIT_HOUR_OPTIONS.map((hours) => (
                <OptionChip
                  key={hours}
                  selected={fixture.dailyLimitHours === hours}
                >
                  {t("hours", { count: hours })}
                </OptionChip>
              ))}
              <OptionChip selected={fixture.dailyLimitHours === null}>
                {t("custom")}
              </OptionChip>
            </GroupSurface>
          ) : null}

          {fixture.customDailyLimitHours ? (
            <CustomValueRow
              unit={t("hourUnit")}
              value={fixture.customDailyLimitHours}
            />
          ) : null}
        </Group>

        {/* Figma "Slot Note" — the fixed 30-minute interval, stated not offered. */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 overflow-clip px-6 lg:px-0">
          <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg bg-accent-surface px-3 py-2.5">
            <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
            <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
              <ThaiText>{t("slotNote")}</ThaiText>
            </p>
          </div>
        </div>

        <div className={cn("hidden w-full shrink-0 items-center gap-3", CARD_ACTIONS, "lg:flex")}>
          {actions}
        </div>
        </div>

        <SiteFooter className="mt-auto hidden lg:flex" />
      </ScreenBody>

      {/* Figma "Actions" — a fixed 120px cancel beside a filling save, over a
          top hairline. Not ScreenActions: that stacks its buttons vertically.
          The desktop card holds the same pair, so the bar stops at `lg`. */}
      <div className="flex w-full shrink-0 items-start gap-3 overflow-clip border-t border-border bg-card px-6 py-3 lg:hidden">
        {actions}
      </div>
    </MobileScreen>
  );
}
