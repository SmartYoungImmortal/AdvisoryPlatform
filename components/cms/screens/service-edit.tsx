"use client";

import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { CmsPerson } from "@/components/cms/avatar";
import { CmsButton } from "@/components/cms/button";
import { CmsCard } from "@/components/cms/card";
import { useCmsFeedback } from "@/components/cms/feedback";
import {
  CmsFormField,
  CmsLinkButton,
  CmsSelect,
  CmsTextarea,
  CmsTextField,
} from "@/components/cms/fields";
import { useAccountLookup, useActorId, useRecordId } from "@/components/cms/hooks";
import { CmsPage } from "@/components/cms/layout";
import { CmsDataRow, CmsMissing, CmsSidebarOptions } from "@/components/cms/sidebar-options";
import { CmsStatus, useStatusLabels } from "@/components/cms/status";
import { setServicesStatus, updateService } from "@/lib/mock-db/actions";
import { useDatabase } from "@/lib/mock-db/store";
import type { MarketService, PublishStatus } from "@/lib/mock-db/types";

const MINUTE_OPTIONS = ["30", "45", "60", "90", "120"] as const;

export function ServiceEditScreen() {
  const t = useTranslations("cms.serviceEdit");
  const id = useRecordId();
  const service = useDatabase((db) => db.services.find((s) => s.id === id));
  if (!service) {
    return (
      <CmsPage backHref="/admin/services" title={t("title")}>
        <CmsMissing backHref="/admin/services" />
      </CmsPage>
    );
  }
  // Keyed on `updatedAt` so a save or an outside change resets the form to it.
  return <ServiceEditor key={`${service.id}:${service.updatedAt}`} service={service} />;
}

/**
 * A listing seen from the console: its catalogue fields, and a status select
 * in the options column the way Nexus's edit pages carry Draft/Published.
 * Hiding asks for the reason the advisor will be shown.
 */
function ServiceEditor({ service }: { readonly service: MarketService }) {
  const t = useTranslations("cms.serviceEdit");
  const actorId = useActorId();
  const person = useAccountLookup();
  const labels = useStatusLabels();
  const { toast } = useCmsFeedback();
  const categories = useDatabase((db) => db.categories);
  const statusId = useId();
  const categoryId = useId();
  const minutesId = useId();
  const reasonId = useId();

  const initial = {
    title: service.title,
    categoryId: service.categoryId,
    price: String(service.priceSatang / 100),
    minutes: String(service.minutes),
    status: service.status,
    reason: service.hiddenReason ?? "",
  };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<{ title?: string; price?: string; reason?: string }>({});

  const dirty = (Object.keys(initial) as Array<keyof typeof initial>).some(
    (key) => form[key] !== initial[key],
  );

  function save() {
    const price = Number(form.price);
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = t("titleRequired");
    if (!Number.isFinite(price) || price <= 0) next.price = t("priceInvalid");
    if (form.status === "hidden" && !form.reason.trim()) next.reason = t("reasonRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    updateService(
      service.id,
      {
        title: form.title.trim(),
        categoryId: form.categoryId,
        priceSatang: Math.round(price * 100),
        minutes: Number(form.minutes),
      },
      actorId,
    );
    if (form.status !== service.status || form.reason !== (service.hiddenReason ?? "")) {
      setServicesStatus([service.id], form.status, form.reason, actorId);
    }
    toast({ title: t("saved") });
  }

  const statusItems: ReadonlyArray<{ value: PublishStatus; label: string }> = [
    { value: "published", label: labels.publish.published },
    { value: "hidden", label: labels.publish.hidden },
  ];

  return (
    <CmsPage
      aside={
        <CmsSidebarOptions
          actions={
            <>
              <CmsButton block color="action" disabled={!dirty} icon={Save} onClick={save} size="lg">
                {t("save")}
              </CmsButton>
              {service.catalogueId ? (
                <CmsLinkButton
                  block
                  color="neutral"
                  href={`/service/${service.catalogueId}`}
                  icon={ExternalLink}
                  size="lg"
                  variant="outline"
                >
                  {t("viewPublic")}
                </CmsLinkButton>
              ) : null}
            </>
          }
          info={[
            { label: t("created"), at: service.createdAt },
            { label: t("updated"), at: service.updatedAt },
          ]}
        >
          <CmsFormField htmlFor={statusId} label={t("status")}>
            <CmsSelect
              id={statusId}
              items={statusItems}
              onValueChange={(status) => setForm({ ...form, status })}
              value={form.status}
            />
          </CmsFormField>
          {form.status === "hidden" ? (
            <CmsFormField
              error={errors.reason}
              help={t("reasonHelp")}
              htmlFor={reasonId}
              label={t("reason")}
              required
            >
              <CmsTextarea
                id={reasonId}
                invalid={Boolean(errors.reason)}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                rows={3}
                value={form.reason}
              />
            </CmsFormField>
          ) : null}
        </CmsSidebarOptions>
      }
      backHref="/admin/services"
      badge={<CmsStatus group="publish" value={service.status} />}
      title={service.title}
    >
      <CmsCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <CmsTextField
            className="sm:col-span-2"
            error={errors.title}
            label={t("fieldTitle")}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
            value={form.title}
          />
          <CmsFormField htmlFor={categoryId} label={t("category")} required>
            <CmsSelect
              id={categoryId}
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
              onValueChange={(value) => setForm({ ...form, categoryId: value })}
              value={form.categoryId}
            />
          </CmsFormField>
          <CmsFormField htmlFor={minutesId} label={t("minutes")} required>
            <CmsSelect
              id={minutesId}
              items={MINUTE_OPTIONS.map((m) => ({ value: m, label: t("minutesValue", { count: Number(m) }) }))}
              onValueChange={(value) => setForm({ ...form, minutes: value })}
              value={form.minutes}
            />
          </CmsFormField>
          <CmsTextField
            error={errors.price}
            inputMode="numeric"
            label={t("price")}
            min={1}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            required
            trailing={<span className="text-sm text-dimmed">฿</span>}
            type="number"
            value={form.price}
          />
        </div>
      </CmsCard>

      <CmsCard title={t("ownerTitle")}>
        <dl className="space-y-3">
          <CmsDataRow label={t("advisor")}>
            <Link className="inline-block" href={`/admin/users/edit?id=${service.advisorId}`}>
              <CmsPerson account={person(service.advisorId)} detail={person(service.advisorId)?.email} />
            </Link>
          </CmsDataRow>
          <CmsDataRow label={t("bookings")}>
            <span className="font-latin">{service.bookings}</span>
          </CmsDataRow>
          <CmsDataRow label={t("rating")}>
            <span className="font-latin">{service.rating.toFixed(1)}</span>
          </CmsDataRow>
        </dl>
      </CmsCard>
    </CmsPage>
  );
}
