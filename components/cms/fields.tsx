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
 * Nexus's form atoms (`CmsShortText`, `CmsLongText`, `CmsSelect`) on the shadcn
 * primitives. The look is Nuxt UI's md input: 6px radius, an inset `accented`
 * ring that thickens to the primary on focus, `px-2.5 py-1.5`, dimmed
 * placeholder and leading icon.
 */
const controlClass =
  "h-8 rounded-md border-0 bg-card px-2.5 py-1.5 text-sm text-highlighted shadow-none ring-1 ring-accented ring-inset placeholder:text-dimmed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset aria-invalid:ring-destructive disabled:cursor-not-allowed disabled:opacity-75";

/** Nuxt UI's `UFormField`: label row, 4px gap, control, then error or help. */
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
    <div className={cn("text-sm", className)}>
      {label !== undefined || hint !== undefined ? (
        <div className="flex items-center justify-between gap-2">
          {label !== undefined ? (
            <label
              className={cn(
                "block font-medium text-foreground",
                required && "after:ms-0.5 after:text-destructive after:content-['*']",
              )}
              htmlFor={htmlFor}
            >
              {label}
            </label>
          ) : null}
          {hint !== undefined ? <span className="text-dimmed">{hint}</span> : null}
        </div>
      ) : null}
      {description !== undefined ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
      <div className={cn("relative", (label !== undefined || description !== undefined) && "mt-1")}>
        {children}
      </div>
      {error ? (
        <p className="mt-2 text-destructive" role="alert">
          {error}
        </p>
      ) : help !== undefined ? (
        <p className="mt-2 text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

export function CmsInput({
  icon: Icon,
  trailing,
  invalid = false,
  className,
  ...props
}: ComponentProps<"input"> & {
  readonly icon?: LucideIcon;
  readonly trailing?: ReactNode;
  readonly invalid?: boolean;
}) {
  return (
    <div className={cn("relative inline-flex w-full items-center", className)}>
      {Icon ? (
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5">
          <Icon aria-hidden className="size-5 shrink-0 text-dimmed" />
        </span>
      ) : null}
      <Input
        aria-invalid={invalid || undefined}
        className={cn(controlClass, Icon && "ps-9", trailing !== undefined && "pe-9")}
        {...props}
      />
      {trailing !== undefined ? (
        <span className="absolute inset-y-0 end-0 flex items-center pe-2.5">{trailing}</span>
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
      className={cn(controlClass, "h-auto min-h-20 field-sizing-content", className)}
      {...props}
    />
  );
}

export type CmsOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
  readonly icon?: LucideIcon;
};

/** `USelect` with an items array — the shape every Nexus select takes. */
export function CmsSelect<Value extends string>({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  invalid = false,
  className,
}: {
  readonly id?: string;
  readonly value: Value | null;
  readonly onValueChange: (value: Value) => void;
  readonly items: ReadonlyArray<CmsOption<Value>>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly className?: string;
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
        className={cn(
          controlClass,
          "w-full justify-start gap-1.5 [&>svg:last-child]:ms-auto [&>svg:last-child]:size-5 [&>svg:last-child]:text-dimmed",
          className,
        )}
        id={id}
        // `sm` is the primitive's 32px — `USelect` at md. The default size pins
        // 36px through a data attribute that outranks `controlClass`'s `h-8`.
        size="sm"
      >
        {SelectedIcon ? <SelectedIcon aria-hidden className="size-4 text-dimmed" /> : null}
        <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="rounded-md bg-card p-1 shadow-lg ring-1 ring-border"
      >
        {items.map((item) => (
          <SelectItem
            className="rounded-md p-1.5 pe-8 text-sm text-foreground focus:bg-muted/50 focus:text-highlighted"
            key={item.value}
            value={item.value}
          >
            {item.icon ? <item.icon aria-hidden className="size-4 text-dimmed" /> : null}
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
