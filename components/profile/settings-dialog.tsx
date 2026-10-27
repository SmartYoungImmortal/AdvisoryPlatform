"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DESKTOP_TYPE_LIFT } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The shared fields' 36px input, zoomed with the panel, lands near 30 on a
 * 1440 screen, thinner than the buttons under it; from `lg` it takes 52 (44
 * on the screen). Descendant selectors, so the field itself stays untouched.
 */
const FIELD_LIFT = "lg:[&_[data-slot=input-group]]:h-13 lg:[&_[data-slot=input-group]]:rounded-xl lg:[&_[data-slot=input-group]]:px-4";

/**
 * A settings form over the settings page: changing the email or the password,
 * and the note that the change is waiting on a link. The route *is* the
 * dialog's open state (`defaultOpen`), as with the log-out confirm, so a link
 * to `/settings/password` still opens straight onto the form; closing it (the
 * button, Escape or the scrim) goes back to `closeHref`.
 *
 * The popup is portalled out of the account column, so from `lg` it takes that
 * column's zoom itself (`app-scale`) and its sizes match the page behind it;
 * below `lg` the wrapper is `contents` and nothing is zoomed. Its body has the
 * desktop type lift (`DESKTOP_TYPE_LIFT`), as the pages these forms came from
 * did, so the shared fields and banners set their type on the frame's steps.
 */
export function SettingsDialog({
  title,
  description,
  closeHref = "/settings",
  children,
}: {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly closeHref?: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();
  const c = useTranslations("common");

  return (
    <Dialog defaultOpen onOpenChange={(open) => !open && router.push(closeHref)}>
      <DialogContent
        className="block max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-md lg:w-auto lg:max-w-none"
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
          <div className={cn("px-5 pb-5 lg:px-8 lg:pb-8", DESKTOP_TYPE_LIFT, FIELD_LIFT)}>{children}</div>
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
