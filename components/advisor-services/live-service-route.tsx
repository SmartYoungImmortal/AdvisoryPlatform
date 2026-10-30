"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MobileScreen, ScreenBody, ScreenTopBar } from "@/components/mobile/screen";
import { StatusPill } from "@/components/mobile/status-pill";
import { useResource } from "@/lib/api/use-resource";
import { getMyAdvisorService } from "@/lib/advisor-services/api";
import { ServiceFormScreen } from "@/components/advisor-services/service-form-screen";
import { Button } from "@/components/ui/button";

function RouteContent({ mode }: { readonly mode: "detail" | "edit" | "delete" }) {
  const params = useSearchParams();
  const t = useTranslations("serviceForm");
  const serviceId = params.get("serviceId") ?? "";
  if (!serviceId) return <p role="alert" className="p-6">{t("missingServiceId")}</p>;
  if (mode === "edit") return <ServiceFormScreen mode="edit" serviceId={serviceId} />;
  if (mode === "delete") return <ServiceFormScreen mode="edit" serviceId={serviceId} state="delete" />;
  return <LiveDetail serviceId={serviceId} />;
}

function LiveDetail({ serviceId }: { readonly serviceId: string }) {
  const t = useTranslations("advisorServices");
  const f = useTranslations("serviceForm");
  const c = useTranslations("common");
  const service = useResource(`advisors/me/services/${serviceId}`, (signal) => getMyAdvisorService(serviceId, signal));
  return <MobileScreen wide><ScreenTopBar href="/advisor/services" label={c("back")} /><ScreenBody className="gap-4 p-6">
    {service.loading ? <p role="status">{f("loadingService")}</p> : null}
    {service.error ? <div role="alert"><p>{service.error.message}</p><Button variant="link" type="button" onClick={service.reload} className="mt-2 h-auto border-0 p-0 text-base font-normal underline">{f("retry")}</Button></div> : null}
    {service.data ? <section className="w-full rounded-card border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h1 className="text-xl font-semibold">{service.data.name}</h1><StatusPill tone={service.data.isPublished ? "success" : "neutral"}>{service.data.isPublished ? t("statusPublished") : t("statusHidden")}</StatusPill></div><p className="mt-3 text-sm text-muted-foreground">{service.data.description}</p><p className="mt-3 text-sm">฿{service.data.priceSatang / 100} · {service.data.durationMinutes} minutes</p><Link className="mt-5 inline-flex text-sm font-medium text-primary" href={`/advisor/services/manage?serviceId=${encodeURIComponent(serviceId)}`}>{t("editService")}</Link></section> : null}
  </ScreenBody></MobileScreen>;
}

export function LiveServiceRoute({ mode }: { readonly mode: "detail" | "edit" | "delete" }) {
  return <Suspense fallback={<RouteLoading />}><RouteContent mode={mode} /></Suspense>;
}

function RouteLoading() {
  const t = useTranslations("serviceForm");
  return <p className="p-6" role="status">{t("loading")}</p>;
}
