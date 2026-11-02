"use client";

import { ArrowLeft, CalendarRange } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { ListingEditor, type Part } from "@/components/advisor-services/listing-editor";
import { authPill } from "@/components/auth/auth-split";
import { LiveServiceDetailSkeleton, ServiceFrame, ServiceView } from "@/components/service/service-detail-live";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getAdvisorServiceImages,
  getMyAdvisorService,
  listMyServicePackages,
  updateAdvisorService,
  type AdvisorService,
} from "@/lib/advisor-services/api";
import type { ApiPublicService, ApiServicePackage } from "@/lib/api/types";
import { invalidate, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/view`: the advisor's own service. Two modes under the
 * owner's bar: **edit**, the listing editor (`listing-editor.tsx`), a card
 * per part of the page and the part pressed open beside them; and
 * **preview**, the page exactly as a customer sees it (`ServiceView`). A
 * hidden service shows too, as it will look once on sale.
 */

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

/** The owner's records for one service, put together as the public page reads one. */
function useOwnedService(serviceId: string) {
  const record = useResource<AdvisorService>(
    `advisors/me/services/${serviceId}`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(serviceId, signal), [serviceId]),
  );
  const images = useResource<{ images: string[] }>(
    `advisors/me/services/${serviceId}/images`,
    useCallback((signal: AbortSignal) => getAdvisorServiceImages(serviceId, signal), [serviceId]),
  );
  const packages = useResource<ApiServicePackage[]>(
    `advisors/me/services/${serviceId}/packages`,
    useCallback((signal: AbortSignal) => listMyServicePackages(serviceId, signal), [serviceId]),
  );
  const reload = () => {
    // The public page and the lists read the same service under their own keys.
    invalidate(`services/${serviceId}`);
    invalidate("advisors/me/services");
    invalidate("services?");
    record.reload();
    images.reload();
    packages.reload();
  };
  const service: ApiPublicService | undefined =
    record.data && images.data && packages.data
      ? {
          id: record.data.id,
          advisorId: record.data.advisorId,
          categoryId: record.data.categoryId,
          name: record.data.name,
          description: record.data.description ?? "",
          priceSatang: record.data.priceSatang,
          durationMinutes: record.data.durationMinutes,
          screeningRequired: record.data.screeningRequired,
          trialEnabled: record.data.trialEnabled,
          trialDurationMinutes: record.data.trialDurationMinutes,
          relatedServiceIds: record.data.relatedServiceIds,
          createdAt: record.data.createdAt,
          images: images.data.images,
          packages: packages.data,
        }
      : undefined;
  return { record, images, packages, service, reload, error: record.error ?? images.error ?? packages.error };
}

export function OwnerServiceScreen({ serviceId, initialPart = null }: {
  readonly serviceId: string;
  /** The editor's part to open with; the old settings route opens on the booking rules. */
  readonly initialPart?: Part | null;
}) {
  const t = useTranslations("ownerService");
  const owned = useOwnedService(serviceId);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  if (owned.error) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-16">
        <ApiErrorCard error={owned.error} onRetry={owned.reload} title={t("loadFailed")} />
        <Button className={cn(authPill(false), PILL)} nativeButton={false} render={<Link href="/advisor/services" />} variant="outline">
          {t("back")}
        </Button>
      </div>
    );
  }
  if (!owned.service || !owned.record.data || !owned.images.data || !owned.packages.data) return <LiveServiceDetailSkeleton />;

  const bar = <OwnerBar mode={mode} onChanged={owned.reload} onMode={setMode} record={owned.record.data} />;
  if (mode === "preview") return <ServiceView owner={{ bar, intro: null, packages: null }} service={owned.service} />;
  return (
    <ServiceFrame>
      {bar}
      <ListingEditor
        images={owned.images.data.images}
        initialPart={initialPart}
        onChanged={owned.reload}
        onPreview={() => setMode("preview")}
        packages={owned.packages.data}
        record={owned.record.data}
      />
    </ServiceFrame>
  );
}

/* ------------------------------------------------------------------- bar */

/**
 * Above the page: the way back, the two modes, whether it is open for booking
 * (and the switch that changes it), and its schedule.
 */
function OwnerBar({ record, mode, onMode, onChanged }: {
  readonly record: AdvisorService;
  readonly mode: "edit" | "preview";
  readonly onMode: (next: "edit" | "preview") => void;
  readonly onChanged: () => void;
}) {
  const t = useTranslations("ownerService");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function setPublished(next: boolean) {
    setSaving(true);
    setFailure(null);
    try {
      await updateAdvisorService(record.id, { isPublished: next });
      onChanged();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-5 lg:mb-9">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label={t("back")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/advisor/services"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div aria-label={t("modeLabel")} className="flex rounded-full bg-muted p-1" role="group">
          {(["edit", "preview"] as const).map((option) => (
            <button
              aria-pressed={mode === option}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-10 lg:px-5 lg:text-frame-meta",
                mode === option ? "bg-card text-foreground shadow-hero-card" : "text-muted-foreground hover:text-foreground",
              )}
              key={option}
              onClick={() => onMode(option)}
              type="button"
            >
              {t(option === "edit" ? "modeEdit" : "modePreview")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end lg:gap-3">
        <label className="flex h-10 items-center gap-2.5 px-1 text-sm text-foreground lg:h-12 lg:text-frame-meta">
          <span className={record.isPublished ? "text-success" : "text-muted-foreground"}>
            {record.isPublished ? t("onSale") : t("hiddenShort")}
          </span>
          <Switch aria-label={t("publishSwitch")} checked={record.isPublished} disabled={saving} onCheckedChange={(next) => void setPublished(next)} />
        </label>
        <Button
          className={cn(authPill(false), PILL)}
          nativeButton={false}
          render={<Link href={`/advisor/services/schedule?serviceId=${encodeURIComponent(record.id)}`} />}
          variant="outline"
        >
          <CalendarRange aria-hidden />
          {t("schedule")}
        </Button>
      </div>
      {failure ? (
        <p className="text-sm text-destructive md:basis-full" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}
