"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DestructiveButton, NeutralButton } from "@/components/mobile/buttons";
import { SCREENING_DECLINE_MESSAGE_MAX_LENGTH } from "@/components/screening/screening-data";

/**
 * Figma "Advisor - Review answers - Decline (Light)" (2077:20179, desktop
 * 2077:20250). Opens from the "ปฏิเสธ" button, on top of the review screen.
 *
 * It follows the team's confirm dialog (`DeleteServiceDialog`): centered, an icon
 * above the title, and cancel and decline buttons side by side (326px wide on the
 * phone, 420px on desktop). It adds an optional message that the advisee sees on
 * their declined screen. `defaultOpen` is set because this route is the open state.
 *
 * With `onConfirm`, the button sends the decline. Without it (the sample route),
 * the button is a plain link so the prototype can still be clicked through.
 */
export function DeclineScreeningDialog({
  name,
  cancelHref,
  onConfirm,
  confirmHref,
  busy = false,
  error,
}: {
  readonly name: string;
  readonly cancelHref: string;
  readonly onConfirm?: (message: string) => void;
  readonly confirmHref?: string;
  readonly busy?: boolean;
  readonly error?: string | null;
}) {
  const t = useTranslations("screening");
  const c = useTranslations("common");
  const [message, setMessage] = useState("");

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent
        className="w-[326px] gap-4 p-5 shadow-none max-sm:max-w-[calc(100%---spacing(8))] lg:w-[420px] lg:p-6"
        size="sm"
      >
        <AlertDialogHeader className="place-items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-destructive/12">
            <MessageSquare aria-hidden className="size-4.5 text-destructive" />
          </span>
          <AlertDialogTitle className="text-lg font-semibold">
            {t("declineTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t("declineBody", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex w-full flex-col gap-1.5">
          <label
            className="w-full text-sm font-medium text-foreground"
            htmlFor="screening-decline-message"
          >
            {t("declineMessageLabel")}
          </label>
          <Textarea
            className="h-21 resize-none bg-muted px-3 text-sm shadow-none field-sizing-fixed"
            disabled={busy}
            id="screening-decline-message"
            maxLength={SCREENING_DECLINE_MESSAGE_MAX_LENGTH}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("declinePlaceholder")}
            value={message}
          />
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter className="flex flex-row gap-2.5 group-data-[size=sm]/alert-dialog-content:flex sm:flex-row">
          <NeutralButton className="flex-1" href={cancelHref}>
            {c("cancel")}
          </NeutralButton>
          {onConfirm ? (
            <DestructiveButton
              className="flex-1"
              disabled={busy}
              onClick={() => onConfirm(message)}
            >
              {t("declineConfirm")}
            </DestructiveButton>
          ) : (
            <DestructiveButton className="flex-1" href={confirmHref}>
              {t("declineConfirm")}
            </DestructiveButton>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
