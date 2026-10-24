"use client";

import { Check, Hourglass, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { PrimaryButton } from "@/components/mobile/buttons";
import { ScreenActions } from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { Surface } from "@/components/mobile/surface";
import { DetailRow } from "@/components/screening/parts";

/**
 * The pieces the advisee's screening outcomes share, the fixture screens
 * (`advisee-screens.tsx`) and the live ones (`advisee-live.tsx`) alike.
 */

/**
 * Figma "Status Card": two completed steps and one in progress. Each step
 * states its outcome as a pill, so a card whose whole job is "where is this
 * now" has a shape rather than three rows of the same ink.
 */
export function SubmittedSteps() {
  const t = useTranslations("screening");
  return (
    <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
      <Surface className="flex w-full shrink-0 flex-col items-start gap-3 p-3.5">
        <DetailRow icon={Check} label={t("step1")} value={<StatusPill tone="success">{t("done")}</StatusPill>} />
        <DetailRow icon={Check} label={t("step2")} value={<StatusPill tone="success">{t("done")}</StatusPill>} />
        <DetailRow
          icon={Hourglass}
          label={t("step3")}
          value={
            <StatusPill icon={Hourglass} tone="info">
              {t("waiting")}
            </StatusPill>
          }
        />
      </Surface>
    </div>
  );
}

/** Under the submitted card: the way home, and that other advisors are still open. */
export function SubmittedActions({ homeHref }: { readonly homeHref: string }) {
  const t = useTranslations("screening");
  return (
    <ScreenActions className="gap-3.5">
      <PrimaryButton href={homeHref}>{t("backHome")}</PrimaryButton>
      <p className="w-full text-center text-sm font-normal text-muted-foreground">{t("browseOthers")}</p>
    </ScreenActions>
  );
}

/**
 * Figma "Advisor Note": the advisor's message with a decline, quoted. A quote
 * belongs under the surface it sits on, which is the `well` tier; line breaks
 * the advisor typed are kept.
 */
export function AdvisorNote({ message }: { readonly message: string }) {
  const t = useTranslations("screening");
  return (
    <div className="flex w-full shrink-0 flex-col items-start px-6 pt-8">
      <Surface className="flex w-full shrink-0 items-start gap-3 p-3.5" tier="well">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
          <MessageSquare aria-hidden className="size-4.5 text-muted-foreground" />
        </span>
        <div className="flex min-w-px flex-1 flex-col items-start gap-1">
          <p className="w-full text-xs font-normal text-muted-foreground">{t("advisorMessageLabel")}</p>
          <p className="w-full text-sm font-normal whitespace-pre-line text-foreground">{message}</p>
        </div>
      </Surface>
    </div>
  );
}
