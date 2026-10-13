"use client";

import { RotateCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";

import { NeutralButton } from "@/components/mobile/buttons";
import { Surface } from "@/components/mobile/surface";
import { ApiError, ApiUnreachableError } from "@/lib/api/client";

/**
 * What an API-connected screen shows around its data: a loading block, a Thai error
 * card and the "10 นาที" time label. Sample (fixture) screens do not need these.
 */

/** A placeholder shown while data is loading. */
export function LoadingBlock() {
  return (
    <div aria-busy className="flex w-full shrink-0 flex-col gap-3 px-6 pt-6">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="mt-4 h-40 w-full animate-pulse rounded-card bg-muted motion-reduce:animate-none" />
    </div>
  );
}

/** The three kinds of load error that every screen shows with the same text. */
export type LoadErrorKind = "offline" | "notFound" | "server";

export function loadErrorKind(error: unknown): LoadErrorKind {
  if (error instanceof ApiUnreachableError) return "offline";
  if (error instanceof ApiError && error.status === 404) return "notFound";
  return "server";
}

/** An error card, with a retry button when `onRetry` is given. */
export function ErrorNotice({
  title,
  body,
  onRetry,
}: {
  readonly title: string;
  readonly body?: string;
  readonly onRetry?: () => void;
}) {
  const e = useTranslations("errorStates");

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

/**
 * `ErrorNotice` with the app's Thai text for a `LoadErrorKind`. The API's message
 * is English and meant for developers, so it is never shown.
 */
export function LoadErrorNotice({
  kind,
  onRetry,
}: {
  readonly kind: LoadErrorKind;
  readonly onRetry?: () => void;
}) {
  const e = useTranslations("errorStates");
  return <ErrorNotice body={e(`${kind}Body`)} onRetry={onRetry} title={e(`${kind}Title`)} />;
}

/**
 * Turns a time into a key and a count ("10 นาที", "2 ชม.", "เมื่อวาน") for the
 * screen to translate. Anything older than yesterday becomes a date.
 */
export function elapsedKey(
  iso: string,
  now: number,
):
  | { readonly key: "justNow" | "yesterday" }
  | { readonly key: "minutesAgo" | "hoursAgo"; readonly count: number }
  | { readonly key: "date"; readonly date: Date } {
  const date = new Date(iso);
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  if (minutes < 1) return { key: "justNow" };
  if (minutes < 60) return { key: "minutesAgo", count: minutes };
  if (minutes < 24 * 60) return { key: "hoursAgo", count: Math.floor(minutes / 60) };
  if (minutes < 48 * 60) return { key: "yesterday" };
  return { key: "date", date };
}

/** The time label for list rows, relative to `now`. */
export function useElapsedLabel(now: number): (iso: string) => string {
  const t = useTranslations("common");
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
