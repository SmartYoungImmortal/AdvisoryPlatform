"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldDescription, FieldError, FieldLabel, Field as FieldRoot } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The fields and the entry dialog of `/advisor/edit`, shared by its
 * background lists and its portfolio.
 */

/** The box every field here wears: the sign-up form's white box on a hairline. */
export const FIELD_BOX = "h-11 rounded-xl border-accented bg-card px-4 text-base shadow-none md:h-12 md:text-base";

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  inputMode,
  placeholder,
  className,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly error?: string;
  readonly inputMode?: "numeric" | "url";
  readonly placeholder?: string;
  readonly className?: string;
}) {
  const note = `${id}-note`;
  return (
    <FieldRoot className={cn("gap-1.5", className)} data-invalid={error ? true : undefined}>
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Input
        aria-describedby={error || hint ? note : undefined}
        aria-invalid={error ? true : undefined}
        className={FIELD_BOX}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? (
        <FieldError className="text-sm" id={note}>
          {error}
        </FieldError>
      ) : null}
      {!error && hint ? (
        <FieldDescription className="text-sm" id={note}>
          {hint}
        </FieldDescription>
      ) : null}
    </FieldRoot>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly hint?: string;
  readonly rows?: number;
}) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Textarea
        className="min-h-24 rounded-xl border-accented bg-card px-4 py-3 text-base shadow-none field-sizing-content md:text-base"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
      {hint ? <FieldDescription className="text-sm">{hint}</FieldDescription> : null}
    </FieldRoot>
  );
}

export function SelectField<K extends string>({
  id,
  label,
  value,
  onChange,
  items,
  placeholder,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: K | "";
  readonly onChange: (value: K) => void;
  readonly items: readonly { readonly value: K; readonly label: string }[];
  readonly placeholder?: string;
}) {
  return (
    <FieldRoot className="gap-1.5">
      <FieldLabel className="text-sm font-medium text-muted-foreground" htmlFor={id}>
        {label}
      </FieldLabel>
      <Select items={items} onValueChange={(next) => onChange(next as K)} value={value || null}>
        <SelectTrigger className={cn(FIELD_BOX, "w-full justify-between data-[size=default]:h-11 md:data-[size=default]:h-12")} id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} sideOffset={6}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRoot>
  );
}

/**
 * An entry's dialog, the settings' confirm card: its title in bold at the top
 * left, the fields flat on white, and the answers on one line at the right,
 * the way out as bare words and saving the entry as the capsule. `aside`
 * sits at the start of that line (a way to delete the entry), `problem`
 * above it (why the last save failed).
 */
export function EntryDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  children,
  submitLabel,
  busy = false,
  aside,
  problem,
  wide = false,
  focusId,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly onSubmit: () => void;
  readonly children: ReactNode;
  readonly submitLabel?: string;
  readonly busy?: boolean;
  readonly aside?: ReactNode;
  readonly problem?: string | null;
  readonly wide?: boolean;
  /** The field to start in, where the first thing in the dialog is not one (a picture's remove). */
  readonly focusId?: string;
}) {
  const t = useTranslations("advisorEdit");
  return (
    <Dialog onOpenChange={(next) => (busy ? null : onOpenChange(next))} open={open}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl p-5 md:p-6",
          wide ? "sm:max-w-[560px]" : "sm:max-w-[480px]",
        )}
        initialFocus={focusId ? () => document.getElementById(focusId) : undefined}
        overlayClassName="bg-scrim/40 supports-backdrop-filter:backdrop-blur-none"
        showCloseButton={false}
      >
        <form
          className="flex flex-col"
          noValidate
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            // The dialog is portalled out of the page's form in the DOM but not in React,
            // so its submit would otherwise reach that form's handler too.
            event.stopPropagation();
            if (!busy) onSubmit();
          }}
        >
          <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
          <div className="mt-5 flex flex-col gap-4">{children}</div>
          {problem ? (
            <p className="mt-5 text-sm text-destructive" role="alert">
              {problem}
            </p>
          ) : null}
          <div className="mt-6 flex items-center justify-end gap-3">
            {aside ? <div className="mr-auto">{aside}</div> : null}
            <Button className="h-11 px-4 text-sm font-medium" disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="ghost">
              {t("cancel")}
            </Button>
            <Button
              className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background hover:bg-foreground/85"
              disabled={busy}
              type="submit"
            >
              {busy ? t("saving") : (submitLabel ?? t("done"))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
