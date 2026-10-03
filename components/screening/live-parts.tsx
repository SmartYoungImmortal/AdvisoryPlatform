"use client";

import { RotateCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import { NeutralButton } from "@/components/mobile/buttons";
import { Surface } from "@/components/mobile/surface";
import {
  elapsedKey,
  type ScreeningErrorKey,
} from "@/components/screening/screening-data";

/**
 * Pieces the API-backed screening screens share and the fixture screens do not
 * need: a loading block, a Thai error card and the "10 นาที" time label.
 */

/** A quiet placeholder while a read is in flight. */
export function ScreeningLoading() {
  return (
    <div aria-busy className="flex w-full shrink-0 flex-col gap-3 px-6 pt-6">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-40 w-full animate-pulse rounded-card bg-muted motion-reduce:animate-none" />
    </div>
  );
}

/**
 * A failed read or write, in Thai. The API's own sentence is English and meant
 * for developers, so it is never shown here — the key picks the copy.
 */
export function ScreeningErrorNotice({
  errorKey,
  onRetry,
}: {
  readonly errorKey: ScreeningErrorKey;
  readonly onRetry?: () => void;
}) {
  const e = useTranslations("errorStates");
  const t = useTranslations("screening");

  let title: string;
  let body: string | null = null;
  switch (errorKey) {
    case "offline":
      title = e("offlineTitle");
      body = e("offlineBody");
      break;
    case "notFound":
      title = e("notFoundTitle");
      body = e("notFoundBody");
      break;
    case "server":
      title = e("serverTitle");
      body = e("serverBody");
      break;
    default:
      title = t(errorKey);
  }

  return (
    <div className="flex w-full shrink-0 flex-col px-6 pt-4" role="alert">
      <Surface className="flex w-full flex-col items-start gap-2 p-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
        {onRetry ? (
          <NeutralButton onClick={onRetry} size="sm">
            <RotateCw aria-hidden className="size-3.5" />
            {e("retry")}
          </NeutralButton>
        ) : null}
      </Surface>
    </div>
  );
}

/** "10 นาที", "2 ชม.", "เมื่อวาน", or a date — relative to `now`. */
export function useElapsedLabel(now: number): (iso: string) => string {
  const t = useTranslations("screening");
  const format = useFormatter();
  return useCallback(
    (iso: string) => {
      const elapsed = elapsedKey(iso, now);
      switch (elapsed.key) {
        case "justNow":
          return t("justNow");
        case "yesterday":
          return t("yesterday");
        case "minutesAgo":
          return t("minutesAgo", { count: elapsed.count });
        case "hoursAgo":
          return t("hoursAgo", { count: elapsed.count });
        default:
          return format.dateTime(elapsed.date, { day: "numeric", month: "short" });
      }
    },
    [format, now, t],
  );
}

/** "ส่งเมื่อ 10 นาทีที่แล้ว" — the review heading's form of the same time. */
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
