"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { CmsApiError, CmsDetailSkeleton } from "@/components/cms/api";
import { CmsSection } from "@/components/cms/card";
import { CmsLinkButton } from "@/components/cms/fields";
import { useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { useAccountName } from "@/components/cms/people";
import {
  CmsDataList,
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

const BACK = "/admin/services";

/**
 * One listing, from the admin services list.
 *
 * **Read-only.** `AdminServicesController` is a single `GET`: nothing edits,
 * publishes or hides a service for an admin, so the fields are label and value
 * rows rather than a form whose Save could not be sent. The record is found in
 * the list the table already read (same key, no extra request); there is no
 * admin `GET /services/:id`.
 */
export function ServiceEditScreen() {
  const t = useTranslations("cms.serviceEdit");
  const tNav = useTranslations("cms.nav");
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
  const frame = { backHref: BACK, backLabel: tNav("services"), title: t("title") };

  if (id === "" || (!services.loading && !services.error && !service)) {
    return (
      <CmsPage {...frame}>
        <CmsMissing backHref={BACK} />
      </CmsPage>
    );
  }

  if (services.loading) {
    return (
      <CmsPage {...frame}>
        <CmsDetailSkeleton rows={6} />
      </CmsPage>
    );
  }

  if (services.error || !service) {
    return (
      <CmsPage {...frame}>
        {services.error ? (
          <CmsApiError error={services.error} onRetry={services.reload} />
        ) : (
          <CmsMissing backHref={BACK} />
        )}
      </CmsPage>
    );
  }

  return <ServiceRecord service={service} />;
}

function ServiceRecord({ service }: { readonly service: AdminService }) {
  const t = useTranslations("cms.serviceEdit");
  const tNav = useTranslations("cms.nav");
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
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <CmsLinkButton
              block
              href={`/service/${service.id}`}
              icon={ExternalLink}
              size="lg"
              variant="secondary"
            >
              {t("viewPublic")}
            </CmsLinkButton>
          }
          info={[
            { label: t("created"), by: owner, at: service.createdAt },
            { label: t("updated"), by: owner, at: service.modifiedAt },
          ]}
        />
      }
      backHref={BACK}
      backLabel={tNav("services")}
      badge={<CmsStatus group="publish" value={service.isPublished ? "published" : "hidden"} />}
      description={t("readOnly")}
      title={service.name}
    >
      <CmsSection title={t("details")}>
        <CmsDataList>
          <CmsDataRow label={t("advisor")}>
            {owner ? (
              <Link
                className="font-medium underline-offset-4 hover:underline"
                href={`/admin/users/edit?id=${service.advisorId}`}
              >
                {owner}
              </Link>
            ) : (
              "-"
            )}
          </CmsDataRow>
          <CmsDataRow label={t("category")}>{category}</CmsDataRow>
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
        </CmsDataList>
      </CmsSection>

      <CmsSection title={t("description")}>
        <p className="text-sm leading-6 whitespace-pre-line text-foreground">
          {service.description || "-"}
        </p>
      </CmsSection>
    </CmsPage>
  );
}
