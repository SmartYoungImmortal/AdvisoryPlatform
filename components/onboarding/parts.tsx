import { CircleCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill, type StatusTone } from "@/components/mobile/status-pill";
import { cn } from "@/lib/utils";

/** The three stages, so the track can be drawn as steps rather than a ratio. */
const STAGES = [1, 2, 3] as const;

/**
 * Figma "Stage Header" — a 354x8 progress track with a proportional fill, the
 * "ขั้นตอนที่ n จาก 3" caption and the 28/40 stage title.
 *
 * The desktop frames keep every part of it and only change the measure and the
 * title's step: Figma "Step Band" (1787:24450) is the same track over the same
 * caption in an 800px column, with the title at 40/60. Callers pass those as
 * `lg:` classes rather than the band being a second component.
 *
 * The track is three segments, not one bar with a 33%/67%/100% fill. A
 * continuous fill says "two thirds of something"; the caption underneath says
 * "ขั้นตอนที่ 2 จาก 3", and the eye should be able to read that count off the
 * track without the caption. The unfilled segments also carry a hairline — on
 * the phone they sit on the page ground, where `bg-muted` alone was a per-cent
 * away from invisible.
 *
 * The segments are decorative: the caption is the accessible statement of where
 * the applicant is, which is why the track is `aria-hidden` rather than a second
 * voice saying the same thing.
 */
export function StageHeader({
  step,
  label,
  title,
  className,
  subtitle,
}: {
  readonly step: 1 | 2 | 3;
  readonly label: string;
  readonly title: string;
  readonly className?: string;
  /** Figma's stage 3 hangs its intro line under the title, inside the band. */
  readonly subtitle?: ReactNode;
}) {
  return (
    // 88px total: 8 top padding + 8 track + 10 + 18 caption + 4 + 40 title.
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-2",
        className,
      )}
    >
      <div aria-hidden className="flex w-full shrink-0 items-center gap-1.5">
        {STAGES.map((stage) => (
          <span
            className={cn(
              "h-2 min-w-px flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
              stage <= step ? "bg-primary" : "border border-border bg-muted",
            )}
            key={stage}
          />
        ))}
      </div>
      <p className="mt-2.5 w-full text-xs font-normal text-muted-foreground">
        {label}
      </p>
      <h1 className="mt-1 w-full text-heading font-semibold text-foreground lg:text-display">
        {title}
      </h1>
      {subtitle ? (
        <p className="hidden w-full pt-2 text-sm font-normal text-muted-foreground lg:block">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/** Figma upload drop zone — dashed border turns destructive when a file is rejected. */
export function DropZone({
  icon: Icon,
  title,
  subtitle,
  action,
  invalid = false,
  compact = false,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly action: ReactNode;
  readonly invalid?: boolean;
  readonly compact?: boolean;
}) {
  return (
    // Figma "Upload Dropzone" is 354 x 218: 28 padding, a 56px glyph, 12 gap,
    // a 16/24 title, 4 gap, a 12/18 subtitle, 12 gap, then the 36px browse button.
    <div
      className={cn(
        "flex w-full shrink-0 flex-col items-center justify-center overflow-clip rounded-card border border-dashed bg-card",
        compact ? "px-4 py-4" : "px-5 py-7",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      {/* The frame draws a bare 56px glyph, which at that size reads as clip-art
          dropped on an empty box. It goes in a bead instead — the same shape the
          empty states and the stat tiles use for a mark — so the zone has one
          object at its centre rather than a large grey outline. The compact form
          keeps the inline glyph: it sits in a 3-line box with no room for one. */}
      {compact ? (
        <Icon className="size-5 shrink-0 text-muted-foreground" />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-7 text-muted-foreground" />
        </span>
      )}
      <p
        className={cn(
          "w-full text-center font-medium text-foreground",
          compact ? "mt-2 text-sm" : "mt-3 text-base",
        )}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="mt-1 w-full text-center text-xs font-normal text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
      {action}
    </div>
  );
}

/** Figma guidance list — a 14px circle-check beside a 14/20 line. */
export function CheckLine({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2 overflow-clip">
      <CircleCheck className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-px flex-1 text-sm font-normal text-foreground">
        {children}
      </p>
    </div>
  );
}

/**
 * Figma "Next Row" — the uploaded state lists next steps with a 4px bullet dot
 * (not the circle-check used by the photo-guidance list), label inset 12px.
 */
export function BulletLine({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex h-5 w-full shrink-0 items-start gap-2 overflow-clip">
      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" />
      <p className="min-w-px flex-1 text-sm font-normal text-foreground">
        {children}
      </p>
    </div>
  );
}

/** The step's own ink, and the pill its status is said in. */
const STEP_TONES = {
  muted: { ink: "text-muted-foreground", pill: "neutral" },
  primary: { ink: "text-primary", pill: "info" },
  destructive: { ink: "text-destructive", pill: "danger" },
  success: { ink: "text-success", pill: "success" },
} as const satisfies Record<string, { ink: string; pill: StatusTone }>;

/**
 * Figma verification step — glyph, label, right-aligned status.
 *
 * The status was 12px text tinted with the same class as the glyph, which meant
 * "อนุมัติแล้ว" and "ต้องแก้ไข" were told apart by a hue of grey-versus-red at the
 * smallest size on the screen. It is a `StatusPill` now: the outcome of each
 * step is the one thing an applicant is on this screen to read.
 *
 * The row also stops being 20px tall. It was a bare line in a `gap-3` stack, so
 * the list had no rows to speak of; it carries its own 14/12 inset and the list
 * around it draws the hairlines.
 */
export function StepRow({
  icon: Icon,
  label,
  status,
  tone = "muted",
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly status: string;
  readonly tone?: keyof typeof STEP_TONES;
}) {
  const { ink, pill } = STEP_TONES[tone];

  return (
    <div className="flex w-full shrink-0 items-center gap-2.5 px-3.5 py-3">
      <Icon className={cn("size-4.5 shrink-0", ink)} />
      <span className="min-w-px flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      <StatusPill tone={pill}>{status}</StatusPill>
    </div>
  );
}
