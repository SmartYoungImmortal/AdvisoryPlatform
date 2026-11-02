"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ServiceFormScreen } from "@/components/advisor-services/service-form-screen";
import { ServiceScheduleScreen } from "@/components/advisor-services/service-schedule-screen";
import { OwnerServiceScreen } from "@/components/advisor-services/owner-service-view";

function RouteContent({
  mode,
}: {
  readonly mode: "detail" | "edit" | "delete" | "schedule";
}) {
  const params = useSearchParams();
  const t = useTranslations("serviceForm");
  const serviceId = params.get("serviceId") ?? "";
  if (!serviceId)
    return (
      <p role="alert" className="p-6">
        {t("missingServiceId")}
      </p>
    );
  if (mode === "edit")
    return <ServiceFormScreen mode="edit" serviceId={serviceId} />;
  if (mode === "delete")
    return (
      <ServiceFormScreen mode="edit" serviceId={serviceId} state="delete" />
    );
  if (mode === "schedule")
    return <ServiceScheduleScreen serviceId={serviceId} />;
  // The owner's own service, shown as the page customers see, editable in place.
  return <OwnerServiceScreen serviceId={serviceId} />;
}

export function LiveServiceRoute({
  mode,
}: {
  readonly mode: "detail" | "edit" | "delete" | "schedule";
}) {
  return (
    <Suspense fallback={<RouteLoading />}>
      <RouteContent mode={mode} />
    </Suspense>
  );
}

function RouteLoading() {
  const t = useTranslations("serviceForm");
  return (
    <output className="block p-6">
      {t("loading")}
    </output>
  );
}
