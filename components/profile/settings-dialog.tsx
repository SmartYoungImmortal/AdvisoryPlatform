"use client";

import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The fields at a thumb's 44 on a phone and an upright tablet (the card is a
 * phone's width there), and 44 in the frame's space from `lg`, a step over
 * the capsules under them. Descendant selectors, so the shared field itself
 * stays untouched. The dialogs draw it `outline`: the sign-up form's white
 * box on a hairline.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-11 lg:[&_[data-slot=input-group]]:px-4 lg:[&_[data-slot=input-group-control]]:text-base md:[&_[data-slot=field-label]]:text-sm lg:[&_[data-slot=field-label]]:text-frame-label";

/**
 * The frame's type steps from `lg` for the shared blocks' captions and lines,
 * leaving the capsules alone: they carry their own (`settingsPill`).
 */
const BODY_LIFT = "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm:not([data-slot=button])]:text-frame-meta";

/**
 * The dialogs over the settings: changing the email or the password, the note
 * that the change is waiting on a link, and logging out.
 *
 * A confirm card on a half-dark scrim, read from the top left: the question
 * in bold, the line under it, the form if there is one, then the answers on
 * one line held to the right, the way out as bare words and the thing being
 * done as the capsule last. No close in the corner and no mark: the way out
 * is the first answer (and Escape, and the scrim). Nothing inside is boxed
 * but the fields.
 *
 * Measured in the frame's 1710 space from `lg`, where the card takes the
 * account column's zoom (`app-scale`): 400 wide, 16 round, 24 in from every
 * edge; a 23/600 title, the 16/24 line 8 under it, the answers 40 tall, 12
 * apart, 24 under the line. Below `lg` the zoom wrapper is `contents`.
 *
 * The route *is* the dialog's open state (`defaultOpen`), so
 * `/settings/password` still opens straight onto the form; closing it goes
 * back to `closeHref`. With `open` the page holds it instead.
 */
export function SettingsDialog({
  icon: Icon,
  title,
  description,
  closeHref = "/settings",
  open,
  onOpenChange,
  children,
}: {
  /**
   * The step's mark. With one, the card is the centred kind instead (as
   * changing the password is): 440 wide, the mark in a grey disc 32 from the
   * top, the title and its line centred under it, the capsules stacked full
   * width (`SETTINGS_DIALOG_STACK`, `settingsStackPill`) and the fields 48
   * tall in the frame's space.
   */
  readonly icon?: LucideIcon;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly closeHref?: string;
  /** Held by the page rather than the route; `onOpenChange` hears every close. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const popup = useRef<HTMLDivElement>(null);
  const state =
    open === undefined
      ? { defaultOpen: true, onOpenChange: (next: boolean) => !next && router.push(closeHref) }
      : { open, onOpenChange };

  return (
    <Dialog {...state}>
      <DialogContent
        // On a phone 16px clear of each edge.
        className="block max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-2xl bg-card p-0 text-foreground shadow-hero-card ring-0 outline-none sm:max-w-sm lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself rather than its first field; from the keyboard it goes to
        // the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        overlayClassName="bg-scrim/50"
        ref={popup}
        showCloseButton={false}
      >
        {Icon ? (
          <div className="app-scale contents lg:block lg:w-110">
            <div className="flex flex-col px-6 pt-8 pb-6">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-muted lg:size-16">
                  <Icon aria-hidden className="size-7 text-foreground lg:size-8" strokeWidth={1.75} />
                </span>
                <DialogTitle className="mt-1.5 text-xl leading-8 font-semibold text-foreground lg:text-frame-heading">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-0.5 text-sm text-balance text-muted-foreground lg:text-frame-label">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              <div className={cn("mt-6", BODY_LIFT, FIELD_LIFT, "lg:[&_[data-slot=input-group]]:h-12")}>{children}</div>
            </div>
          </div>
        ) : (
          <div className="app-scale contents lg:block lg:w-100">
            <div className="flex flex-col p-6">
              <DialogTitle className="text-xl leading-8 font-semibold text-foreground lg:text-frame-heading">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 text-sm text-pretty text-muted-foreground lg:mt-2 lg:text-base lg:leading-6">
                  {description}
                </DialogDescription>
              ) : null}
              <div className={cn("mt-6", BODY_LIFT, FIELD_LIFT)}>{children}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's answers: one line held to the right, the way out first and the thing being done last. */
export const SETTINGS_DIALOG_ACTIONS = "mt-6 flex flex-wrap justify-end gap-3";

/**
 * The dialog's answers, 40 tall with 16px type in the frame's space (a
 * thumb's 44 on a phone): the way out as bare words (`ghost`), the thing
 * being done filled in ink (`solid`), or in a soft red for leaving
 * (`danger`). None has a line round it.
 */
export function settingsPill(kind: "solid" | "ghost" | "danger") {
  return cn(
    "h-11 shrink-0 rounded-full border-0 px-4 text-sm font-medium shadow-none disabled:opacity-40 lg:h-10 lg:text-base",
    kind === "solid" && "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85",
    kind === "ghost" && "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
    kind === "danger" && "bg-destructive/25 text-destructive hover:bg-destructive/35 hover:text-destructive",
  );
}

/** The centred card's capsules (`icon`), stacked full width under the form, the thing being done first. */
export const SETTINGS_DIALOG_STACK = "mt-6 flex flex-col gap-2.5";

/**
 * The centred card's capsules, 48 tall with 16px type in the frame's space:
 * the thing being done filled in ink (`solid`), or in red for what cannot be
 * undone (`danger`), and the way out in the soft grey of the settings rows'
 * own capsules (`soft`). None has a line round it.
 */
export function settingsStackPill(kind: "solid" | "danger" | "soft") {
  return cn(
    "h-11 w-full gap-2 rounded-full border-0 px-5 text-sm font-medium shadow-none disabled:opacity-40 lg:h-12 lg:px-6 lg:text-base",
    kind === "solid" && "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85",
    kind === "danger" && "bg-destructive text-primary-foreground hover:bg-destructive/90",
    kind === "soft" && "bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

/**
 * A short list inside the dialog (the rules a password answers to): its
 * caption, then a line for each, on the dialog's own white with nothing
 * drawn round it.
 */
export function SettingsDialogList({
  caption,
  children,
  className,
}: {
  readonly caption: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5 lg:gap-3", className)}>
      <p className="text-xs text-muted-foreground">{caption}</p>
      {children}
    </div>
  );
}
