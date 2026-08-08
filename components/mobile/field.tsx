import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Figma "Vertical Field" — 61px tall: a 21px label row, a 4px gap and a 36px input
 * on surface-input with a border-input hairline and an 8px radius. Figma's shadow-xs
 * is fully transparent, so no box-shadow is drawn.
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
    <div className="flex w-full shrink-0 flex-col items-start overflow-clip">
      <div className="flex w-full flex-col items-start gap-1">
        <div className="relative h-[21px] w-full shrink-0">
          <label
            className="font-thai absolute inset-x-0 top-0 text-[14px] leading-[20px] font-medium text-foreground"
            htmlFor={inputProps.id}
          >
            {label}
          </label>
        </div>
        <div
          className={cn(
            "flex h-9 w-full shrink-0 items-center gap-2 overflow-clip rounded-[8px] border bg-muted px-3 py-[7.5px]",
            invalid ? "border-destructive" : "border-input",
          )}
        >
          {Icon ? (
            <span className="flex w-5 shrink-0 flex-col items-center justify-center p-[2px]">
              <Icon className="size-4 text-muted-foreground" />
            </span>
          ) : null}
          <input
            className={cn(
              "min-w-px flex-1 bg-transparent text-[14px] leading-[20px] font-normal text-foreground outline-none placeholder:text-muted-foreground",
              latin ? "font-latin" : "font-thai",
              className,
            )}
            {...inputProps}
          />
          {trailing ? (
            <span className="flex w-5 shrink-0 flex-col items-center justify-center p-[2px] text-muted-foreground">
              {trailing}
            </span>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="font-thai mt-1 w-full text-[12px] leading-[18px] font-normal text-destructive">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p className="font-thai mt-1 w-full text-[12px] leading-[18px] font-normal text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
