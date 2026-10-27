"use client";

import { CalendarDays, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { InfoRow, InfoStackRow } from "@/components/mobile/banner";
import { Field } from "@/components/mobile/field";
import {
  SETTINGS_DIALOG_ACTIONS,
  SettingsDialog,
  SettingsDialogList,
  settingsPill,
} from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { deleteOwnAccount } from "@/lib/api/account";
import { signOut } from "@/lib/session";

interface AccountDeletionBlockers {
  readonly upcomingAppointments: readonly {
    readonly appointmentId: string;
    readonly startTime: string;
    readonly state: "PENDING_PAYMENT" | "BOOKED";
  }[];
}

/**
 * Deleting the account, over the settings rather than on a page of its own,
 * in the same dialog as changing the email or the password
 * (`SettingsDialog`): what goes with the account, then the word to type
 * before the red capsule gives way. When the API refuses because bookings are
 * still ahead, the same dialog lists them in place of the losses and drops
 * the field.
 *
 * Held by the settings page (`open`), not by a route: there is nothing to
 * link to.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("deleteAccount");

  return (
    <SettingsDialog description={t("subtitle")} onOpenChange={onOpenChange} open={open} title={t("title")}>
      {/* Its own component, so each opening starts with an empty field. */}
      <DeleteAccountForm onClose={() => onOpenChange(false)} />
    </SettingsDialog>
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
    <form className="flex w-full flex-col" onSubmit={submit}>
      {/* What goes with the account, or while bookings are in the way, those. */}
      <SettingsDialogList caption={isBlocked ? t("blockedTitle") : t("lossTitle")}>
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
      </SettingsDialogList>

      {isBlocked ? null : (
        <div className="mt-5 flex w-full flex-col">
          <Field
            id="delete-confirm"
            label={t("confirmLabel")}
            latin
            onChange={(event) => {
              setConfirmation(event.target.value);
              setFailed(false);
            }}
            outline
            placeholder={t("confirmPlaceholder")}
            value={confirmation}
          />
        </div>
      )}
      {failed ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("deleteFailed")}
        </p>
      ) : null}

      <div className={SETTINGS_DIALOG_ACTIONS}>
        {isBlocked ? (
          <>
            <Button className={settingsPill("solid")} nativeButton={false} render={<Link href="/bookings" />}>
              {t("viewBookings")}
            </Button>
            <Button className={settingsPill()} onClick={onClose} type="button" variant="outline">
              {t("backToSettings")}
            </Button>
          </>
        ) : (
          <>
            <Button
              className={settingsPill("destructive")}
              disabled={confirmation !== "DELETE" || submitting}
              type="submit"
            >
              {t("submit")}
            </Button>
            <Button className={settingsPill()} onClick={onClose} type="button" variant="outline">
              {t("keep")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
