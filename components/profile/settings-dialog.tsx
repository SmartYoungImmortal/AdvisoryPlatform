"use client";

import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The fields at 36 on a phone, 44 on an upright tablet and in the frame's
 * space from `lg`. On a phone the label and the field's own type are 12, the
 * placeholder centred with it; iOS no longer zooms into a field that small
 * (`IosFocusZoom`).
 * Descendant selectors, so the shared field itself stays untouched. The
 * dialogs draw it `outline`: the sign-up form's white box on a hairline.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-9 md:[&_[data-slot=input-group]]:h-11 lg:[&_[data-slot=input-group]]:px-4 lg:[&_[data-slot=input-group-control]]:text-base [&_[data-slot=field-label]]:text-xs md:[&_[data-slot=field-label]]:text-sm lg:[&_[data-slot=field-label]]:text-frame-label [&_[data-slot=input-group-control]]:text-xs md:[&_[data-slot=input-group-control]]:text-base";

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
 * edge; a 23/600 title, its 19/28 line 8 under it, the answers 48 tall, 12
 * apart, 24 under the line. Below `lg` the zoom wrapper is `contents` and the
 * card is a step smaller, 20 in from its edges.
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
        // On a phone no wider than 320 (16 clear of the edges on a narrower
        // one), a card over the page rather than a sheet across it; an
        // upright tablet keeps its 384.
        className="block max-h-[calc(100dvh-2rem)] max-w-[min(20rem,calc(100%-2rem))] gap-0 overflow-y-auto overscroll-contain rounded-2xl bg-card p-0 text-foreground shadow-hero-card ring-0 outline-none sm:max-w-80 md:max-w-sm lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself rather than its first field; from the keyboard it goes to
        // the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        overlayClassName="bg-scrim/50"
        ref={popup}
        showCloseButton={false}
      >
        {Icon ? (
          // A step smaller on a phone, where the card is most of the screen.
          <div className="app-scale contents lg:block lg:w-110">
            <div className="flex flex-col px-4 pt-5 pb-4 md:px-6 md:pt-8 md:pb-6">
              <div className="flex flex-col items-center text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted md:size-14 lg:size-16">
                  <Icon aria-hidden className="size-5 text-foreground md:size-7 lg:size-8" strokeWidth={1.75} />
                </span>
                <DialogTitle className="mt-1.5 text-sm leading-6 font-semibold text-foreground md:text-xl md:leading-8 lg:text-frame-heading">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-0.5 text-xs text-balance text-muted-foreground md:text-sm lg:text-frame-label">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              <div className={cn("mt-4 md:mt-6", BODY_LIFT, FIELD_LIFT, "lg:[&_[data-slot=input-group]]:h-12")}>
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div className="app-scale contents lg:block lg:w-100">
            <div className="flex flex-col p-4 md:p-6">
              <DialogTitle className="text-sm leading-6 font-semibold text-foreground md:text-xl md:leading-8 lg:text-frame-heading">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 text-xs text-pretty text-muted-foreground md:text-sm lg:mt-2 lg:text-frame-body lg:leading-7">
                  {description}
                </DialogDescription>
              ) : null}
              <div className={cn("mt-4 md:mt-6", BODY_LIFT, FIELD_LIFT)}>{children}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's answers: one line held to the right, the way out first and the thing being done last. */
export const SETTINGS_DIALOG_ACTIONS = "mt-4 flex flex-wrap justify-end gap-2 md:mt-6 md:gap-3";

/**
 * The dialog's answers, 48 tall with 19px type in the frame's space (40 on a
 * phone): the way out as bare words (`ghost`), the thing being done filled
 * in ink (`solid`), or in a soft red for leaving (`danger`). None has a line
 * round it.
 */
export function settingsPill(kind: "solid" | "ghost" | "danger") {
  return cn(
    "h-9 shrink-0 rounded-full border-0 px-4 text-xs font-medium shadow-none disabled:opacity-40 md:h-11 md:text-sm lg:h-12 lg:px-5 lg:text-frame-body",
    kind === "solid" && "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85",
    kind === "ghost" && "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
    kind === "danger" && "bg-destructive/25 text-destructive hover:bg-destructive/35 hover:text-destructive",
  );
}

/** The centred card's capsules (`icon`), stacked full width under the form, the thing being done first. */
export const SETTINGS_DIALOG_STACK = "mt-4 flex flex-col gap-2 md:mt-6 md:gap-2.5";

/**
 * The centred card's capsules, 48 tall with 16px type in the frame's space
 * (40 on a phone):
 * the thing being done filled in ink (`solid`), or in red for what cannot be
 * undone (`danger`), and the way out in the soft grey of the settings rows'
 * own capsules (`soft`). None has a line round it.
 */
export function settingsStackPill(kind: "solid" | "danger" | "soft") {
  return cn(
    "h-9 w-full gap-2 rounded-full border-0 px-5 text-xs font-medium shadow-none disabled:opacity-40 md:h-11 md:text-sm lg:h-12 lg:px-6 lg:text-base",
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
