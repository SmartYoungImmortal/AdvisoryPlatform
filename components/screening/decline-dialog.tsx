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
  const router = useRouter();

  return (
    <DeclineMessageDialog
      busy={busy}
      cancelHref={cancelHref}
      error={error}
      id="screening-decline-message"
      maxLength={SCREENING_DECLINE_MESSAGE_MAX_LENGTH}
      onConfirm={onConfirm}
      onOpenChange={(open) => {
        if (!open && !busy) router.push(cancelHref);
      }}
      open
      text={{
        title: t("declineTitle"),
        body: t("declineBody", { name }),
        label: t("declineMessageLabel"),
        placeholder: t("declinePlaceholder"),
        confirm: t("declineConfirm"),
        busy: t("declining"),
      }}
    />
  );
}

/**
 * A decline with an optional message to the person asking, in the settings'
 * own dialog. The screening decline (a route) and the free-trial decline (over
 * the chat) both use it, each with its own words. The way out is a link back
 * when `cancelHref` is given, otherwise it closes the dialog; while the decline
 * is in flight both answers are held.
 */
export function DeclineMessageDialog({
  id,
  maxLength,
  text,
  open,
  onOpenChange,
  cancelHref,
  onConfirm,
  busy = false,
  error,
}: {
  /** The message field's id, unique on the page. */
  readonly id: string;
  readonly maxLength: number;
  readonly text: {
    readonly title: string;
    readonly body: string;
    readonly label: string;
    readonly placeholder: string;
    readonly confirm: string;
    readonly busy: string;
  };
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly cancelHref?: string;
  readonly onConfirm: (message: string) => void;
  readonly busy?: boolean;
  readonly error?: string | null;
}) {
  const c = useTranslations("common");
  const [message, setMessage] = useState("");
  const cancelLink = cancelHref && !busy ? <Link href={cancelHref} /> : undefined;

  return (
    <SettingsDialog description={text.body} onOpenChange={onOpenChange} open={open} title={text.title}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground md:text-sm" htmlFor={id}>
          {text.label}
        </label>
        <Textarea
          className="min-h-24 resize-none rounded-xl border-accented bg-card px-4 py-3 text-sm shadow-none field-sizing-fixed md:text-base"
          disabled={busy}
          id={id}
          maxLength={maxLength}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={text.placeholder}
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
          nativeButton={!cancelLink}
          onClick={cancelLink ? undefined : () => onOpenChange(false)}
          render={cancelLink}
          type={cancelLink ? undefined : "button"}
          variant="ghost"
        >
          {c("cancel")}
        </Button>
        <Button className={settingsPill("danger")} disabled={busy} onClick={() => onConfirm(message)} type="button" variant="ghost">
          {busy ? text.busy : text.confirm}
        </Button>
      </div>
    </SettingsDialog>
  );
}
