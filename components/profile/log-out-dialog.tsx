"use client";

import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DestructiveButton, NeutralButton } from "@/components/mobile/buttons";
import { signOut } from "@/lib/session";

/**
 * Figma "Log out confirm" (995:7665): a 326 x 194 dialog on a scrim — surface,
 * 16px radius, 20px padding, 16px gap.
 *
 * Figma "Desktop / Log out confirm (Light)" (1787:26258) is the same dialog at
 * 420 x 210 with 24px of padding, and its actions on one line held to the right
 * — the cancel first, the thing being confirmed last, which is the order every
 * desktop dialog on this platform reads in.
 *
 * `defaultOpen` because this route *is* the dialog's open state; the prototype has
 * no trigger to press. Swapping the hand-built `<dialog open>` for the primitive is
 * what brings the focus trap, the Escape handler, the scroll lock and the
 * title/description being announced as the dialog's accessible name.
 */
export function LogOutDialog({ cancelHref = "/profile" }: { readonly cancelHref?: string }) {
  const t = useTranslations("logOut");

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent
        className="w-[326px] gap-4 p-5 shadow-none max-sm:max-w-[calc(100%---spacing(8))] lg:w-[420px] lg:p-6"
        size="sm"
      >
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-xl leading-7 font-semibold">
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* Figma stacks the actions; the default footer is a two-column grid at
            this size, so the stack is restated rather than inherited. The
            desktop frame lays the same pair on one line, right-aligned, which
            `flex-row-reverse` gives without reordering the markup — the
            destructive action is still the last thing tab order reaches. */}
        <AlertDialogFooter className="flex flex-col gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-col lg:flex-row-reverse lg:justify-start">
          <DestructiveButton
            className="lg:w-auto"
            onClick={() => {
              signOut();
              // A full load rather than `router.replace`: the gate on this guarded
              // route reacts to the sign-out too, and its soft redirect would add a
              // `?next=` pointing back at this dialog.
              window.location.replace("/login");
            }}
          >
            {t("confirm")}
          </DestructiveButton>
          <NeutralButton className="lg:w-auto" href={cancelHref}>
            {t("cancel")}
          </NeutralButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
