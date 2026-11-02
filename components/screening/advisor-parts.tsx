"use client";

import { useTranslations } from "next-intl";

import type { ScreeningErrorKey } from "@/components/screening/screening-data";
import { DESK_BONE } from "@/components/work/desk-parts";
import { cn } from "@/lib/utils";

/**
 * The pieces the advisor's screening pages share, the requests' cards
 * (`request-card.tsx`) and the pages in `advisor-live.tsx` alike.
 */

/**
 * What a failed write says in the one line a popup or a pill has room for:
 * the request already answered elsewhere, no connection, or the API's
 * failure — the long load-error cards are for the page itself.
 */
export function useShortFailure(): (key: ScreeningErrorKey) => string {
  const t = useTranslations("screening");
  const e = useTranslations("errorStates");
  return (key) => {
    if (key === "errorAlreadyDecided") return t("errorAlreadyDecided");
    if (key === "offline") return e("offlineBody");
    return e("serverBody");
  };
}

/** One line box of a type step with its bone inside, so a skeleton's line stands as tall as the text it holds. */
export function BoneLine({ text, bone }: { readonly text: string; readonly bone: string }) {
  return (
    <span className={cn("flex h-lh items-center", text)}>
      <span className={cn(DESK_BONE, "rounded", bone)} />
    </span>
  );
}
