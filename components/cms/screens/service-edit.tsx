"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsCardSkeleton } from "@/components/cms/api";
import { CmsCard } from "@/components/cms/card";
import { CmsFormField, CmsLinkButton } from "@/components/cms/fields";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import {
  CmsDataRow,
  CmsMissing,
  CmsSidebarOptions,
} from "@/components/cms/sidebar-options";
import { CmsStatus } from "@/components/cms/status";
import {
  ADMIN_KEYS,
  ADMIN_MAX_LIMIT,
  listAdminServices,
  listCategories,
  type AdminService,
  type TaxonomyRecord,
} from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/client";
import { useResource } from "@/lib/api/use-resource";
import { formatBaht } from "@/lib/mock-db/format";

/**
 * One listing, from the admin services list — Nexus's record page (`[id].vue`):
 * the fields in one form card, the status and the audit in the options panel.
 *
 * **Read-only.** `AdminServicesController` is a single `GET`: nothing edits,
 * publishes or hides a service for an admin, so the fields are shown disabled
 * rather than as a form whose Save could not be sent. The record is found in the
 * list the table already read (same key, no extra request); there is no admin
 * `GET /services/:id`.
 */
export function ServiceEditScreen() {
  const t = useTranslations("cms.serviceEdit");
  const id = useRecordId();

  const servicesFetcher = useCallback(
    (signal: AbortSignal) => listAdminServices({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const services = useResource<Paginated<AdminService>>(
    `${ADMIN_KEYS.services}?limit=${ADMIN_MAX_LIMIT}`,
    servicesFetcher,
  );
  const service = services.data?.items.find((s) => s.id === id);

  if (id === "" || (!services.loading && !services.error && !service)) {
    return (
      <CmsPage backHref="/admin/services" title={t("title")}>
        <CmsMissing backHref="/admin/services" />
      </CmsPage>
    );
  }

  if (services.loading) {
    return (
      <CmsPage backHref="/admin/services" title={t("title")}>
        <CmsCardSkeleton rows={5} />
      </CmsPage>
    );
  }

  if (services.error || !service) {
    return (
      <CmsPage backHref="/admin/services" title={t("title")}>
        {services.error ? (
          <CmsApiError error={services.error} onRetry={services.reload} />
        ) : (
          <CmsMissing backHref="/admin/services" />
        )}
      </CmsPage>
    );
  }

  return <ServiceRecord service={service} />;
}

function ServiceRecord({ service }: { readonly service: AdminService }) {
  const t = useTranslations("cms.serviceEdit");
  const accountName = useAccountName();
  const owner = accountName(service.advisorId);

  const categoriesFetcher = useCallback(
    (signal: AbortSignal) => listCategories({ limit: ADMIN_MAX_LIMIT }, signal),
    [],
  );
  const categories = useResource<Paginated<TaxonomyRecord>>(
    `${ADMIN_KEYS.categories}?limit=${ADMIN_MAX_LIMIT}`,
    categoriesFetcher,
  );
  const category =
    categories.data?.items.find((c) => c.id === service.categoryId)?.name ?? "-";

  return (
    <CmsPage backHref="/admin/services" title={service.name}>
      {/* Nexus's page body: its own p-4, a 4-column grid, the form card on
          three of them and the options panel on the fourth. */}
      <section className="p-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-3">
            {/* Plain label/value rows, not disabled inputs: nothing here can be
                changed by an admin, and a field that looks typeable but is not
                reads as broken. */}
            <CmsCard>
              <dl className="space-y-4">
                <CmsDataRow label={t("fieldTitle")}>{service.name}</CmsDataRow>
                <CmsDataRow label={t("category")}>{category}</CmsDataRow>
                <CmsDataRow label={t("advisor")}>
                  <Link
                    className="text-action transition-colors hover:text-action/75"
                    href={`/admin/users/edit?id=${service.advisorId}`}
                  >
                    {owner ?? "-"}
                  </Link>
                </CmsDataRow>
                <CmsDataRow label={t("price")}>
                  <span className="font-latin">{formatBaht(service.priceSatang)}</span>
                </CmsDataRow>
                <CmsDataRow label={t("minutes")}>
                  {t("minutesValue", { count: service.durationMinutes })}
                </CmsDataRow>
                <CmsDataRow label={t("screening")}>
                  {service.screeningRequired ? t("yes") : t("no")}
                </CmsDataRow>
                <CmsDataRow label={t("trial")}>
                  {service.trialEnabled && service.trialDurationMinutes
                    ? t("minutesValue", { count: service.trialDurationMinutes })
                    : t("no")}
                </CmsDataRow>
                <CmsDataRow label={t("description")}>
                  <span className="font-normal whitespace-pre-line text-foreground">
                    {service.description || "-"}
                  </span>
                </CmsDataRow>
              </dl>
            </CmsCard>
          </div>

          <CmsSidebarOptions
            actions={
              <CmsLinkButton
                block
                color="neutral"
                href={`/service/${service.id}`}
                icon={ExternalLink}
                size="lg"
                variant="outline"
              >
                {t("viewPublic")}
              </CmsLinkButton>
            }
            info={[
              { label: t("created"), by: owner ?? undefined, at: service.createdAt },
              { label: t("updated"), by: owner ?? undefined, at: service.modifiedAt },
            ]}
          >
            <CmsFormField label={t("status")}>
              <div>
                <CmsStatus
                  group="publish"
                  value={service.isPublished ? "published" : "hidden"}
                />
              </div>
            </CmsFormField>
          </CmsSidebarOptions>
        </div>
      </section>
    </CmsPage>
  );
}

