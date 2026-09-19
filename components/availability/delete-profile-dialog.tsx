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
import {
  AVAILABILITY_PROFILES,
  DELETE_TARGET,
} from "@/lib/availability/profiles";

/**
 * Figma "Availability - Delete profile confirm" (1594:31904).
 *
 * `defaultOpen` because this route *is* the dialog's open state — the prototype has
 * no trigger to press, the same way the log-out confirmation works.
 *
 * The strip between the body and the actions names the Service that stops taking
 * bookings. `bg-destructive/10` rather than `<Alert variant="destructive">`: that
 * variant is red text on a plain card, and the frame tints the ground.
 */
export function DeleteProfileDialog() {
  const t = useTranslations("availability");
  const c = useTranslations("common");
  const profile = AVAILABILITY_PROFILES.find(
    (candidate) => candidate.id === DELETE_TARGET.profileId,
  );

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent
        // Figma's desktop "Dialog" (1994:28609) is the same panel at 420 x 208,
        // which is the phone's 326 given the room a 1440 page has for it.
        className="w-[326px] gap-4 p-5 shadow-none max-sm:max-w-[calc(100%---spacing(8))] lg:w-[420px] lg:p-6"
        size="sm"
      >
        <AlertDialogHeader className="place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-xl leading-7 font-semibold">
            {t("deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {t("deleteBody", {
              name: profile?.name ?? "",
              count: profile?.serviceCount ?? 0,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="w-full rounded-lg bg-destructive/10 px-3 py-2.5 text-xs font-normal text-destructive">
          {t("deleteImpact", { service: DELETE_TARGET.affectedServiceName })}
        </p>

        {/* Figma puts the two actions side by side here, unlike the stacked mobile
            confirmations, so the footer's default grid is kept and only the widths
            are set. */}
        <AlertDialogFooter className="flex flex-row gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-row">
          <NeutralButton className="flex-1" href="/availability/profiles">
            {c("cancel")}
          </NeutralButton>
          <DestructiveButton className="flex-1" href="/availability/profiles">
            {t("deleteConfirm")}
          </DestructiveButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
