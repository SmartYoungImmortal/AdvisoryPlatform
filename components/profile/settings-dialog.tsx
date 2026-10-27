"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { PILL_LG, SHEET_W } from "@/components/payment/invoice-screens";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The fields at the capsules' heights: 44 on a phone and on an upright tablet
 * (the sheet is a phone's width there), and from `lg`, where the sheet is
 * zoomed down from 1710, 56, the capsules' own. Descendant selectors, so the
 * shared field itself stays untouched. The dialogs draw it `outline`: the
 * sign-up form's white box on a hairline.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-11 lg:[&_[data-slot=input-group]]:h-14 lg:[&_[data-slot=input-group]]:px-5 lg:[&_[data-slot=input-group-control]]:text-frame-body md:[&_[data-slot=field-label]]:text-sm lg:[&_[data-slot=field-label]]:text-frame-meta";

/**
 * The frame's type steps from `lg` for the shared blocks' captions and lines,
 * leaving the capsules alone: they carry their own (`settingsPill`).
 */
const BODY_LIFT = "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm:not([data-slot=button])]:text-frame-meta";

/**
 * The dialogs over the settings: changing the email or the password, the note
 * that the change is waiting on a link, and logging out.
 *
 * Laid out as a sign-in popup is: the close bare at the top right corner, the
 * title in bold and the line under it centred over the form, then the
 * capsules stacked full width under everything, the thing being done filled
 * in ink and the way out the soft grey capsule the settings rows already use.
 * Nothing inside is boxed but the fields.
 *
 * The route *is* the dialog's open state (`defaultOpen`), so
 * `/settings/password` still opens straight onto the form; closing it (the
 * button, Escape or the scrim) goes back to `closeHref`. With `open` the page
 * holds it instead.
 *
 * The popup is portalled out of the account column, so from `lg` it takes the
 * column's zoom itself (`app-scale`); below `lg` that wrapper is `contents`.
 */
export function SettingsDialog({
  title,
  description,
  closeHref = "/settings",
  open,
  onOpenChange,
  children,
}: {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly closeHref?: string;
  /** Held by the page rather than the route; `onOpenChange` hears every close. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const c = useTranslations("common");
  const popup = useRef<HTMLDivElement>(null);
  const state =
    open === undefined
      ? { defaultOpen: true, onOpenChange: (next: boolean) => !next && router.push(closeHref) }
      : { open, onOpenChange };

  return (
    <Dialog {...state}>
      <DialogContent
        // On a phone 24px clear of each edge.
        className="block max-h-[calc(100dvh-3rem)] max-w-[calc(100%-3rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 outline-none sm:max-w-sm lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself, so the close does not open wearing its focus ring; from the
        // keyboard it goes to the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        ref={popup}
        showCloseButton={false}
      >
        <div className={cn("app-scale contents lg:block", SHEET_W)}>
          <div className="relative flex flex-col px-6 pt-10 pb-6 lg:px-14 lg:pt-16 lg:pb-12">
            <DialogClose
              render={
                <Button
                  aria-label={c("close")}
                  className="absolute top-2 right-2 size-11 text-foreground lg:top-4 lg:right-4 lg:size-12"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden className="size-6" />
            </DialogClose>
            <div className="flex flex-col items-center gap-1.5 text-center lg:gap-2">
              <DialogTitle className="text-xl leading-snug font-semibold text-foreground lg:text-frame-heading">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-sm text-balance text-muted-foreground lg:text-frame-meta">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <div className={cn("mt-7 lg:mt-10", BODY_LIFT, FIELD_LIFT)}>{children}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's capsules, stacked full width under the form at every size, the thing being done first. */
export const SETTINGS_DIALOG_ACTIONS = "mt-8 flex flex-col gap-2.5 lg:mt-10 lg:gap-3";

/**
 * The dialog's capsules: the thing being done filled in ink (`solid`), and
 * the way out in the soft grey of the settings rows' own capsules, with no
 * line round it.
 */
export function settingsPill(kind: "solid" | "soft" = "soft") {
  return cn(
    authPill(kind === "solid"),
    "md:h-11 md:text-sm",
    PILL_LG,
    kind === "soft" && "border-0 bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
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
