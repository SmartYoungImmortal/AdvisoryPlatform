"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { authPill } from "@/components/auth/auth-split";
import { PILL_LG, SHEET_W, SHEET_X } from "@/components/payment/invoice-screens";
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
 * Every dialog over the settings: changing the email or the password, the note
 * that the change is waiting on a link, logging out and deleting the account.
 *
 * Drawn as the receipt's popup is (`ReceiptDialog`), the one the account pages
 * already open: a white sheet the shape and width of the receipt, its close
 * out on the dimmed page above the sheet's top right corner on a phone and held
 * at the top inside it from `lg`; the title in the booking card's regular
 * weight, a line under it, then the form, then the capsules stacked full width
 * under everything, the thing being done first. Nothing inside is boxed but
 * the fields.
 *
 * The route *is* the dialog's open state (`defaultOpen`) for the ones a link
 * can open, so `/settings/password` still opens straight onto the form;
 * closing it (the button, Escape or the scrim) goes back to `closeHref`. With
 * `open` the page holds it instead, as deleting is: a step with nothing to
 * link to.
 *
 * The sheet is portalled out of the account column, so from `lg` it takes the
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
        // On a phone 24px clear of each edge, as the receipt's. The popup
        // only places things: the sheet below scrolls, and below `lg` the
        // close sits outside it.
        className="block max-w-[calc(100%-3rem)] gap-0 overflow-visible bg-transparent p-0 text-foreground ring-0 outline-none sm:max-w-sm lg:w-auto lg:max-w-none"
        // Opened by a press (or by its route), the dialog takes the focus
        // itself, so the close does not open wearing its focus ring; from the
        // keyboard it goes to the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        ref={popup}
        showCloseButton={false}
      >
        <DialogClose
          render={
            <Button
              aria-label={c("close")}
              className="absolute -top-13 right-0 size-11 text-foreground hover:bg-transparent lg:hidden"
              size="icon"
              variant="ghost"
            />
          }
        >
          <X aria-hidden className="size-6" />
        </DialogClose>
        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-card bg-card shadow-hero-card lg:max-h-[calc(100dvh-3rem)]">
          <div className={cn("app-scale contents lg:block", SHEET_W)}>
            <div className="sticky top-0 z-10 hidden justify-end bg-card px-4 pt-4 lg:flex">
              <DialogClose render={<Button aria-label={c("close")} className="size-12" size="icon" variant="ghost" />}>
                <X aria-hidden className="size-6" />
              </DialogClose>
            </div>
            <div className={cn("flex flex-col pt-6 pb-6 lg:pt-0 lg:pb-10", SHEET_X)}>
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <DialogTitle className="text-lg leading-snug font-normal text-foreground lg:text-frame-heading">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="text-sm text-pretty text-muted-foreground lg:text-frame-meta">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              <div className={cn("mt-6 lg:mt-8", BODY_LIFT, FIELD_LIFT)}>{children}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's capsules, stacked full width under the form at every size, the thing being done first, as the receipt's are. */
export const SETTINGS_DIALOG_ACTIONS = "mt-8 flex flex-col gap-2.5 lg:mt-10 lg:gap-3";

/**
 * The receipt's capsules (`NextSteps`): the thing being done filled in ink
 * (`solid`), or in the destructive red for what cannot be undone, and the way
 * out outlined.
 */
export function settingsPill(kind: "solid" | "outline" | "destructive" = "outline") {
  return cn(
    authPill(kind !== "outline"),
    "md:h-11 md:text-sm",
    PILL_LG,
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
