"use client";

import { CalendarCheck, Check, Gift, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { liveServiceHref } from "@/components/bookings/booking-flow";
import { noteTrial } from "@/components/chat/chat-live";
import { DeclineMessageDialog } from "@/components/screening/decline-dialog";
import {
  declineTrial,
  grantTrial,
  TRIAL_DECLINE_MESSAGE_MAX_LENGTH,
  type ApiTrialRequest,
} from "@/components/trials/trial-data";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** The page a granted advisee picks their trial's time on: the service, its trial times open. */
export function trialPickHref(serviceId: string): string {
  return `${liveServiceHref(serviceId)}&trial=1`;
}

/** The capsule the card's answers share: small, round, the chat's type step. */
const ACTION = "h-8 rounded-full px-3.5 text-xs font-medium lg:h-9 lg:px-4 lg:text-frame-label";

/**
 * A free-trial request in the conversation, on the side of the advisee who
 * sent it: what was asked (the trial's length and the service), where it
 * stands, and the answer each side can give from here. The advisor grants it
 * or declines it (with an optional message, in a dialog); the advisee, once it
 * is granted, goes to pick a time, and once that is booked, to the booking.
 *
 * An answer shows at once (`noteTrial`); the other side sees it over the
 * socket (`chat:trial`).
 */
export function TrialCard({ trial, mine }: { readonly trial: ApiTrialRequest; readonly mine: boolean }) {
  const t = useTranslations("trial");
  const [busy, setBusy] = useState<"grant" | "decline" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const minutes = trial.trialDurationMinutes;

  const answer = async (kind: "grant" | "decline", message = "") => {
    setBusy(kind);
    setFailure(null);
    try {
      noteTrial(kind === "grant" ? await grantTrial(trial.id) : await declineTrial(trial.id, message));
      setDeclining(false);
    } catch (cause) {
      setFailure(cause instanceof ApiError && cause.status === 409 ? t("alreadyDecided") : t("answerFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={cn(
        "flex w-72 max-w-full flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 text-left lg:w-80 lg:p-4",
        mine ? "rounded-tr-md" : "rounded-tl-md",
      )}
      data-slot="trial-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Gift aria-hidden className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground lg:text-frame-meta">
            {minutes ? t("cardTitle", { minutes }) : t("cardTitleNoLength")}
          </p>
          <p className="truncate text-xs text-muted-foreground lg:text-frame-label">{trial.serviceName}</p>
        </div>
      </div>

      <TrialStatusLine mine={mine} trial={trial} />

      {failure ? (
        <p className="text-xs text-destructive lg:text-frame-label" role="alert">
          {failure}
        </p>
      ) : null}

      {/* The advisor's answers, while it waits on them. */}
      {!mine && trial.status === "PENDING" ? (
        <div className="flex gap-2">
          <Button
            aria-busy={busy === "grant" || undefined}
            className={cn(ACTION, "flex-1")}
            disabled={busy !== null || minutes === null}
            onClick={() => void answer("grant")}
            type="button"
          >
            <Check aria-hidden />
            {busy === "grant" ? t("granting") : t("grant")}
          </Button>
          <Button
            className={cn(ACTION, "flex-1")}
            disabled={busy !== null}
            onClick={() => {
              setFailure(null);
              setDeclining(true);
            }}
            type="button"
            variant="outline"
          >
            <X aria-hidden />
            {t("decline")}
          </Button>
        </div>
      ) : null}

      {/* The advisee's way on, once it is theirs to use. */}
      {mine && trial.status === "GRANTED" ? (
        <Button
          className={cn(ACTION, "w-full")}
          nativeButton={false}
          render={
            <Link
              href={trial.trialBookingId ? `/bookings/detail?bookingId=${trial.trialBookingId}` : trialPickHref(trial.serviceId)}
            />
          }
          variant={trial.trialBookingId ? "outline" : "default"}
        >
          <CalendarCheck aria-hidden />
          {trial.trialBookingId ? t("viewBooking") : t("pickTime")}
        </Button>
      ) : null}

      <DeclineTrialDialog
        busy={busy === "decline"}
        failure={declining ? failure : null}
        onConfirm={(message) => void answer("decline", message)}
        onOpenChange={(open) => {
          if (busy) return;
          setDeclining(open);
          setFailure(null);
        }}
        open={declining}
      />
    </div>
  );
}

/** Where the request stands, said for the side reading it. */
function TrialStatusLine({ trial, mine }: { readonly trial: ApiTrialRequest; readonly mine: boolean }) {
  const t = useTranslations("trial");
  let text: string;
  let tone: string;
  if (trial.status === "PENDING") {
    text = mine ? t("pendingMine") : t("pendingTheirs");
    tone = "text-warning";
  } else if (trial.status === "GRANTED") {
    tone = "text-success";
    if (trial.trialBookingId) text = t("booked");
    else text = mine ? t("grantedMine") : t("grantedTheirs");
  } else {
    text = t("declined");
    tone = "text-muted-foreground";
  }
  return (
    <div className="flex flex-col gap-1">
      <p className={cn("text-xs font-medium lg:text-frame-label", tone)}>{text}</p>
      {trial.status === "DECLINED" && trial.decisionReason ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs whitespace-pre-line text-foreground lg:text-frame-label">
          {trial.decisionReason}
        </p>
      ) : null}
    </div>
  );
}

/** Declining, over the conversation: what the advisee will be told, and an optional message for the card. */
function DeclineTrialDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
  failure,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (message: string) => void;
  readonly busy: boolean;
  readonly failure: string | null;
}) {
  const t = useTranslations("trial");
  return (
    <DeclineMessageDialog
      busy={busy}
      error={failure}
      id="trial-decline-message"
      maxLength={TRIAL_DECLINE_MESSAGE_MAX_LENGTH}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      text={{
        title: t("declineTitle"),
        body: t("declineBody"),
        label: t("declineMessageLabel"),
        placeholder: t("declinePlaceholder"),
        confirm: t("declineConfirm"),
        busy: t("declining"),
      }}
    />
  );
}
