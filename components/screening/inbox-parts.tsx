"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import {
  acceptScreeningRequest,
  declineScreeningRequest,
  getScreeningRequest,
  screeningErrorKey,
  screeningKeys,
  type ApiAdvisorScreeningRequestDetail,
  type ScreeningErrorKey,
} from "@/components/screening/screening-data";
import { DESK_BONE } from "@/components/work/desk-parts";
import { useResource, type Resource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * What the advisor's two ways into a request share: the requests' inbox
 * (`inbox-screen.tsx`) and the review page (`/screening/review`, in
 * `advisor-live.tsx`) read one request the same way, answer it the same way,
 * and say a failed answer in the same words.
 */

/** How a request was answered. */
export type ScreeningOutcome = "accepted" | "declined";

/** An answer that did not go through: why, and which of the two it was. */
export type DecisionFailure = { readonly key: ScreeningErrorKey; readonly on: ScreeningOutcome };

/**
 * One request with its answers, under the key both pages read it by, so
 * moving from one to the other does not ask again. Reading it marks it as
 * viewed on the API.
 */
export function useScreeningRequest(requestId: string): Resource<ApiAdvisorScreeningRequestDetail> {
  return useResource(
    screeningKeys.request(requestId),
    useCallback((signal: AbortSignal) => getScreeningRequest(requestId, signal), [requestId]),
  );
}

/**
 * Accepting or declining a request (the decline with its optional message).
 * `busy` holds from the press until `onDecided` has taken over — the page
 * moves on, or reads the request again — so the pills cannot be pressed
 * twice, and `working` says which of the two is on its way; a failure
 * releases them and keeps why (`failure`), a request already answered
 * elsewhere as `errorAlreadyDecided`.
 */
export function useScreeningDecision(
  requestId: string,
  {
    onDecided,
    onFailed,
  }: {
    readonly onDecided: (outcome: ScreeningOutcome) => void;
    readonly onFailed?: (failure: DecisionFailure) => void;
  },
) {
  const [working, setWorking] = useState<ScreeningOutcome | null>(null);
  const [failure, setFailure] = useState<DecisionFailure | null>(null);

  const run = async (on: ScreeningOutcome, send: () => Promise<unknown>) => {
    setWorking(on);
    setFailure(null);
    try {
      await send();
      onDecided(on);
    } catch (cause) {
      const next = { key: screeningErrorKey(cause, { conflict: "errorAlreadyDecided" }), on };
      setFailure(next);
      setWorking(null);
      onFailed?.(next);
    }
  };

  return {
    busy: working !== null,
    working,
    failure,
    accept: () => run("accepted", () => acceptScreeningRequest(requestId)),
    decline: (message: string) => run("declined", () => declineScreeningRequest(requestId, message)),
  };
}

/**
 * What a failed write says in the one line a popup, a pill or a toast has
 * room for: the request already answered elsewhere, no connection, or the
 * API's failure — the long load-error cards are for the page itself.
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
