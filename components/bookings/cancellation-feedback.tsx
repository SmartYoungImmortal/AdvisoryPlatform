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

export function CancellationFeedback({ cancellation }: { readonly cancellation: ReturnType<typeof useBookingCancellation> }) {
  const t = useTranslations("bookings");
  if (cancellation.state.kind === "idle") return null;
  if (cancellation.state.kind === "pending") {
    return <p role="status" className="text-sm text-muted-foreground">{t(cancellation.state.action === "cancel" ? "cancellationPending" : "cancellationChecking")}</p>;
  }
  const { outcome } = cancellation.state;
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col items-start gap-2 rounded-card border border-border bg-card p-3.5">
      <p className="text-sm text-foreground">{t(MESSAGE[outcome])}</p>
      {outcome === "uncertain" ? <NeutralButton size="sm" onClick={() => void cancellation.check()}>{t("cancellationCheck")}</NeutralButton> : null}
      {outcome === "signIn" ? <NeutralButton size="sm" href="/login">{t("cancellationLogin")}</NeutralButton> : null}
    </div>
  );
}
