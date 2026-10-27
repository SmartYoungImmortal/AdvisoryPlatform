"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { profilePill } from "@/components/profile/identity-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The fields at the profile form's heights: 44 on a phone, 48 on a tablet, and
 * from `lg`, where the panel is zoomed down from 1710, 52 (44 on the screen),
 * so a field is never thinner than the capsules under it. Descendant
 * selectors, so the shared field itself stays untouched. The dialogs draw it
 * `outline`: the sign-up form's white box on a hairline.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-11 md:[&_[data-slot=input-group]]:h-12 lg:[&_[data-slot=input-group]]:h-13 lg:[&_[data-slot=input-group]]:px-4 lg:[&_[data-slot=input-group-control]]:text-frame-body";

/**
 * The desktop type lift (`DESKTOP_TYPE_LIFT`) for the shared blocks' captions
 * and lines, leaving the capsules alone: they are drawn on the profile form's
 * own steps (`settingsPill`).
 */
const BODY_LIFT = "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm:not([data-slot=button])]:text-frame-meta";

/**
 * A settings form over the settings page: changing the email or the password,
 * the note that the change is waiting on a link, and deleting the account.
 * For the first three the route *is* the dialog's open state (`defaultOpen`),
 * as with the log-out confirm, so a link to `/settings/password` still opens
 * straight onto the form; closing it (the button, Escape or the scrim) goes
 * back to `closeHref`. With `open` it is held by the page instead, as deleting
 * is: a step with nothing to link to.
 *
 * The popup is portalled out of the account column, so from `lg` it takes that
 * column's zoom itself (`app-scale`) and its sizes match the page behind it;
 * below `lg` the wrapper is `contents` and nothing is zoomed. Its body lifts
 * the shared fields and banners onto the frame's type steps (`BODY_LIFT`,
 * `FIELD_LIFT`), as the pages these forms came from did.
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
        className="block max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-md lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself, so the close button does not open wearing its focus ring;
        // from the keyboard it goes to the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        ref={popup}
        showCloseButton={false}
      >
        <div className="app-scale contents lg:block lg:w-140">
          <div className="relative flex flex-col gap-1 py-5 pr-14 pl-5 lg:gap-1.5 lg:py-8 lg:pr-20 lg:pl-8">
            <DialogTitle className="text-lg leading-snug font-semibold text-foreground lg:text-frame-heading">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-muted-foreground lg:text-frame-meta">
                {description}
              </DialogDescription>
            ) : null}
            <DialogClose
              render={
                <Button
                  aria-label={c("close")}
                  className="absolute top-3 right-3 size-9 lg:top-6 lg:right-6 lg:size-12"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <X aria-hidden className="size-5 lg:size-6" />
            </DialogClose>
          </div>
          <div className={cn("px-5 pb-5 lg:px-8 lg:pb-8", BODY_LIFT, FIELD_LIFT)}>{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The dialog's actions: stacked full width on a phone, the thing being done
 * first; one line from `lg`, held to the right, cancel first and the action
 * last, the order every desktop dialog on this platform reads in.
 */
export const SETTINGS_DIALOG_ACTIONS = "mt-6 flex flex-col gap-2.5 lg:mt-8 lg:flex-row-reverse lg:justify-start lg:gap-3";

/**
 * The dialog's capsules, as the profile form draws its own: the thing being
 * done filled in ink (`solid`), or in the destructive red for what cannot be
 * undone, and the way out outlined. Full width on a phone, where they stack.
 */
export function settingsPill(kind: "solid" | "outline" | "destructive" = "outline") {
  return cn(
    profilePill(kind !== "outline"),
    "w-full lg:w-auto",
    kind === "destructive" &&
      "bg-destructive text-primary-foreground hover:bg-destructive/90 disabled:bg-destructive/40",
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
