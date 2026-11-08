"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import {
  LiveScreeningOutcome,
  LiveScreeningQuestions,
  ScreeningQuestionsLoading,
} from "@/components/screening/advisee-live";
import {
  ScreeningAcceptedScreen,
  ScreeningDeclinedScreen,
  ScreeningSubmittedScreen,
} from "@/components/screening/advisee-screens";
import {
  LiveReviewAnswers,
  LiveScreeningRequests,
  LiveScreeningSetup,
  ReviewAnswersLoading,
  ScreeningSetupLoading,
} from "@/components/screening/advisor-live";
import { ScreeningRequestsScreen } from "@/components/screening/advisor-screens";
import { isApiConfigured } from "@/lib/api/client";

/**
 * Decides which version of each screening screen a route shows.
 *
 * The ids go in the query string (`?serviceId=` or `?requestId=`): the static
 * export can only prerender fixed slugs (see `components/bookings/booking-flow.ts`).
 *
 * The questions, the review and the setup pages are the API's only. They read
 * the id with `useSearchParams` under a `Suspense`, so the prerendered page is
 * their skeleton and the first render on the client already knows the id —
 * without one each says so, rather than showing sample data. The outcome
 * pages and the requests list still fall back to the sample screens used by
 * the `/screens` index and the prototype.
 */

export function ScreeningQuestionsRoute() {
  return (
    <Suspense fallback={<ScreeningQuestionsLoading />}>
      <QuestionsFromQuery />
    </Suspense>
  );
}

function QuestionsFromQuery() {
  const serviceId = asUuid(useSearchParams().get("serviceId"));
  return <LiveScreeningQuestions serviceId={serviceId} />;
}

export function ScreeningOutcomeRoute({
  outcome,
}: {
  readonly outcome: "submitted" | "accepted" | "declined";
}) {
  const serviceId = asUuid(useQueryValue("serviceId"));
  if (serviceId) return <LiveScreeningOutcome outcome={outcome} serviceId={serviceId} />;
  if (outcome === "accepted") return <ScreeningAcceptedScreen />;
  if (outcome === "declined") return <ScreeningDeclinedScreen />;
  return <ScreeningSubmittedScreen />;
}

/** The list needs no id, so it uses the API whenever the build has one. */
export function ScreeningRequestsRoute() {
  return isApiConfigured ? <LiveScreeningRequests /> : <ScreeningRequestsScreen />;
}

/** `/screening/review` and, with `declining`, `/screening/review/decline`. */
export function ReviewAnswersRoute({ declining = false }: { readonly declining?: boolean }) {
  return (
    <Suspense fallback={<ReviewAnswersLoading />}>
      <ReviewFromQuery declining={declining} />
    </Suspense>
  );
}

function ReviewFromQuery({ declining }: { readonly declining: boolean }) {
  const requestId = asUuid(useSearchParams().get("requestId"));
  return <LiveReviewAnswers declining={declining} requestId={requestId} />;
}

export function ScreeningSetupRoute() {
  return (
    <Suspense fallback={<ScreeningSetupLoading />}>
      <SetupFromQuery />
    </Suspense>
  );
}

function SetupFromQuery() {
  const serviceId = asUuid(useSearchParams().get("serviceId"));
  return <LiveScreeningSetup serviceId={serviceId} />;
}
