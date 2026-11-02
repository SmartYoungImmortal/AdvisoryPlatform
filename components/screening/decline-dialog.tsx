"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SETTINGS_DIALOG_ACTIONS, SettingsDialog, settingsPill } from "@/components/profile/settings-dialog";
import { SCREENING_DECLINE_MESSAGE_MAX_LENGTH } from "@/components/screening/screening-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Declining a request, over its review page — in the settings' own dialog
 * (`SettingsDialog`), so it opens, closes and reads as the desk's other
 * popups do: the question, what the advisee will be told, an optional
 * message they see on their declined screen, then the way out as bare words
 * and the decline in the soft red capsule.
 *
 * The route (`/screening/review/decline`) is the dialog's open state; closing
 * it, or answering no, goes back to `cancelHref` — except while the decline
 * is in flight, when both answers are held.
 */
export function DeclineScreeningDialog({
  name,
  cancelHref,
  onConfirm,
  busy = false,
  error,
}: {
  readonly name: string;
  readonly cancelHref: string;
  readonly onConfirm: (message: string) => void;
  readonly busy?: boolean;
  readonly error?: string | null;
}) {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const router = useRouter();
  const [message, setMessage] = useState("");

  return (
    <SettingsDialog
      description={t("declineBody", { name })}
      onOpenChange={(open) => {
        if (!open && !busy) router.push(cancelHref);
      }}
      open
      title={t("declineTitle")}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground md:text-sm" htmlFor="screening-decline-message">
          {t("declineMessageLabel")}
        </label>
        <Textarea
          className="min-h-24 resize-none rounded-xl border-accented bg-card px-4 py-3 text-sm shadow-none field-sizing-fixed md:text-base"
          disabled={busy}
          id="screening-decline-message"
          maxLength={SCREENING_DECLINE_MESSAGE_MAX_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("declinePlaceholder")}
          value={message}
        />
      </div>
      {error ? (
        <p className="mt-3 text-xs text-destructive md:text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className={SETTINGS_DIALOG_ACTIONS}>
        <Button
          className={settingsPill("ghost")}
          disabled={busy}
          nativeButton={busy}
          render={busy ? undefined : <Link href={cancelHref} />}
          variant="ghost"
        >
          {c("cancel")}
        </Button>
        <Button className={settingsPill("danger")} disabled={busy} onClick={() => onConfirm(message)} type="button" variant="ghost">
          {busy ? t("declining") : t("declineConfirm")}
        </Button>
      </div>
    </SettingsDialog>
  );
}
