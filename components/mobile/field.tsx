import { Eye, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import {
  Field as FieldRoot,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Figma's eye affordance inside a password field. A real button, so it is
 * reachable by Tab and carries a focus ring — the bare <button> it replaces had
 * neither, and each password screen re-declared its own copy.
 */
export function RevealPasswordButton({ label }: { readonly label: string }) {
  return (
    <InputGroupButton aria-label={label} className="text-muted-foreground" size="icon-xs">
      <Eye className="size-4" />
    </InputGroupButton>
  );
}

/**
 * Figma "Vertical Field" — a 21px label row, a 4px gap and a 36px input on
 * surface-input with a border-input hairline. Figma's shadow-xs is fully
 * transparent, so no box-shadow is drawn.
 *
 * The metrics are the only thing this layer owns: the label/description/error
 * wiring (`htmlFor`, `aria-describedby`, `role="alert"`), the focus ring and the
 * aria-invalid treatment all come from the shadcn primitives underneath. The
 * hand-rolled version drew the same box but had none of that behaviour.
 */
export function Field({
  label,
  icon: Icon,
  trailing,
  hint,
  error,
  invalid = false,
  latin = false,
  className,
  ...inputProps
}: {
  readonly label: ReactNode;
  readonly icon?: LucideIcon;
  readonly trailing?: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly invalid?: boolean;
  readonly latin?: boolean;
} & ComponentProps<"input">) {
  return (
    <FieldRoot className="gap-1">
      <FieldLabel htmlFor={inputProps.id}>{label}</FieldLabel>
      {/* Padding lives on the group so the icon, control and trailing slot share
          one 12px inset instead of each re-deriving it. */}
      <InputGroup className="gap-2 bg-muted px-3 shadow-none">
        {Icon ? (
          <InputGroupAddon className="p-0">
            <Icon className="size-4" />
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          aria-invalid={invalid || undefined}
          className={cn("px-0 text-sm", latin && "font-latin", className)}
          {...inputProps}
        />
        {trailing ? (
          <InputGroupAddon align="inline-end" className="p-0">
            {trailing}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? (
        <FieldError className="text-xs">{error}</FieldError>
      ) : hint ? (
        <FieldDescription className="text-xs">{hint}</FieldDescription>
      ) : null}
    </FieldRoot>
  );
}
