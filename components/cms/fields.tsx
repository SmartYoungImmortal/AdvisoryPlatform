"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

import { CmsButton, type CmsButtonProps } from "@/components/cms/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The console's form controls on the shadcn primitives, drawn as the site's
 * sign-in field is (`Field outline`): a white box on a grey hairline with 14px
 * corners, the focus ring the rest of the site shows, 40 tall at 1440 and 44
 * on a phone, where the type is 16px so iOS does not zoom into the field.
 */
const controlClass =
  "h-11 rounded-xl border border-accented bg-card px-3.5 py-2 text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm";

/** A field: its label (a muted 14px line, as on the sign-in page), the control, then the error or a help line. */
export function CmsFormField({
  label,
  htmlFor,
  required = false,
  hint,
  description,
  error,
  help,
  className,
  children,
}: {
  readonly label?: ReactNode;
  readonly htmlFor?: string;
  readonly required?: boolean;
  readonly hint?: ReactNode;
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly help?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      {label !== undefined || hint !== undefined ? (
        <div className="flex items-center justify-between gap-2">
          {label !== undefined ? (
            <label
              className={cn(
                "block font-medium text-muted-foreground",
                required && "after:ms-0.5 after:text-destructive after:content-['*']",
              )}
              htmlFor={htmlFor}
            >
              {label}
            </label>
          ) : null}
          {hint !== undefined ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
      {description !== undefined ? <p className="text-muted-foreground">{description}</p> : null}
      <div className="relative">{children}</div>
      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : help !== undefined ? (
        <p className="text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

export function CmsInput({
  icon: Icon,
  trailing,
  invalid = false,
  className,
  inputClassName,
  ...props
}: ComponentProps<"input"> & {
  readonly icon?: LucideIcon;
  readonly trailing?: ReactNode;
  readonly invalid?: boolean;
  /** Classes for the input itself; `className` styles the wrapper. */
  readonly inputClassName?: string;
}) {
  return (
    <div className={cn("relative inline-flex w-full items-center", className)}>
      {Icon ? (
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </span>
      ) : null}
      <Input
        aria-invalid={invalid || undefined}
        className={cn(controlClass, Icon && "ps-10", trailing !== undefined && "pe-10", inputClassName)}
        {...props}
      />
      {trailing !== undefined ? (
        <span className="absolute inset-y-0 end-0 flex items-center pe-2">{trailing}</span>
      ) : null}
    </div>
  );
}

export function CmsTextarea({
  invalid = false,
  className,
  ...props
}: ComponentProps<"textarea"> & { readonly invalid?: boolean }) {
  return (
    <Textarea
      aria-invalid={invalid || undefined}
      className={cn(controlClass, "h-auto min-h-24 py-2.5 md:h-auto", className)}
      {...props}
    />
  );
}

export type CmsOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly icon?: LucideIcon;
};

/** A select over an items array, in the same box as the text fields. */
export function CmsSelect<Value extends string>({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  invalid = false,
  className,
  "aria-label": ariaLabel,
}: {
  readonly id?: string;
  readonly value: Value | null;
  readonly onValueChange: (value: Value) => void;
  readonly items: ReadonlyArray<CmsOption<Value>>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly className?: string;
  readonly "aria-label"?: string;
}) {
  const selected = items.find((item) => item.value === value);
  const SelectedIcon = selected?.icon;
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as Value);
      }}
      value={value}
    >
      <SelectTrigger
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        className={cn(
          controlClass,
          "w-full justify-start gap-2 data-[size=default]:h-11 md:data-[size=default]:h-10 [&>svg:last-child]:ms-auto [&>svg:last-child]:size-4",
          className,
        )}
        id={id}
      >
        {SelectedIcon ? <SelectedIcon aria-hidden className="size-4 text-muted-foreground" /> : null}
        <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="rounded-xl bg-popover p-1 shadow-panel ring-1 ring-border"
      >
        {items.map((item) => (
          <SelectItem
            className="h-9 rounded-lg px-2.5 pe-8 text-sm text-foreground focus:bg-muted focus:text-foreground"
            key={item.value}
            value={item.value}
          >
            {item.icon ? <item.icon aria-hidden className="size-4 text-muted-foreground" /> : null}
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A labelled field around a text input — the common case, spelled once. */
export function CmsTextField({
  label,
  required,
  error,
  help,
  className,
  ...inputProps
}: ComponentProps<typeof CmsInput> & {
  readonly label: ReactNode;
  readonly required?: boolean;
  readonly error?: ReactNode;
  readonly help?: ReactNode;
}) {
  const fallbackId = useId();
  const id = inputProps.id ?? fallbackId;
  return (
    <CmsFormField
      className={className}
      error={error}
      help={help}
      htmlFor={id}
      label={label}
      required={required}
    >
      <CmsInput {...inputProps} id={id} invalid={Boolean(error)} required={required} />
    </CmsFormField>
  );
}

/** `CmsButton` as a link, with the Base UI prop a non-<button> needs. */
export function CmsLinkButton({
  href,
  ...props
}: Omit<CmsButtonProps, "render" | "nativeButton"> & { readonly href: string }) {
  return <CmsButton nativeButton={false} render={<Link href={href} />} {...props} />;
}
