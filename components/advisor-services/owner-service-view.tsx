"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { ServiceEditor, ServiceEditorSkeleton, type Part } from "@/components/advisor-services/service-editor";
import { authPill } from "@/components/auth/auth-split";
import { ApiErrorCard } from "@/components/service/parts";
import { Button } from "@/components/ui/button";
import {
  getAdvisorServiceImages,
  getMyAdvisorService,
  listMyServicePackages,
  type AdvisorService,
} from "@/lib/advisor-services/api";
import type { ApiServicePackage } from "@/lib/api/types";
import { invalidate, useLastAnswer, useResource } from "@/lib/api/use-resource";
import { cn } from "@/lib/utils";

/**
 * `/advisor/services/view`: the advisor's own service, read and handed to the
 * editor (`service-editor.tsx`), which holds every change on the page until
 * its save and shows the client's view of what it holds.
 */

const PILL = "h-10 w-auto px-4 text-sm md:h-10 md:px-5 md:text-sm lg:h-12 lg:px-6 lg:text-frame-body";

/**
 * The owner's records for one service, its words read in each language by
 * name (Thai, the source, and English) rather than the reader's, under keys
 * of their own (`#th`, `#en`) so the pages that read in the reader's language
 * never share them.
 */
function useOwnedService(serviceId: string) {
  const record = useResource<AdvisorService>(
    `advisors/me/services/${serviceId}#th`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(serviceId, signal, "th"), [serviceId]),
  );
  const english = useResource<AdvisorService>(
    `advisors/me/services/${serviceId}#en`,
    useCallback((signal: AbortSignal) => getMyAdvisorService(serviceId, signal, "en"), [serviceId]),
  );
  const images = useResource<{ images: string[] }>(
    `advisors/me/services/${serviceId}/images`,
    useCallback((signal: AbortSignal) => getAdvisorServiceImages(serviceId, signal), [serviceId]),
  );
  const packages = useResource<ApiServicePackage[]>(
    `advisors/me/services/${serviceId}/packages#th`,
    useCallback((signal: AbortSignal) => listMyServicePackages(serviceId, signal, "th"), [serviceId]),
  );
  const englishPackages = useResource<ApiServicePackage[]>(
    `advisors/me/services/${serviceId}/packages#en`,
    useCallback((signal: AbortSignal) => listMyServicePackages(serviceId, signal, "en"), [serviceId]),
  );
  const reload = () => {
    // The public page and the lists read the same service under their own keys.
    invalidate(`services/${serviceId}`);
    invalidate("advisors/me/services");
    invalidate("services?");
    record.reload();
    english.reload();
    images.reload();
    packages.reload();
    englishPackages.reload();
  };
  return {
    record,
    english,
    images,
    packages,
    englishPackages,
    reload,
    error: record.error ?? english.error ?? images.error ?? packages.error ?? englishPackages.error,
  };
}

export function OwnerServiceScreen({ serviceId, initialPart = null }: {
  readonly serviceId: string;
  /** The editor's part to open with; the old settings route opens on the booking rules. */
  readonly initialPart?: Part | null;
}) {
  const t = useTranslations("ownerService");
  const owned = useOwnedService(serviceId);
  // Read again after a save, the editor stays (and keeps its note and its open part).
  const record = useLastAnswer(owned.record);
  const english = useLastAnswer(owned.english);
  const images = useLastAnswer(owned.images);
  const packages = useLastAnswer(owned.packages);
  const englishPackages = useLastAnswer(owned.englishPackages);

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
  if (!record || !english || !images || !packages || !englishPackages) return <ServiceEditorSkeleton />;

  return (
    <ServiceEditor
      english={{ name: english.name, description: english.description ?? "", packages: englishPackages }}
      images={images.images}
      initialPart={initialPart}
      onSaved={owned.reload}
      packages={packages}
      record={record}
    />
  );
}
