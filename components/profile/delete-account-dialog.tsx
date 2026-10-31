"use client";

import { CalendarDays, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { InfoStackRow } from "@/components/mobile/banner";
import { Field } from "@/components/mobile/field";
import {
  SETTINGS_DIALOG_STACK,
  SettingsDialog,
  SettingsDialogList,
  settingsStackPill,
} from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { deleteOwnAccount } from "@/lib/api/account";
import { signOut } from "@/lib/session";

interface AccountDeletionBlockers {
  readonly hasUnsettledEarnings: boolean;
  readonly upcomingAppointments: readonly {
    readonly appointmentId: string;
    readonly startTime: string;
    readonly state: "PENDING_PAYMENT" | "BOOKED";
  }[];
}

/**
 * Deleting the account, over the settings rather than on a page of its own,
 * in the centred card changing the email has (`SettingsDialog` with a mark):
 * what goes with the account said in the line under the title, then the word
 * to type before the red capsule gives way. When the API refuses because
 * bookings are still ahead, the same card lists them in place of the field.
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
    <SettingsDialog
      description={t("subtitle")}
      icon={Trash2}
      onOpenChange={onOpenChange}
      open={open}
      title={t("title")}
    >
      {/* Its own component, so each opening starts with an empty field. */}
      <DeleteAccountForm onClose={() => onOpenChange(false)} />
    </SettingsDialog>
  );
}

function DeleteAccountForm({ onClose }: { readonly onClose: () => void }) {
  const t = useTranslations("deleteAccount");
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasUnsettledEarnings, setHasUnsettledEarnings] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    AccountDeletionBlockers["upcomingAppointments"]
  >([]);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function refreshBlockers() {
    const result = await api.get<AccountDeletionBlockers>("users/me/deletion-blockers");
    setUpcomingAppointments(result.upcomingAppointments);
    setHasUnsettledEarnings(result.hasUnsettledEarnings);
    const blocked = result.upcomingAppointments.length > 0 || result.hasUnsettledEarnings;
    setIsBlocked(blocked);
    return blocked;
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
          if (blockers) {
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
      {/* What goes with the account is the line under the title; the only
          list is the bookings in the way, when there are some. */}
      {isBlocked ? (
        <SettingsDialogList caption={t("blockedTitle")}>
          {upcomingAppointments.length > 0 ? <InfoStackRow
            body={t("blocked1Body")}
            icon={CalendarDays}
            iconClassName="text-destructive"
            title={t("blocked1Title")}
          /> : null}
          {hasUnsettledEarnings ? <InfoStackRow body={t("blocked2Body")} icon={Wallet} iconClassName="text-destructive" title={t("blocked2Title")} /> : null}
          {upcomingAppointments.map((appointment) => (
            <p className="w-full pl-6.5 text-xs text-muted-foreground md:text-sm" key={appointment.appointmentId}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(appointment.startTime),
              )}
            </p>
          ))}
        </SettingsDialogList>
      ) : (
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
      )}
      {failed ? (
        <p className="mt-3 text-xs text-destructive md:text-sm" role="alert">
          {t("deleteFailed")}
        </p>
      ) : null}

      <div className={SETTINGS_DIALOG_STACK}>
        {isBlocked ? (
          <>
            {upcomingAppointments.length > 0 ? <Button className={settingsStackPill("solid")} nativeButton={false} render={<Link href="/bookings" />}>
              {t("viewBookings")}
            </Button> : null}
            <Button className={settingsStackPill("soft")} onClick={onClose} type="button" variant="ghost">
              {t("backToSettings")}
            </Button>
          </>
        ) : (
          <>
            <Button
              className={settingsStackPill("danger")}
              disabled={confirmation !== "DELETE" || submitting}
              type="submit"
            >
              {t("submit")}
            </Button>
            <Button className={settingsStackPill("soft")} onClick={onClose} type="button" variant="ghost">
              {t("keep")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
