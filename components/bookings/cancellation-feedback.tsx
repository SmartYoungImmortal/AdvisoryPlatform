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

/** The booking card's outlined capsule, so the way on here reads as one of the card's own. */
const PILL = "h-10 w-auto rounded-full px-5 text-sm font-medium lg:h-12 lg:px-6 lg:text-frame-meta";

/** Sits inside the booking card, so it is a tinted panel like the card's cancel prompt, not a second card. */
export function CancellationFeedback({ cancellation }: { readonly cancellation: ReturnType<typeof useBookingCancellation> }) {
  const t = useTranslations("bookings");
  if (cancellation.state.kind === "idle") return null;
  if (cancellation.state.kind === "pending") {
    // `<output>`: a live status by its own semantics, announced without a role.
    return <output className="block text-sm text-muted-foreground lg:text-frame-meta">{t(cancellation.state.action === "cancel" ? "cancellationPending" : "cancellationChecking")}</output>;
  }
  const { outcome } = cancellation.state;
  return (
    <output aria-live="polite" className="flex w-full flex-col items-start gap-3 rounded-xl bg-muted p-4 lg:gap-4 lg:p-5">
      {/* A `<span>`: `<output>` holds phrasing content only. */}
      <span className="block text-sm text-foreground lg:text-frame-meta">{t(MESSAGE[outcome])}</span>
      {outcome === "uncertain" ? <NeutralButton className={PILL} onClick={() => void cancellation.check()}>{t("cancellationCheck")}</NeutralButton> : null}
      {outcome === "signIn" ? <NeutralButton className={PILL} href="/login">{t("cancellationLogin")}</NeutralButton> : null}
    </output>
  );
}
