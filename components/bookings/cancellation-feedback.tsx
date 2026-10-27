"use client";

import { useTranslations } from "next-intl";
import { NeutralButton } from "@/components/mobile/buttons";
import type { CancellationOutcome, useBookingCancellation } from "@/components/bookings/use-booking-cancellation";

const MESSAGE = {
  cancelled: "cancellationConfirmed",
  changed: "cancellationChanged",
  retry: "cancellationRetry",
  signIn: "cancellationSignIn",
  unavailable: "cancellationUnavailable",
  uncertain: "cancellationUncertain",
} as const satisfies Record<CancellationOutcome, string>;

/** Sits inside the booking card, so it is a tinted panel like the card's cancel prompt, not a second card. */
export function CancellationFeedback({ cancellation }: { readonly cancellation: ReturnType<typeof useBookingCancellation> }) {
  const t = useTranslations("bookings");
  if (cancellation.state.kind === "idle") return null;
  if (cancellation.state.kind === "pending") {
    return <p role="status" className="text-sm text-muted-foreground lg:text-frame-meta">{t(cancellation.state.action === "cancel" ? "cancellationPending" : "cancellationChecking")}</p>;
  }
  const { outcome } = cancellation.state;
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col items-start gap-3 rounded-xl bg-muted p-4 lg:gap-4 lg:p-5">
      <p className="text-sm text-foreground lg:text-frame-meta">{t(MESSAGE[outcome])}</p>
      {outcome === "uncertain" ? <NeutralButton size="sm" className="w-auto rounded-full" onClick={() => void cancellation.check()}>{t("cancellationCheck")}</NeutralButton> : null}
      {outcome === "signIn" ? <NeutralButton size="sm" className="w-auto rounded-full" href="/login">{t("cancellationLogin")}</NeutralButton> : null}
    </div>
  );
}
