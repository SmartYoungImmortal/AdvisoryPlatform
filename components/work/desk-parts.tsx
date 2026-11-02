"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The pieces the desk's pages are drawn with, each the approved pages' own:
 * the transactions page's filter capsules and empty box, and the settings
 * page's rows. A page of the desk is these and its list, nothing else.
 */

/** A capsule: its name, and after it what it holds (how many, or how much). */
export type DeskFilterOption<K extends string> = { readonly key: K; readonly label: string; readonly note?: ReactNode };

/**
 * Capsules that filter the list under them, the current one filled in ink —
 * the transactions page's, with what each holds after its name.
 */
export function DeskFilter<K extends string>({ label, value, options, onChange }: {
  readonly label: string;
  readonly value: K;
  readonly options: readonly DeskFilterOption<K>[];
  readonly onChange: (next: K) => void;
}) {
  return (
    // `<fieldset>`: a group by its own semantics; reset so it lays out as the row it was.
    <fieldset
      aria-label={label}
      className="-mx-5 mt-5 flex min-w-0 gap-2 overflow-x-auto border-0 px-5 py-0 md:-mx-10 md:px-10 lg:mx-0 lg:mt-8 lg:gap-3 lg:px-0"
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Button
            aria-pressed={active}
            className={cn(
              "h-9 shrink-0 gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap lg:h-12 lg:px-5 lg:text-frame-meta",
              active
                ? "border-hero-action bg-hero-action text-hero-action-foreground hover:bg-hero-action/90 hover:text-hero-action-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
            key={option.key}
            onClick={() => onChange(option.key)}
            type="button"
            variant="ghost"
          >
            {option.label}
            {option.note === undefined ? null : (
              <span className={cn("font-latin tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{option.note}</span>
            )}
          </Button>
        );
      })}
    </fieldset>
  );
}

/** A placeholder's surface while the API answers, still for a reader who asks for less motion. */
export const DESK_BONE = "animate-pulse bg-muted motion-reduce:animate-none";

/**
 * A list page's own shape while it loads, so nothing shifts when it lands —
 * the transactions page's skeleton: the capsules' row (`capsules` their
 * widths), then groups of rows with the hairline between, each row the
 * circle, its two lines and the value at the right. Each line is one line
 * box of its text's step (`h-lh`) with the bone inside, so a row stands as
 * tall as a real one.
 */
export function DeskListSkeleton({ label, capsules, groups = 2, rows = 2 }: {
  readonly label: string;
  readonly capsules: readonly string[];
  readonly groups?: number;
  readonly rows?: number;
}) {
  return (
    <div aria-busy className="flex w-full flex-col">
      <span className="sr-only">{label}</span>
      {capsules.length > 0 ? (
        <div aria-hidden className="mt-5 flex gap-2 lg:mt-8 lg:gap-3">
          {capsules.map((width) => (
            <span className={cn(DESK_BONE, "h-9 shrink-0 rounded-full lg:h-12", width)} key={width} />
          ))}
        </div>
      ) : null}
      <div aria-hidden className="flex flex-col divide-y divide-border">
        {Array.from({ length: groups }, (_, group) => (
          <div className="flex flex-col pt-5 lg:pt-8" key={group}>
            <span className="flex h-lh items-center text-xs lg:text-frame-label">
              <span className={cn(DESK_BONE, "h-3 w-24 rounded lg:h-3.5 lg:w-28")} />
            </span>
            {Array.from({ length: rows }, (_, row) => (
              <div className="flex items-start gap-3 py-2.5 lg:gap-5 lg:py-3.5" key={row}>
                <span className={cn(DESK_BONE, "size-9 shrink-0 rounded-full lg:size-12")} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
                  <span className="flex h-lh items-center text-sm lg:text-frame-body">
                    <span className={cn(DESK_BONE, "h-3.5 w-1/2 rounded lg:h-4.5")} />
                  </span>
                  <span className="flex h-lh items-center text-xs lg:text-frame-meta">
                    <span className={cn(DESK_BONE, "h-3 w-1/3 rounded lg:h-4")} />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 lg:gap-1">
                  <span className="flex h-lh items-center text-sm lg:text-frame-meta">
                    <span className={cn(DESK_BONE, "h-3.5 w-12 rounded lg:h-4 lg:w-14")} />
                  </span>
                  <span className="flex h-lh items-center text-xs lg:text-frame-label">
                    <span className={cn(DESK_BONE, "h-3 w-10 rounded lg:h-3.5 lg:w-12")} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Nothing here yet — the transactions page's empty box: from `lg` one
 * hairline box filling the rest of the page, its muted glyph, what will land
 * here, and the way to start when there is one.
 */
export function DeskEmpty({ icon: Icon, title, body, action }: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly action?: { readonly label: string; readonly href: string };
}) {
  return (
    <div className="mt-6 flex min-h-[calc(100dvh-22rem)] w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center lg:mt-8 lg:min-h-0 lg:flex-1 lg:gap-5 lg:rounded-2xl lg:border lg:border-border lg:py-20">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-hero-ink/75 lg:size-14">
        <Icon aria-hidden className="size-5 lg:size-7" strokeWidth={1.5} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-base font-semibold text-foreground lg:text-frame-figure">{title}</h2>
        <p className="text-xs text-balance text-muted-foreground lg:text-frame-meta">{body}</p>
      </div>
      {action ? (
        <Button
          className={cn(authPill(true), "mt-1 h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body")}
          nativeButton={false}
          render={<Link href={action.href} />}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

/** A part of a desk page: its name a step under the band's title, what it does at the right, then its body. */
export function DeskSection({ id, title, hint, action, children, className }: {
  readonly id: string;
  readonly title: string;
  readonly hint?: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex min-h-11 items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground lg:text-frame-body" id={id}>
            {title}
          </h2>
          {hint ? <p className="text-xs text-muted-foreground lg:text-frame-meta">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A setting's row — the settings page's: what it is with its line under it,
 * and its control at the right, on a hairline. A list of them is a `<ul>`.
 */
export function DeskRow({ label, detail, children }: {
  readonly label: ReactNode;
  readonly detail?: ReactNode;
  /** The control: an action capsule, a switch. */
  readonly children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 border-b border-border py-3 md:py-3.5 lg:gap-8 lg:py-5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:gap-1">
        <span className="text-sm font-medium text-foreground lg:text-frame-body">{label}</span>
        {detail ? <span className="text-xs break-words text-muted-foreground lg:text-frame-meta">{detail}</span> : null}
      </div>
      {children}
    </li>
  );
}

/** A row's action — the settings page's soft grey capsule: a link, or a press. */
export function DeskRowAction({ href, onClick, children }: {
  readonly children: ReactNode;
} & ({ readonly href: string; readonly onClick?: never } | { readonly href?: never; readonly onClick: () => void })) {
  const className = "h-8 shrink-0 rounded-full bg-muted px-3.5 text-xs font-medium text-foreground hover:bg-muted/70 hover:text-foreground md:text-sm lg:h-11 lg:px-5 lg:text-frame-meta";
  if (href === undefined) {
    return (
      <Button className={className} onClick={onClick} type="button" variant="ghost">
        {children}
      </Button>
    );
  }
  return (
    <Button className={className} nativeButton={false} render={<Link href={href} />} variant="ghost">
      {children}
    </Button>
  );
}
