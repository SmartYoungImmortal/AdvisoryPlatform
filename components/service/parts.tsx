import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/lib/api/client";
import { NeutralButton } from "@/components/mobile/buttons";
import { ThaiText } from "@/components/mobile/thai-text";
import { surfaceClass } from "@/components/mobile/surface";
import { cn } from "@/lib/utils";

/**
 * The pieces `/service/[id]` shares between its fixture rendering and its
 * API-backed one.
 *
 * They were defined inside `service-detail-screen.tsx` and are lifted out
 * unchanged, so the live screen is not a second copy of the same four blocks.
 */

/** The heads inside the page: a step above their card titles once there is room. */
export const SECTION_HEAD =
  "w-full text-base font-semibold text-foreground lg:text-lg";

/** Figma "Topic Chip" — a muted pill, 12/18, that says what fits in the hour. */
export function TopicChip({ label }: { readonly label: string }) {
  return (
    <span className="flex shrink-0 items-start rounded-full bg-muted px-2.5 py-1 text-xs font-normal whitespace-nowrap text-muted-foreground">
      {label}
    </span>
  );
}

/**
 * Figma "Dist Row" — a 6px track whose fill is the share of ratings at that star.
 * The five rows together are the shape of the score, which a bare "4.9" hides:
 * an average sits in the same place whether the tail is empty or full of ones.
 */
export function DistributionRow({
  label,
  fill,
}: {
  readonly label: string;
  readonly fill: number;
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-2 overflow-clip">
      <span className="font-latin shrink-0 text-xs font-normal tabular-nums whitespace-nowrap text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The four steps between opening this page and the money reaching the advisor.
 * The copy is the landing page's, verbatim: a reader who arrives here from a
 * search has never seen it, and it is the answer to "how does paying work".
 */
export function StepList() {
  const t = useTranslations("landing");
  const steps = [1, 2, 3, 4] as const;

  return (
    <ol
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-3 overflow-clip p-4",
      )}
    >
      {steps.map((n) => (
        <li className="flex w-full shrink-0 items-start gap-3 overflow-clip" key={n}>
          <span className="font-latin flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-surface text-xs font-semibold tabular-nums text-primary">
            {n}
          </span>
          <div className="flex min-w-px flex-1 flex-col items-start gap-0.5 overflow-clip">
            <p className="w-full text-sm font-semibold text-foreground">
              {t(`step${n}Title`)}
            </p>
            <p className="w-full text-xs font-normal text-muted-foreground">
              <ThaiText>{t(`step${n}Body`)}</ThaiText>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * What a block says when the API answered with a failure.
 *
 * The API's own sentence, verbatim, the way `components/home/browse-list.tsx`
 * prints it — it is the only thing that tells "no session" apart from "the
 * container is not running", and a translated guess would erase the difference.
 *
 * A retry is offered for everything the reader could plausibly fix by asking
 * again, and withheld for 401 and 403: pressing it a second time cannot change
 * who you are. `signInHref` puts the way in beside the sentence instead.
 */
export function ApiErrorCard({
  title,
  error,
  onRetry,
  extra,
  className,
}: {
  readonly title: string;
  readonly error: Error;
  readonly onRetry?: () => void;
  /** An action the specific failure suggests — answering screening, signing in. */
  readonly extra?: ReactNode;
  readonly className?: string;
}) {
  const s = useTranslations("search");
  const c = useTranslations("common");
  const unauthenticated = error instanceof ApiError && error.isUnauthenticated;

  return (
    <div
      className={cn(
        surfaceClass(),
        "flex w-full shrink-0 flex-col items-start gap-3 p-5",
        className,
      )}
    >
      <p className="w-full text-base font-semibold text-foreground">{title}</p>
      <p className="w-full text-sm font-normal text-muted-foreground">
        {error.message}
      </p>
      <div className="flex w-full shrink-0 flex-wrap items-center gap-2">
        {unauthenticated ? (
          <NeutralButton className="w-auto shrink-0" href="/login" size="sm">
            {c("login")}
          </NeutralButton>
        ) : onRetry ? (
          <NeutralButton className="w-auto shrink-0" onClick={onRetry} size="sm">
            {s("retry")}
          </NeutralButton>
        ) : null}
        {extra}
      </div>
    </div>
  );
}
