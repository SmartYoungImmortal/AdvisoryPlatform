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

/**
 * Figma "Log out confirm" (995:7665): a 326 x 194 dialog on a scrim — surface,
 * 16px radius, 20px padding, 16px gap.
 *
 * `defaultOpen` because this route *is* the dialog's open state; the prototype has
 * no trigger to press. Swapping the hand-built `<dialog open>` for the primitive is
 * what brings the focus trap, the Escape handler, the scroll lock and the
 * title/description being announced as the dialog's accessible name.
 */
export function LogOutDialog() {
  const t = useTranslations("logOut");

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent
        className="w-[326px] gap-4 p-5 shadow-none max-sm:max-w-[calc(100%---spacing(8))]"
        size="sm"
      >
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-xl leading-7 font-semibold">
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* Figma stacks the actions; the default footer is a two-column grid at
            this size, so the stack is restated rather than inherited. */}
        <AlertDialogFooter className="flex flex-col gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-col">
          <DestructiveButton href="/login">{t("confirm")}</DestructiveButton>
          <NeutralButton href="/profile">{t("cancel")}</NeutralButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
