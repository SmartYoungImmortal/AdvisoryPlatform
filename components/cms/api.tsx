"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import { invalidate } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * The three things every console queue does with the API, in one place.
 *
 * A queue reads through `useResource`, so it has exactly three states to draw —
 * loading, failed, and the rows — and one thing to do after a write: drop the
 * cached read so the queue does not keep showing the row it just ruled on.
 *
 * ## Why the failure card shows the API's own sentence
 *
 * The admin API answers a refused ruling with the reason: "This refund case has
 * already been resolved", "Account is not suspended", "Ruling requires an admin
 * profile row for the signed-in admin". Those three are the difference between
 * "somebody got here first", "the record is not in that state" and "your own admin
 * account is not set up" — and an admin can act on each one differently. A
 * translated "something went wrong" would throw all of that away, so `ApiError`'s
 * message is printed verbatim, as `components/home/browse-list` does.
 *
 * Copy is borrowed from `errorStates.*` rather than invented: the console has no
 * load-failure copy of its own, and `errorStates` is the shared namespace for
 * exactly this. See the report for the `cms.api.*` keys this would rather have.
 */

/** A failed read: the API's own sentence, and a way to ask again. */
export function CmsApiError({
  error,
  onRetry,
  className,
}: {
  readonly error: Error;
  readonly onRetry?: () => void;
  readonly className?: string;
}) {
  const t = useTranslations("errorStates");
  return (
    <CmsCard className={className}>
      <div className="flex flex-col items-start gap-3">
        <p className="text-base font-semibold text-highlighted">{t("serverTitle")}</p>
        {/* Verbatim. It is the only part of this card that says what happened. */}
        <p className="text-sm text-muted-foreground">{error.message}</p>
        {onRetry ? (
          <CmsButton color="neutral" onClick={onRetry} variant="outline">
            {t("retry")}
          </CmsButton>
        ) : null}
      </div>
    </CmsCard>
  );
}

/**
 * A table-shaped placeholder, so the page does not reflow when the rows land.
 *
 * Mirrors `CmsTable`'s frame — toolbar band, header row, body rows, footer band —
 * at the same heights, rather than a spinner in the middle of an empty card.
 */
export function CmsTableSkeleton({
  columns,
  rows = 5,
}: {
  readonly columns: number;
  readonly rows?: number;
}) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <span className="h-8 w-full max-w-xs rounded-md bg-muted" />
        <span className="h-8 w-40 shrink-0 rounded-md bg-muted" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows + 1 }, (_, row) => (
          <div className="flex items-center gap-4 px-4 py-5" key={row}>
            {Array.from({ length: columns }, (_, column) => (
              <span
                className={cn(
                  "h-4 rounded-md bg-muted",
                  column === 0 ? "w-1/4" : "flex-1",
                  row === 0 && "h-3.5 opacity-60",
                )}
                key={column}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border p-4">
        <span className="h-4 w-48 rounded-md bg-muted" />
        <span className="h-8 w-32 rounded-md bg-muted" />
      </div>
    </div>
  );
}

/** A card-shaped placeholder, for a detail page rather than a list. */
export function CmsCardSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <CmsCard>
      <div aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, row) => (
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4" key={row}>
            <span className="h-4 w-24 rounded-md bg-muted" />
            <span className="h-4 w-2/3 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </CmsCard>
  );
}

export type RulingResult = { readonly ok: boolean };

/**
 * Run one or more writes, then re-read the queue.
 *
 * `invalidate(prefix)` is the whole reason this exists: `useResource` caches by
 * key for the life of the tab, so without it a queue keeps rendering the row an
 * admin has just approved. The prefix is the key prefix the queue reads under —
 * `"admin/refunds"` clears every page and filter of the refunds queue.
 *
 * A failure is reported with the API's own message, which is what makes a 409 and
 * a 403 legible: the admin is told the record was already resolved, or that their
 * account has no admin profile row, rather than being told nothing.
 *
 * Several ids run in sequence rather than in parallel, on purpose: the API has no
 * bulk ruling route, and a queue of parallel writes against the same rows makes
 * the order of the resulting 409s arbitrary.
 */
export function useRuling(): (options: {
  /** The writes to run, one per selected record. */
  readonly run: ReadonlyArray<() => Promise<unknown>>;
  /** The `useResource` key prefix to drop afterwards. */
  readonly keyPrefix: string;
  /** Shown when every write succeeded. */
  readonly success: string;
  readonly successColor?: "success" | "warning";
  readonly onDone?: () => void;
}) => Promise<RulingResult> {
  const { toast } = useCmsFeedback();

  return useCallback(
    async ({ run, keyPrefix, success, successColor = "success", onDone }) => {
      let failure: Error | null = null;
      let done = 0;
      for (const write of run) {
        try {
          await write();
          done += 1;
        } catch (cause) {
          failure = cause instanceof Error ? cause : new Error(String(cause));
          // Stop on the first refusal. Carrying on would bury its message under
          // the next one, and a 403 for a missing admin profile row will refuse
          // every remaining write for the same reason anyway.
          break;
        }
      }

      // Whatever happened, anything that did land has changed the queue.
      if (done > 0) invalidate(keyPrefix);
      onDone?.();

      if (failure) {
        // 409 and 403 both arrive here as an `ApiError` whose `message` is the
        // API's own sentence; an `ApiUnreachableError` says the API was not
        // reached. Either way the message is the thing worth showing.
        toast({ color: "error", title: failure.message });
        return { ok: false };
      }

      toast({ color: successColor, title: success });
      return { ok: true };
    },
    [toast],
  );
}
