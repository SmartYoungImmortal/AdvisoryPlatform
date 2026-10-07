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
 * Which version of each screening screen a route shows.
 *
 * With an id in the query string (`?serviceId=` / `?requestId=`) the screen reads
 * the API — the static export can only prerender fixture slugs, so ids ride in the
 * query string, as `components/bookings/booking-flow.ts` explains. Without one it
 * is the fixture the `/screens` index and the prototype click-through use.
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

/** The list has no id to carry, so it is live whenever the build has an API. */
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
