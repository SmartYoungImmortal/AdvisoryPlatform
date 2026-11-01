"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useSyncExternalStore } from "react";

import { CmsButton } from "@/components/cms/button";
import { CmsEmpty } from "@/components/cms/card";
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
 * ## Why the failure shows the API's own sentence
 *
 * The admin API answers a refused ruling with the reason: "This refund case has
 * already been resolved", "Account is not suspended", "Ruling requires an admin
 * profile row for the signed-in admin". Those three are the difference between
 * "somebody got here first", "the record is not in that state" and "your own admin
 * account is not set up" — and an admin can act on each one differently. A
 * translated "something went wrong" would throw all of that away, so `ApiError`'s
 * message is printed verbatim, as `ApiErrorCard` in `components/service/parts.tsx` does.
 */

/** A failed read: the site's empty-state shape, the API's own sentence, and a way to ask again. */
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
    <CmsEmpty
      action={
        onRetry ? (
          <CmsButton icon={RotateCw} onClick={onRetry} variant="secondary">
            {t("retry")}
          </CmsButton>
        ) : undefined
      }
      // Verbatim. It is the only part of this block that says what happened.
      body={error.message}
      className={className}
      icon={CircleAlert}
      title={t("serverTitle")}
    />
  );
}

/** A grey bone, the placeholder shape the site's skeletons are built from. */
const BONE = "block rounded-full bg-muted";

/**
 * A table-shaped placeholder at the table's own heights — the capsules and the
 * search, the head, the rows — so the page does not reflow when the rows land.
 */
export function CmsTableSkeleton({
  columns,
  rows = 6,
}: {
  readonly columns: number;
  readonly rows?: number;
}) {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <span className="flex gap-2">
          <span className={cn(BONE, "h-9 w-20")} />
          <span className={cn(BONE, "h-9 w-24")} />
          <span className={cn(BONE, "h-9 w-24")} />
        </span>
        <span className={cn(BONE, "hidden h-9 w-64 md:block")} />
      </div>
      <div className="mt-4 divide-y divide-border border-b border-border">
        {Array.from({ length: rows + 1 }, (_, row) => (
          <div className={cn("flex items-center gap-6", row === 0 ? "h-11" : "h-13")} key={row}>
            {Array.from({ length: Math.min(columns, 6) }, (_, column) => (
              <span
                className={cn(
                  BONE,
                  row === 0 ? "h-2.5 opacity-60" : "h-3",
                  column === 0 ? "w-1/4" : "flex-1",
                )}
                key={column}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A record page's placeholder: label and value rows on hairlines. */
export function CmsDetailSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      <span className={cn(BONE, "mb-4 h-4 w-32")} />
      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, row) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6" key={row}>
            <span className={cn(BONE, "h-3 w-24")} />
            <span className={cn(BONE, "h-3 w-2/3")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- after a ruling */

/**
 * Bumped after every write that landed. `useResource` re-reads a key only when
 * a reader mounts, so a queue that stays on screen after a bulk ruling — and
 * the sidebar's waiting counts beside it — would otherwise sit on a dropped
 * cache entry. The shell keys the page and the counts by this, so they mount
 * again and read what changed; keys that were not dropped cost nothing.
 */
let rulingVersion = 0;
const rulingListeners = new Set<() => void>();

function bumpRulingVersion(): void {
  rulingVersion += 1;
  for (const listener of rulingListeners) listener();
}

function subscribeRuling(listener: () => void): () => void {
  rulingListeners.add(listener);
  return () => rulingListeners.delete(listener);
}

/** The number of rulings that have landed in this tab. */
export function useRulingVersion(): number {
  return useSyncExternalStore(
    subscribeRuling,
    () => rulingVersion,
    () => 0,
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
  readonly onDone?: () => void;
}) => Promise<RulingResult> {
  const { toast } = useCmsFeedback();

  return useCallback(
    async ({ run, keyPrefix, success, onDone }) => {
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

      // Whatever happened, anything that did land has changed the queue, and
      // the waiting counts are read under the same prefixes.
      if (done > 0) {
        invalidate(keyPrefix);
        bumpRulingVersion();
      }
      onDone?.();

      if (failure) {
        // 409 and 403 both arrive here as an `ApiError` whose `message` is the
        // API's own sentence; an `ApiUnreachableError` says the API was not
        // reached. Either way the message is the thing worth showing.
        toast({ color: "error", title: failure.message });
        return { ok: false };
      }

      toast({ color: "success", title: success });
      return { ok: true };
    },
    [toast],
  );
}
