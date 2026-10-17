"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { ApiError } from "@/lib/api/client";
import { invalidate } from "@/lib/api/use-resource";
import { deleteAdvisorService } from "@/lib/advisor-services/api";

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
  serviceId,
  serviceName,
}: {
  readonly record?: AdvisorServiceRecord;
  readonly serviceId?: string;
  readonly serviceName?: string;
}) {
  const t = useTranslations("serviceForm");
  const c = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = serviceId ?? record?.serviceId ?? "";
  const name = serviceName ?? record?.service.title ?? t("unnamedService");
  const back = `/advisor/services/manage?serviceId=${encodeURIComponent(id)}`;

  async function remove() {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdvisorService(id);
      invalidate("advisors/me/services");
      router.push("/advisor/services");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("apiUnavailable"));
      setBusy(false);
    }
  }

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
            {error ?? t("deleteDialogBody", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-row">
          <NeutralButton className="flex-1" href={back}>
            {c("cancel")}
          </NeutralButton>
          <DestructiveButton className="flex-1" type="button" disabled={busy} onClick={() => void remove()}>{busy ? t("deleting") : t("deleteConfirm")}</DestructiveButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
