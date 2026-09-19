import { Trash2 } from "lucide-react";
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
import type { AdvisorServiceRecord } from "@/lib/advisor-services";

/**
 * Figma "Delete service confirm" (1594:29786) — opened from the edit form's danger
 * zone, over the form itself.
 *
 * Centred, with a destructive badge above the title, unlike the left-aligned
 * log-out and profile confirmations: this one is the only irreversible action on the
 * screen and the frame gives it the heavier treatment. `defaultOpen` because the
 * route *is* the open state.
 *
 * The body names what survives — bookings already paid for still run — because that
 * is the question an Advisor with upcoming sessions is actually asking.
 */
export function DeleteServiceDialog({
  record,
}: {
  readonly record: AdvisorServiceRecord;
}) {
  const t = useTranslations("serviceForm");
  const c = useTranslations("common");
  const back = `/advisor/services/${record.serviceId}/edit`;

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent
        // Figma's desktop "Dialog" (1998:29707) is the same panel at 420 x 260,
        // which is the phone's 326 given the room a 1440 page has for it.
        className="w-[326px] gap-4 p-5 shadow-none max-sm:max-w-[calc(100%---spacing(8))] lg:w-[420px] lg:p-6"
        size="sm"
      >
        <AlertDialogHeader className="place-items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-destructive">
            <Trash2 className="size-4.5 text-destructive-foreground" />
          </span>
          <AlertDialogTitle className="text-lg font-semibold">
            {t("deleteDialogTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t("deleteDialogBody", { name: record.service.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-row">
          <NeutralButton className="flex-1" href={back}>
            {c("cancel")}
          </NeutralButton>
          <DestructiveButton className="flex-1" href="/advisor/services">
            {t("deleteConfirm")}
          </DestructiveButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
