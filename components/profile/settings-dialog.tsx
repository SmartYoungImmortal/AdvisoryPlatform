"use client";

import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The fields at the capsules' heights: 44 on a phone and on an upright tablet
 * (the card is a phone's width there), and 48 in the frame's space from `lg`.
 * Descendant selectors, so the shared field itself stays untouched. The
 * dialogs draw it `outline`: the sign-up form's white box on a hairline.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-11 lg:[&_[data-slot=input-group]]:h-12 lg:[&_[data-slot=input-group]]:px-4 lg:[&_[data-slot=input-group-control]]:text-base md:[&_[data-slot=field-label]]:text-sm lg:[&_[data-slot=field-label]]:text-frame-label";

/**
 * The frame's type steps from `lg` for the shared blocks' captions and lines,
 * leaving the capsules alone: they carry their own (`settingsPill`).
 */
const BODY_LIFT = "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm:not([data-slot=button])]:text-frame-meta";

/**
 * The dialogs over the settings: changing the email or the password, the note
 * that the change is waiting on a link, and logging out.
 *
 * A small card on a half-dark scrim, everything centred down it: the step's
 * mark in a grey disc, the title in bold and the line under it, then the form,
 * then the capsules stacked full width, the thing being done in ink and the
 * way out in the settings rows' soft grey. No close in the corner: the way
 * out is the last capsule (and Escape, and the scrim). Nothing inside is
 * boxed but the fields.
 *
 * Measured in the frame's 1710 space from `lg`, where the card takes the
 * account column's zoom (`app-scale`): 440 wide, 16 round, 32 over the disc
 * and 24 round the rest. Below `lg` the zoom wrapper is `contents`.
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
  /** The step's mark, in the disc over the title. */
  readonly icon: LucideIcon;
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
        className="block max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-2xl bg-card p-0 text-foreground shadow-hero-card ring-0 outline-none sm:max-w-md lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself rather than its first field; from the keyboard it goes to
        // the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        overlayClassName="bg-scrim/50"
        ref={popup}
        showCloseButton={false}
      >
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
            <div className={cn("mt-6", BODY_LIFT, FIELD_LIFT)}>{children}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's capsules, stacked full width under the form at every size, the thing being done first. */
export const SETTINGS_DIALOG_ACTIONS = "mt-6 flex flex-col gap-2.5";

/**
 * The dialog's capsules, 48 tall with 16px type in the frame's space: the
 * thing being done filled in ink (`solid`), and the way out in the soft grey
 * of the settings rows' own capsules. Neither has a line round it.
 */
export function settingsPill(kind: "solid" | "soft" = "soft") {
  return cn(
    "h-11 w-full gap-2 rounded-full border-0 px-5 text-sm font-medium shadow-none disabled:opacity-40 lg:h-12 lg:px-6 lg:text-base",
    kind === "solid"
      ? "bg-hero-action text-hero-action-foreground hover:bg-hero-action/85"
      : "bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

/**
 * A short list inside the dialog (what goes with the account, the rules a
 * password answers to): its caption, then a line for each, on the dialog's
 * own white with nothing drawn round it.
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
