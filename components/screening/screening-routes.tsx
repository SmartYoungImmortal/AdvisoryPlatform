"use client";

import { useTranslations } from "next-intl";

import { asUuid, useQueryValue } from "@/components/bookings/booking-flow";
import {
  LiveScreeningOutcome,
  LiveScreeningQuestions,
} from "@/components/screening/advisee-live";
import {
  ScreeningAcceptedScreen,
  ScreeningDeclinedScreen,
  ScreeningQuestionsScreen,
  ScreeningSubmittedScreen,
} from "@/components/screening/advisee-screens";
import {
  LiveReviewAnswers,
  LiveScreeningRequests,
  LiveScreeningSetup,
} from "@/components/screening/advisor-live";
import {
  ReviewAnswersScreen,
  ScreeningRequestsScreen,
  ScreeningSetupScreen,
} from "@/components/screening/advisor-screens";
import { DeclineScreeningDialog } from "@/components/screening/decline-dialog";
import { isApiConfigured } from "@/lib/api/client";

/**
 * Decides which version of each screening screen a route shows.
 *
 * With an id in the query string (`?serviceId=` or `?requestId=`), the screen uses
 * the API. The static export can only prerender fixed slugs, so ids go in the query
 * string (see `components/bookings/booking-flow.ts`). Without an id, the route
 * shows the sample screen used by the `/screens` index and the prototype.
 */

export function ScreeningQuestionsRoute() {
  const serviceId = asUuid(useQueryValue("serviceId"));
  return serviceId ? <LiveScreeningQuestions serviceId={serviceId} /> : <ScreeningQuestionsScreen />;
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

export function ReviewAnswersRoute({ declining = false }: { readonly declining?: boolean }) {
  const t = useTranslations("screening");
  const requestId = asUuid(useQueryValue("requestId"));
  if (requestId) return <LiveReviewAnswers declining={declining} requestId={requestId} />;
  return (
    <>
      <ReviewAnswersScreen />
      {declining ? (
        <DeclineScreeningDialog
          cancelHref="/screening/review"
          confirmHref="/screening/requests"
          name={t("req1Name")}
        />
      ) : null}
    </>
  );
}

export function ScreeningSetupRoute() {
  const serviceId = asUuid(useQueryValue("serviceId"));
  return serviceId ? <LiveScreeningSetup serviceId={serviceId} /> : <ScreeningSetupScreen />;
}
