"use client";

import { CircleCheck, ImageUp, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps, type DragEvent, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { FilePickButton } from "@/components/onboarding/file-pick";
import { Field as FieldRoot, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/*
 * Every size here is the sign-in and sign-up pages' own (`Field outline`,
 * `authPill`, `AuthHeading`), measured on them: the application sits in the
 * same frame and should read at the same scale.
 */

/** The sign-up page's label: grey, 500, 14px on the phone and 16 from the tablet. */
const LABEL = "gap-1.5 text-sm font-medium text-muted-foreground md:text-base";

/**
 * The sign-up page's box: 40px, 12px corners, the stronger hairline. 16px type
 * on the phone, so iOS never zooms into it; the input primitive takes it to 14
 * from the tablet, as it does on that page.
 */
const BOX = "h-10 gap-2 rounded-xl border-accented bg-card px-3 shadow-none";

/** The line under a field, and every note of that weight on these screens: 12px. */
export const NOTE = "text-xs";

/** "(ไม่บังคับ)" after a label, lighter than the label itself. */
function OptionalMark({ children }: { readonly children?: string }) {
  return children ? <span className="font-normal text-muted-foreground/80">({children})</span> : null;
}

/** The line under a field: the error when there is one, otherwise the hint. */
function Footnote({ id, error, hint }: { readonly id: string; readonly error?: ReactNode; readonly hint?: ReactNode }) {
  if (error) {
    return (
      <FieldError className={NOTE} id={`${id}-error`}>
        {error}
      </FieldError>
    );
  }
  if (hint) {
    return (
      <FieldDescription className={NOTE} id={`${id}-hint`}>
        {hint}
      </FieldDescription>
    );
  }
  return null;
}

/** Which footnote the control is described by, if any. */
function describedBy(id: string, error?: ReactNode, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/**
 * One answer on the application: label above, box, then the error or the hint
 * below it. The error replaces the hint rather than stacking under it, and the
 * box is described by whichever is showing, so a screen reader hears it on
 * focus.
 */
export function ApplicationField({
  id,
  label,
  hint,
  error,
  icon: Icon,
  optional,
  latin = false,
  className,
  ...inputProps
}: {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly icon?: LucideIcon;
  /** The word for "optional", when the answer is. */
  readonly optional?: string;
  /** Latin-only answers (a phone number, a date) take Geist. */
  readonly latin?: boolean;
} & Omit<ComponentProps<"input">, "id">) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className={LABEL} htmlFor={id}>
        {label}
        <OptionalMark>{optional}</OptionalMark>
      </FieldLabel>
      <InputGroup className={BOX}>
        {Icon ? (
          <InputGroupAddon className="p-0">
            <Icon aria-hidden className="size-4" />
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          aria-describedby={describedBy(id, error, hint)}
          aria-invalid={error ? true : undefined}
          className={cn("px-0 text-base", latin && "font-latin", className)}
          id={id}
          {...inputProps}
        />
      </InputGroup>
      <Footnote error={error} hint={hint} id={id} />
    </FieldRoot>
  );
}

/** The same answer, as a few lines of prose: it grows with what is typed. */
export function ApplicationTextarea({
  id,
  label,
  hint,
  optional,
  className,
  ...props
}: {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly optional?: string;
} & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className={LABEL} htmlFor={id}>
        {label}
        <OptionalMark>{optional}</OptionalMark>
      </FieldLabel>
      <Textarea
        aria-describedby={describedBy(id, undefined, hint)}
        className={cn(
          "max-h-56 min-h-24 resize-none rounded-xl border-accented bg-card px-3 py-2 text-base shadow-none",
          className,
        )}
        id={id}
        {...props}
      />
      <Footnote hint={hint} id={id} />
    </FieldRoot>
  );
}

/**
 * What stopped the stage, above its form, at the sign-up page's banner scale:
 * the destructive hairline over its tint, a 14px title and a 12px reason, and
 * `role="alert"` so it is read out the moment it appears.
 */
export function NoticeBanner({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-destructive/40 bg-destructive/5 px-3.5 py-3" role="alert">
      <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 text-destructive" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className={cn("text-muted-foreground", NOTE)}>{children}</div>
      </div>
    </div>
  );
}

/**
 * The picker's button: the white capsule every secondary action on the site
 * is, sized to its label, since it sits inside a well or under a preview.
 */
export const PICK = cn(authPill(), "w-auto");

/** Whether a drag carries files, rather than text or a link moved about the page. */
function carriesFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * Where a document goes before it is attached: a dashed well with the file
 * rule in it and the one button that opens the picker (or the camera, on a
 * phone). With a mouse a file can also be dropped on it; the well turns the
 * accent while one is held over it and says so.
 *
 * Dropping hands the file to the same `onPick` as the picker, so whatever the
 * screen checks a picked file for, a dropped one is checked for too: the
 * picker's `accept` does not reach a drop.
 */
export function DocumentDrop({
  icon: Icon,
  title,
  rule,
  accept,
  pickLabel,
  onPick,
  invalid = false,
  compact = false,
}: {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  /** The file types and size, under the title. */
  readonly rule: ReactNode;
  readonly accept: string;
  readonly pickLabel: ReactNode;
  readonly onPick: (file: File) => void;
  readonly invalid?: boolean;
  /** The proof well inside a skill card: one line shorter, a smaller mark. */
  readonly compact?: boolean;
}) {
  const t = useTranslations("advisorOnboarding");
  const [over, setOver] = useState(false);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-card border border-dashed text-center",
        compact ? "px-4 py-4" : "px-5 py-6",
        over && "border-primary bg-accent-surface",
        !over && invalid && "border-destructive bg-destructive/5",
        !over && !invalid && "border-accented bg-muted/40",
      )}
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        // Leaving for a child of the well is not leaving the well.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onPick(file);
      }}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-card shadow-hero-card",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon
          aria-hidden
          className={cn(compact ? "size-4.5" : "size-5", invalid && !over ? "text-destructive" : "text-muted-foreground")}
        />
      </span>
      <p className={cn("text-sm font-medium text-foreground", compact ? "mt-2" : "mt-2.5 md:text-base")}>
        {over ? t("dropRelease") : title}
      </p>
      <p className={cn("mt-0.5 text-muted-foreground", NOTE)}>{rule}</p>
      <FilePickButton accept={accept} className={cn(PICK, "mt-3")} onPick={onPick}>
        <ImageUp aria-hidden />
        {pickLabel}
      </FilePickButton>
      {/* A drop needs a pointer that can drag; on touch there is nothing to drop. */}
      <p className={cn("mt-2 hidden text-muted-foreground pointer-fine:block", NOTE)}>{t("dropHint")}</p>
    </div>
  );
}

/** A guidance line: a check in the success ink beside the sentence. */
export function CheckLine({ children }: { readonly children: ReactNode }) {
  return (
    <li className="flex w-full items-start gap-2">
      <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
      <span className="min-w-px flex-1 text-sm text-foreground">{children}</span>
    </li>
  );
}

/** "JPG · 2.4 MB": what a picked file is, the line under its name. */
export function describeFile(file: File): string {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toUpperCase();
  const size =
    file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return extension ? `${extension} · ${size}` : size;
}
