"use client";

import { CalendarDays, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

import { InfoRow, InfoStackRow } from "@/components/mobile/banner";
import { Field } from "@/components/mobile/field";
import { profilePill } from "@/components/profile/identity-card";
import { SettingsDialogList } from "@/components/profile/settings-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api/client";
import { deleteOwnAccount } from "@/lib/api/account";
import { signOut } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The fields at the profile form's heights: 44 on a phone, 48 on a tablet,
 * 52 from `lg` (44 on the screen), drawn `outline`. Descendant selectors, so
 * the shared field itself stays untouched.
 */
const FIELD_LIFT =
  "[&_[data-slot=input-group]]:h-11 md:[&_[data-slot=input-group]]:h-12 lg:[&_[data-slot=input-group]]:h-13 lg:[&_[data-slot=input-group]]:px-4 lg:[&_[data-slot=input-group-control]]:text-frame-body";

/** The frame's type steps from `lg` for the list's caption and lines, leaving the capsules alone. */
const BODY_LIFT = "lg:[&_.text-xs]:text-frame-label lg:[&_.text-sm:not([data-slot=button])]:text-frame-meta";

/** Stacked full width on a phone, the thing being done first; one line held right from `lg`. */
const ACTIONS = "mt-6 flex flex-col gap-2.5 lg:mt-8 lg:flex-row-reverse lg:justify-start lg:gap-3";

/** The profile form's capsules: red for deleting, the way out outlined; full width on a phone. */
function deletePill(destructive = false) {
  return cn(
    profilePill(destructive),
    "w-full lg:w-auto",
    destructive && "bg-destructive text-primary-foreground hover:bg-destructive/90 disabled:bg-destructive/40",
  );
}

interface AccountDeletionBlockers {
  readonly upcomingAppointments: readonly {
    readonly appointmentId: string;
    readonly startTime: string;
    readonly state: "PENDING_PAYMENT" | "BOOKED";
  }[];
}

/**
 * Deleting the account, over the settings rather than on a page of its own:
 * what goes with the account, then the word to type before the red capsule
 * gives way. When the API refuses because bookings are still ahead, the same
 * dialog lists them in place of the losses and drops the field.
 *
 * Its own frame, not the other settings dialogs' (`SettingsDialog`): this one
 * passed as it is, the title and the close on one band at the top and the
 * capsules held right from `lg`.
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
  const c = useTranslations("common");
  const popup = useRef<HTMLDivElement>(null);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="block max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-card bg-card p-0 text-foreground shadow-hero-card ring-0 sm:max-w-md lg:w-auto lg:max-w-none"
        // Opened by a press, the dialog takes the focus itself, so the close
        // does not open wearing its focus ring; from the keyboard it goes to
        // the first control as usual.
        initialFocus={(type) => (type === "keyboard" ? true : popup.current)}
        ref={popup}
        showCloseButton={false}
      >
        {/* Portalled out of the account column, so from `lg` it takes the column's zoom itself. */}
        <div className="app-scale contents lg:block lg:w-140">
          <div className="relative flex flex-col gap-1 py-5 pr-14 pl-5 lg:gap-1.5 lg:py-8 lg:pr-20 lg:pl-8">
            <DialogTitle className="text-lg leading-snug font-semibold text-foreground lg:text-frame-heading">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground lg:text-frame-meta">
              {t("subtitle")}
            </DialogDescription>
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
          <div className={cn("px-5 pb-5 lg:px-8 lg:pb-8", BODY_LIFT, FIELD_LIFT)}>
            {/* Its own component, so each opening starts with an empty field. */}
            <DeleteAccountForm onClose={() => onOpenChange(false)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

      <div className={ACTIONS}>
        {isBlocked ? (
          <>
            <Button className={cn(profilePill(true), "w-full lg:w-auto")} nativeButton={false} render={<Link href="/bookings" />}>
              {t("viewBookings")}
            </Button>
            <Button className={deletePill()} onClick={onClose} type="button" variant="outline">
              {t("backToSettings")}
            </Button>
          </>
        ) : (
          <>
            <Button className={deletePill(true)} disabled={confirmation !== "DELETE" || submitting} type="submit">
              {t("submit")}
            </Button>
            <Button className={deletePill()} onClick={onClose} type="button" variant="outline">
              {t("keep")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
