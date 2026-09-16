import Link from "next/link";
import { ChevronDown, Info, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  MobileScreen,
  ScreenBody,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import { NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  BLOCKED_DATES,
  EDITED_PROFILE_NAME,
  SPECIFIC_DATES,
  WEEKLY_DAYS,
  WEEKLY_ERROR,
  type EditorTab,
  type TimeRange,
} from "@/lib/availability/editor";

const TAB_HREF: Record<EditorTab, string> = {
  weekly: "/availability/profiles/edit",
  specific: "/availability/profiles/edit/specific",
  blocked: "/availability/profiles/edit/blocked",
};

/**
 * Figma "Tabs" — a full-width segmented control: a 4px muted track, the selected
 * segment a plain white surface at a 9px radius.
 *
 * Not the bookings screen's `StatusTabs`, which is a content-width track with an
 * accent-filled pill. Same idea, different drawing, and that one is private to its
 * screen.
 */
function EditorTabs({ current }: { readonly current: EditorTab }) {
  const t = useTranslations("availability");
  const tabs: readonly EditorTab[] = ["weekly", "specific", "blocked"];

  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
      <div className="flex w-full shrink-0 items-start overflow-clip rounded-[12px] bg-muted p-1">
        {tabs.map((tab) => (
          <Link
            className={cn(
              "flex min-w-px flex-1 items-center justify-center overflow-clip rounded-[9px] p-2 text-sm whitespace-nowrap",
              tab === current
                ? "bg-card font-medium text-foreground"
                : "font-normal text-muted-foreground",
            )}
            href={TAB_HREF[tab]}
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
 * medium value and a 14px chevron. It is a trigger, not an input; the prototype's
 * time picker lives on its own frame.
 */
function TimeTrigger({
  value,
  invalid = false,
}: {
  readonly value: string;
  readonly invalid?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-px flex-1 items-center gap-1 overflow-clip rounded-md border bg-muted py-2 pr-2.5 pl-3",
        invalid ? "border-destructive" : "border-border",
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
}: {
  readonly range: TimeRange;
  readonly removable?: boolean;
  readonly invalid?: boolean;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <TimeTrigger invalid={invalid} value={range.start} />
      <span className="shrink-0 text-sm font-normal whitespace-nowrap text-muted-foreground">
        –
      </span>
      <TimeTrigger invalid={invalid} value={range.end} />
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

/** Figma "Day" / "Date" — the card every tab stacks. */
function EditorCard({
  children,
  invalid = false,
}: {
  readonly children: ReactNode;
  readonly invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start gap-2 overflow-clip rounded-[12px] border bg-card px-3.5 py-3",
        invalid ? "border-destructive" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

/** Figma "+ เพิ่ม…" — the accent link that closes a card or a list. */
function AddLink({ children }: { readonly children: ReactNode }) {
  return (
    <Link
      className="w-full text-sm font-medium text-primary"
      href="/availability/profiles/edit"
    >
      {children}
    </Link>
  );
}

/** Figma "+ เพิ่มวันที่…" — the dashed row that appends a date to a tab's list. */
function AddDashedRow({ children }: { readonly children: ReactNode }) {
  return (
    <Link
      className="flex w-full shrink-0 items-center justify-center gap-2 overflow-clip rounded-[12px] border border-dashed border-border bg-muted p-3.5 text-sm font-medium text-primary"
      href="/availability/profiles/edit"
    >
      {children}
    </Link>
  );
}

/** Figma "Validation Note" — the tinted accent strip each tab closes on. */
function Note({ children }: { readonly children: string }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6">
      <div className="flex w-full shrink-0 items-start gap-2 overflow-clip rounded-lg bg-accent-surface px-3 py-2.5">
        <Info className="mt-px size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-px flex-1 text-xs font-normal text-muted-foreground">
          <ThaiText>{children}</ThaiText>
        </p>
      </div>
    </div>
  );
}

function WeeklyTab({ invalid = false }: { readonly invalid?: boolean }) {
  const t = useTranslations("availability");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
      {invalid ? (
        /* Figma "Error Banner" — the count of what must be fixed, above the list. */
        <div className="flex w-full shrink-0 items-center gap-2 overflow-clip rounded-[12px] border border-destructive bg-destructive/10 px-3.5 py-3">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <p className="min-w-px flex-1 text-sm font-medium text-destructive">
            {t("errorCount", { count: 1 })}
          </p>
        </div>
      ) : null}

      {WEEKLY_DAYS.map(({ day, ranges }) => {
        const dayInvalid = invalid && day === WEEKLY_ERROR.day;
        const shown = dayInvalid ? WEEKLY_ERROR.ranges : ranges;
        const isOpen = shown.length > 0;

        return (
          <EditorCard invalid={dayInvalid} key={day}>
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="min-w-px flex-1 text-base font-medium text-foreground">
                {t(`weekday.${day}`)}
              </p>
              {isOpen ? null : (
                <span className="shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground">
                  {t("dayClosed")}
                </span>
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

            {isOpen ? <AddLink>{t("addRange")}</AddLink> : null}
          </EditorCard>
        );
      })}
    </div>
  );
}

function SpecificTab() {
  const t = useTranslations("availability");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
      {SPECIFIC_DATES.map((date) => (
        <EditorCard key={date.id}>
          <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
            <p className="min-w-px flex-1 text-base font-medium text-foreground">
              {date.label}
            </p>
            <Link
              className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive"
              href={TAB_HREF.specific}
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
          <AddLink>{t("addRange")}</AddLink>
        </EditorCard>
      ))}
      <AddDashedRow>{t("addSpecificDate")}</AddDashedRow>
    </div>
  );
}

function BlockedTab() {
  const t = useTranslations("availability");

  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2.5 overflow-clip px-6">
      {BLOCKED_DATES.map((date) => {
        const wholeDay = date.range === undefined;

        return (
          <EditorCard key={date.id}>
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="min-w-px flex-1 text-base font-medium text-foreground">
                {date.label}
              </p>
              <Link
                className="shrink-0 text-sm font-medium whitespace-nowrap text-destructive"
                href={TAB_HREF.blocked}
              >
                {t("delete")}
              </Link>
            </div>
            <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
              <p className="min-w-px flex-1 text-sm font-normal text-muted-foreground">
                {wholeDay ? t("blockWholeDay") : t("blockPartial")}
              </p>
              <Switch
                aria-label={t("blockWholeDay")}
                className="shrink-0"
                defaultChecked={wholeDay}
              />
            </div>
            {date.range ? <RangeRow range={date.range} removable={false} /> : null}
          </EditorCard>
        );
      })}
      <AddDashedRow>{t("addBlockedDate")}</AddDashedRow>
    </div>
  );
}

/**
 * Figma "Availability - Profile / Weekly · Specific dates · Blocked dates" and the
 * weekly error state.
 *
 * The name field appears on the weekly frame only; the other two carry the profile's
 * name as the heading's subtitle instead. That is how the frames are drawn, and it
 * reads as deliberate — the name is edited where the week is, not on every tab — so
 * it is reproduced rather than normalised.
 *
 * Every control is presentational. Picking a time opens its own frame, and the tabs
 * are sibling routes, so this screen needs no client boundary.
 */
export function ProfileEditorScreen({
  tab = "weekly",
  state = "default",
}: {
  readonly tab?: EditorTab;
  readonly state?: "default" | "error";
}) {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const invalid = state === "error";

  return (
    <MobileScreen className="pb-0">
      <ScreenTopBar href="/availability/profiles" label={c("back")} />

      <ScreenBody className="gap-4 pb-6">
        <div className="flex w-full shrink-0 flex-col items-start gap-1.5 overflow-clip px-6">
          <h1 className="w-full text-2xl font-semibold text-foreground">
            {t("editorTitle")}
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            {tab === "weekly" ? (
              <ThaiText>{t("editorSubtitle")}</ThaiText>
            ) : (
              EDITED_PROFILE_NAME
            )}
          </p>
        </div>

        {tab === "weekly" ? (
          <div className="flex w-full shrink-0 flex-col items-start gap-1 overflow-clip px-6">
            <p className="w-full text-sm font-medium text-foreground">
              {t("nameLabel")}
            </p>
            <Input
              className="h-9"
              defaultValue={EDITED_PROFILE_NAME}
              type="text"
            />
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t("nameHint")}</ThaiText>
            </p>
          </div>
        ) : null}

        <EditorTabs current={tab} />

        {tab === "weekly" ? <WeeklyTab invalid={invalid} /> : null}
        {tab === "specific" ? <SpecificTab /> : null}
        {tab === "blocked" ? <BlockedTab /> : null}

        <Note>{t(`note.${tab}`)}</Note>
      </ScreenBody>

      <div className="flex w-full shrink-0 items-start gap-3 overflow-clip border-t border-border bg-card px-6 py-3">
        <NeutralButton className="w-30 shrink-0" href="/availability/profiles">
          {c("cancel")}
        </NeutralButton>
        {/* Nothing can be saved while a range is invalid, which the frame shows by
            dimming the action rather than removing it. */}
        <PrimaryButton
          className="min-w-px flex-1"
          disabled={invalid}
          href={invalid ? undefined : "/availability/profiles"}
        >
          {t("saveProfile")}
        </PrimaryButton>
      </div>
    </MobileScreen>
  );
}
