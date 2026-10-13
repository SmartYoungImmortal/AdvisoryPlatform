"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import { elapsedKey, ErrorNotice, LoadErrorNotice } from "@/components/mobile/live-state";
import type { ScreeningErrorKey } from "@/components/screening/screening-data";

/**
 * Shows a screening error in Thai: the shared text for offline, not-found and
 * server errors, and screening's own text for the others.
 */
export function ScreeningErrorNotice({
  errorKey,
  onRetry,
}: {
  readonly errorKey: ScreeningErrorKey;
  readonly onRetry?: () => void;
}) {
  const t = useTranslations("screening");
  if (errorKey === "offline" || errorKey === "notFound" || errorKey === "server") {
    return <LoadErrorNotice kind={errorKey} onRetry={onRetry} />;
  }
  return <ErrorNotice onRetry={onRetry} title={t(errorKey)} />;
}

/** "ส่งเมื่อ 10 นาทีที่แล้ว": the review heading's version of the time label. */
export function useSentLabel(now: number): (iso: string) => string {
  const t = useTranslations("screening");
  const format = useFormatter();
  return useCallback(
    (iso: string) => {
      const elapsed = elapsedKey(iso, now);
      switch (elapsed.key) {
        case "justNow":
          return t("sentJustNow");
        case "yesterday":
          return t("sentYesterday");
        case "minutesAgo":
          return t("sentMinutesAgo", { count: elapsed.count });
        case "hoursAgo":
          return t("sentHoursAgo", { count: elapsed.count });
        default:
          return t("sentOn", {
            date: format.dateTime(elapsed.date, { day: "numeric", month: "short" }),
          });
      }
    },
    [format, now, t],
  );
}
