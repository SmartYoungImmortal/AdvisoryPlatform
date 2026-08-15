import { CircleCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Figma "Stage Header" — a 354x8 progress track with a proportional fill, the
 * "ขั้นตอนที่ n จาก 3" caption and the 28/40 stage title.
 */
export function StageHeader({
  step,
  label,
  title,
}: {
  readonly step: 1 | 2 | 3;
  readonly label: string;
  readonly title: string;
}) {
  return (
    // 88px total: 8 top padding + 8 track + 10 + 18 caption + 4 + 40 title.
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip px-6 pt-2">
      <div className="h-2 w-full shrink-0 overflow-clip rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
      <p className="mt-2.5 w-full text-xs font-normal text-muted-foreground">
        {label}
      </p>
      <h1 className="mt-1 w-full text-heading font-semibold text-foreground">
        {title}
      </h1>
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
        "flex w-full shrink-0 flex-col items-center justify-center overflow-clip rounded-xl border border-dashed bg-card",
        compact ? "px-4 py-4" : "px-5 py-7",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      <Icon
        className={cn("shrink-0 text-muted-foreground", compact ? "size-5" : "size-14")}
      />
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

/** Figma verification step — glyph, label, right-aligned status. */
export function StepRow({
  icon: Icon,
  label,
  status,
  tone = "muted",
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly status: string;
  readonly tone?: "muted" | "primary" | "destructive" | "success";
}) {
  const toneClass = {
    muted: "text-muted-foreground",
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-foreground",
  }[tone];

  return (
    <div className="flex h-5 w-full shrink-0 items-center gap-2.5">
      <Icon className={cn("size-4.5 shrink-0", toneClass)} />
      <span className="min-w-px flex-1 text-sm font-normal text-foreground">
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs font-medium whitespace-nowrap",
          toneClass,
        )}
      >
        {status}
      </span>
    </div>
  );
}
