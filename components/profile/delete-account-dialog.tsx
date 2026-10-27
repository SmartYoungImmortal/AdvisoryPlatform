"use client";

import { CalendarDays, Trash2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InfoCard, InfoRow, InfoStackRow } from "@/components/mobile/banner";
import { DestructiveButton, NeutralButton, PrimaryButton } from "@/components/mobile/buttons";
import { Field } from "@/components/mobile/field";
import { ApiError, api } from "@/lib/api/client";
import { deleteOwnAccount } from "@/lib/api/account";
import { signOut } from "@/lib/session";
import { cn } from "@/lib/utils";

interface AccountDeletionBlockers {
  readonly upcomingAppointments: readonly {
    readonly appointmentId: string;
    readonly startTime: string;
    readonly state: "PENDING_PAYMENT" | "BOOKED";
  }[];
}

/**
 * Deleting the account, over the settings rather than on a page of its own:
 * the warning, what goes with the account, then the word to type before the
 * button gives way. When the API refuses because bookings are still ahead,
 * the same dialog lists them in place of the losses and drops the field.
 *
 * Laid out as the log-out confirm (`LogOutDialog`) is, its sibling in the
 * same list: the actions stacked on a phone, on one line held right from
 * `lg`, the way out first and the thing being confirmed last.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-h-[calc(100dvh-3rem)] gap-0 overflow-y-auto overscroll-contain p-5 shadow-none data-[size=default]:max-w-[calc(100%-3rem)] data-[size=default]:sm:max-w-md lg:p-6">
        {/* Its own component, so each opening starts with an empty field. */}
        <DeleteAccountForm onClose={() => onOpenChange(false)} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteAccountForm({ onClose }: { readonly onClose: () => void }) {
  const t = useTranslations("deleteAccount");
  const [isBlocked, setIsBlocked] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    AccountDeletionBlockers["upcomingAppointments"]
  >([]);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function refreshBlockers() {
    const result = await api.get<AccountDeletionBlockers>("users/me/deletion-blockers");
    setUpcomingAppointments(result.upcomingAppointments);
    setIsBlocked(result.upcomingAppointments.length > 0);
    return result.upcomingAppointments;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") return;
    setSubmitting(true);
    try {
      await deleteOwnAccount();
      // A full load, as logging out does: the settings route's gate reacts to
      // the sign-out too, and its soft redirect would add a `?next=` back here.
      await signOut();
      window.location.replace("/login");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          const blockers = await refreshBlockers();
          if (blockers.length > 0) {
            setFailed(false);
            return;
          }
        } catch {
          // Show the regular failure state if the blocker details could not load.
        }
      }
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <AlertDialogHeader className="place-items-start gap-4 text-left">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
          <TriangleAlert aria-hidden className="size-6.5 text-destructive" />
        </span>
        <div className="flex flex-col gap-2">
          <AlertDialogTitle className="text-xl leading-7 font-semibold">{t("title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {isBlocked ? t("subtitleBlocked") : t("subtitle")}
          </AlertDialogDescription>
        </div>
      </AlertDialogHeader>

      {/* Outlined in destructive while bookings are in the way; the plain
          loss list has no border. The muted tint keeps it a block of its own
          on the dialog's surface. */}
      <InfoCard
        caption={isBlocked ? t("blockedTitle") : t("lossTitle")}
        className={cn("border-0 bg-muted/50 shadow-none", isBlocked && "ring-1 ring-destructive ring-inset")}
        gap="gap-2.5"
      >
        {isBlocked ? (
          <>
            <InfoStackRow
              body={t("blocked1Body")}
              icon={CalendarDays}
              iconClassName="text-destructive"
              title={t("blocked1Title")}
            />
            {upcomingAppointments.map((appointment) => (
              <p className="w-full pl-6.5 text-sm text-muted-foreground" key={appointment.appointmentId}>
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(appointment.startTime),
                )}
              </p>
            ))}
          </>
        ) : (
          <>
            <InfoRow align="items-start" icon={Trash2}>
              {t("loss1")}
            </InfoRow>
            <InfoRow align="items-start" icon={Trash2}>
              {t("loss2")}
            </InfoRow>
            <InfoRow align="items-start" icon={Trash2}>
              {t("loss3")}
            </InfoRow>
          </>
        )}
      </InfoCard>

      {isBlocked ? null : (
        <Field
          // 16px below `lg`: iOS zooms the page into a smaller field when it takes focus.
          className="text-base lg:text-sm"
          id="delete-confirm"
          label={t("confirmLabel")}
          latin
          onChange={(event) => {
            setConfirmation(event.target.value);
            setFailed(false);
          }}
          placeholder={t("confirmPlaceholder")}
          value={confirmation}
        />
      )}
      {failed ? (
        <p className="-mt-2 text-sm text-destructive" role="alert">
          {t("deleteFailed")}
        </p>
      ) : null}

      <AlertDialogFooter className="flex flex-col gap-2.5 sm:flex-col lg:flex-row-reverse lg:justify-start">
        {isBlocked ? (
          <>
            <PrimaryButton className="lg:w-auto" href="/bookings">
              {t("viewBookings")}
            </PrimaryButton>
            <NeutralButton className="lg:w-auto" onClick={onClose} type="button">
              {t("backToSettings")}
            </NeutralButton>
          </>
        ) : (
          <>
            <DestructiveButton className="lg:w-auto" disabled={confirmation !== "DELETE" || submitting} type="submit">
              {t("submit")}
            </DestructiveButton>
            <NeutralButton className="lg:w-auto" onClick={onClose} type="button">
              {t("keep")}
            </NeutralButton>
          </>
        )}
      </AlertDialogFooter>
    </form>
  );
}
